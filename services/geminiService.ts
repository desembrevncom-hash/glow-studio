const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processStudioImage = async (images: { data: string, mimeType: string }[]): Promise<string> => {
  return generateProductPhotoshoot(images);
};

export const generateProductPhotoshoot = async (
  images: { data: string; mimeType: string }[],
  customPrompt?: string
): Promise<string> => {
  const response = await fetch('/api/generate-photoshoot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ images, customPrompt })
  });

  const data = await response.json();

  if (!response.ok) {
    let errorMsg = data.error || 'Failed to generate image from server.';
    
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
