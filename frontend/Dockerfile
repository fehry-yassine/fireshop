FROM node:20-bookworm-slim

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend ./

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
