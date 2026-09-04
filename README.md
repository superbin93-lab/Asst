# IT Asset Suite

Phần mềm quản lý **tài sản IT, nhân sự, nghỉ phép và ticket hỗ trợ** cho doanh
nghiệp vừa và nhỏ. Giao diện song ngữ Việt – Anh, phân quyền theo vai trò.

| | |
|---|---|
| Stack | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL 17 |
| Xác thực | Session cookie httpOnly, mật khẩu bcrypt, RBAC theo permission |
| Ngôn ngữ | `next-intl`, tiếng Việt mặc định, đổi được trong giao diện |

---

## Môi trường phát triển

Có ba cách dựng môi trường dev. Con số dưới đây đo trên máy Windows 11 + Docker
Desktop, repo nằm ở ổ `D:` — **thời gian biên dịch lại sau khi sửa một dòng code**:

| Cách | Lệnh | Sửa code → thấy kết quả |
|---|---|---|
| **Lai** (khuyến nghị): DB trong Docker, app chạy native | `npm run docker:db` + `npm run dev` | **~0,15 giây** |
| Tất cả trong Docker | `npm run docker:dev` | **~74 giây** |
| Không Docker: PostgreSQL portable | `npm run db:start` + `npm run dev` | ~0,15 giây |

Chênh lệch không phải do cấu hình chưa tối ưu mà là giới hạn của bind-mount
Docker trên Windows/macOS — chính tài liệu Next.js cũng khuyến cáo điều này
(`node_modules/next/dist/docs/01-app/02-guides/local-development.md`, mục 8).
Xem [Chạy toàn bộ trong Docker](#chạy-toàn-bộ-trong-docker) nếu bạn vẫn muốn cách đó.

### Cách khuyến nghị

```bash
npm install
cp .env.example .env          # rồi điền AUTH_SECRET (xem bên dưới)
npm run docker:db             # PostgreSQL 17 trong Docker, cổng 55432
npm run db:migrate            # tạo bảng
npm run db:seed               # dữ liệu danh mục + dữ liệu mẫu
npm run dev
```

`docker:db` mở cổng **55432** đúng bằng cổng của PostgreSQL portable, nên
`DATABASE_URL` trong `.env.example` dùng được cho cả hai — không phải sửa gì khi
đổi qua lại. Dữ liệu nằm trong volume `itam-dev_pgdata`, tắt máy không mất.

Mở http://localhost:3000 và đăng nhập:

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `admin@company.local` | `Admin@12345` | Quản trị hệ thống |
| `cuong.le@company.local` | `Demo@12345` | Quản trị IT |
| `bich.tran@company.local` | `Demo@12345` | Quản trị nhân sự |
| `em.hoang@company.local` | `Demo@12345` | Quản lý bộ phận |
| `giang.vu@company.local` | `Demo@12345` | Nhân viên |

Sinh `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Chạy `SEED_DEMO=false npm run db:seed` nếu chỉ muốn dữ liệu danh mục, không muốn
dữ liệu mẫu.

### Chạy toàn bộ trong Docker

Một lệnh dựng cả PostgreSQL lẫn app, không cần cài Node trên máy. Migration và
seed chạy tự động lúc khởi động, không cần `.env`:

```bash
npm run docker:dev            # dựng và chạy nền
npm run docker:dev:logs       # xem log
npm run docker:dev:stop       # dừng (giữ dữ liệu)
```

| Lệnh | Việc |
|---|---|
| `npm run docker:dev:sh` | Mở shell trong container (chạy `npx prisma migrate dev` khi đổi schema) |
| `npm run docker:dev:deps` | Cài lại `node_modules` sau khi `package.json` đổi |
| `npm run docker:dev:reset` | Xoá sạch cả dữ liệu database, dựng lại từ đầu |

Ba điểm cần biết trước khi dùng cách này:

- **Mỗi lần sửa code phải chờ khoảng 74 giây**, lần biên dịch đầu khoảng 2,5 phút.
- Container chạy `next dev --webpack` chứ không phải Turbopack. Turbopack dựa vào
  sự kiện inotify mà bind-mount Windows không gửi, nên nó **âm thầm phục vụ code
  cũ** — đã kiểm chứng trên chính repo này. Webpack có chế độ polling nên vẫn nhận
  thay đổi. Đổi lại, bundler lúc dev khác lúc build production.
- `node_modules` và `.next` của container nằm trong volume riêng, tách khỏi bản
  trên Windows, vì chúng chứa binary biên dịch cho Linux. Sau khi thêm package
  phải chạy `npm run docker:dev:deps`.

Sau khi `npm run docker:dev` xong, DB vẫn mở ở cổng 55432 nên `npm run db:studio`
hay DBeaver trên Windows kết nối được như thường.

---

## Triển khai lên VPS bằng Docker

Cách nhanh nhất để chạy trên một VPS trống: cài Docker một lần, sau đó mỗi lần
deploy chỉ cần `git pull` + `docker compose up`.

```bash
# Trên VPS (Ubuntu/Debian), cài Docker một lần:
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

git clone https://github.com/superbin93-lab/Asst.git
cd Asst
cp .env.docker.example .env
nano .env        # điền POSTGRES_PASSWORD, AUTH_SECRET, SEED_ADMIN_PASSWORD, APP_URL

docker compose up -d --build
```

Container `app` tự chạy `prisma migrate deploy` và seed tài khoản admin (dùng
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` trong `.env`) mỗi lần khởi động —
việc này an toàn để lặp lại vì chỉ upsert, không xoá dữ liệu. Ứng dụng nghe ở
cổng `APP_PORT` (mặc định `3000`).

Cập nhật lên bản mới:

```bash
git pull
docker compose up -d --build
```

Xem log / trạng thái:

```bash
docker compose logs -f app
docker compose ps
```

Nếu VPS bật `ufw`, mở cổng cho `APP_PORT` (mặc định `3000`):

```bash
sudo ufw allow 3000/tcp
```

### Đưa ra Internet qua Cloudflare

Có hai cách, nên chọn cách đầu.

**Cloudflare Tunnel (khuyến nghị)** — VPS không cần mở cổng nào ra Internet,
Cloudflare lo HTTPS, không phải gia hạn chứng chỉ:

1. Trong Cloudflare Zero Trust → Networks → Tunnels, tạo tunnel mới, thêm public
   hostname trỏ tới `http://app:3000` (tên service trong compose).
2. Chép token vào `.env`: `TUNNEL_TOKEN=...`
3. Đặt `APP_BIND=127.0.0.1` trong `.env` để app không lộ ra ngoài, rồi:

```bash
docker compose --profile tunnel up -d
```

**Hoặc Cloudflare DNS proxy (đám mây cam)** trỏ thẳng vào IP VPS. Cách này cần
mở cổng 80/443 và tự lo chứng chỉ ở origin; chế độ SSL "Flexible" tuy chạy được
nhưng chặng Cloudflare → VPS không mã hoá. Vì vậy Tunnel gọn và an toàn hơn.

Với cả hai cách, nhớ đặt `APP_URL=https://ten-mien-cua-ban` trong `.env`. Cookie
session dùng cờ `secure` khi `NODE_ENV=production`, nên **bắt buộc phải vào bằng
HTTPS** thì mới đăng nhập được — vào bằng `http://<IP>:3000` khi đã có Cloudflare
sẽ đăng nhập không thành công.

### Kiểm tra tự động trước khi deploy

`.github/workflows/check.yml` chạy mỗi lần push và pull request:

- `npm run check` — typecheck + lint + i18n + unit test (không cần database).
- `docker build` bản production — để Dockerfile hỏng thì lộ ra ở GitHub chứ không
  phải lúc đang deploy dở trên VPS.

Nên chờ dấu tích xanh trên GitHub rồi mới `git pull` trên VPS.

Sự cố thường gặp:

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| `docker compose up` báo thiếu biến môi trường | Chưa `cp .env.docker.example .env` hoặc chưa điền `POSTGRES_PASSWORD` / `AUTH_SECRET` / `SEED_ADMIN_PASSWORD` |
| Container `app` cứ restart liên tục | `docker compose logs app` xem lỗi migration/kết nối DB; thường do `db` chưa healthy kịp hoặc `.env` sai |
| Vào được `http://<IP>:3000` từ VPS nhưng không vào được từ máy khác | Firewall VPS (`ufw`) hoặc security group của nhà cung cấp cloud chưa mở cổng `3000` |
| Muốn đổi cổng ứng dụng | Sửa `APP_PORT` trong `.env` rồi `docker compose up -d` lại |
| Đăng nhập báo sai mật khẩu dù mật khẩu đúng | Đang vào bằng `http://`. Cookie session có cờ `secure` ở chế độ production nên chỉ hoạt động qua HTTPS |
| Build trên VPS bị treo hoặc báo hết bộ nhớ | `next build` cần khoảng 1,5–2 GB RAM. Tạm bật swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |

### Không dùng Docker (cài trực tiếp lên VPS)

Nếu VPS không hỗ trợ Docker hoặc bạn muốn quản lý Node/PostgreSQL trực tiếp:

```bash
# Node.js 24.x + PostgreSQL 17 + git + pm2
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib git
sudo npm install -g pm2

git clone https://github.com/superbin93-lab/Asst.git
cd Asst
npm install

sudo -u postgres psql -c "CREATE USER itam WITH PASSWORD 'doi-mat-khau-manh';"
sudo -u postgres psql -c "CREATE DATABASE itam OWNER itam;"

cp .env.example .env
nano .env        # DATABASE_URL trỏ vào postgres vừa tạo, AUTH_SECRET, APP_URL=http://<IP_VPS>:3000

npx prisma generate
npm run db:deploy
SEED_DEMO=false SEED_ADMIN_PASSWORD="mat-khau-admin-manh" npm run db:seed

npm run build
pm2 start "npm run start" --name asst
pm2 save && pm2 startup   # chạy dòng lệnh pm2 in ra để tự khởi động cùng VPS

sudo ufw allow 3000/tcp
```

Cập nhật bản mới:

```bash
cd ~/Asst
git pull
npm install
npm run db:deploy
npm run build
pm2 restart asst
```

---

## Phân hệ

### Tài sản IT
Danh sách và hồ sơ tài sản (mã tự sinh `AST-2026-0001`, serial, thông số kỹ thuật
dạng key/value), cấp phát và thu hồi có biên bản, lịch sử thiết bị, bảo trì –
sửa chữa, khấu hao đường thẳng / số dư giảm dần, cảnh báo hết bảo hành, bản quyền
phần mềm theo số license, vật tư tiêu hao có sổ xuất nhập tồn.

### Ticket hỗ trợ
Tiếp nhận yêu cầu, phân nhóm, mức ưu tiên, phân công, trao đổi (có ghi chú nội bộ
người yêu cầu không thấy), đóng/mở lại. **SLA tính theo giờ hành chính**: bỏ qua
đêm, cuối tuần và ngày lễ theo đúng lịch làm việc cấu hình được.

### Nhân sự
Hồ sơ nhân viên, phòng ban (cây phân cấp), chức danh, hợp đồng lao động, cảnh báo
hợp đồng sắp hết hạn. Thông tin lương tách riêng sau quyền `employee.salary.view`.

### Nghỉ phép
Quỹ phép theo năm và theo loại phép (được hưởng / chuyển tiếp / điều chỉnh / đã
dùng / đang chờ), đơn nghỉ phép có nửa ngày, **luồng duyệt nhiều cấp** (quản lý
trực tiếp → HR), kiểm tra trùng lịch, số ngày báo trước tối thiểu, số ngày nghỉ
liên tục tối đa. Số ngày nghỉ **loại trừ cuối tuần và ngày lễ**; ngày lễ nửa ngày
tính 0,5.

### Quản trị
Tài khoản, vai trò với ma trận quyền, cấu hình hệ thống (thông tin công ty, ngày
làm việc trong tuần, tiền tệ, tiền tố mã, số cấp duyệt), nhật ký hệ thống ghi lại
mọi thao tác ghi dữ liệu.

---

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run check` | Typecheck + lint + kiểm tra i18n + unit test |
| `npm test` | Unit test (tính ngày phép, SLA giờ hành chính) |
| `npm run smoke` | Gọi thử toàn bộ trang qua HTTP với session thật |
| `npm run verify` | Kiểm thử đầu-cuối trên trình duyệt: vòng đời tài sản và luồng nghỉ phép |
| `npm run shot -- /reports` | Chụp màn hình trang (thêm `SHOT_THEME=dark` cho giao diện tối) |
| `npm run db:start` / `db:stop` / `db:status` | Điều khiển PostgreSQL portable |
| `npm run db:psql` | Mở psql vào database dev |
| `npm run db:reset` | Xoá sạch cluster dev |
| `npm run db:studio` | Prisma Studio |
| `npm run i18n:check` | Báo lỗi nếu hai ngôn ngữ lệch key |
| `npm run docker:db` | Chỉ dựng PostgreSQL trong Docker (cổng 55432) |
| `npm run docker:dev` | Dựng cả app lẫn DB trong Docker |
| `npm run docker:dev:logs` / `:stop` / `:sh` | Log, dừng, mở shell trong container dev |
| `npm run docker:dev:deps` | Cài lại node_modules của container sau khi đổi `package.json` |
| `npm run docker:dev:reset` | Xoá container dev **và toàn bộ dữ liệu** |
| `npm run docker:prod` | Chạy thử đúng bản production trên máy (giống hệt VPS) |

---

## Cấu trúc mã nguồn

```
prisma/
  schema.prisma          Toàn bộ mô hình dữ liệu (5 phân hệ)
  seed.ts                Dữ liệu danh mục + dữ liệu mẫu
src/
  app/
    (auth)/login         Trang đăng nhập
    (app)/               Toàn bộ trang sau đăng nhập
  features/<module>/
    schema.ts            Zod: kiểm tra dữ liệu vào
    queries.ts           Truy vấn đọc (server-only)
    actions.ts           Server action: nghiệp vụ ghi
    *.tsx                Component riêng của phân hệ
  components/
    ui/                  Design system (Button, Table, Dialog, ...)
    shared/              Component dùng chung (bảng lọc, phân trang, form)
    charts/              Biểu đồ (bảng màu đã kiểm định light + dark)
  lib/                   db, auth, phân quyền, audit, cấu hình, định dạng
  messages/{vi,en}/      Chuỗi giao diện, tách theo namespace
```

Quy ước: **mọi thao tác ghi đi qua server action**, action luôn `authorize()`
trước, ghi `AuditLog` sau, và trả về `ActionResult` để form hiển thị lỗi theo
từng trường.

---

## Phân quyền

Quyền là chuỗi (`asset.view`, `leave.approve`, …) gắn vào vai trò; vai trò gắn
vào tài khoản. Thêm quyền mới **không cần migration** — khai báo trong
`src/lib/auth/permissions.ts` rồi tick trong màn hình Vai trò.

Vai trò hệ thống có sẵn: Quản trị hệ thống, Quản trị IT, Nhân viên IT, Quản trị
nhân sự, Quản lý bộ phận, Nhân viên.

---

## Triển khai

1. Tạo PostgreSQL (Neon, Supabase, RDS hoặc VPS tự dựng).
2. Đặt biến môi trường: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`.
3. `npm run db:deploy` để áp migration.
4. `npm run db:seed` một lần cho lần cài đầu tiên (nên đặt `SEED_DEMO=false`, và
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` cho tài khoản quản trị thật).
5. `npm run build && npm start`, hoặc deploy thẳng lên Vercel.

Cookie session được đánh dấu `secure` khi `NODE_ENV=production`, nên bắt buộc
chạy sau HTTPS.

---

## Thư mục `.devdb`

`npm run db:start` giải nén và điều khiển bản PostgreSQL 17 portable, không cần
quyền admin và không ảnh hưởng máy. Thư mục này đã nằm trong `.gitignore`; nếu
mất, tải lại bản binaries của EnterpriseDB và giải nén vào `.devdb/pgsql`.
