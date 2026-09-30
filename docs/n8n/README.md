# n8n workflow: minor-publish

Publishes the S-Base minor snapshot to the public site repo (`redluee/future-proof-met-ai`, deployed on Vercel as minor.stevenheijn.nl). See "Publishing" in `backend/src/modules/minor/AGENTS.md`.

The file `minor-publish.workflow.json` contains no secrets. Import it in n8n (Workflows, Import from file) and link the credentials:

| Credential (name in JSON) | Type | Value |
|---------------------------|------|-------|
| `SBase Webhook` | Header Auth | name `X-Webhook-Secret`, value = `N8N_WEBHOOK_SECRET` from S-Base |
| `SBase Snapshot` | Header Auth | name `Authorization`, value `Bearer <MINOR_SNAPSHOT_TOKEN>` |
| `GitHub Minor Site` | GitHub API | fine-grained token with only `contents: write` on `redluee/future-proof-met-ai` |

Flow: Webhook (or the nightly Schedule Trigger) -> fetch snapshot from `http://172.17.0.1:3001/api/minor/public/snapshot` -> validate (and refuse anything containing `fromWhom` or `peerName`) -> stop when `contentHash` equals the one in the repo -> copy missing evidence files -> one commit on `main` via the Git Data API -> Vercel deploys.

Notes:
- From inside the n8n container `localhost` is the container itself. `172.17.0.1` is the Docker host (S-Base backend). `host.docker.internal` does not resolve on this server.
- Activate the workflow so the production webhook URL `https://n8n.stevenheijn.nl/webhook/minor-publish` exists. S-Base calls `http://127.0.0.1:5678/webhook/minor-publish` (`N8N_WEBHOOK_URL`). The `/webhook-test/` URL is not used.
- Set an Error Workflow in the workflow settings to get notified of failed runs.
- Not yet run against a live n8n: do a manual "Execute workflow" first, with the nightly trigger as the entry point.
