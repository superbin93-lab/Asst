# Module `leave` - nghỉ phép

Đơn nghỉ phép nhiều cấp duyệt, quỹ phép theo năm, tính ngày công theo lịch làm việc.

| | |
|---|---|
| Trang | `/leave`, `/leave/new`, `/leave/[id]`, `/leave/approvals`, `/leave/requests`, `/leave/balances` |
| Quyền | `leave.view.all` `leave.approve` `leave.manage` - **tạo đơn không cần quyền** (`authorizeSession`) |
| Bảng | `LeaveRequest` `LeaveApproval` `LeaveBalance` `LeaveType` `Holiday` |
| i18n | `leave.json` |

## File

| File | Vai trò |
|---|---|
| `workdays.ts` | Tính số ngày nghỉ - **thuần, không chạm DB**, có `tests/workdays.test.ts` |
| `actions.ts` | Vòng đời đơn: `createLeaveRequest` `submitLeaveRequest` `decideLeaveRequest` `cancelLeaveRequest` `deleteLeaveRequest` |
| `balance-actions.ts` | Quỹ phép: `generateBalances` `adjustBalance` (tách riêng vì quyền và nhịp dùng khác hẳn) |
| `queries.ts` | `buildLeaveWhere` với `scope: "mine" \| "all" \| "approvals"`, `listBalances`, `countPendingApprovals` |

## Bất biến

**Ba ô quỹ.** Số ngày còn dùng được:
`entitledDays + carriedOverDays + adjustmentDays − usedDays − pendingDays`.
Chỉ áp dụng khi `leaveType.deductsBalance`. Ngày di chuyển giữa các ô:

| Sự kiện | Tác động |
|---|---|
| Gửi đơn (PENDING) | `pendingDays += totalDays` |
| Duyệt xong cấp cuối | `pendingDays −= n`, `usedDays += n` |
| Từ chối | `pendingDays −= n` |
| Huỷ đơn đang PENDING | `pendingDays −= n` |
| Huỷ đơn đã APPROVED | `usedDays −= n` |

Đơn `DRAFT` **không** giữ chỗ quỹ - chỉ khi `submitLeaveRequest` mới trừ.

**Chuỗi duyệt (`buildApprovalChain`).** Cấp 1 là `employee.manager`, không có thì là trưởng
bộ phận. Cấp 2 là người đầu tiên có `leave.manage` (hoặc super admin), chỉ tạo khi
`settings.approvalLevels >= 2`. Bước trỏ về chính người gửi hoặc về tài khoản đã khoá bị loại.
Chuỗi rỗng → `fail("validation", { employeeId: "noApprover" })`, không cho gửi đơn.

**`validateLeaveWindow`** chạy cả lúc tạo lẫn lúc gửi đơn, kiểm theo thứ tự: ngày kết thúc ≥
ngày bắt đầu → nửa ngày phải được `type.allowHalfDay` cho phép → `totalDays > 0` → `maxConsecutiveDays`
(so bằng **số ngày lịch**, không phải ngày công) → `minNoticeDays` → trùng đơn `PENDING`/`APPROVED`
→ đủ quỹ.

**Duyệt.** Chỉ approver của bước `PENDING` hiện tại được quyết, trừ người có `leave.manage` -
họ hành động ở bất kỳ bước nào. Từ chối làm mọi bước sau thành `SKIPPED`.

**`generateBalances`** chia tỷ lệ theo số tháng còn lại của năm vào làm (làm tròn 0.5), cộng
ngày dư năm trước nhưng không vượt `carryOverLimitDays`, và **bỏ qua** dòng đã tồn tại.
`createEmployee` (module `hr`) cũng tạo quỹ theo đúng công thức này - sửa một chỗ thì sửa cả hai.

**Ngày lễ** (`indexHolidays`) có hai loại: `isRecurring` khớp theo tháng-ngày mọi năm, còn lại
khớp đúng ngày. Lễ nửa ngày tính 0.5 ngày công. `sla.ts` của module `tickets` dùng lại chính
`indexHolidays`/`isoWeekday` này.

## Khi phát triển thêm

- Đổi công thức đếm ngày → sửa `workdays.ts` và cập nhật `tests/workdays.test.ts` trước
  (`node --test --import tsx tests/workdays.test.ts`).
- `nextLeaveCode(tx)` **phải** nhận tx client, nếu không rollback sẽ đốt mất số.
- Thay đổi trạng thái quỹ luôn nằm trong `db.$transaction` cùng với thay đổi đơn.
