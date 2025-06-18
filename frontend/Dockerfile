FROM node:20.18.1-alpine 

ENV YARN_VERSION=4.2.2
ENV NODE_ENV=production

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare yarn@${YARN_VERSION}
RUN yarn && yarn build

EXPOSE 8080
ENV PORT=8080

CMD ["yarn", "start"]