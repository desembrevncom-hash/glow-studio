import { PhotoRecipe, PhotoshootResponse, PhotoshootJob } from '../types';
import { getSessionId } from '../utils/session';

function parseErrorMessage(data: any): string {
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
    case 'SPEND_CAP_EXCEEDED':
      errorMsg = 'Dự án của bạn đã đạt hạn mức chi tiêu hàng tháng (Monthly Spend Cap). Vui lòng điều chỉnh hạn mức tại https://ai.studio/spend để tiếp tục.';
      break;
    case 'UNKNOWN_ERROR':
      errorMsg = data.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      break;
  }
  return errorMsg;
}

export const generateProductPhotoshoot = async (
  recipe: PhotoRecipe
): Promise<PhotoshootResponse> => {
  const sessionId = recipe.sessionId || getSessionId();

  const response = await fetch('/api/photoshoots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...recipe,
      sessionId
    })
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
    const errorMsg = parseErrorMessage(data);
    const err = new Error(errorMsg) as any;
    err.code = data.code;
    err.retryAfterSeconds = data.retryAfterSeconds;
    throw err;
  }

  if (!data.imageUrl) {
    throw new Error('Không nhận được hình ảnh từ máy chủ.');
  }

  return {
    success: true,
    jobId: data.jobId,
    imageUrl: data.imageUrl,
    metadata: data.metadata
  };
};

export const getPhotoshootHistory = async (sessionId?: string): Promise<PhotoshootJob[]> => {
  const sid = sessionId || getSessionId();
  const response = await fetch(`/api/photoshoots/history?sessionId=${encodeURIComponent(sid)}`);
  
  if (!response.ok) {
    throw new Error('Không thể tải lịch sử render.');
  }

  const data = await response.json();
  return data.jobs || [];
};

export const rerenderPhotoshoot = async (
  jobId: string,
  sessionId?: string,
  outputQuality?: string
): Promise<PhotoshootResponse> => {
  const sid = sessionId || getSessionId();
  const response = await fetch(`/api/photoshoots/${jobId}/rerender`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sid, outputQuality })
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(parseErrorMessage(data)) as any;
    err.code = data.code;
    throw err;
  }

  return {
    success: true,
    jobId: data.jobId,
    imageUrl: data.imageUrl,
    metadata: data.metadata
  };
};

export const variationPhotoshoot = async (
  jobId: string,
  sessionId?: string,
  outputQuality?: string
): Promise<PhotoshootResponse> => {
  const sid = sessionId || getSessionId();
  const response = await fetch(`/api/photoshoots/${jobId}/variation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sid, outputQuality })
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(parseErrorMessage(data)) as any;
    err.code = data.code;
    throw err;
  }

  return {
    success: true,
    jobId: data.jobId,
    imageUrl: data.imageUrl,
    metadata: data.metadata
  };
};

export const upscalePhotoshoot = async (jobId: string, sessionId?: string): Promise<PhotoshootResponse> => {
  const sid = sessionId || getSessionId();
  const response = await fetch(`/api/photoshoots/${jobId}/upscale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sid })
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(parseErrorMessage(data)) as any;
    err.code = data.code;
    throw err;
  }

  return {
    success: true,
    jobId: data.jobId,
    imageUrl: data.imageUrl,
    metadata: data.metadata
  };
};

export const deletePhotoshoot = async (jobId: string): Promise<boolean> => {
  const sessionId = getSessionId();
  const response = await fetch(`/api/photoshoots/${jobId}?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Không thể xoá photoshoot.');
  }

  const data = await response.json();
  return data.success;
};
