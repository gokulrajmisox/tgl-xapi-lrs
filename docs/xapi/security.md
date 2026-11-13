# xAPI LRS security

- Provider secrets are 256-bit random values, shown once. TGL stores a per-credential salt and scrypt hash; the public key selects the credential row. Rotation revokes the previous credential. Authorization headers and secrets are never logged or returned by list APIs.
- Basic credentials are accepted only over HTTPS, with localhost HTTP reserved for development.
- Registration enabled state, scopes, and exact allowed CORS origins are checked server-side. Credential scopes are intersected with registration scopes. Rate limits use keyed hashes for client IP and credential keys; raw IPs are not persisted.
- Service-role access is confined to server route handlers. Public Supabase roles receive no LRS raw-table privileges; RLS is enabled on every LRS table. Students can read only their own mapped provider connections, progress, mappings, and evidence.
- Provider actors remain unmatched until an administrator verifies the relationship. Mapping operations, registration changes, and credential lifecycle actions are audited.
- The initial administrator claim is `app_metadata.role=admin`, set only through a trusted operator process. The web client cannot promote itself.
- Statements remain immutable; voids preserve raw evidence and exclude the voided target from current progress. LRS values never issue a certificate by themselves.
- Payloads are bounded; statement batches are limited to 100 and bodies to 1 MiB. JSON document bodies are limited to 2 MiB.
