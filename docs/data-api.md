# IMORA Data Export API

`GET /api/v1/data` exports operational data belonging **only to the user whose
Supabase access token is supplied**. It is designed for a trusted integration
or a user's own local migration.

## Authentication

Send the user's current Supabase access token; never send a service-role key to
the browser or to an untrusted party.

```bash
curl https://imora.indexim.id/api/v1/data \
  -H "Authorization: Bearer USER_SUPABASE_ACCESS_TOKEN"
```

The response contains `profile`, `scenarios`, `monitoring_areas`,
`status_history`, `forecast_history`, and `notifications`. Each resource is
filtered to the token owner's `owner_id` (or profile id).

To export one resource only:

```bash
curl "https://imora.indexim.id/api/v1/data?resource=scenarios" \
  -H "Authorization: Bearer USER_SUPABASE_ACCESS_TOKEN"
```

Allowed values are: `profile`, `scenarios`, `monitoring_areas`,
`status_history`, `forecast_history`, and `notifications`.

## Getting a token safely

For an integration running inside the IMORA web app, use the existing logged-in
session via `supabase.auth.getSession()` and send `session.access_token` in the
Authorization header. Do not hard-code, commit, or share this token. It expires
and should be refreshed through the normal Supabase login flow.

This endpoint intentionally cannot export every user's data. A company-wide
server-to-server export should instead be implemented on an Indexim-controlled
backend with an audited service-role secret, explicit administrator access, and
logging.
