<div align="center">

<img src="https://assets.sevalla.com/brand/logo/svg/sevalla-mark-color.svg" alt="" width="64" height="64" />

# Sevalla GitHub Action

**Deploy and promote Sevalla apps and static sites from GitHub Actions.**

[![Release](https://img.shields.io/github/v/release/sevalla/sevalla-deploy?color=57534e)](https://github.com/sevalla/sevalla-deploy/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-57534e)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-24-57534e?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Sevalla API](https://img.shields.io/badge/Sevalla_API-v3-57534e)](https://api-docs.sevalla.com)

[Docs](https://docs.sevalla.com/developer-tools/github-actions) · [Sevalla](https://sevalla.com)

</div>

A GitHub Action that deploys applications and static sites on [Sevalla](https://sevalla.com), and promotes applications from one pipeline stage to the next. It deploys with an API key or an application's deploy hook, and can wait until the deployment finishes.

## Quick start

```yaml
- uses: sevalla/sevalla-deploy@v2.0.0
  with:
    action: deploy-app
    sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
    app-id: <app-id>
    wait-for-finish: true
```

Create an API key under **Tools** > **API keys** in the [Sevalla dashboard](https://app.sevalla.com/api-keys), and store it as the `SEVALLA_TOKEN` secret.

## Inputs

| Name | Required | Description |
| --- | --- | --- |
| `action` | Yes | `deploy-app`, `promote-app`, or `deploy-static-site` |
| `sevalla-token` | Yes* | Sevalla API token |
| `app-id` | — | Application ID (for `deploy-app`) |
| `static-site-id` | — | Static site ID (for `deploy-static-site`) |
| `pipeline-id` | — | Pipeline ID (for `promote-app`) |
| `source-app-id` | — | Source application ID (for `promote-app`) |
| `target-app-ids` | — | Comma-separated target app IDs (for `promote-app`) |
| `branch` | — | Git branch to deploy |
| `docker-image` | — | Docker image to deploy |
| `is-restart` | — | Restart without building (`true`/`false`, default `false`) |
| `wait-for-finish` | — | Poll until deployment completes (`true`/`false`, default `false`) |
| `deploy-hook-url` | — | Deploy hook URL (alternative to `sevalla-token` + `app-id`) |

*Not required when using `deploy-hook-url` without `wait-for-finish`. With a deploy hook, `app-id` is read from the hook URL.

## Outputs

| Name | Description |
| --- | --- |
| `deployment-id` | Deployment ID (for `deploy-app` and `deploy-static-site`) |
| `deployment-ids` | JSON array of deployment IDs (for `promote-app`) |

## How it works

```text
GitHub Actions Workflow
       │
       │  action: deploy-app | promote-app | deploy-static-site
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  sevalla-deploy                                                  │
│                                                                  │
│  deploy-app          POST /v3/applications/{id}/deployments      │
│  promote-app         POST /v3/pipelines/{id}/promote             │
│  deploy-static-site  POST /v3/static-sites/{id}/deployments      │
│                                                                  │
│  wait-for-finish     GET  /v3/.../deployments/{deployment_id}    │
└──────────────────────────────────────────────────────────────────┘
```

When `wait-for-finish` is enabled, the action polls every 5 seconds until the deployment reaches a terminal status (`success`, `failed`, `cancelled`, or `skipped`). The action fails if the deployment doesn't succeed.

## Examples

### Deploy an app

```yaml
jobs:
  deploy-app:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla/sevalla-deploy@v2.0.0
        with:
          action: deploy-app
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          app-id: <app-id>
          branch: main
          wait-for-finish: true
```

### Deploy with a deploy hook

```yaml
jobs:
  deploy-app:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla/sevalla-deploy@v2.0.0
        with:
          action: deploy-app
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          deploy-hook-url: ${{ secrets.SEVALLA_DEPLOY_HOOK_URL }}
          wait-for-finish: true
```

### Promote an app

```yaml
jobs:
  promote-app:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla/sevalla-deploy@v2.0.0
        with:
          action: promote-app
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          pipeline-id: <pipeline-id>
          source-app-id: <staging-app-id>
          target-app-ids: <production-app-id>
          wait-for-finish: true
```

### Deploy a static site

```yaml
jobs:
  deploy-static-site:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla/sevalla-deploy@v2.0.0
        with:
          action: deploy-static-site
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          static-site-id: <static-site-id>
          branch: main
          wait-for-finish: true
```

## License

MIT. See [LICENSE](LICENSE).
