# server/Dockerfile
FROM rust:1.79 as builder
WORKDIR /app
# Cache deps
COPY server/Cargo.toml server/Cargo.lock ./ 
RUN mkdir -p src && echo "fn main(){}" > src/main.rs && cargo build --release && rm -rf target/release/deps/m3_memory_server*
# Build real app
COPY server ./ 
RUN cargo build --release

# Runtime
FROM gcr.io/distroless/cc-debian12
WORKDIR /app
# runtime needs sqlite (bundled rusqlite ok), tzdata optional for chrono formatting
COPY --from=builder /app/target/release/m3-memory-server /usr/local/bin/m3-memory-server
EXPOSE 3033
ENV BIND=0.0.0.0:3033
ENTRYPOINT ["/usr/local/bin/m3-memory-server"]