FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/data/imperio.sqlite
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src ./src
COPY scripts ./scripts
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 3001
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/server.js"]
