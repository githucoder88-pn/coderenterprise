# Known Issues

- The `extensions/runtime/sandbox` uses a VM-based isolation boundary; for
  untrusted code, operators should run workers in gVisor/Firecracker-backed
  containers.
- Ollama tool-use depends on the locally running model's support; older models
  may reject tool calls.
- Realtime collaboration is event-sourced via Firestore; multi-writer conflict
  resolution for workspace edits is currently last-write-wins for patch
  operations.
- Prometheus/OpenTelemetry metric names are not yet stabilized; labels may
  change until 1.1.
