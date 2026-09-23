# Build args let the compose file inject the production API/socket URLs
# at build time - Vite bakes VITE_* vars into the bundle at build, not
# runtime, so these must be ARGs available during `npm run build`, not
# just environment variables set on the running container.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SOCKET_URL=/

FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Custom config for SPA fallback routing and the /api, /socket.io
# reverse proxies - see nginx.conf for why the stock default doesn't
# work for a client-side-routed React app talking to a separate API
# container.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
