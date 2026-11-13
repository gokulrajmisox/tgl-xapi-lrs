# Conformance testing

The implementation has unit tests for statement shape validation, actor identity normalization, assigned fields, and activity extraction. Run `pnpm test:xapi`, `pnpm exec tsc --noEmit`, and `pnpm build` for local checks.

The official ADL xAPI LRS Test Suite has not been run against this implementation. Do not advertise TGL as xAPI-conformant until a dedicated test deployment passes the relevant suite. Configure a test-only provider registration with broad test scopes and a non-production database. Do not disable rate limits or actor authorization in production to accommodate conformance tests.

Areas requiring suite-driven validation include HTTP error bodies, canonical format, continuation compatibility, statement comparison edge cases, conditional document behavior, alternate request syntax, and attachment transport.
