# Образ для собственного сервера (например, российский VPS — когда понадобится хранить данные в РФ).
# Сборка:  docker build -t insida .
# Запуск:  docker run -p 3000:3000 --env-file .env insida
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
# Сборка обращается к базе для статических страниц: передайте DATABASE_URL через --build-arg
ARG DATABASE_URL
ARG AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
