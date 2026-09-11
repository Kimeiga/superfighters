FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
