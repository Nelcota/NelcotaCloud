#![forbid(unsafe_code)]

use std::io::{self, Write};

fn main() -> io::Result<()> {
    // SQLx tracks known migrations individually, so Cargo must also watch for new files.
    writeln!(io::stdout(), "cargo::rerun-if-changed=migrations")
}
