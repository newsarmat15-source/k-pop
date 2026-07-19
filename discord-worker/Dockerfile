FROM node:22-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# App source.
COPY index.js ./

ENV NODE_ENV=production

# Outbound-only WebSocket worker — no ports exposed.
CMD ["node", "index.js"]
