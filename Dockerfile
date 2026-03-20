# TD3 Backend — Docker build for Render. Uses repo root as context.
# Build stage — Node 20 required by smob, workbox-build, glob, jackspeak, lru-cache
FROM node:20-alpine AS build

WORKDIR /app

# Install Python and build tools BEFORE npm install
RUN apk add --no-cache python3 make g++ gcc

# Copy package files first (for better caching)
COPY package*.json ./
COPY nx.json ./

# Install dependencies
RUN npm install

# Then copy source files
COPY . .

# Build
RUN npx nx build backend

# Runtime stage
FROM node:20-alpine

WORKDIR /app
RUN mkdir -p /app/assets && chown -R node:node /app
USER node

COPY --from=build /app/dist/backend ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3333
CMD ["node", "main.js"]
