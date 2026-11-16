# Build context: the repository root. Builds the console and serves it with Caddy, which also
# proxies the API and obtains TLS certificates.

FROM node:26-alpine AS console
WORKDIR /console
COPY apps/console/package.json apps/console/package-lock.json ./
RUN npm ci
COPY apps/console ./
# Vite inlines the API address into the bundle at build time.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM caddy:2-alpine
COPY deploy/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=console /console/dist /srv/console
