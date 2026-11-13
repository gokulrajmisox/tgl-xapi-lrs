# xAPI statement examples

Use the provider key and secret returned once by the TGL administrator. The example IDs and actor are illustrative; use a real stable actor identity configured for that provider.

```http
POST /api/xapi/statements HTTP/1.1
Host: tgl.example.org
Authorization: Basic <base64-key-colon-secret>
X-Experience-API-Version: 1.0.3
Content-Type: application/json
```

```json
{
  "id": "c2d4d71f-6712-4d8f-a44b-29d7055e99c6",
  "actor": {
    "objectType": "Agent",
    "account": {
      "homePage": "https://lms.example.org",
      "name": "learner-42"
    }
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/completed",
    "display": { "en-US": "completed" }
  },
  "object": {
    "objectType": "Activity",
    "id": "https://lms.example.org/courses/intro-python"
  },
  "result": { "completion": true, "success": true, "score": { "scaled": 0.91 } },
  "timestamp": "2026-11-12T10:30:00Z"
}
```

A successful POST returns HTTP 200 with the statement ID array. Completion and score are accepted only as authenticated provider evidence and remain provider-reported. An unmatched actor's statement is retained but is not associated with a learner until an administrator verifies the mapping.
