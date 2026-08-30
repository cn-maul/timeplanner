# syntax=docker/dockerfile:1

# ---------- 阶段 1：构建前端 ----------
FROM node:22-alpine AS webbuild
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY frontend/ .
# 产物输出到 /app/web/dist（vite outDir = ../web/dist）
RUN npm run build

# ---------- 阶段 2：编译后端（内嵌前端产物） ----------
FROM golang:1.27-alpine AS gobuild
WORKDIR /src
COPY go.mod ./
COPY main.go store.go slots.go server.go ./
COPY web/ ./web/
COPY --from=webbuild /app/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /timeplanner .

# ---------- 阶段 3：运行镜像 ----------
# 数据文件固定在 /data 目录，运行时挂载宿主机目录即可持久化：
#   docker run -v ./data:/data ghcr.io/<owner>/timeplanner
FROM alpine:3.22
RUN apk add --no-cache tzdata ca-certificates
ENV TZ=Asia/Shanghai
WORKDIR /data
COPY --from=gobuild /timeplanner /usr/local/bin/timeplanner
EXPOSE 7777
ENTRYPOINT ["/usr/local/bin/timeplanner"]
CMD ["-host", "0.0.0.0", "-data", "/data/planner-data.json", "-no-open"]
