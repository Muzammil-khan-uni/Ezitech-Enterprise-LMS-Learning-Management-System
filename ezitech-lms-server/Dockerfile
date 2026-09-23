FROM node:22-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS production
WORKDIR /usr/src/app

RUN addgroup -S ezitech && adduser -S ezitech -G ezitech

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

RUN mkdir -p uploads-tmp logs && chown -R ezitech:ezitech /usr/src/app

USER ezitech

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

CMD ["node", "src/server.js"]
