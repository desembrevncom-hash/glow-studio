<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-huCv5bYEEiQoufkD9SrlJoQNYLAKKsD

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment Rules

**IMPORTANT:** Do NOT use the old AI Studio 'Publish' button for production. AI Studio publish only hosts static frontend files and does not run the required Node.js backend (/api/photoshoots).

To deploy this application correctly:
1. **GitHub + Cloud Run = Production:** Connect this GitHub repository to Google Cloud Run.
2. Cloud Run will automatically build using the included `Dockerfile` and serve the full stack on port 8080.
3. Set environment variables in Cloud Run:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `GCS_BUCKET_NAME` = (optional, for persistent Google Cloud Storage)

## Architecture & Storage Notes (MVP vs Production)

- **Current MVP Mode:** Photoshoot job history is managed via `studio_glow_session_id` in localStorage and an In-Memory Repository on the Node.js server.
- **Stateless Cloud Run Notice:** Because Cloud Run instances are stateless and ephemeral, in-memory render history and data URLs do not persist across instance restarts or scale-to-zero events.
- **Production Roadmap:** For permanent, multi-user storage:
  1. Configure **Google Cloud Storage** (`GCS_BUCKET_NAME`) in `server/services/storageService.ts` to store uploaded/generated image assets as durable URLs.
  2. Connect **Google Cloud Firestore**, **PostgreSQL**, or **Supabase** in `server/services/photoshootRepository.ts` for persistent database records.

## Cost Optimization (Tối ưu chi phí tạo ảnh)

Chi phí render hình ảnh chất lượng cao 2K khoảng **$0.101/ảnh (~2.700đ)**. Để tối ưu chi phí và tăng tốc độ làm việc:

1. **Workflow khuyến nghị (Preview trước, HD sau):**
   - **Thử nghiệm bố cục:** Chọn chất lượng `Preview tiết kiệm (0.5K)` (~$0.045 / ~1.200đ) hoặc `Standard (1K)` (~$0.067 / ~1.800đ) để thử góc máy, ánh sáng và kiểm tra bố cục sản phẩm.
   - **Xuất ảnh chất lượng cao:** Sau khi đã chọn được bố cục ưng ý trong *Lịch sử Render*, bấm nút **✨ Nâng cấp HD (2K)** để AI tạo ảnh 2K cuối cùng phục vụ in ấn hoặc quảng cáo.
2. **Lưu ý tính phí:**
   - Mỗi lần bấm **Generate**, **Re-render**, **Biến thể (Variation)**, hoặc **Nâng cấp HD (Upscale)** đều gửi một yêu cầu tạo ảnh mới đến AI và tính chi phí tương ứng với mức chất lượng được chọn.
   - Khi Re-render hoặc tạo Biến thể từ ảnh 2K, hệ thống sẽ hiển thị hộp thoại xác nhận để người dùng có thể chủ động chuyển về mức *Standard* tiết kiệm chi phí nếu muốn.

## API Endpoints

- `GET /api/health` - Server health check & version info
- `POST /api/photoshoots` - Create a new photoshoot (returns `jobId`, `imageUrl`, and `metadata`)
- `GET /api/photoshoots/history?sessionId=...` - Get render history for a session
- `GET /api/photoshoots/:id` - Get specific photoshoot job details
- `POST /api/photoshoots/:id/rerender` - Re-run photoshoot with exact original recipe (supports quality override)
- `POST /api/photoshoots/:id/variation` - Generate an alternative composition variation (supports quality override)
- `POST /api/photoshoots/:id/upscale` - Upscale an existing photoshoot to 2K HD resolution
- `DELETE /api/photoshoots/:id` - Delete a photoshoot job


