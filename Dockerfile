# Multi-stage build: Compile React frontend, then run single FastAPI server
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PORT=8008

# Install dependencies
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r ./server/requirements.txt

# Copy backend server code and compiled frontend
COPY server/ ./server/
COPY --from=frontend-builder /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 8008

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8008}"]
