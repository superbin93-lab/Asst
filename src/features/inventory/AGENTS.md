# Module `inventory` - license phần mềm & vật tư tiêu hao

| | |
|---|---|
| Trang | `/licenses`, `/consumables` |
| Quyền | `license.view` `license.manage` `consumable.view` `consumable.manage` |
| Bảng | `SoftwareLicense` `LicenseSeat` `Consumable` `StockTransaction` |
| i18n | `catalog.json` (khoá `catalog.licenses`, `catalog.consumables`) |

## Khác quy ước chung - đọc trước khi sửa

- **Không có `queries.ts`.** Hai trang này truy vấn thẳng `db` trong `page.tsx` vì mỗi trang chỉ
  cần một truy vấn. Nếu bạn thêm màn hình thứ ba hoặc dùng lại truy vấn ở chỗ khác thì hãy tạo
  `queries.ts` với `import "server-only"` theo đúng quy ước, đừng nhân bản truy vấn.
- **Không có `schema.ts`.** Zod cho license, seat, consumable và phiếu kho nằm ở
  `src/features/catalog/schema.ts` (`licenseSchema`, `licenseSeatSchema`, `consumableSchema`,
  `stockMovementSchema`). Thêm trường thì sửa bên đó.

## Bất biến

**License**
- `seatsTotal` không được nhỏ hơn số seat đang phát (`LicenseSeat` có `revokedAt = null`).
- Cấp seat cần **ít nhất một** trong `employeeId` / `assetId`; hết seat thì `fail("noSeatsLeft")`.
- Thu hồi seat là **đặt `revokedAt`**, không xoá dòng - lịch sử cấp phát phải giữ lại.
- Ngưỡng cảnh báo sắp hết hạn lấy từ `settings.licenseAlertDays`, không hardcode 30.

**Vật tư**
- `recordStockMovement` là đường **duy nhất** thay đổi `Consumable.quantity`. Dấu của delta:
  `IN` = `+|q|`, `OUT` = `−|q|`, `ADJUST` = `q` giữ nguyên dấu. Tồn kho âm bị chặn
  (`fail("insufficientStock")`).
- Cập nhật tồn và ghi `StockTransaction` nằm trong **cùng một transaction**, và mỗi dòng sổ lưu
  `balanceAfter` để tra lịch sử mà không phải cộng dồn lại từ đầu.
- Xoá vật tư chỉ khi `quantity === 0`.
- Cảnh báo tồn thấp so sánh **hai cột** (`quantity <= minQuantity`) nên phải dùng `$queryRaw` -
  Prisma không so sánh cột với cột. Xem `dashboard/queries.ts`.
- `code` để trống thì sinh `VT0001` bằng `nextConsumableCode()`.

## Khi phát triển thêm

- Loại license mới → `LICENSE_TYPES` trong `catalog/schema.ts` + enum `LicenseType` (Prisma) +
  `catalog.json` hai ngôn ngữ.
- `license-panel.tsx` và `consumable-panel.tsx` là component client tự viết (không dùng
  `CrudPanel`) vì có bảng con seat/sổ kho - giữ nguyên hướng đó khi mở rộng.
