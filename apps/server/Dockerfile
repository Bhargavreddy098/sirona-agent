# ---------- Stage 1: Build & install dependencies ----------
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install all dependencies cleanly
RUN npm ci --silent

# Copy full backend source code
COPY . .

# ---------- Stage 2: Production image ----------
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files for clean prod install
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --silent --only=production

# Copy source code from build stage
COPY --from=build /app ./

# Install PM2 globally for production cluster mode
RUN npm install -g pm2 --silent

# Expose backend port
EXPOSE 8000

# Start backend using PM2 cluster mode
CMD ["pm2-runtime", "start", "server.js", "-i", "max"]
