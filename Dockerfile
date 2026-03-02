FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY tsconfig.base.json eslint.config.js ./
COPY packages ./packages
COPY apps ./apps
COPY cases ./cases
COPY scripts ./scripts

RUN npm ci

FROM base AS dev
CMD ["node", "-v"]

FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY cases ./cases
COPY scripts ./scripts

RUN npm ci --omit=dev

FROM node:20-alpine AS prod
WORKDIR /app

COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/package-lock.json ./package-lock.json
COPY --from=prod-deps /app/packages ./packages
COPY --from=prod-deps /app/apps ./apps
COPY --from=prod-deps /app/cases ./cases
COPY --from=prod-deps /app/scripts ./scripts
COPY --from=prod-deps /app/node_modules ./node_modules

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "process.exit(0)"

CMD ["node", "-v"]
