FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/ai-runtime/package.json apps/ai-runtime/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @lawdesk/ai-runtime build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app .
EXPOSE 4100
CMD ["pnpm", "--filter", "@lawdesk/ai-runtime", "start"]
