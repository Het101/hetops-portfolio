# Contributing

This is a personal site, so most changes come from me. Fixes for typos, broken links or rendering bugs are welcome.

Once per clone, turn on the hooks (secret scan, signing check, `node --check app.js`, Conventional Commit messages, signed pushes):

```sh
git config core.hooksPath .githooks
```

- Commit subjects are [Conventional Commits](https://www.conventionalcommits.org) under 72 characters, e.g. `fix(nav): keep the bar steady while scrolling`.
- Commits must be signed; `main` rejects unsigned ones.
- There is no build step. Serve the folder with any static server, or `docker build -t portfolio . && docker run --rm -p 8080:80 portfolio` and open http://localhost:8080.
- A new file the page links to also needs adding to the `COPY` line in the `Dockerfile`; CI fails if it is missing.
- Check the change at desktop and phone widths, and with reduced motion turned on.

Security problems: see [SECURITY.md](SECURITY.md), never a public issue.
