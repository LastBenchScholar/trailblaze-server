# Use official Node LTS image
FROM node:22.15.0-slim

# Create app directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Start app
CMD ["npm", "run", "prod"]