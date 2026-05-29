FROM node:20-alpine

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
