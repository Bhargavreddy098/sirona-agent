# Candidate only. Building/selecting this image requires the recorded P6 Gate B approval.
# Build context is the verified, explicitly assembled context; never the repository root.
FROM ghcr.io/webassembly/wasi-sdk@sha256:9515a0625f6ac6002aa2c285fd718cba0575b507bfaa3687ba41fea822a2bfa5 AS sql-parser
USER root
COPY tree-sitter-linux-x64.gz /tmp/tree-sitter.gz
COPY sql-v0.3.11.tar.gz /tmp/sql.tar.gz
RUN --network=none mkdir -p /src/sql /out && gzip -dc /tmp/tree-sitter.gz > /usr/local/bin/tree-sitter && chmod 0555 /usr/local/bin/tree-sitter && tar -xzf /tmp/sql.tar.gz -C /src/sql
RUN --network=none TREE_SITTER_WASI_SDK_PATH=/opt/wasi-sdk tree-sitter build --wasm --output /out/tree-sitter-sql.wasm /src/sql

# Same immutable official Node foundation and user setup as the existing P3 worker.
FROM node@sha256:2a49bdf71e9fd965a58c1703fd9ddd205b34e5782b692a72dd1d248abb0beb43
USER root
RUN --network=none addgroup -g 10001 sirona && adduser -u 10001 -G sirona -D -h /home/sirona sirona && mkdir -p /workspace && chown 10001:10001 /workspace
COPY apks/ /tmp/apks/
# Signed APKs and their complete pinned closure are verified before context assembly.
RUN --network=none apk add --no-network --no-cache /tmp/apks/*.apk && rm -rf /tmp/apks && mkdir -p /opt/sirona/mcp /opt/sirona/parsers && chown -R 10001:10001 /opt/sirona
COPY --chown=10001:10001 package.json package-lock.json /opt/sirona/
COPY --chown=10001:10001 server.mjs /opt/sirona/mcp/server.mjs
COPY --from=sql-parser --chown=10001:10001 /out/tree-sitter-sql.wasm /opt/sirona/parsers/tree-sitter-sql.wasm
USER 10001:10001
WORKDIR /opt/sirona
# Only integrity-locked public package downloads; no package install scripts.
RUN npm ci --ignore-scripts --omit=dev --no-audit --no-fund --userconfig=/dev/null && npm cache clean --force
WORKDIR /workspace
CMD ["sleep", "3600"]
