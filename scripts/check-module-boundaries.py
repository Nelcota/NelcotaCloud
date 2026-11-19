"""Check qualified server imports and console feature dependency directions."""

import re
from pathlib import Path
from posixpath import normpath


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "crates/server/src"
CONSOLE = ROOT / "apps/console/src"
SERVER_DEPENDENCIES = {
    "auth": {"tenants", "webhooks"},
    "cache": {"tenants"},
    "database": {"tenants"},
    "oauth": {"auth", "tenants", "webhooks"},
    "storage": {"auth", "tenants"},
    "team": {"auth", "tenants"},
    "tenants": set(),
    "webhooks": {"tenants"},
    "shared": set(),
}
SERVER_IMPORT = re.compile(r"\bcrate::modules::(\w+)(?:::(\w+))?")
CONSOLE_IMPORT = re.compile(r"""(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]""")


def server_violations() -> list[str]:
    violations = []
    for source in SERVER.rglob("*.rs"):
        parts = source.relative_to(SERVER).parts
        context = parts[1] if parts[0] == "modules" else parts[0]
        if context not in SERVER_DEPENDENCIES:
            continue
        for line_number, line in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
            if line.lstrip().startswith("//"):
                continue
            for target, package in SERVER_IMPORT.findall(line):
                if target == context:
                    continue
                if target not in SERVER_DEPENDENCIES[context]:
                    violations.append(f"{source.relative_to(ROOT)}:{line_number}: {context} -> {target}")
                if target == "auth" and package != "integration":
                    violations.append(f"{source.relative_to(ROOT)}:{line_number}: use an Auth integration facade")
    return violations


def console_dependencies() -> tuple[dict[str, set[str]], list[str]]:
    graph: dict[str, set[str]] = {}
    violations = []
    for source in sorted(CONSOLE.rglob("*.ts*")):
        relative = source.relative_to(CONSOLE)
        parts = relative.parts
        for line_number, line in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
            if line.lstrip().startswith("//"):
                continue
            for specifier in CONSOLE_IMPORT.findall(line):
                destination = console_target(relative, specifier)
                if destination[0] == "external":
                    continue
                if forbidden_console_import(parts, destination):
                    violations.append(f"{source.relative_to(ROOT)}:{line_number}: forbidden import {specifier}")
                if parts[0] == destination[0] == "modules" and parts[1] != destination[1]:
                    graph.setdefault(parts[1], set()).add(destination[1])
    return graph, violations


def console_target(source: Path, specifier: str) -> list[str]:
    if specifier.startswith("@/"):
        return specifier.removeprefix("@/").split("/")
    if specifier.startswith("."):
        return normpath(f"{source.parent.as_posix()}/{specifier}").split("/")
    return ["external"]


def forbidden_console_import(source: tuple[str, ...], target: list[str]) -> bool:
    if source[0] == "shared":
        return target[0] in {"app", "modules"}
    if source[0] == "modules":
        return target[0] == "app"
    return False


def console_cycles(graph: dict[str, set[str]]) -> list[str]:
    visited: set[str] = set()
    cycles = []

    def visit(feature: str, chain: tuple[str, ...]) -> None:
        if feature in chain:
            cycle = (*chain[chain.index(feature):], feature)
            cycles.append("console feature cycle: " + " -> ".join(cycle))
            return
        if feature in visited:
            return
        for target in sorted(graph.get(feature, set())):
            visit(target, (*chain, feature))
        visited.add(feature)

    for feature in sorted(graph):
        visit(feature, ())
    return cycles


def main() -> int:
    graph, console = console_dependencies()
    violations = server_violations() + console + console_cycles(graph)
    for violation in violations:
        print(violation)
    return int(bool(violations))


if __name__ == "__main__":
    raise SystemExit(main())
