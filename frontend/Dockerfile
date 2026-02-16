FROM node:18-alpine

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli@latest

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose essential ports only
EXPOSE 8081 19000

# Start Expo with LAN access
CMD ["npx", "expo", "start", "--host", "0.0.0.0", "--lan"]