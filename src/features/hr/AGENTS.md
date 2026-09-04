# Module `hr` - nhân sự

Hồ sơ nhân viên, sơ đồ tổ chức (bộ phận / chức danh), hợp đồng lao động.

| | |
|---|---|
| Trang | `/employees`, `/employees/new`, `/employees/[id]`, `/employees/[id]/edit`, `/employees/departments`, `/employees/positions`, `/employees/contracts` |
| Quyền | `employee.view` `employee.create` `employee.update` `employee.delete` `employee.salary.view` `org.manage` |
| Bảng | `Employee` `Department` `Position` `EmploymentContract` |
| i18n | `hr.json` |

## File

| File | Vai trò |
|---|---|
| `queries.ts` | `buildEmployeeWhere` `listEmployees` `getEmployee` `listDepartments` `listPositions` `listContracts` `getHrStats` |
| `actions.ts` | `createEmployee` `updateEmployee` `deleteEmployee` + `saveDepartment/Position/Contract` và các `delete*` |
| `employee-form.tsx` | Form hồ sơ |
| `department-panel.tsx` / `position-panel.tsx` / `contract-panel.tsx` | Wrapper client cho `CrudPanel` |

## Bất biến

- **`createEmployee` tạo luôn quỹ phép năm hiện tại** cho mọi `LeaveType` đang bật và
  `deductsBalance`, chia tỷ lệ theo số tháng còn lại kể từ `hireDate` (làm tròn 0.5). Công thức
  này trùng với `generateBalances` bên module `leave` - sửa thì sửa cả hai.
- `employeeCode` để trống thì sinh `NV0001` bằng `nextEmployeeCode()`; `employeeCode` và `email`
  được kiểm trùng thủ công trước khi ghi.
- **Danh sách mặc định ẩn người đã nghỉ.** `buildEmployeeWhere` đặt `status != TERMINATED` khi
  không có `?status=`; `?status=active` cũng cho kết quả tương tự. Mọi dropdown chọn nhân viên
  (ở `assets`, `leave`, `tickets`, `inventory`) đều lọc `status != TERMINATED` - giữ nguyên nếp này.
- **Không xoá được khi còn ràng buộc**: nhân viên đang giữ tài sản (`_count.assetsHeld > 0`),
  bộ phận còn nhân viên hoặc bộ phận con, chức danh còn nhân viên. Trả `fail("cannotDeleteInUse")`
  để người dùng chuyển sang đổi trạng thái thay vì xoá.
- `managerId` không được trỏ về chính nhân viên đó; `parentId` của bộ phận cũng vậy.
- Trường lương nằm trên `Employee` nhưng chỉ hiển thị cho người có `employee.salary.view` -
  kiểm ở tầng trang/component, đừng để lọt vào payload gửi xuống client.
- `getEmployee` là truy vấn tổng hợp lớn (tài sản đang giữ, quỹ phép, đơn nghỉ, ticket đã tạo,
  cấp dưới, hợp đồng) - thêm quan hệ vào đây trước khi viết truy vấn rời.

## Khi phát triển thêm

1. Trường mới trên hồ sơ → `schema.ts` → Prisma + migration → `employee-form.tsx`.
   `diffFields` tự ghi thay đổi vào audit.
2. Bộ lọc mới → `buildEmployeeWhere` + `employee-filters.tsx`; cột sắp xếp mới → `SORTABLE`.
3. Bộ phận / chức danh dùng `CrudPanel`, nên chỉ cần khai báo descriptor trong wrapper client
   tương ứng, không viết form riêng.
