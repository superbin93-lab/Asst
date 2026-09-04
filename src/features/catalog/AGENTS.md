# Module `catalog` - danh mục nền

Bảy màn hình danh mục dùng chung một `actions.ts`, mỗi loại một quyền khác nhau.

| Trang | Quyền | Zod nằm ở |
|---|---|---|
| `/catalog/categories` | `catalog.manage` | `catalog/schema.ts` |
| `/catalog/locations` | `catalog.manage` | `catalog/schema.ts` |
| `/catalog/vendors` | `catalog.manage` | `catalog/schema.ts` |
| `/catalog/ticket-categories` | `ticket.config` | `tickets/schema.ts` |
| `/catalog/sla` | `ticket.config` | `tickets/schema.ts` |
| `/catalog/leave-types` | `leave.manage` | `leave/schema.ts` |
| `/catalog/holidays` | `leave.manage` | `leave/schema.ts` |

i18n: `catalog.json`.

## Bất biến

- **Mỗi action `authorize()` bằng quyền riêng của nó**, không dùng chung `catalog.manage` cho
  cả bảy. Sai chỗ này là mở quyền ngoài ý muốn.
- **Zod ở lại module sở hữu nghiệp vụ**, `catalog/actions.ts` import về. `ticketCategorySchema`
  và `slaPolicySchema` thuộc `tickets`, `leaveTypeSchema` và `holidaySchema` thuộc `leave`. Đừng
  gom hết về đây.
- **Mọi `delete*` chặn khi còn tham chiếu** bằng `_count` (`assets`, `children`, `employees`,
  `tickets`, `requests`, ...) → `fail("cannotDeleteInUse")`. Xoá LeaveType chỉ chặn theo
  `requests`, dòng quỹ phép sẽ đi theo.
- `code` theo regex `^[A-Z0-9_-]+$`, unique, kiểm trùng thủ công trước khi ghi.
- `parentId` không được trỏ về chính nó (category, location, ticket category).
- `revalidateCatalog()` revalidate cả bảy trang **và** `/assets`, vì danh mục là nguồn dropdown
  của form tài sản.

## Khi phát triển thêm

1. Danh mục mới → thêm Zod ở module sở hữu → thêm cặp `save*` / `delete*` vào `actions.ts` →
   thêm trang dưới `src/app/(app)/catalog/` → thêm mục vào `NAV_SECTIONS` (`src/lib/navigation.ts`)
   với đúng quyền → thêm khoá vào `catalog.json` **và** `nav.json`, cả `vi` lẫn `en`.
2. Màn hình danh mục dùng `CrudPanel`, mà `CrudPanel` nhận descriptor có `render` nên **mỗi
   entity cần một wrapper client riêng** - gom vào `asset-panels.tsx` (category/location/vendor)
   hoặc `service-panels.tsx` (ticket category/SLA/leave type/holiday) thay vì tạo file mới.
3. `CrudField` chỉ hỗ trợ `text | textarea | number | date | color | checkbox | select`. Cần
   control phức tạp hơn thì viết panel riêng, đừng mở rộng `CrudPanel` cho một màn hình.
