FROM nginx:alpine

ARG GITHUB_TOKEN_HET101
ARG GITHUB_TOKEN_HETU29

COPY index.html /usr/share/nginx/html/index.html
COPY icon.svg /usr/share/nginx/html/icon.svg
COPY testimonials.json /usr/share/nginx/html/testimonials.json
COPY Het_Patel_Resume.pdf /usr/share/nginx/html/Het_Patel_Resume.pdf

RUN sed -i "s|TOKEN_HET101_PLACEHOLDER|${GITHUB_TOKEN_HET101:-}|g" /usr/share/nginx/html/index.html && \
    sed -i "s|TOKEN_HETU29_PLACEHOLDER|${GITHUB_TOKEN_HETU29:-}|g" /usr/share/nginx/html/index.html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
