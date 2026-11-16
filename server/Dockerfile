# 랩워즈 계정 서버: Node가 TypeScript를 직접 실행하고 내장 SQLite를 쓴다 (외부 패키지 없음)
FROM node:24.11.1-alpine
WORKDIR /app
COPY src ./src
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production MW_DB=/data/lab-wars.db PORT=8787 HOST=0.0.0.0
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "src/main.ts"]
