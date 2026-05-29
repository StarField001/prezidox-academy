FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm ci --only=production

# Copy all project files
COPY . .

# Generate Prisma client
RUN cd backend && npx prisma generate

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "backend/src/app.js"]