FROM node:25-alpine

WORKDIR /app

# Install Bun
RUN npm install -g bun

# Install system dependencies
RUN apk add --no-cache git netcat-openbsd

# Copy package files
COPY package.json ./

# Copy the rest
COPY . .

RUN bun install

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Start app
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "start"]