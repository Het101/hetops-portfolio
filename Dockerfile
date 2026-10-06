FROM nginx:alpine

COPY index.html 404.html gate.js styles.css app.js eye3d.js intro.js inside.js chaos.js case.js robots.txt sitemap.xml Het_Patel_Resume.pdf \
     favicon.ico favicon.svg apple-touch-icon.png icon-192.png icon-512.png site.webmanifest /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY work /usr/share/nginx/html/work
COPY .well-known /usr/share/nginx/html/.well-known
# Headers, compression, caching and the custom 404 (see nginx/default.conf).
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1
