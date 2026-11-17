# 계정 서버 운영

로그인·자동 로그인·계정별 저장을 담당하는 서버입니다. 게임(GitHub Pages)은 정적 사이트이고, 이 서버만 라즈베리파이에서 돌립니다.

## 구성

- Node 24(TypeScript 직접 실행) + 내장 SQLite, 외부 패키지 없음 (`server/src`)
- 데이터: Docker 볼륨 `lab-wars-data`의 `/data/lab-wars.db`
- 컨테이너는 `127.0.0.1:8787`에만 열고, 인터넷 공개는 프록시(Tailscale Funnel)가 맡습니다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 |
| POST | `/api/auth/register` | `{username, password}` → `{access, refresh, user}`. `user`는 `{id, username, nickname, admin?}` (관리자면 `admin: true`) |
| POST | `/api/auth/login` | 같은 응답 |
| POST | `/api/auth/refresh` | `{refresh}` → 새 토큰 (갱신 토큰은 1회용으로 회전) |
| POST | `/api/auth/logout` | `{refresh}` 폐기 |
| GET | `/api/save` | `{data, version}` (Bearer 토큰) |
| PUT | `/api/save` | `{data, version}` → `{version}`, 버전이 어긋나면 409 + 서버 데이터 |
| GET | `/api/leaderboard` | `{top, me, total}` 순위표 (공개, Bearer 토큰이 있으면 `me`에 내 순위, 내 줄에는 `mine: true`). 이름은 닉네임(없으면 아이디). 30초 캐시, 저장·닉네임 변경 시 갱신. 저장 데이터에서 무한 기록·별을 검증해 계산 |
| GET | `/api/me` | `{user}` 내 정보 (Bearer 토큰) |
| PUT | `/api/me/nickname` | `{nickname}` → `{user}`. 2~12자 한글·영문·숫자·밑줄·띄어쓰기, 앞뒤 공백은 잘라 냄. 겹쳐도 됨 (Bearer 토큰) |
| POST | `/api/feedback` | `{category: '문의'\|'건의'\|'버그', text(1~1000자), name?, version?}` → `{ok, id}`. 로그인했으면 계정으로, 아니면 게스트(`name`, 없으면 '게스트')로 저장. 계정(게스트는 IP)당 10분 5회 |
| GET | `/api/admin/feedback` | `{items, open}` 최신순 300건 (관리자만, 아니면 403) |
| PATCH | `/api/admin/feedback` | `{id, done}` 처리됨 표시 / 다시 열기 (관리자만) |
| GET | `/api/admin/players` | `{players}` 선물 보낼 플레이어 목록: 아이디·닉네임·마지막 저장·연구비·뽑기권·클리어·무한 기록 (관리자만) |
| POST | `/api/admin/gifts` | `{userIds, money?, tickets?, message?}` → `{ok, sent}`. 연구비 0~10,000,000, 뽑기권 0~1000, 하나 이상. 없는 계정은 건너뜀 (관리자만) |
| GET | `/api/admin/gifts` | `{items}` 보낸 선물 기록 최신 100건, 받은 시각 포함 (관리자만) |
| GET | `/api/gifts` | `{items}` 내 선물함: 아직 받지 않은 선물 (Bearer 토큰) |
| POST | `/api/gifts/claim` | `{ids?}` (없으면 전부) → `{items, money, tickets}`. 받음 처리는 한 번만 되고, 게임이 합계를 저장에 더함 (Bearer 토큰) |

## 닉네임 · 관리자 · 의견함

- 닉네임은 화면·순위표에 보이는 이름이고 로그인 아이디와 따로 바꿀 수 있습니다. 예전 DB는 서버가 켜질 때 `users.nickname` 칸을 자동으로 추가합니다(데이터 유지).
- 관리자는 환경 변수 `ADMIN_USERS`(쉼표로 여러 개, 대소문자 무시, 기본 `apg0001`)로 정합니다. `compose.yaml`에 들어 있습니다.
- 관리자 계정으로 로그인하면 게임 타이틀에 **의견함** 버튼이 생겨 받은 의견을 최신순으로 보고 처리됨/다시 열기를 표시할 수 있습니다.
- 의견은 `feedback` 표에 분류·본문·보낸 사람·게임 버전·시각·처리 여부와 함께 저장됩니다. 직접 꺼내 보려면:

```bash
docker compose exec api node -e "const {DatabaseSync}=require('node:sqlite');console.table(new DatabaseSync('/data/lab-wars.db').prepare('SELECT id,category,author,done,text FROM feedback ORDER BY id DESC LIMIT 20').all())"
```

## 선물

- 관리자는 타이틀의 **선물 보내기**에서 플레이어를 검색·여러 명 골라 연구비와 장비 뽑기권을 보냅니다. **보낸 기록**에서 받았는지 볼 수 있습니다.
- 받는 사람은 타이틀(지도에는 선물이 있을 때만)의 **선물함**에서 받습니다. 거절은 없습니다.
- 저장 데이터를 DB에서 직접 고치지 않습니다. 기기 저장과 충돌하면 덮어써질 수 있어서, 서버는 `gifts` 표에 쌓아 두고 받을 때 한 번만 받음 처리하며 게임이 저장에 더해 동기화합니다.
- 서버 쉘에서 바로 넣기 (예: apg0001에게 뽑기권 10장):

```bash
docker compose exec api node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/lab-wars.db');d.prepare(\"INSERT INTO gifts (user_id,money,tickets,message,sender,created_at) SELECT id,0,10,'개발자의 특권','운영자',? FROM users WHERE username='apg0001'\").run(Date.now())"
```

## 보안

- 비밀번호: scrypt 해시. 접근 토큰: HMAC 서명, 15분. 갱신 토큰: 60일, DB에는 SHA-256만 저장.
- CORS: `MW_ORIGINS`에 있는 출처만 허용합니다. 인증 요청은 IP당 1분 10회, 의견 보내기는 계정(게스트는 IP)당 10분 5회로 제한합니다.
- 관리자 아이디는 미리 가입해 두세요. 아직 아무도 쓰지 않은 관리자 아이디는 누구든 먼저 가입하면 관리자가 됩니다.
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
gh variable set MW_API_URL -R apg0001/lab-wars --body "https://<주소>:10000"
gh workflow run "Deploy Pages" -R apg0001/lab-wars --ref main
```

## 백업

```bash
docker compose exec api sh -c 'cp /data/lab-wars.db /data/backup.db'
docker compose cp api:/data/backup.db ./lab-wars-$(date +%F).db
```
