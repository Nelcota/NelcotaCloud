# Build context: the repository root (the workspace Cargo.toml and Cargo.lock live there).

FROM rust:1.100-slim-trixie AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
# Cache mounts keep the registry and compiled dependencies between builds.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release --locked -p server \
    && cp target/release/server /usr/local/bin/server

FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home --shell /usr/sbin/nologin nelcota
COPY --from=builder /usr/local/bin/server /usr/local/bin/server
USER nelcota
EXPOSE 8080
ENV BIND_ADDRESS=0.0.0.0:8080 \
    RUST_LOG=info
ENTRYPOINT ["/usr/local/bin/server"]
