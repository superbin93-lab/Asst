<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# IT Asset Suite - hướng dẫn cho agent

## Chạy dự án
- `npm run db:start` khởi động PostgreSQL portable trong `.devdb` (không cần cài đặt hệ thống). `npm run db:status` để kiểm tra.
- `npm run dev` chạy app. `npm run check` chạy typecheck + lint + kiểm tra i18n + unit test.
- `npm run smoke` gọi thử toàn bộ trang qua HTTP bằng session thật (cần dev server đang chạy).

## Quy ước bắt buộc
- **Mọi thao tác ghi đi qua server action** trong `src/features/<module>/actions.ts`.
  Mỗi action: `authorize(PERMISSIONS.X)` -> validate bằng Zod -> ghi DB -> `recordAudit()` -> `revalidatePath()` -> trả `ActionResult`.
- Truy vấn đọc nằm trong `queries.ts` và luôn bắt đầu bằng `import "server-only"`.
- Trang dùng `requirePermission()` / `requireUser()` từ `src/lib/auth/guard.ts`; đừng tự kiểm tra quyền thủ công.
- Quyền là chuỗi khai báo trong `src/lib/auth/permissions.ts`; thêm quyền mới không cần migration, nhưng phải thêm nhãn vào `PERMISSION_GROUPS` và cả hai file `src/messages/{vi,en}/admin.json`.

## i18n
- Chuỗi tách theo namespace: `src/messages/vi/<ns>.json` và `src/messages/en/<ns>.json`.
- **Key không được chứa dấu chấm** (next-intl dùng dấu chấm để lồng cấp). Quyền có dấu chấm được đổi thành `_` khi làm key.
- Thêm key ở một ngôn ngữ thì phải thêm ở ngôn ngữ kia; `npm run i18n:check` sẽ báo lỗi nếu lệch.

## Ranh giới server/client
- Không truyền hàm (formatter, render callback) từ Server Component sang Client Component - truyền dữ liệu đã tính sẵn.
- Không đọc đồng hồ (`Date.now()`, `new Date()`) trong thân component; tính ở tầng query hoặc trong helper khai báo ngoài component. ESLint `react-hooks/purity` sẽ chặn.
- Không `setState` trong `useEffect` để đồng bộ props/URL; suy ra giá trị khi render (xem `SearchField`, `AssignAssetDialog`).

## Nghiệp vụ dễ sai
- Số ngày nghỉ phép: `src/features/leave/workdays.ts` (loại trừ cuối tuần theo cấu hình + ngày lễ, hỗ trợ nửa ngày). Có unit test.
- SLA giờ hành chính: `src/features/tickets/sla.ts`. Có unit test.
- Quỹ phép chuyển giữa ba ô: `pendingDays` khi gửi đơn, sang `usedDays` khi duyệt xong, trả lại khi từ chối/huỷ.

## Biểu đồ
- Bảng màu ở `src/app/globals.css` (`--viz-1..5`), một tông xanh theo thang thứ tự, đã kiểm định riêng cho light và dark.
- Dùng `BarList` cho so sánh độ lớn, `TrendChart` cho chuỗi thời gian một series. Không thêm hue mới.
