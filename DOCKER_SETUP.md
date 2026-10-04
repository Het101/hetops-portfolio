# HetOps Portfolio - Docker Setup

Static site served by nginx. No environment variables or tokens are needed.

## Run locally

```bash
docker-compose up --build
```

## Coolify deployment

1. Create a deployment with **Build Pack** set to `Dockerfile`.
2. Set **Port** to `8080:80`.
3. Deploy.

If `GITHUB_TOKEN_HET101` or `GITHUB_TOKEN_HETU29` are still set in Coolify, delete them. They are no longer used.

## GitHub stats

The GitHub section loads public data in the visitor's browser, without a token:

- contributions: `github-contributions-api.jogruber.de` (public profile data)
- repositories, stars, pull requests, commits: the public GitHub REST API

Never put a token in this site. Anything in the HTML, including values substituted at build time, can be read by every visitor.
