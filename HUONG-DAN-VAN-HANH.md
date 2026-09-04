# Hướng dẫn vận hành ASST

Quy trình sửa lỗi và cập nhật phần mềm ASST đang chạy trên AWS EC2 + Cloudflare.
Viết cho người không có nền tảng lập trình: cứ làm đúng thứ tự, không cần hiểu
bên trong. Gõ lệnh nghĩa là copy nguyên dòng, dán vào cửa sổ lệnh, bấm Enter.

## Nguyên tắc phải nhớ (chỉ 4 điều)

1. **Có hai "chỗ": máy của bạn (`d:\Asst`) và máy chủ AWS.** Mọi thay đổi code
   chỉ làm ở máy bạn. Máy chủ chỉ làm một việc: tải code mới về và chạy.
2. **Không bao giờ sửa file trực tiếp trên máy chủ AWS.** Sửa một lần là lần sau
   tải code mới sẽ bị xung đột, rất khó gỡ.
3. **Luôn sao lưu dữ liệu trước khi cập nhật máy chủ.** Đây là điều quan trọng
   nhất trong cả tài liệu này.
4. **Sửa xong ở máy mình phải chạy `npm run check` trước.** Nó báo lỗi thì đừng
   đưa lên máy chủ.

## Cách vào máy chủ AWS

Mở PowerShell trên máy bạn, gõ lệnh SSH mà AWS đã cấp, dạng:

```
ssh -i "duong-dan-den-key.pem" ubuntu@<địa-chỉ-IP-EC2>
```

Xong việc thì gõ `exit` để thoát ra.

---

## Phần A — Làm một lần, trước tiên

Vào máy chủ AWS rồi gõ lần lượt:

```bash
cd ~/Asst
```
```bash
docker compose exec -T db pg_dump -U itam itam | gzip > ~/backup-lan-dau.sql.gz
```
```bash
cp .env ~/env-du-phong
```

- Lệnh 2 tạo file sao lưu toàn bộ dữ liệu.
- Lệnh 3 cất giữ file cấu hình chứa mật khẩu. File này **không** nằm trong
  GitHub, mất là phải dựng lại từ đầu.

Kiểm tra: gõ `ls -lh ~/backup-lan-dau.sql.gz`, thấy tên file kèm dung lượng là đạt.

---

## Phần B — Mỗi lần sửa lỗi hoặc thêm tính năng

### B1. Sửa ở máy bạn

Mở Claude Code trong `d:\Asst`, mô tả việc cần làm bằng tiếng Việt bình thường.
Ví dụ: *"Trang danh sách tài sản bị lỗi khi lọc theo bộ phận, sửa giúp tôi."*
Bạn không cần tự viết code.

### B2. Kiểm tra ở máy bạn

Trong PowerShell tại `d:\Asst`:

```
npm run check
```

- Chạy xong không có chữ `error` → tốt, đi tiếp.
- Có lỗi → đưa nguyên đoạn báo lỗi cho Claude Code và bảo sửa.
  **Đừng đi tiếp khi còn lỗi.**

### B3. Xem thử bằng mắt

```
npm run dev
```

Mở trình duyệt vào `http://localhost:3000`, bấm thử đúng chỗ vừa sửa.
Xong thì bấm `Ctrl+C` trong PowerShell để tắt.

### B4. Đẩy code lên GitHub

Bảo Claude Code: *"Commit và push thay đổi này lên GitHub."*

Sau đó mở `https://github.com/superbin93-lab/Asst` bằng trình duyệt. Ở dòng trên
cùng của danh sách file có một biểu tượng nhỏ:

| Biểu tượng | Nghĩa là | Làm gì |
|---|---|---|
| 🟡 chấm vàng | Đang kiểm tra | Chờ vài phút |
| ✅ tích xanh | Đạt | Đi tiếp bước B5 |
| ❌ chữ X đỏ | Hỏng | **Dừng lại**, chụp màn hình đưa Claude Code. Không cập nhật máy chủ |

### B5. Cập nhật máy chủ AWS

Vào máy chủ, gõ đúng hai dòng:

```bash
cd ~/Asst
```
```bash
./deploy.sh
```

Chỉ vậy thôi. `deploy.sh` tự làm đủ 5 việc theo thứ tự: kiểm tra điều kiện →
**sao lưu dữ liệu** → tải code mới → dựng lại → chờ ứng dụng khởi động rồi báo
kết quả.

Nó chạy khoảng 3-6 phút và hiện rất nhiều dòng chữ - bình thường. Chỉ cần nhìn
dòng cuối cùng:

| Dòng cuối | Nghĩa là | Làm gì |
|---|---|---|
| `CẬP NHẬT THÀNH CÔNG` | Xong | Sang bước B6 |
| `!!! DỪNG LẠI: ...` | Có vấn đề | Đọc phần chữ ngay sau đó - nó ghi rõ phải làm gì. Không tự đoán |

**Quan trọng:** khi script dừng ở bước sao lưu, nó **chưa hề động vào** phần mềm
đang chạy. Trang web của bạn vẫn hoạt động bình thường. Cứ bình tĩnh.

File sao lưu được cất ở `~/asst-backups/`, tự động giữ lại 14 bản gần nhất.

> Nếu báo `Permission denied`, **đừng gõ `chmod +x`**. Lệnh đó tự nó là một
> thay đổi mà Git ghi nhận, và bước 0 của `deploy.sh` sẽ chặn lại vì tưởng
> bạn sửa file trên máy chủ. Thay vào đó gõ hai dòng này:
>
> ```bash
> git checkout -- deploy.sh
> ```
> ```bash
> git pull --ff-only
> ```
>
> Bản `deploy.sh` trong kho đã sẵn quyền chạy, nên tải lại là xong.

### B6. Kiểm tra lại

```bash
docker compose ps
```

Cả `app` lẫn `db` phải ghi `Up` hoặc `running`. Sau đó mở trang web của bạn,
đăng nhập, bấm thử chức năng vừa sửa. Xong thì `exit`.

---

## Phần C — Khi có sự cố

### Trang web không vào được, hoặc chức năng báo lỗi

Vào máy chủ và gõ:

```bash
cd ~/Asst && docker compose logs --tail=100 app
```

Bôi đen toàn bộ đoạn chữ hiện ra, copy, dán cho Claude Code kèm câu
*"Máy chủ báo lỗi thế này, giúp tôi xử lý."*

### Vừa cập nhật xong thì hỏng, cần quay về bản cũ ngay

```bash
cd ~/Asst && git log --oneline -5
```

Nó liệt kê 5 bản gần nhất, mỗi dòng bắt đầu bằng một mã 7 ký tự. Lấy mã ở dòng
**thứ hai** (bản trước khi cập nhật), rồi:

```bash
git checkout <mã-7-ký-tự>
docker compose up -d --build
```

Trang web trở lại như cũ. Báo cho Claude Code biết để xử lý tiếp.

> Lưu ý: cách này quay lui được code, nhưng **không** quay lui được thay đổi cấu
> trúc dữ liệu. Nếu bản mới có đổi cấu trúc database thì phải khôi phục từ file
> sao lưu - lý do vì sao bước sao lưu luôn đứng ngay trước `git pull`.

---

## Ba cái bẫy hay gặp với AWS + Cloudflare

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Đăng nhập báo sai mật khẩu dù mật khẩu đúng | Đang vào bằng `http://` hoặc bằng địa chỉ IP. Bắt buộc vào bằng tên miền `https://` của Cloudflare |
| Ổ đĩa máy chủ đầy dần theo thời gian | Ảnh Docker cũ tích lại. `deploy.sh` sẽ dừng và báo trước khi hết chỗ. Dọn bằng: `docker image prune -af` |
| Cập nhật xong nhưng trình duyệt vẫn hiện giao diện cũ | Bấm `Ctrl+F5`. Nếu vẫn vậy, vào Cloudflare bấm **Purge Cache** |

---

## Việc nên bổ sung khi có thời gian

Theo thứ tự ưu tiên:

1. **Tự động sao lưu hằng ngày và gửi ra nơi khác (S3).** Hiện dữ liệu chỉ nằm
   trong một máy chủ EC2 duy nhất.
2. ~~Gộp các lệnh ở bước B5 thành một lệnh~~ - **đã xong**, xem `deploy.sh`.
3. **Thêm đường kiểm tra sức khoẻ `/api/health`** - hiện container "đang chạy"
   không có nghĩa là trang web phục vụ được.
4. **Lưu nhật ký lỗi ra nơi đọc được về sau** - hiện log mất khi container được
   tạo lại.

---

## Khôi phục dữ liệu từ bản sao lưu

Chỉ dùng khi dữ liệu thật sự hỏng hoặc mất. **Lệnh này ghi đè toàn bộ database
hiện tại** - hãy hỏi Claude Code trước khi chạy, đừng tự làm.

```bash
cd ~/Asst && ls -lht ~/asst-backups/     # xem có những bản nào
```

Sau khi đã chắc chắn chọn được file cần khôi phục:

```bash
gunzip -c ~/asst-backups/<tên-file>.sql.gz | docker compose exec -T db psql -U itam -d itam
docker compose restart app
```

## Máy chủ đang dùng

- **AWS EC2 `c7i-flex.large`** - 2 vCPU, 4 GB RAM. Đủ dư để dựng lại phần mềm,
  không cần lo hết bộ nhớ.
- Cloudflare đứng trước, lo phần HTTPS.
- Thư mục dự án trên máy chủ: `~/Asst`. Sao lưu: `~/asst-backups/`.
