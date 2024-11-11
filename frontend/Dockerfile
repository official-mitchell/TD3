# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Add Python and build dependencies
RUN apk add --no-cache python3 make g++ gcc

COPY package.json .
COPY nx.json .
COPY tsconfig.base.json .
COPY tsconfig.json .

# Copy the project files
COPY frontend ./frontend
COPY packages ./packages

# Install dependencies
RUN npm install

# Build the app
RUN npx nx build frontend

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist/frontend /usr/share/nginx/html