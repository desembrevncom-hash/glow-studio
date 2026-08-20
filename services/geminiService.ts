const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processStudioImage = async (images: { data: string, mimeType: string }[]): Promise<string> => {
  return generateProductPhotoshoot(images);
};

export const generateProductPhotoshoot = async (images: { data: string, mimeType: string }[]): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch('/api/generate-photoshoot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
      }

      if (!data.imageUrl) {
        throw new Error('Không nhận được dữ liệu hình ảnh từ máy chủ.');
      }

      return data.imageUrl;
    } catch (error: any) {
      attempts++;
      const errorMessage = error?.message || '';

      const isRetryable =
        errorMessage.includes('429') ||
        errorMessage.includes('503') ||
        errorMessage.includes('quá tải') ||
        errorMessage.includes('tạm thời');

      if (isRetryable && attempts < maxAttempts) {
        const waitTime = attempts * 2000;
        await delay(waitTime);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Không thể tạo ảnh sau nhiều lần thử lại. Vui lòng thử lại sau giây lát.');
};
