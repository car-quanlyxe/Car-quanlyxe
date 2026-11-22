# CAR RENTAL — bộ mã nguồn triển khai

Tên dự án Vercel đã chọn: **car_quanlyxe**  
Tên miền `.vercel.app` cụ thể sẽ do Vercel hiển thị sau khi deploy. Tên dự án là `car_quanlyxe`; địa chỉ được cấp có thể phụ thuộc quy tắc tên miền và tình trạng khả dụng.

## 1. Có gì trong phiên bản này?

- Giao diện web responsive cho điện thoại và máy tính.
- Đăng nhập bằng tài khoản Supabase (không mở đăng ký công khai).
- Quản lý xe, khách hàng, lịch thuê, bảo dưỡng và thu/chi.
- Trang tổng quan: số xe, lịch nhận/trả hôm nay, công nợ, tổng thu/chi.
- Chặn lịch thuê trùng cùng một xe ở tầng cơ sở dữ liệu PostgreSQL.
- Phân quyền dữ liệu theo tài khoản bằng Supabase Row Level Security (RLS).

## 2. Lưu ý trước khi đưa dữ liệu thật vào

Đây là bộ khung ứng dụng để triển khai và tiếp tục hoàn thiện, chưa phải phần mềm kế toán hay hệ thống quản lý hồ sơ pháp lý hoàn chỉnh. Hãy nhờ cha mẹ/người lớn chịu trách nhiệm tạo và quản lý tài khoản dịch vụ, thiết lập thanh toán và rà soát bảo mật trước khi sử dụng thực tế.

**Không nhập hoặc tải CCCD, ảnh giấy tờ, hợp đồng có thông tin nhạy cảm lên bản thử nghiệm.** Bản hiện tại chỉ lưu tên, số điện thoại, email và ghi chú khách hàng; chưa có chức năng tải hợp đồng/CCCD. Chỉ bổ sung lưu trữ giấy tờ sau khi người lớn phụ trách xác định căn cứ pháp lý, mục đích, thời hạn lưu, quyền truy cập và phương án xóa/backup an toàn. Không đưa mật khẩu, khóa bí mật hoặc dữ liệu khách hàng vào mã nguồn công khai.

## 3. Chuẩn bị tài khoản và dịch vụ

Người lớn phụ trách nên tạo/quản lý:
1. Tài khoản GitHub để lưu mã nguồn.
2. Tài khoản Supabase để lưu dữ liệu trực tuyến.
3. Tài khoản Vercel để triển khai website.

Tài liệu chính thức:
- Vercel Git deployments: https://vercel.com/docs/git
- Vercel project domains: https://vercel.com/docs/domains/working-with-domains
- Supabase bắt đầu: https://supabase.com/docs/guides/getting-started

## 4. Tạo cơ sở dữ liệu Supabase

1. Đăng nhập Supabase và tạo một project mới.
2. Chọn khu vực phù hợp, đặt mật khẩu database mạnh và lưu ở nơi an toàn do người lớn quản lý.
3. Mở **SQL Editor** trong project.
4. Mở tệp `supabase/schema.sql` trong bộ mã nguồn, sao chép toàn bộ nội dung và chạy.
5. Vào **Project Settings → API** (hoặc mục API Keys theo giao diện hiện tại), sao chép Project URL và publishable key/anon key. Đây là hai giá trị dùng ở frontend; tuyệt đối không dùng `service_role` key trong trình duyệt.
6. Vào **Authentication → Users** và tạo một người dùng bằng email/mật khẩu cho chủ xe. Giữ đăng ký công khai tắt; không chia sẻ tài khoản.

## 5. Chạy thử trên máy tính

Cài Node.js phiên bản LTS trước. Mở Terminal/PowerShell tại thư mục dự án:

```bash
npm install
```

Tạo file tên `.env` ở thư mục gốc (cùng cấp `package.json`) với nội dung:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Thay hai giá trị mẫu bằng Project URL và publishable/anon key lấy từ Supabase. Không dán các giá trị này vào cuộc trò chuyện công khai. Không bao giờ đặt `service_role` key ở biến `VITE_...`.

Sau đó chạy:

```bash
npm run dev
```

Mở địa chỉ local mà Vite hiển thị, thường là `http://localhost:5173`.

Kiểm tra: đăng nhập, thêm một xe, thêm khách hàng thử, tạo lịch thuê. Thử tạo lịch thứ hai trùng giờ cho cùng xe; database phải từ chối lịch trùng. Dùng dữ liệu giả khi kiểm thử.

## 6. Đưa mã nguồn lên GitHub

1. Tạo repository GitHub mới, ví dụ `car_quanlyxe`.
2. Mở terminal trong thư mục dự án, chạy:

```bash
git init
git add .
git commit -m "Initial CAR RENTAL app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_ACCOUNT/car_quanlyxe.git
git push -u origin main
```

Thay `YOUR_GITHUB_ACCOUNT` bằng tên tài khoản GitHub. Kiểm tra `.env` không bị đưa lên GitHub; `.gitignore` đã loại trừ file này.

## 7. Deploy lên Vercel

1. Đăng nhập Vercel bằng tài khoản do người lớn phụ trách quản lý.
2. Chọn **Add New → Project**, import repository `car_quanlyxe` từ GitHub.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Trong phần **Environment Variables**, thêm:
   - `VITE_SUPABASE_URL` = Project URL của Supabase
   - `VITE_SUPABASE_ANON_KEY` = publishable/anon key
5. Chọn Deploy.
6. Khi deploy hoàn tất, Vercel cấp URL dạng `car-quanlyxe.vercel.app` nếu project slug đó còn khả dụng. Nếu đã có người dùng tên này, chọn slug khác trong phần Settings → Domains.
7. Mỗi lần cập nhật mã và push lên nhánh main, Vercel có thể tự build/deploy lại theo cấu hình Git.

## 8. Kiểm tra sau triển khai

- Mở URL Vercel trên điện thoại và máy tính.
- Đăng nhập bằng tài khoản đã tạo trong Supabase.
- Thêm dữ liệu giả để kiểm tra các màn hình.
- Kiểm tra lịch trùng xe, sửa/xóa dữ liệu và đăng xuất.
- Nếu màn hình báo chưa kết nối, kiểm tra Environment Variables rồi redeploy.
- Nếu đăng nhập lỗi, kiểm tra tài khoản trong Supabase Authentication và URL/key.

## 9. Phần cần hoàn thiện tiếp trước khi dùng vận hành

Bản starter chưa bao gồm:
- Nhập dữ liệu trực tiếp từ Excel; cần làm bước nhập CSV/XLSX và kiểm tra dữ liệu trước khi ghi.
- Tệp hợp đồng, biên bản bàn giao và lưu trữ giấy tờ riêng tư.
- Báo cáo doanh thu/lợi nhuận theo tháng có đối soát với lịch thuê.
- Nhắc lịch tự động qua email/Zalo.
- Phân quyền nhiều nhân viên, nhật ký thao tác, quy trình backup/khôi phục.
- Kiểm tra chuyên sâu về pháp lý, bảo mật, quyền riêng tư và thuế.

Đặc biệt: số liệu “chênh lệch thu - chi” trên dashboard là tổng giao dịch thu trừ tổng giao dịch chi đã nhập, không tự động tính toàn bộ lợi nhuận theo hợp đồng.

## 10. Cấu trúc thư mục

```text
CAR_RENTAL_car_quanlyxe/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── README_VI.md
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── lib/supabase.js
└── supabase/
    └── schema.sql
```
