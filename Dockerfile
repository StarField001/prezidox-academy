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

# Start server — apply any pending DB migrations first, then boot.
# migrate deploy is non-blocking: if it fails (e.g. DB briefly unreachable),
# we log and still start the app so the site stays up.
CMD ["sh", "-c", "cd backend && (npx prisma migrate deploy || echo '[deploy] prisma migrate deploy failed — continuing without applying migrations') && node src/app.js"]