import { PhotoRecipe } from '../types';

export const generateProductPhotoshoot = async (
  recipe: PhotoRecipe
): Promise<string> => {
  const response = await fetch('/api/photoshoots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(recipe)
  });

  const contentType = response.headers.get("content-type");
  if (response.status === 404 || (contentType && contentType.includes("text/html"))) {
    throw new Error('Không tìm thấy endpoint /api/photoshoots. Bản publish hiện tại chưa chạy backend Node.js (Vui lòng deploy bản production qua Cloud Run).');
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error("Non-JSON Response", response.status, contentType);
    throw new Error('Backend API không khả dụng. Vui lòng deploy bản production qua Cloud Run.');
  }

  if (!response.ok) {
    let errorMsg = data.error || 'Đã xảy ra lỗi hệ thống.';
    
    switch (data.code) {
      case 'RATE_LIMIT':
        errorMsg = `Hệ thống AI đang bận. Vui lòng đợi ${data.retryAfterSeconds || 30} giây rồi thử lại.`;
        break;
      case 'MISSING_API_KEY':
        errorMsg = 'Server chưa cấu hình GEMINI_API_KEY.';
        break;
      case 'INVALID_API_KEY':
        errorMsg = 'API key không hợp lệ hoặc chưa được cấp quyền.';
        break;
      case 'TIMEOUT':
        errorMsg = 'Yêu cầu tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại với ảnh nhẹ hơn.';
        break;
      case 'REQUEST_IN_PROGRESS':
        errorMsg = 'Một yêu cầu tạo ảnh đang được xử lý. Vui lòng chờ hoàn tất.';
        break;
      case 'INVALID_IMAGE':
        errorMsg = 'Ảnh không hợp lệ. Vui lòng dùng PNG, JPG, JPEG hoặc WebP dưới 10MB.';
        break;
      case 'GEMINI_EMPTY_RESULT':
        errorMsg = 'Gemini không trả về ảnh. Vui lòng thử lại.';
        break;
      case 'UNKNOWN_ERROR':
        errorMsg = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
        break;
    }

    const err = new Error(errorMsg) as any;
    err.code = data.code;
    err.retryAfterSeconds = data.retryAfterSeconds;
    throw err;
  }

  if (!data.imageUrl) {
    throw new Error('No image returned from server.');
  }

  return data.imageUrl;
};
