# Build context: the repository root. Builds the console and serves it with Caddy, which also
# proxies the API and obtains TLS certificates.

FROM node:26.13.1-alpine AS console
# Same layout as the repository: the console compiles the SDK from ../../packages/sdk/src.
WORKDIR /repo/apps/console
COPY apps/console/package.json apps/console/package-lock.json ./
RUN npm install --global npm@12.2.3 && npm ci
COPY apps/console ./
COPY packages/sdk/src /repo/packages/sdk/src
# Vite inlines these into the bundle at build time; all are public values.
ARG VITE_API_URL
ARG VITE_PLATFORM_PUBLISHABLE_KEY
ARG VITE_CONSOLE_OAUTH_PROVIDERS
ARG VITE_SUPPORT_EMAIL
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_PLATFORM_PUBLISHABLE_KEY=${VITE_PLATFORM_PUBLISHABLE_KEY} \
    VITE_CONSOLE_OAUTH_PROVIDERS=${VITE_CONSOLE_OAUTH_PROVIDERS} \
    VITE_SUPPORT_EMAIL=${VITE_SUPPORT_EMAIL}
RUN npm run build

FROM caddy:2.11.9-alpine
COPY deploy/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=console /repo/apps/console/dist /srv/console
