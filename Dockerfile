# Dockerfile for ProcureBot Email Watcher Service

# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build not required for tsx execution, but good practice if we were compiling.
# For simplicity, we run directly with tsx.

# Default Environment Variables (Can be overridden)
ENV NODE_ENV=production

# Command to run the watcher
CMD ["npx", "tsx", "services/email-watcher.ts"]
