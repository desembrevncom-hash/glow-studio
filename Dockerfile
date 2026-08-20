FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy rest of the files
COPY . .

# Build the frontend
RUN npm run build

# Expose port (Cloud Run sets PORT env variable, fallback is 3000)
EXPOSE 3000

# Start the express server
CMD ["npm", "start"]
