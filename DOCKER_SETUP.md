# HetOps Portfolio - Docker Setup

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Edit with your tokens
nano .env

# Build and run
docker-compose up -d
```

## Coolify Deployment

1. **In Coolify Dashboard:**
   - Create new deployment
   - Set **Build Pack** to `Dockerfile`
   - Set **Port** to `8080:80`

2. **Add Environment Variables:**
   | Key | Value |
   |-----|-------|
   | `GITHUB_TOKEN_HET101` | Your Het101 token |
   | `GITHUB_TOKEN_HETU29` | Your Hetu29 token |

3. **Deploy!**

## Local Development

```bash
# Without tokens (uses demo data)
docker-compose up --build

# With tokens
GITHUB_TOKEN_HET101=ghp_xxx GITHUB_TOKEN_HETU29=ghp_xxx docker-compose up --build
```

## GitHub Token Setup

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`
4. Copy the token

**Note:** Tokens are only used at build time and embedded into the static HTML. They are NOT exposed at runtime.
