FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY homeward/src ./homeward/src
COPY homeward/data ./homeward/data
COPY homeward/web/app.mjs homeward/web/server.mjs ./homeward/web/
COPY homeward/web/dist ./homeward/web/dist
RUN mkdir -p homeward/results/cache && chown -R node:node /app/homeward/results
USER node
EXPOSE 3000
CMD ["node", "homeward/web/server.mjs"]
