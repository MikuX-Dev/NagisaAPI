FROM node:26-alpine

WORKDIR /app

# Install Bun
RUN npm install -g bun

# Install system dependencies
RUN apk add --no-cache git netcat-openbsd python3 py3-pip

# Copy package files
COPY package.json ./

# Copy the rest
COPY . .

RUN bun install

# Prepare python
RUN python3 -m venv venv
RUN venv/bin/pip install -r requirements.txt

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Start app
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bun", "start"]