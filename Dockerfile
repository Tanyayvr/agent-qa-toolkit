FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json eslint.config.js ./
COPY packages ./packages
COPY apps ./apps
COPY cases ./cases
COPY scripts ./scripts

RUN npm ci

FROM base AS dev
CMD ["node", "-v"]

FROM node:20-alpine AS prod
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY cases ./cases
COPY scripts ./scripts

RUN npm ci --omit=dev

CMD ["node", "-v"]
