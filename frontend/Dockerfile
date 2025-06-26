FROM node:20.18.1-alpine AS base

FROM base AS builder
ENV YARN_VERSION=4.2.2
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare yarn@${YARN_VERSION}
RUN yarn && yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]