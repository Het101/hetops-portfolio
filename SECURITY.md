# Security policy

hetops.dev is a static site: one HTML page, a stylesheet, a script and some images, served by nginx from a container. Please read what is and is not here before reporting.

## What is here

- **No accounts, no logins, no forms that store anything.** The contact section is a `mailto:` link and a copy-to-clipboard button; the only text box is the quick-navigation search, which filters locally. Nothing a visitor types is sent anywhere.
- **No server-side code.** The container is stock `nginx:alpine` serving the files in this repo.
- **Third-party scripts**, version-pinned by URL: GSAP from cdnjs, Lenis and Phosphor icons from unpkg, fonts from Google Fonts.
- **Analytics** is a self-hosted, cookieless [Umami](https://umami.is) instance at `analytics.hetops.dev`. It sets no cookies and stores no personal data. The website ID in `app.js` is public by design: every visitor's browser sends it.

## What counts as a vulnerability

- Script injection or anything that lets a third party run code in a visitor's browser on hetops.dev.
- A secret committed to this repository.
- A misconfiguration in the container or the CI workflows that would let someone change what the site serves.

A bug in one of the tools the site links to belongs to that tool's repo: [hetops-dns](https://github.com/Het101/hetops-dns/security/advisories/new), [threadvault](https://github.com/Het101/threadvault/security/advisories/new), [retirement-radar](https://github.com/Het101/retirement-radar/security/advisories/new).

## Reporting

**Do not open a public issue for a security problem.**

Use [GitHub's private vulnerability reporting](https://github.com/Het101/hetops-portfolio/security/advisories/new), or email patel.x.het@gmail.com. Include what the problem is, how to reproduce it, and what an attacker gets out of it.

Expect an acknowledgement within 3 working days. You will be credited in the fix unless you would rather not be.

## How the repo is kept honest

- CI checks that every local link resolves, that `app.js` parses, and that the Docker image builds and serves every linked file.
- CodeQL reads `app.js`; OpenSSF Scorecard reads the repository settings; zizmor reads the workflows.
- Every action is pinned to a commit SHA, and Dependabot waits 7 days before proposing a new one.
- Commits to `main` must be signed, and CI scans the tree for committed keys and tokens.
