# Base Node.js image
FROM node:24-alpine AS base

# Set for base and all layer that inherit from it
ENV NODE_ENV=production

RUN apk add --no-cache \
	bash \
	openssl \
	;

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
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]