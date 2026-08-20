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

# Expose port (Cloud Run uses PORT environment variable, defaults to 8080)
EXPOSE 8080

# Start the express server
CMD ["npm", "start"]
