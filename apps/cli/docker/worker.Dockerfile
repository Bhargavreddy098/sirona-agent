# Official Node 24.19.0 Alpine linux/amd64 manifest, reviewed for this worker.
FROM node@sha256:2a49bdf71e9fd965a58c1703fd9ddd205b34e5782b692a72dd1d248abb0beb43
RUN addgroup -g 10001 sirona && adduser -u 10001 -G sirona -D -h /home/sirona sirona && mkdir -p /workspace && chown 10001:10001 /workspace
USER 10001:10001
WORKDIR /workspace
CMD ["sleep", "3600"]
