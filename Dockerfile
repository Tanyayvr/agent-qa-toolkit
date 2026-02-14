FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json eslint.config.js ./
COPY packages ./packages
COPY apps ./apps
COPY cases ./cases
COPY scripts ./scripts

RUN npm install

CMD ["node", "-v"]
