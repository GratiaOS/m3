# syntax=docker/dockerfile:1.6

# ---- builder ----
ARG RUST_VERSION=1.85
FROM rust:${RUST_VERSION}-slim AS builder
WORKDIR /build

# Copy workspace manifests first to maximize caching
COPY Cargo.toml Cargo.lock ./
COPY server/Cargo.toml server/Cargo.toml

# Prime dependency cache (no real source yet)
RUN mkdir -p server/src \
 && echo 'fn main(){}' > server/src/main.rs \
 && cargo build -p m3-memory-server --release || true

# Now bring real sources
COPY server/src server/src

# Build the actual binary
RUN cargo build -p m3-memory-server --release

# ---- runtime ----
FROM debian:bookworm-slim
# Only CA certs needed (webhooks); rusqlite is built with bundled sqlite
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# exports: default location inside the container
ENV M3_EXPORTS_DIR=/app/server/exports
RUN mkdir -p "$M3_EXPORTS_DIR"
VOLUME ["/app/server/exports"]

# Copy binary from builder
COPY --from=builder /build/target/release/m3-memory-server /usr/local/bin/m3-memory-server

# Container defaults
ENV M3_BIND=0.0.0.0:3033 \
    M3_DB_PATH=/data/memory.db \
    RUST_LOG=info

VOLUME ["/data"]
EXPOSE 3033

ENTRYPOINT ["/usr/local/bin/m3-memory-server"]