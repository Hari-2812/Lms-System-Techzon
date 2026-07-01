# Build backend server
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npm run build

# Final Execution Stage
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --only=production
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY backend/.env.example ./backend/dist/.env

EXPOSE 5000
CMD ["node", "backend/dist/server.js"]
