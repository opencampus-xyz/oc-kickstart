FROM node:20.18.1-alpine 
WORKDIR /app

ENV NODE_ENV=production

COPY public ./public
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static

EXPOSE 8080
ENV PORT=8080

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]