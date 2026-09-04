# Module `dashboard` - trang chủ & báo cáo

Hai màn hình đọc-thuần, không có `actions.ts`.

| | |
|---|---|
| Trang | `/` (trang chủ), `/reports` |
| Quyền | `/` chỉ cần đăng nhập; `/reports` cần `report.view` |
| i18n | `dashboard.json`, `reports.json` |

| File | Vai trò |
|---|---|
| `queries.ts` | `getDashboardData(user)` - toàn bộ trang chủ trong một lần gọi |
| `report-queries.ts` | `resolveRange(period)` + `getReportData(range)` |
| `report-filter.tsx` | Bộ chọn kỳ (client) |

## Bất biến

**Trang chủ tự cắt theo quyền.** `getDashboardData` tính trước các cờ `seesAssets`,
`seesAllTickets`, `seesEmployees`, `approvesLeave`, `seesConsumables`, `seesLicenses`, rồi mỗi
nhánh trong `Promise.all` là `cờ ? db.… : Promise.resolve(<giá trị rỗng>)`. Nhờ vậy dashboard của
một nhân viên thường tốn ít truy vấn hơn hẳn của quản trị viên. **Widget mới phải theo đúng khuôn
này**, đừng truy vấn vô điều kiện rồi lọc ở tầng render.

Kết quả trả về kèm `permissions: {...}` để component biết widget nào nên hiện.

**Phạm vi ticket** (`ticketVisibility`) lặp lại luật của `tickets/queries.ts`: không có
`ticket.view.all` thì chỉ đếm ticket mình là requester / assignee / người tạo. Đổi luật hiển thị
ticket thì phải đổi cả ở đây.

**Ngưỡng cảnh báo** lấy từ `settings.warrantyAlertDays` / `settings.licenseAlertDays`, không
hardcode.

**Tồn kho thấp** phải dùng `$queryRaw` vì so sánh hai cột (`quantity <= minQuantity`) -
Prisma không làm được.

**Báo cáo.** `resolveRange` đọc `?period=` với ba giá trị `month` | `quarter` | mặc định là năm
hiện tại. Đường xu hướng ticket 12 tháng được **zero-fill** để biểu đồ không đứt đoạn.
`slaCompliance` = số ticket giải quyết trước `resolutionDueAt` / tổng ticket đã giải quyết
trong kỳ.

## Ranh giới server/client & biểu đồ

- Không đọc đồng hồ trong thân component. `now` tính một lần ở tầng query (hoặc trong helper
  khai báo ngoài component, xem `expiryWindow` ở `/licenses`); ESLint `react-hooks/purity` sẽ chặn.
- **Không truyền hàm** (formatter, render callback) từ Server Component xuống Client Component -
  `BarList` nhận `locale` rồi tự định dạng, không nhận `valueFormatter`.
- `BarList` cho so sánh độ lớn, `TrendChart` cho chuỗi thời gian một series. Màu lấy từ
  `--viz-1..5` trong `src/app/globals.css`, đã kiểm định cho cả light lẫn dark - **không thêm hue mới**.
- Giá trị `Decimal` của Prisma phải `.toString()` trước khi gửi xuống client.
