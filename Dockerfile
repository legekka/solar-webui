# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SOLAR_CONTROL_URL=http://localhost:8015
ARG VITE_SOLAR_CONTROL_API_KEY

# Create .env file from build args
RUN echo "VITE_SOLAR_CONTROL_URL=${VITE_SOLAR_CONTROL_URL}" > .env && \
    echo "VITE_SOLAR_CONTROL_API_KEY=${VITE_SOLAR_CONTROL_API_KEY}" >> .env

# Build the application
RUN npm run build

# Stage 2: Serve with a lightweight web server
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Serve the application
CMD ["serve", "-s", "dist", "-l", "5173", "-n"]

