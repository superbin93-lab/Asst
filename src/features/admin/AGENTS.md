# Module `admin` - người dùng, vai trò, cấu hình, nhật ký

| | |
|---|---|
| Trang | `/admin/users`, `/admin/roles`, `/admin/settings`, `/admin/audit`, `/profile` |
| Quyền | `admin.users` `admin.roles` `admin.settings` `admin.audit` |
| Bảng | `User` `Role` `RolePermission` `UserRole` `Session` `Setting` `AuditLog` |
| i18n | `admin.json` |

## Khác quy ước chung

**Không có `schema.ts`.** Zod cho user và role khai báo ngay trong `actions.ts`; cấu hình hệ
thống dùng `settingsSchema` của `src/lib/settings.ts`. Các helper `optionalString` / `optionalId`
import từ `@/features/assets/schema`.

## Bất biến

**Tài khoản**
- Không tự vô hiệu hoá (`id === actor.id && !isActive`) và không tự xoá chính mình →
  `fail("cannotDisableSelf")`.
- `isSuperAdmin` chỉ super admin mới đặt được; với người khác trường này bị bỏ qua (`undefined`).
- **Vô hiệu hoá tài khoản hoặc reset mật khẩu đều xoá sạch `Session` của người đó.** Giữ nếp
  này cho mọi thao tác thu hồi quyền truy cập.
- Một `Employee` chỉ gắn được với một `User` (`employeeId` unique) - kiểm trùng trước khi ghi.
- Mật khẩu qua `passwordIssues()` (`src/lib/auth/password.ts`), trả về **khoá message** đầu tiên.

**Vai trò**
- `saveRole` lọc danh sách quyền theo `ALL_PERMISSIONS`, nên chuỗi lạ gửi từ client bị loại.
- `code` của role không sửa được sau khi tạo (chỉ `create` mới nhận `code`).
- Role `isSystem` không xoá được; role còn user gán cũng không xoá được.

**Cấu hình**
- `updateSettings` gọi `revalidatePath("/", "layout")` vì cấu hình chạm tới toàn bộ layout
  (tên công ty, tiền tệ, ngưỡng cảnh báo).
- `workweek` đến từ nhiều checkbox cùng tên nên phải đọc bằng `formData.getAll("workweek")`.
- Setting là **một dòng JSON** khoá `app`; thêm trường thì thêm vào `settingsSchema` (có
  `.default()`) là xong, không cần migration.

## Thêm một quyền mới

Bốn chỗ, thiếu chỗ nào cũng hỏng:

1. `src/lib/auth/permissions.ts` → `PERMISSIONS` + đưa vào một nhóm trong `PERMISSION_GROUPS`
   (nếu thiếu, màn hình vai trò sẽ không hiện quyền đó).
2. `ROLE_PRESETS` nếu vai trò mặc định nên có sẵn quyền.
3. `src/messages/vi/admin.json` **và** `src/messages/en/admin.json` - **dấu chấm trong tên quyền
   đổi thành `_`** khi làm khoá (`asset.view` → `asset_view`), vì next-intl dùng dấu chấm để lồng cấp.
4. `src/lib/navigation.ts` nếu quyền mở ra một mục sidebar mới.

Không cần migration: quyền là chuỗi lưu trên `RolePermission`.

## Nhật ký

`recordAudit()` (`src/lib/audit.ts`) **nuốt lỗi** - nó không bao giờ làm hỏng thao tác chính, nên
đừng dựa vào nó để xác nhận thành công. `diffFields(before, after)` sinh phần `changes`.
`/admin/audit` chỉ đọc, lọc qua `audit-filters.tsx`.
