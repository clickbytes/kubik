FROM rust:1.99-bookworm AS build
WORKDIR /src

COPY Cargo.toml Cargo.lock ./
COPY apps/server/Cargo.toml apps/server/Cargo.toml
COPY crates/worldgen/Cargo.toml crates/worldgen/Cargo.toml
COPY apps/server/src apps/server/src
COPY apps/server/world-config.json apps/server/world-config.json
COPY crates/worldgen/src crates/worldgen/src
RUN cargo build --locked --release -p kubik-server

FROM debian:bookworm-slim
COPY --from=build /src/target/release/kubik-server /usr/local/bin/kubik-server
ENV KUBIK_BIND=0.0.0.0:3000
EXPOSE 3000
CMD ["kubik-server"]
