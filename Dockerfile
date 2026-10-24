FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY homeward/src ./homeward/src
COPY homeward/data ./homeward/data
COPY homeward/web/app.mjs homeward/web/server.mjs ./homeward/web/
COPY homeward/web/dist ./homeward/web/dist
COPY homeward/experiments/enterprise-prospecting/contract.mjs homeward/experiments/enterprise-prospecting/companies.json homeward/experiments/enterprise-prospecting/images.json homeward/experiments/enterprise-prospecting/observed-status.json ./homeward/experiments/enterprise-prospecting/
RUN mkdir -p homeward/results/cache homeward/experiments/enterprise-prospecting/results/interactions \
 && chown -R node:node /app/homeward/results /app/homeward/experiments/enterprise-prospecting/results
USER node
EXPOSE 3000
CMD ["node", "homeward/web/server.mjs"]
