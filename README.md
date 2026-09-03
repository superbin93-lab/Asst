# IT Asset Suite

Phần mềm quản lý **tài sản IT, nhân sự, nghỉ phép và ticket hỗ trợ** cho doanh
nghiệp vừa và nhỏ. Giao diện song ngữ Việt – Anh, phân quyền theo vai trò.

| | |
|---|---|
| Stack | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL 17 |
| Xác thực | Session cookie httpOnly, mật khẩu bcrypt, RBAC theo permission |
| Ngôn ngữ | `next-intl`, tiếng Việt mặc định, đổi được trong giao diện |

---

## Bắt đầu nhanh

```bash
npm install
cp .env.example .env          # rồi điền AUTH_SECRET (xem bên dưới)
npm run db:start              # PostgreSQL portable trong .devdb, không cần cài đặt
npm run db:migrate            # tạo bảng
npm run db:seed               # dữ liệu danh mục + dữ liệu mẫu
npm run dev
```

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
