import React, { useState, useCallback, useEffect } from 'react';
import { generateProductPhotoshoot } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import { AppState } from './types';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // State variables renamed from mainAmpouleImage -> mainProductImage and productBoxImage -> packagingImage
  const [mainProductImage, setMainProductImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [packagingImage, setPackagingImage] = useState<{ data: string, mimeType: string } | null>(null);
  
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = useCallback((file: File, index: 1 | 2) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      if (index === 1) {
        setMainProductImage({ data, mimeType: file.type });
      } else {
        setPackagingImage({ data, mimeType: file.type });
      }
      
      // Reset toàn bộ state kết quả cũ sau mỗi lần upload mới để tránh lưu ngữ cảnh cũ
      setProcessedImage(null);
      setAppState(AppState.IDLE);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Function renamed to reflect senior requirement (generate2KShot -> generateProductPhotoshoot)
  const handleGeneratePhotoshoot = async () => {
    const imagesToProcess = [mainProductImage, packagingImage].filter((img): img is { data: string, mimeType: string } => img !== null);
    
    if (imagesToProcess.length === 0) return;

    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      // Calls the stateless brand-independent photoshoot generator
      const resultUrl = await generateProductPhotoshoot(imagesToProcess);
      setProcessedImage(resultUrl);
      setAppState(AppState.COMPLETED);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi trong quá trình tạo ảnh.");
      setAppState(AppState.ERROR);
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setMainProductImage(null);
    setPackagingImage(null);
    setProcessedImage(null);
    setError(null);
  };

  const hasImages = mainProductImage !== null || packagingImage !== null;

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 bg-[#080808] text-white">
      <header className="mb-16 text-center max-w-2xl animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-4">
          Visual Analysis & 2K Rendering
        </div>
        <h1 className="text-6xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-600">
          Studio Glow <span className="text-indigo-400">2K</span>
        </h1>
        <p className="text-zinc-500 text-lg font-light tracking-wide">
          Chụp ảnh sản phẩm mỹ phẩm cao cấp tự động (Hỗ trợ mọi nhãn hàng).
        </p>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center gap-12">
        {!processedImage ? (
          <section className="w-full max-w-3xl space-y-10 bg-zinc-900/20 p-8 md:p-12 rounded-[3rem] border border-zinc-800/50 backdrop-blur-2xl shadow-2xl">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Thành phần chụp hình</h2>
              <p className="text-zinc-500 text-sm">Tải lên tối đa 2 ảnh tham chiếu sản phẩm hiện tại của bạn.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploader 
                id="one"
                label="Main Product (Ảnh sản phẩm chính)"
                onImageSelect={(file) => handleImageSelect(file, 1)} 
                selectedImage={mainProductImage?.data || null} 
                isLoading={appState === AppState.PROCESSING}
              />
              <ImageUploader 
                id="two"
                label="Box or Packaging (Vỏ hộp / Bao bì phụ)"
                onImageSelect={(file) => handleImageSelect(file, 2)} 
                selectedImage={packagingImage?.data || null} 
                isLoading={appState === AppState.PROCESSING}
              />
            </div>

            <button
              onClick={handleGeneratePhotoshoot}
              disabled={!hasImages || appState === AppState.PROCESSING}
              className={`w-full py-6 px-8 rounded-[2rem] font-black text-xl transition-all duration-500 flex items-center justify-center gap-4 ${
                !hasImages || appState === AppState.PROCESSING
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50'
                  : 'bg-white text-black hover:bg-zinc-100 shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.97]'
              }`}
            >
              {appState === AppState.PROCESSING ? (
                <>
                  <div className="animate-spin h-6 w-6 border-4 border-black/10 border-t-black rounded-full"></div>
                  <span>Đang dựng ảnh cao cấp 2K...</span>
                </>
              ) : (
                'Generate Product Photoshoot'
              )}
            </button>

            {error && (
              <div className="flex flex-col gap-4 p-6 bg-red-950/30 border border-red-900/40 rounded-3xl animate-in zoom-in duration-300">
                <p className="text-red-400 text-sm text-center font-medium leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={handleGeneratePhotoshoot}
                  className="py-3 px-6 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Thử lại ngay
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="w-full animate-in fade-in zoom-in duration-1000 flex flex-col items-center gap-12">
            <div className="w-full max-w-4xl aspect-square bg-[#0c0c0c] rounded-[4rem] border border-zinc-800/50 shadow-[0_50px_120px_-20px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center relative group">
              <img 
                src={processedImage} 
                alt="Studio Result" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/5 text-[10px] font-black tracking-[0.2em] uppercase text-white/80">
                2K Studio Composition
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full max-w-lg">
              <a 
                href={processedImage} 
                download="studio-composition-2k.png"
                className="flex-[2] bg-white hover:bg-zinc-200 text-black py-5 px-10 rounded-3xl font-black text-center transition-all active:scale-[0.95] shadow-xl"
              >
                Download HD
              </a>
              <button 
                onClick={reset}
                className="flex-1 px-10 py-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all font-black text-zinc-400 active:scale-[0.95]"
              >
                Reset
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-32 text-zinc-800 text-[10px] font-black tracking-[0.3em] uppercase flex flex-col items-center gap-8">
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
        <div className="flex gap-12">
          <span>Intelligent Scaling</span>
          <span>Box Recognition</span>
          <span>Pro Perspective</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
