FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN npm run migrate && npm run seed && npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
