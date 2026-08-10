FROM node:22-alpine

WORKDIR /app

# Install openssl and other deps for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Copy prisma schema so that 'npm install' can run its postinstall prisma generate hook
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build Next.js app
RUN npm run build

# Expose Next.js custom port
EXPOSE 3050

# Push the schema definitions, seed the database, and start the application
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && npm run start"]
