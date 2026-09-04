<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# IT Asset Suite - hướng dẫn cho agent

Ứng dụng quản lý tài sản IT, ticket hỗ trợ, nhân sự và nghỉ phép cho doanh nghiệp
vừa và nhỏ. Next.js 16 App Router + Prisma 7 + PostgreSQL, giao diện song ngữ
Việt - Anh, phân quyền theo permission.

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `npm run docker:db` | PostgreSQL 17 trong Docker, cổng 55432 - **cách dựng DB dev mặc định** |
| `npm run db:start` / `db:stop` / `db:status` | PostgreSQL 17 portable trong `.devdb`, cũng cổng 55432, dùng khi không có Docker |
| `npm run dev` | Dev server (Turbopack) |
| `npm run docker:dev` | Dựng **cả app lẫn DB** trong Docker. Chạy được nhưng mỗi lần sửa code phải chờ ~74 giây (bind-mount Windows); xem README trước khi dùng |
| `npm run docker:prod` | Chạy đúng bản production trên máy, giống hệt VPS |
| `npm run check` | **Cổng chính**: typecheck + lint + i18n + unit test |
| `npm test` | Unit test |
| `node --test --import tsx tests/workdays.test.ts` | Chạy **một** file test |
| `npm run smoke` | Gọi thử toàn bộ trang qua HTTP bằng session thật (cần dev server đang chạy) |
| `npm run verify` | Kiểm thử đầu-cuối trên trình duyệt thật: vòng đời tài sản + luồng nghỉ phép |
| `npm run shot -- /reports` | Chụp màn hình trang (`SHOT_THEME=dark`, `SHOT_LOCALE=en`, `SMOKE_EMAIL=...`) |
| `npm run db:migrate` / `db:seed` / `db:studio` / `db:psql` / `db:reset` | Prisma + database dev |

`smoke` / `verify` / `shot` cần dev server **và** database đang chạy. Chúng đăng
nhập bằng cách ghi thẳng `Session` vào DB rồi set cookie, không gõ form đăng nhập.

## Docker

Ba file, ba mục đích khác nhau - đừng lẫn:

| File | Dùng cho | Ghi chú |
|---|---|---|
| `docker-compose.yml` | Production trên VPS | Yêu cầu `.env` (`cp .env.docker.example .env`). Có service `cloudflared` sau profile `tunnel` |
| `docker-compose.dev.yml` | Dev trên máy cá nhân | Mọi biến đều có mặc định, chạy được không cần `.env`. Project name riêng `itam-dev` nên không đụng stack production |
| `Dockerfile` | Cả hai | Stage `dev` (chỉ dependencies, source đến từ bind mount) và stage `runner` (bản production) |

Điểm dễ vấp:

- Compose **nội suy biến của mọi service kể cả service ngoài profile đang bật**,
  nên biến của `cloudflared` phải dùng `${VAR:-}` chứ không được `${VAR:?}`, nếu
  không lệnh `docker compose up -d` thông thường sẽ hỏng.
- `process.env` thắng file `.env` (thứ tự nạp của Next), nên `.env` bị bind-mount
  vào container dev không đè được `DATABASE_URL` mà compose truyền vào.
- Container dev không dùng Turbopack mà dùng `next dev --webpack` (`npm run dev:poll`).
  Turbopack dựa vào inotify, bind-mount Windows không gửi sự kiện, nên nó **âm thầm
  phục vụ code cũ** - đã kiểm chứng. Webpack có polling nên vẫn nhận thay đổi.
- Entrypoint dev nằm ở `/usr/local/bin/dev-entrypoint.sh`, **ngoài `/app`**, vì
  bind mount thay thế toàn bộ `/app` lúc chạy.
- `node_modules` và `.next` của container nằm trong volume riêng: chúng chứa binary
  biên dịch cho Linux, không dùng chung với bản Windows được.

## Kiến trúc

**Đường đi của một request đọc**
`src/app/(app)/<route>/page.tsx` → `requirePermission()` → `queries.ts` của module
→ Server Component render. Layout `(app)/layout.tsx` gọi `requireUser()` và chỉ
gửi xuống client những mục sidebar user có quyền (`src/lib/navigation.ts`).
**Không có middleware** - toàn bộ bảo vệ nằm ở layout/page qua
`src/lib/auth/guard.ts`.

**Đường đi của một request ghi**
Form client (`useActionForm` trong `src/components/shared/form.tsx`) → server
action → `ActionResult`. `fieldErrors` chứa **khóa message** thuộc namespace
`validation`, client mới dịch sang chữ - đừng trả về câu tiếng Việt/Anh cứng.

**Prisma khác mặc định.** Generator là `prisma-client` (không phải
`@prisma/client`): client là mã TypeScript sinh ra ở `src/generated/prisma`,
import qua `@/generated/prisma/client`. Connection string khai báo ở
`prisma.config.ts`, **không** nằm trong `schema.prisma` (Prisma 7 bỏ `url` khỏi
datasource). `src/generated/**` bị ESLint bỏ qua. Dùng singleton `src/lib/db.ts`,
không tự `new PrismaClient()`.

**Lớp `src/lib/`**
- `auth/guard.ts` - `requireUser` / `requirePermission` redirect (dùng cho trang);
  `authorize` ném `ForbiddenError` (dùng cho action). Đừng lẫn hai loại.
- `auth/permissions.ts` - danh mục quyền, `ROLE_PRESETS`, `PERMISSION_GROUPS`.
- `auth/session.ts` - token ngẫu nhiên trong cookie httpOnly, DB chỉ lưu SHA-256.
- `action.ts` - `ok` / `fail` / `runAction` / `zodFieldErrors`.
- `audit.ts` - `recordAudit()` **nuốt lỗi**, không bao giờ làm hỏng thao tác chính.
- `sequence.ts` - sinh mã `AST-2026-0001`, `TK-`, `LV-`, `NV`. Luôn truyền tx
  client vào để số không bị đốt khi transaction rollback.
- `settings.ts` - `getSettings()` cache theo request; nguồn của prefix mã,
  workweek, số cấp duyệt, ngưỡng cảnh báo. Đọc setting, đừng hardcode.
- `query.ts` - lọc/sắp xếp/phân trang **đọc từ URL**; `sorting()` có allow-list
  cột nên URL bịa không thể order theo cột tuỳ ý.

**Một module `src/features/<module>/`**: `schema.ts` (Zod) · `queries.ts`
(`import "server-only"`) · `actions.ts` (server action) · `*.tsx` (component
riêng). Component dùng chung ở `src/components/{ui,shared,charts,layout}`.

## Bản đồ module

Mỗi module có `AGENTS.md` riêng trong thư mục của nó, ghi trang, quyền, bảng dữ
liệu, bất biến nghiệp vụ và checklist khi phát triển thêm. **Đọc file của module
trước khi sửa module đó**; file này chỉ giữ những gì dùng chung.

| Module | Phạm vi | Tài liệu |
|---|---|---|
| `assets` | Tài sản IT: nhập kho, cấp phát, thu hồi, bảo trì, thanh lý | [src/features/assets/AGENTS.md](src/features/assets/AGENTS.md) |
| `leave` | Đơn nghỉ phép, chuỗi duyệt, quỹ phép, ngày lễ | [src/features/leave/AGENTS.md](src/features/leave/AGENTS.md) |
| `tickets` | Helpdesk, SLA giờ hành chính, hội thoại | [src/features/tickets/AGENTS.md](src/features/tickets/AGENTS.md) |
| `hr` | Hồ sơ nhân viên, bộ phận, chức danh, hợp đồng | [src/features/hr/AGENTS.md](src/features/hr/AGENTS.md) |
| `inventory` | License phần mềm + vật tư tiêu hao | [src/features/inventory/AGENTS.md](src/features/inventory/AGENTS.md) |
| `catalog` | Bảy màn hình danh mục nền | [src/features/catalog/AGENTS.md](src/features/catalog/AGENTS.md) |
| `admin` | Người dùng, vai trò, cấu hình, nhật ký | [src/features/admin/AGENTS.md](src/features/admin/AGENTS.md) |
| `dashboard` | Trang chủ + `/reports` (đọc thuần) | [src/features/dashboard/AGENTS.md](src/features/dashboard/AGENTS.md) |

Hai module đi lệch khuôn chung: `inventory` không có `queries.ts` lẫn `schema.ts`
(truy vấn nằm trong `page.tsx`, Zod ở `catalog/schema.ts`), còn `admin` khai báo
Zod ngay trong `actions.ts`. Lý do ghi trong tài liệu của từng module.

## Quy ước bắt buộc
- **Mọi thao tác ghi đi qua server action** trong `src/features/<module>/actions.ts`.
  Mỗi action: `authorize(PERMISSIONS.X)` -> validate bằng Zod -> ghi DB -> `recordAudit()` -> `revalidatePath()` -> trả `ActionResult`.
- Truy vấn đọc nằm trong `queries.ts` và luôn bắt đầu bằng `import "server-only"`.
- Trang dùng `requirePermission()` / `requireUser()` từ `src/lib/auth/guard.ts`; đừng tự kiểm tra quyền thủ công.
- Quyền là chuỗi khai báo trong `src/lib/auth/permissions.ts`; thêm quyền mới không cần migration, nhưng phải thêm nhãn vào `PERMISSION_GROUPS` và cả hai file `src/messages/{vi,en}/admin.json`.

## i18n
- Locale là **cookie** `itam_locale`, không phải segment trong URL; timezone cố định `Asia/Ho_Chi_Minh` (`src/i18n/request.ts`).
- Chuỗi tách theo namespace: `src/messages/vi/<ns>.json` và `src/messages/en/<ns>.json`. Thêm namespace mới phải khai báo trong `src/messages/index.ts`.
- **Key không được chứa dấu chấm** (next-intl dùng dấu chấm để lồng cấp). Một key sai dấu chấm làm hỏng cả bundle ngôn ngữ, không chỉ chuỗi đó. Quyền có dấu chấm được đổi thành `_` khi làm key.
- Thêm key ở một ngôn ngữ thì phải thêm ở ngôn ngữ kia; `npm run i18n:check` sẽ báo lỗi nếu lệch.

## Ranh giới server/client
- Không truyền hàm (formatter, render callback) từ Server Component sang Client Component - truyền dữ liệu đã tính sẵn (xem `BarList` nhận `locale` chứ không nhận `valueFormatter`).
- Không đọc đồng hồ (`Date.now()`, `new Date()`) trong thân component; tính ở tầng query hoặc trong helper khai báo ngoài component. ESLint `react-hooks/purity` sẽ chặn.
- Không `setState` trong `useEffect` để đồng bộ props/URL; suy ra giá trị khi render (xem `SearchField`, `AssignAssetDialog`).
- `CrudPanel` nhận descriptor có `render`, nên mỗi entity cần một wrapper **client** riêng.

## Nghiệp vụ dễ sai

Chi tiết nằm trong `AGENTS.md` của module tương ứng; đây là danh sách để biết chỗ mà tìm.

- Số ngày nghỉ phép: `src/features/leave/workdays.ts` (loại trừ cuối tuần theo cấu hình + ngày lễ, hỗ trợ nửa ngày). Có unit test.
- SLA giờ hành chính: `src/features/tickets/sla.ts` (08:00-12:00, 13:00-17:30, bỏ đêm/cuối tuần/ngày lễ). Có unit test.
- Quỹ phép chuyển giữa ba ô: `pendingDays` khi gửi đơn, sang `usedDays` khi duyệt xong, trả lại khi từ chối/huỷ. Số cấp duyệt lấy từ `approvalLevels` trong settings.
- Cấp phát tài sản đóng assignment ACTIVE cũ, đặt `holderId`, và **thừa kế `departmentId` từ nhân viên** - tất cả trong cùng một transaction.
- Luật hiển thị ticket (không có `ticket.view.all` thì chỉ thấy ticket của mình) lặp ở **ba** chỗ: `tickets/queries.ts`, `tickets/actions.ts`, `dashboard/queries.ts`.
- Công thức chia tỷ lệ quỹ phép cho người vào làm giữa năm nằm ở **hai** chỗ: `hr/actions.ts` (lúc tạo nhân viên) và `leave/balance-actions.ts` (lúc phát quỹ cả năm).
- So sánh hai cột trong Prisma là không được: tồn kho thấp (`quantity <= minQuantity`) phải dùng `$queryRaw`.

## Biểu đồ
- Bảng màu ở `src/app/globals.css` (`--viz-1..5`), một tông xanh theo thang thứ tự, đã kiểm định riêng cho light và dark.
- Dùng `BarList` cho so sánh độ lớn, `TrendChart` cho chuỗi thời gian một series. Không thêm hue mới.
