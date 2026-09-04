# Module `tickets` - helpdesk

Ticket hỗ trợ với SLA theo giờ hành chính, hội thoại có ghi chú nội bộ.

| | |
|---|---|
| Trang | `/tickets`, `/tickets/mine`, `/tickets/new`, `/tickets/[id]` |
| Quyền | `ticket.create` `ticket.view.all` `ticket.update` `ticket.assign` `ticket.delete` `ticket.config` |
| Bảng | `Ticket` `TicketComment` `TicketEvent` `TicketCategory` `SlaPolicy` |
| i18n | `tickets.json` |

## File

| File | Vai trò |
|---|---|
| `sla.ts` | Cộng phút làm việc, trạng thái badge - **thuần**, có `tests/sla.test.ts` |
| `queries.ts` | `buildTicketWhere` với `scope: "all" \| "mine" \| "assigned"`, `getTicketStats` |
| `actions.ts` | `createTicket` `updateTicket` `addComment` `assignTicket` `claimTicket` `resolveTicket` `reopenTicket` `deleteTicket` |
| `schema.ts` | Zod + `TICKET_STATUSES` `TICKET_PRIORITIES` `CLOSED_STATUSES` |
| `ticket-conversation.tsx` | Bình luận + timeline sự kiện |

## Bất biến

**`requesterId` là `Employee.id`, `assigneeId` là `User.id`.** Đây là chỗ sai nhiều nhất trong
module này - hai bảng khác nhau, đừng gán chéo.

**Hiển thị.** `assertTicketAccess` (mutation) và `buildTicketWhere` (đọc) dùng cùng một luật:
không có `ticket.view.all` thì chỉ thấy ticket mình là requester (theo `employeeId`), assignee,
hoặc người tạo. `buildTicketWhere` ép `scope` về `"mine"` cho những người này, nên URL bịa
`?scope=all` không lộ dữ liệu. Logic này còn lặp lại ở `dashboard/queries.ts` - đổi thì đổi cả ba.

**SLA.** `resolveSlaPolicy` lấy policy gắn với category, nhưng ưu tiên bản **cùng tên và đúng
`priority`** nếu có; không có category thì tra theo `priority`. `computeSlaTargets` cộng phút:
`businessHoursOnly` thì bỏ đêm/cuối tuần/ngày lễ (08:00-12:00, 13:00-17:30), ngược lại cộng
thẳng vào đồng hồ. `updateTicket` **tính lại** hạn khi `priority` hoặc `categoryId` đổi.

**Trạng thái.** Tạo mới: `OPEN` nếu đã có assignee, ngược lại `NEW`. Gán người cũng đẩy `NEW → OPEN`.
`firstResponseAt` được set bởi bình luận **công khai đầu tiên của agent** (`ticket.update`) - ghi
chú nội bộ không dừng đồng hồ phản hồi. `reopenTicket` tăng `reopenedCount` và xoá `resolvedAt`/`closedAt`.

**Ghi chú nội bộ** chỉ người có `ticket.update` mới tạo được; cờ `isInternal` từ form bị ép về
`false` với người khác.

**`TicketEvent`** ghi lại mọi lần đổi status / priority / assignee. Thêm hành động mới thì thêm
event tương ứng, timeline mới đầy đủ.

## Khi phát triển thêm

- Trạng thái mới → enum `TicketStatus` (Prisma) + `TICKET_STATUSES` + `CLOSED_STATUSES` nếu là
  trạng thái đóng (nhiều truy vấn đếm dựa vào danh sách này) + `tickets.json` hai ngôn ngữ.
- Cột sắp xếp mới → thêm vào `SORTABLE` trong `queries.ts`.
- Đổi giờ hành chính → `BUSINESS_HOURS` trong `sla.ts`, chạy `tests/sla.test.ts` lại.
- Cấu hình category/SLA nằm ở module `catalog`, không ở đây.
