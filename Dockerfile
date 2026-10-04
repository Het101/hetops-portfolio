FROM nginx:alpine

COPY index.html styles.css app.js icon.svg robots.txt sitemap.xml Het_Patel_Resume.pdf /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
