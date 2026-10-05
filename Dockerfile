FROM nginx:alpine

COPY index.html styles.css app.js eye3d.js intro.js inside.js chaos.js robots.txt sitemap.xml Het_Patel_Resume.pdf \
     favicon.ico favicon.svg apple-touch-icon.png icon-192.png icon-512.png site.webmanifest /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
