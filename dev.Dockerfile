# Use rolling latest Node 20.x (includes >=20.6 with node:module.register)
FROM node:20-alpine

ENV NODE_ENV=development
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Enable Yarn via Corepack
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Copy manifests first (better caching)
COPY package.json yarn.lock ./

# Install deps
RUN yarn install --silent --force --frozen-lockfile

# Copy source
COPY . .

EXPOSE 3000

# Default dev command
CMD ["yarn", "nodemon-dev"]
