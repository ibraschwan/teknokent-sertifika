# Base Node.js image (glibc — Alpine/musl builds trigger SIGILL on this VPS's CPU)
FROM node:22-bookworm-slim AS base

# Set for base and all layer that inherit from it
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	openssl \
	ca-certificates \
	fonts-dejavu-core \
	&& rm -rf /var/lib/apt/lists/*

# Install all node_modules, including dev dependencies
FROM base AS deps

WORKDIR /app-certificates

ADD package.json ./
RUN npm install --include=dev

# Setup production node_modules
FROM base AS production-deps

WORKDIR /app-certificates

COPY --from=deps /app-certificates/node_modules /app-certificates/node_modules
ADD package.json ./
#RUN npm prune --omit=dev

# Build the app
FROM base AS build

WORKDIR /app-certificates

COPY --from=deps /app-certificates/node_modules /app-certificates/node_modules

ADD . .
RUN npx prisma generate
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

# ENV PORT="3000"
ENV NODE_ENV="production"

WORKDIR /app-certificates

COPY --from=production-deps /app-certificates/node_modules /app-certificates/node_modules

COPY --from=build /app-certificates/build /app-certificates/build
COPY --from=build /app-certificates/public /app-certificates/public
COPY --from=build /app-certificates/prisma /app-certificates/prisma
COPY --from=build /app-certificates/package.json /app-certificates/package.json
COPY --from=build /app-certificates/prisma.config.ts /app-certificates/prisma.config.ts
COPY --from=build /app-certificates/tsconfig.json /app-certificates/tsconfig.json
COPY --from=build /app-certificates/app/generated /app-certificates/app/generated

RUN npx prisma generate

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
CMD ["/docker-entrypoint.sh"]