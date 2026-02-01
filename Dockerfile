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

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Start app
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bun", "start"]