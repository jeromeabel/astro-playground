FROM node:lts-alpine as runtime
WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=4321
ENV MODE=production

EXPOSE 4321

CMD npm run start