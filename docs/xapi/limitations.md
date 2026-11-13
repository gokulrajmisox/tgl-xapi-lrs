# Current xAPI LRS limitations

This is a functioning xAPI 1.0.3-targeted implementation, not a conformance claim.

- Multipart binary attachments are not stored or returned. JSON attachments must use `fileUrl`; `attachments=true` and `multipart/mixed` are rejected with 501.
- State and profile document APIs currently support JSON only, not arbitrary binary content types.
- `format=canonical` is recognized but explicitly rejected with 501; language negotiation and full canonical expansion are not implemented.
- Alternate form-encoded POST request syntax is not implemented.
- StatementRef query-filter inheritance is not implemented. Related agent/activity matching covers indexed actor/object/context identities, but not every recursive StatementRef rule.
- Automatic actor linking requires a provider configured for `verified-link-only` that can emit TGL's one-time context extension. Other providers require administrator review. There is no provider-specific OAuth/pull adapter and no external provider account is preconfigured.
- Progress requires both a verified actor mapping and an administrator-created activity-to-path mapping. It is reported as provider evidence, not TGL assessment or mentor verification.
- Native manual progress emits `experienced`/`progressed` xAPI statements with an explicit self-reported extension; it does not emit a completed verb or `result.completion=true`.
- The admin page requires a trusted Supabase `app_metadata.role=admin` claim. No self-service bootstrap route exists.
- The official ADL LRS Test Suite has not been run. Do not claim full xAPI conformance.
