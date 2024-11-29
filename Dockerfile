# Use Node.js LTS (Long Term Support) as the base image
FROM node:20-slim

# Create app directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
# This is done separately to leverage Docker's cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY server.js .

# Create volume mount points
VOLUME ["/usr/src/app/whirling", "/usr/src/app/aframe"]

# Start the application
CMD [ "npm", "start" ]

