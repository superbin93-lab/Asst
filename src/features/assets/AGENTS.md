# Module `assets` - tài sản IT

Vòng đời một thiết bị: nhập kho → cấp phát → thu hồi → bảo trì → thanh lý.

| | |
|---|---|
| Trang | `/assets`, `/assets/new`, `/assets/[id]`, `/assets/[id]/edit`, `/assets/assignments`, `/assets/maintenance` |
| Quyền | `asset.view` `asset.create` `asset.update` `asset.delete` `asset.assign` `asset.maintain` `asset.export` |
| Bảng | `Asset` `AssetAssignment` `AssetMaintenance` `AssetEvent` |
| i18n | `assets.json` |

## File

| File | Vai trò |
|---|---|
| `schema.ts` | Zod + **nguồn duy nhất** của `optionalString/optionalId/optionalDate/optionalNumber/optionalInt` - `catalog` và `admin` import lại từ đây, đừng viết bản sao |
| `queries.ts` | `buildAssetWhere` / `listAssets` / `getAsset` / `getAssetFormOptions` / `getAssetStats` |
| `actions.ts` | `createAsset` `updateAsset` `deleteAsset` `assignAsset` `returnAsset` `disposeAsset` `saveMaintenance` `deleteMaintenance` |
| `asset-form.tsx` | Form tạo/sửa, dùng `specs-editor.tsx` cho cặp khoá-giá trị tự do |
| `assign-dialog.tsx` / `return-dialog.tsx` | Hộp thoại cấp phát / thu hồi |
| `depreciation.ts` | Tính khấu hao thuần, không chạm DB |

## Bất biến

- **Cấp phát (`assignAsset`)** chỉ chấp nhận `IN_STOCK` hoặc `RESERVED`. Trong **một** transaction:
  đóng mọi assignment `ACTIVE` cũ → tạo assignment mới → `asset.status = ASSIGNED`,
  `holderId`, `condition = conditionOut`, và **`departmentId` kế thừa từ nhân viên** → ghi `AssetEvent`.
- **Thu hồi (`returnAsset`)** đặt `holderId = null` và `status = nextStatus` do form chọn
  (`IN_STOCK` | `IN_REPAIR` | `RETIRED` | `LOST`), không mặc định về kho.
- **Bảo trì**: phiếu `IN_PROGRESS` đẩy tài sản sang `IN_REPAIR`; phiếu `COMPLETED` trả về
  `ASSIGNED` nếu còn assignment `ACTIVE`, ngược lại `IN_STOCK`.
- `deleteAsset` và `disposeAsset` **chặn** khi tài sản đang `ASSIGNED` (`fail("assetAssigned")`).
- `assetTag` để trống thì sinh bằng `nextAssetTag()`; `assetTag` và `serialNumber` được kiểm
  trùng thủ công trước khi ghi (serial không có unique index).
- `warrantyEndAt` tự suy ra từ `purchaseDate + warrantyMonths` khi người dùng không nhập ngày.
- Mỗi thao tác ghi **hai** dấu vết: `AssetEvent` (timeline hiển thị trên trang chi tiết) và
  `recordAudit()` (nhật ký hệ thống). Đừng bỏ cái nào.
- Mọi action kết thúc bằng `revalidateAsset(id)` - hàm này revalidate cả 3 trang danh sách + `/`.

## Khi phát triển thêm

1. Thêm cột lọc mới → sửa `buildAssetWhere` **và** `asset-filters.tsx`; muốn sắp xếp theo cột đó
   thì thêm vào allow-list `SORTABLE` trong `queries.ts`, nếu không `?sort=` sẽ bị bỏ qua.
2. Thêm trường mới → `schema.ts` → `prisma/schema.prisma` + migration → `asset-form.tsx` →
   `diffFields` tự đưa vào audit, không cần khai báo gì thêm.
3. Trạng thái mới → thêm vào enum `AssetStatus` (Prisma) **và** `ASSET_STATUSES` (`schema.ts`)
   **và** `assets.json` cả hai ngôn ngữ.
4. `specs` là JSON tự do; schema parse an toàn và trả `undefined` khi JSON hỏng - đừng để form
   ném lỗi thay vì bỏ qua.
