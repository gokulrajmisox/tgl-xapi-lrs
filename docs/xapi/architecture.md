# TGL xAPI LRS architecture

TGL uses the existing Next.js App Router and connected Supabase PostgreSQL. External providers call the server-only `/api/xapi/` gateway with scoped HTTP Basic credentials over HTTPS. The gateway validates the 1.0.x version header, applies IP/credential rate limits, validates statement structure, and stores original statement JSON through an atomic service-role-only database RPC.

Raw statements are immutable. Duplicate statement IDs with the same normalized payload are idempotent; the same ID with different content returns `409`. Voiding marks the target as voided while preserving both statements. Raw records have RLS enabled and no anon/authenticated access policies.

Actors are keyed by a keyed HMAC of an xAPI inverse functional identifier. Statements without a verified mapping are retained in the administrator review queue. Students may link an actor with a one-time challenge only for registrations explicitly configured for `verified-link-only` that can send the custom context extension; other identities require administrator review. TGL never attaches a learner by matching names or email addresses. A trusted administrator can verify a mapping, after which supported activity mappings allow deterministic progress aggregation. Progress is labeled `provider-reported`; browser time and student-entered status do not become completion evidence.

The LRS exposes Statements, Agents, Activities, State, Agent Profile, Activity Profile, and About routes. JSON documents are stored in Postgres with ETags. Binary/multipart attachments are not implemented; see `limitations.md`.

```text
Provider --Basic credential--> Next.js xAPI gateway
                                  | validate / rate limit
                                  v
                            Supabase LRS tables
                                  | verified actor + activity mapping
                                  v
                       learning_progress / evidence
                                  | student RLS
                                  v
                       Connected Learning dashboard
```

The implementation targets xAPI 1.0.3 but is not declared conformant until the official ADL LRS test suite passes.
