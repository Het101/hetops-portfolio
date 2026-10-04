# HetOps Portfolio

Static site (`index.html`, `styles.css`, `app.js`, `assets/`) served by nginx. No build step, no environment variables, no tokens.

## Run locally

```bash
docker-compose up --build
```

Or without Docker: `python -m http.server 3018` in this folder.

## Coolify deployment

1. Build Pack: `Dockerfile`. Port: `8080:80`.
2. If `GITHUB_TOKEN_HET101` / `GITHUB_TOKEN_HETU29` are still set in Coolify, delete them.

## Analytics (Umami, self-hosted)

Umami is cookieless, so no consent banner is needed, and the data stays on your server.

1. In Coolify: **New Resource > Service > Umami**. Give it the domain `analytics.hetops.dev` and deploy.
2. Open it, sign in with the default `admin` / `umami`, and **change the password immediately**.
3. **Settings > Websites > Add website**: name `hetops.dev`, domain `hetops.dev`. Copy the Website ID.
4. In `app.js`, set:
   ```js
   const UMAMI_SRC = 'https://analytics.hetops.dev/script.js';
   const UMAMI_WEBSITE_ID = '<the id you copied>';
   ```
5. Redeploy. Visits from localhost are ignored (`data-domains`).

What you will see in Umami:

| Built in | Custom events from this site |
|---|---|
| Views, visitors, bounce rate, time on page | `email-click`, `email-copy` (with where it was clicked) |
| Referrers (LinkedIn, Google, GitHub...) | `resume-download` |
| Countries, devices, browsers | `project-link` (which project and which link) |
| UTM campaigns | `writing-click`, `outbound` (LinkedIn, GitHub, Medium) |
| | `section-view`: how far down the page people read |
| | `theme-toggle` |

Tip: share links with UTM tags so you can tell sources apart, for example
`https://hetops.dev/?utm_source=linkedin&utm_campaign=profile`.

## GitHub stats

Loaded in the visitor's browser from public, unauthenticated sources: `github-contributions-api.jogruber.de` for the heatmap, and the public GitHub and npm APIs for the numbers. Never put a token in this site; everything shipped to the browser is readable by every visitor.
