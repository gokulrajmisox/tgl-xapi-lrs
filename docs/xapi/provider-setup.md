# Provider setup

## Prerequisites

- An operator must have a trusted Supabase `app_metadata.role` value of `admin`. User-editable metadata is not accepted. No public role-promotion or bootstrap endpoint exists.
- Use the TGL admin page at `/admin/lrs` to create a provider registration, select scopes, optionally restrict browser origins, and enable it.
- Set the authorized source identifier to the provider's documented, stable source IRI. The page displays a Basic credential once. Store it in the provider's protected secret store immediately. TGL stores only a salted scrypt hash and public credential key. Rotate or revoke credentials from the same page.

## Endpoint and version

```text
https://<your-TGL-host>/api/xapi/
X-Experience-API-Version: 1.0.3
Authorization: Basic base64(<credential-key>:<credential-secret>)
Content-Type: application/json
```

Use TLS. Do not use a student password or Supabase service-role key as an xAPI credential. CORS origins are exact origins configured for a registration; server-to-server requests do not require CORS.

## Actor association

The provider must send a stable xAPI Agent or identified Group. New actors are stored as unmatched; TGL never infers a student from a display name or email similarity.

For a registration configured as `verified-link-only`, a signed-in student can generate a five-minute, one-use challenge from **My Learning → Provider evidence**. Configure the provider to include the returned extension IRI and code in a statement's `context.extensions`. The first authenticated statement containing the valid code links that statement actor to the student. Providers that cannot emit custom context extensions use the administrator-reviewed mapping flow instead. Admin mappings require a verification-method note.

## Sample statement

See `statement-examples.md`. A successful POST returns the statement ID array. Statements with a configured, verified actor and activity mapping are summarized in the student's dashboard as provider-reported evidence.

## Unsupported capabilities

Binary multipart attachments, full canonical format expansion, alternate form-encoded request syntax, and the complete ADL conformance suite are not implemented. Check `limitations.md` before configuring a provider.
