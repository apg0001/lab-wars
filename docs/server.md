# 계정 서버 운영

로그인·자동 로그인·계정별 저장을 담당하는 서버입니다. 게임(GitHub Pages)은 정적 사이트이고, 이 서버만 라즈베리파이에서 돌립니다.

## 구성

- Node 24(TypeScript 직접 실행) + 내장 SQLite, 외부 패키지 없음 (`server/src`)
- 데이터: Docker 볼륨 `manga-wars-data`의 `/data/manga-wars.db`
- 컨테이너는 `127.0.0.1:8787`에만 열고, 인터넷 공개는 프록시(Tailscale Funnel)가 맡습니다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 |
| POST | `/api/auth/register` | `{username, password}` → `{access, refresh, user}` |
| POST | `/api/auth/login` | 같은 응답 |
| POST | `/api/auth/refresh` | `{refresh}` → 새 토큰 (갱신 토큰은 1회용으로 회전) |
| POST | `/api/auth/logout` | `{refresh}` 폐기 |
| GET | `/api/save` | `{data, version}` (Bearer 토큰) |
| PUT | `/api/save` | `{data, version}` → `{version}`, 버전이 어긋나면 409 + 서버 데이터 |

## 보안

- 비밀번호: scrypt 해시. 접근 토큰: HMAC 서명, 15분. 갱신 토큰: 60일, DB에는 SHA-256만 저장.
- CORS: `MW_ORIGINS`에 있는 출처만 허용합니다. 인증 요청은 IP당 1분 10회로 제한합니다.
- 저장 데이터는 64KB로 제한합니다. 게임은 불러올 때 항상 값을 다시 검증합니다.

## 실행

```bash
cd server
cp .env.example .env
sed -i "s|^MW_SECRET=.*|MW_SECRET=$(openssl rand -base64 48)|" .env
docker compose up -d --build
curl http://127.0.0.1:8787/api/health
```

## 인터넷 공개 (Tailscale Funnel)

```bash
sudo tailscale funnel --bg --https=10000 http://127.0.0.1:8787
tailscale funnel status
```

- 공개 주소: `https://<기기이름>.<tailnet>.ts.net:10000`
- Funnel은 tailnet 관리 콘솔의 접근 정책에서 `funnel` 속성을 허용해야 합니다.
- 공개 후 GitHub 저장소 변수 `MW_API_URL`에 주소를 넣고 Pages를 다시 배포하면 게임에 로그인 버튼이 나타납니다.

```bash
gh variable set MW_API_URL -R apg0001/manga-wars --body "https://<주소>:10000"
gh workflow run "Deploy Pages" -R apg0001/manga-wars --ref main
```

## 백업

```bash
docker compose exec api sh -c 'cp /data/manga-wars.db /data/backup.db'
docker compose cp api:/data/backup.db ./manga-wars-$(date +%F).db
```
