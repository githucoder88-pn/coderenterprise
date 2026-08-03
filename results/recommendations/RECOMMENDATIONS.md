# Recommendations

1. **Restore a green baseline:** fix AUD-001, configure ESLint, then make build, lint, typecheck, and tests mandatory.
2. **Choose one package manager:** align Docker, README, lockfile, and CI.
3. **Finish composition:** maintain a route/service registry so source features cannot silently remain unreachable.
4. **Replace placeholders:** implement BullMQ workers, durable event delivery, payment provider boundaries, notification delivery, and real telemetry exporters—or explicitly remove unsupported claims.
5. **Harden authentication:** separate and rotate access/refresh tokens and add client contract tests.
6. **Add integration environments:** Firebase emulator, Redis service, provider mocks, queue worker, and multi-tenant authorization fixtures.
7. **Add E2E and release testing:** configure Playwright for dashboard/desktop/web flows and smoke-test mobile/CLI/VS Code API paths.
8. **Add security gates:** dependency audit, secret scanning, tool sandbox tests, production-config validation, and tenant-isolation tests.
9. **Measure before optimizing:** add indexing, streaming, queue, memory, and failover benchmarks.
10. **Document support boundaries:** clearly label implemented, mocked, local-only, experimental, and production-ready components.
