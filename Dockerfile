FROM nginx:alpine

LABEL maintainer="Het Patel <hetpatidar09@gmail.com>"
LABEL description="HetOps Portfolio"

ARG GITHUB_TOKEN_HET101
ARG GITHUB_TOKEN_HETU29

COPY . /usr/share/nginx/html

RUN sed -i "s|TOKEN_HET101_PLACEHOLDER|${GITHUB_TOKEN_HET101:-}|g" /usr/share/nginx/html/index.html && \
    sed -i "s|TOKEN_HETU29_PLACEHOLDER|${GITHUB_TOKEN_HETU29:-}|g" /usr/share/nginx/html/index.html
