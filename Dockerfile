FROM node:8.9.4
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .


