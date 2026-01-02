FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Build Stage
FROM base AS build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM base
COPY package*.json ./
# Install production dependencies (including tsx if needed, or we use tsx from devDependencies? No, need to be present)
# We will install all dependencies for simplicity since we use tsx
RUN npm install 
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

# Expose port
EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

# Start Server
CMD ["npx", "tsx", "server/index.ts"]
