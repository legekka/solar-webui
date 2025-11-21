# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Run the middleware server
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Expose port for the middleware
EXPOSE 8080

# Start the middleware server
CMD ["node", "server/index.js"]

