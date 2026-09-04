#!/usr/bin/env bash
#
# Cập nhật ASST trên máy chủ. Gộp 4 bước: sao lưu -> tải code mới -> dựng lại
# -> kiểm tra. Chạy trên máy chủ AWS, trong thư mục ~/Asst:
#
#   ./deploy.sh
#
# Script dừng ngay khi có bước hỏng và không bao giờ chạy tiếp sau khi sao lưu
# thất bại. Nếu nó dừng giữa chừng, bản đang chạy vẫn nguyên vẹn.

set -uo pipefail

BACKUP_DIR="$HOME/asst-backups"
KEEP_BACKUPS=14      # giữ lại 14 bản sao lưu gần nhất
MIN_FREE_GB=3        # cần ít nhất từng này dung lượng trống để dựng lại
HEALTH_TRIES=30      # kiểm tra sức khoẻ tối đa 30 lần
HEALTH_WAIT=5        # mỗi lần cách nhau 5 giây

cd "$(dirname "$0")" || exit 1

say()  { printf '\n=== %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n!!! DỪNG LẠI: %s\n\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- Bước 0/5 ---
say "Bước 0/5 - Kiểm tra trước khi chạy"

command -v git >/dev/null 2>&1 || die "Không tìm thấy git trên máy chủ này."

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  die "Không chạy được docker. Thử 'docker ps'; nếu báo permission denied thì đăng xuất rồi đăng nhập lại máy chủ."
fi

[ -f docker-compose.yml ] || die "Không thấy docker-compose.yml. Bạn có đang ở trong thư mục ~/Asst không? Gõ: cd ~/Asst"
[ -f .env ] || die "Không thấy file .env - đây là file chứa mật khẩu. Khôi phục bằng: cp ~/env-du-phong .env"

git rev-parse --git-dir >/dev/null 2>&1 || die "Thư mục này không phải bản sao git của dự án."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "HEAD" ]; then
  die "Máy chủ đang ở chế độ xem một bản cũ (sau khi bạn quay lui). Gõ lệnh này rồi chạy lại:
       git checkout master"
fi

DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "$DIRTY" ]; then
  printf '
'; printf '%s
' "$DIRTY"; printf '
'
  die "Có file của dự án bị sửa trực tiếp trên máy chủ (danh sách ở trên). Không cập nhật khi còn thay đổi lạ.
       Nếu chắc chắn bỏ được chúng đi, gõ: git checkout -- . && ./deploy.sh
       Không chắc thì hỏi Claude Code trước."
fi

UNTRACKED="$(git ls-files --others --exclude-standard | head -n 5)"
if [ -n "$UNTRACKED" ]; then
  info "Lưu ý: có file lạ trong thư mục (không thuộc dự án). Vẫn cập nhật được:"
  printf '%s
' "$UNTRACKED" | sed 's/^/      - /'
fi

FREE_GB="$(df -P -k . | awk 'NR==2 {print int($4/1048576)}')"
if [ -n "$FREE_GB" ] && [ "$FREE_GB" -lt "$MIN_FREE_GB" ]; then
  die "Ổ đĩa chỉ còn ${FREE_GB} GB trống, cần ít nhất ${MIN_FREE_GB} GB để dựng lại.
       Dọn bớt ảnh Docker cũ bằng: docker image prune -af"
fi

DB_ID="$($DC ps -q db 2>/dev/null | head -n1)"
[ -n "$DB_ID" ] || die "Chưa thấy container database. Xem tình trạng bằng: $DC ps"
if [ "$(docker inspect -f '{{.State.Running}}' "$DB_ID" 2>/dev/null)" != "true" ]; then
  die "Container database không chạy nên không sao lưu được. Khởi động lại bằng: $DC up -d db"
fi

OLD_COMMIT="$(git rev-parse --short HEAD)"
info "Thư mục      : $(pwd)"
info "Nhánh        : $BRANCH"
info "Bản đang chạy: $OLD_COMMIT"
info "Đĩa còn trống: ${FREE_GB} GB"
info "OK - đủ điều kiện chạy tiếp."

# ---------------------------------------------------------------- Bước 1/5 ---
say "Bước 1/5 - Sao lưu dữ liệu"

mkdir -p "$BACKUP_DIR" || die "Không tạo được thư mục $BACKUP_DIR"
STAMP="$(date +%F-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/asst-$STAMP-$OLD_COMMIT.sql.gz"

info "Đang ghi vào $BACKUP_FILE ..."
if ! $DC exec -T db pg_dump -U itam itam | gzip > "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE"
  die "Sao lưu thất bại. KHÔNG cập nhật gì cả - bản đang chạy vẫn nguyên vẹn.
       Gửi đoạn lỗi phía trên cho Claude Code."
fi

if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
  rm -f "$BACKUP_FILE"
  die "File sao lưu bị hỏng. KHÔNG cập nhật gì cả - bản đang chạy vẫn nguyên vẹn."
fi

BACKUP_BYTES="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
if [ "$BACKUP_BYTES" -lt 1000 ]; then
  rm -f "$BACKUP_FILE"
  die "File sao lưu nhỏ bất thường (${BACKUP_BYTES} byte) nên không đáng tin. KHÔNG cập nhật gì cả."
fi

info "OK - đã sao lưu $(du -h "$BACKUP_FILE" | cut -f1)."

# Xoá bớt bản cũ để không đầy ổ đĩa.
ls -1t "$BACKUP_DIR"/asst-*.sql.gz 2>/dev/null | tail -n "+$((KEEP_BACKUPS + 1))" | while read -r old; do
  rm -f "$old" && info "Đã xoá bản sao lưu cũ: $(basename "$old")"
done

# ---------------------------------------------------------------- Bước 2/5 ---
say "Bước 2/5 - Tải code mới từ GitHub"

if ! git pull --ff-only; then
  die "Không tải được code mới. Bản đang chạy vẫn nguyên vẹn, chưa có gì thay đổi.
       Thường do máy chủ và GitHub đã đi lệch nhau. Gửi đoạn lỗi phía trên cho Claude Code."
fi

NEW_COMMIT="$(git rev-parse --short HEAD)"
if [ "$NEW_COMMIT" = "$OLD_COMMIT" ]; then
  info "Không có code mới - vẫn ở bản $OLD_COMMIT. Sẽ dựng lại cho chắc."
else
  info "OK - $OLD_COMMIT -> $NEW_COMMIT"
  git --no-pager log --oneline "$OLD_COMMIT..$NEW_COMMIT" | sed 's/^/    /'
fi

# ---------------------------------------------------------------- Bước 3/5 ---
say "Bước 3/5 - Dựng lại ứng dụng (2-5 phút, nhiều dòng chữ là bình thường)"

if ! $DC up -d --build; then
  printf '\n'
  die "Dựng lại thất bại. Bản cũ nhiều khả năng vẫn đang chạy - kiểm tra bằng: $DC ps
       Gửi đoạn lỗi phía trên cho Claude Code.
       File sao lưu của bạn: $BACKUP_FILE"
fi
info "OK - đã dựng xong."

# ---------------------------------------------------------------- Bước 4/5 ---
say "Bước 4/5 - Chờ ứng dụng khởi động"

HEALTHY=0
for i in $(seq 1 "$HEALTH_TRIES"); do
  if $DC exec -T app node -e 'fetch("http://127.0.0.1:3000/").then(function(){process.exit(0)}).catch(function(){process.exit(1)})' >/dev/null 2>&1; then
    HEALTHY=1
    info "OK - ứng dụng đã trả lời (sau $((i * HEALTH_WAIT)) giây)."
    break
  fi
  printf '    ... đang chờ (%d/%d)\r' "$i" "$HEALTH_TRIES"
  sleep "$HEALTH_WAIT"
done
printf '\n'

if [ "$HEALTHY" -ne 1 ]; then
  printf '\n--- 40 dòng nhật ký cuối cùng ---\n'
  $DC logs --tail=40 app
  printf '\n'
  die "Ứng dụng không trả lời sau $((HEALTH_TRIES * HEALTH_WAIT)) giây.
       Copy toàn bộ đoạn nhật ký phía trên gửi cho Claude Code.

       Muốn quay về bản cũ ngay:
         git checkout $OLD_COMMIT && $DC up -d --build

       File sao lưu dữ liệu: $BACKUP_FILE"
fi

# ---------------------------------------------------------------- Bước 5/5 ---
say "Bước 5/5 - Tình trạng các container"
$DC ps

cat <<SUMMARY

=========================================================
 CẬP NHẬT THÀNH CÔNG
=========================================================
 Bản đang chạy : $NEW_COMMIT  (bản trước: $OLD_COMMIT)
 Sao lưu tại   : $BACKUP_FILE

 Việc cuối: mở trang web bằng trình duyệt, đăng nhập và
 bấm thử đúng chức năng vừa sửa. Nếu trình duyệt còn hiện
 giao diện cũ thì bấm Ctrl+F5.

 Nếu phát hiện hỏng, quay về bản cũ bằng:
   git checkout $OLD_COMMIT && $DC up -d --build
=========================================================

SUMMARY
