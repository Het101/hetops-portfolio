FROM nginx:alpine

LABEL maintainer="Het Patel <hetpatidar09@gmail.com>"
LABEL description="HetOps Portfolio - Static website with GitHub API integration"

# Build arguments for tokens
ARG GITHUB_TOKEN_HET101
ARG GITHUB_TOKEN_HETU29

# Environment variables (available at runtime)
ENV GITHUB_TOKEN_HET101=${GITHUB_TOKEN_HET101}
ENV GITHUB_TOKEN_HETU29=${GITHUB_TOKEN_HETU29}

COPY . /usr/share/nginx/html

# Replace placeholders with actual tokens at build time
RUN if [ -n "$GITHUB_TOKEN_HET101" ]; then \
        sed -i "s|TOKEN_HET101_PLACEHOLDER|${GITHUB_TOKEN_HET101}|g" /usr/share/nginx/html/index.html; \
    fi && \
    if [ -n "$GITHUB_TOKEN_HETU29" ]; then \
        sed -i "s|TOKEN_HETU29_PLACEHOLDER|${GITHUB_TOKEN_HETU29}|g" /usr/share/nginx/html/index.html; \
    fi

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
