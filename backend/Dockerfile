# Build stage
FROM node:18-alpine as build

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
FROM node:18-alpine

WORKDIR /app
RUN mkdir -p /app/assets && chown -R node:node /app
USER node

COPY --from=build /app/dist/backend ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3333
CMD ["node", "main.js"]

# # Build stage
# FROM node:18-alpine as build

# WORKDIR /app

# # Add Python and build dependencies
# RUN apk add --no-cache python3 make g++ gcc

# COPY package.json .
# COPY nx.json .
# COPY tsconfig.base.json .
# COPY tsconfig.json .

# # Create assets directory
# RUN mkdir -p backend/src/assets

# # Copy the project files
# COPY backend ./backend
# COPY packages ./packages

# # Install dependencies
# RUN npm install

# # Clear Nx cache before building
# RUN npx nx reset

# # Build the app
# RUN npx nx build backend

# # Runtime stage
# FROM node:18-alpine

# WORKDIR /app

# # Create app directory and set permissions
# RUN mkdir -p /app/assets && chown -R node:node /app

# # Switch to non-root user
# USER node

# COPY --from=build --chown=node:node /app/dist/backend ./
# COPY --from=build --chown=node:node /app/node_modules ./node_modules

# EXPOSE 3333

# CMD ["node", "main.js"]



# # Build stage
# FROM node:18-alpine as build

# WORKDIR /app

# # Add Python and build dependencies
# RUN apk add --no-cache python3 make g++ gcc

# COPY package.json .
# COPY nx.json .
# COPY tsconfig.base.json .
# COPY tsconfig.json .

# # Copy the project files
# COPY backend ./backend
# COPY packages ./packages

# # Install dependencies
# RUN npm install

# # Clear Nx cache before building
# RUN npx nx reset

# # Build the app
# RUN npx nx build backend

# # Runtime stage
# FROM node:18-alpine

# WORKDIR /app

# # Create app directory and set permissions
# RUN mkdir -p /app && chown -R node:node /app

# # Switch to non-root user
# USER node

# COPY --from=build --chown=node:node /app/dist/backend ./
# COPY --from=build --chown=node:node /app/node_modules ./node_modules

# EXPOSE 3000

# CMD ["node", "main.js"]