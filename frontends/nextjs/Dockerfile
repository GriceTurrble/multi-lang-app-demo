FROM node:22-alpine AS builder

WORKDIR /app

# Copy lockfile and manifest first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source and build
COPY . .

# Run in dev mode with watchfiles and a reloading server
FROM builder AS dev-runner

EXPOSE 3000
ENV NODE_ENV=development
ENV PORT=3000
CMD ["npm", "run", "dev"]

# Build for prod.
# Contents of this builder are COPY-ed into the prod-runner below
# to make the image smaller.
FROM builder AS prod-builder

RUN npm run build

FROM node:22-alpine AS prod-runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=prod-builder /app/public ./public
COPY --from=prod-builder /app/.next/standalone ./
COPY --from=prod-builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
