import React, { useState, useCallback, useEffect } from 'react';
import { generateProductPhotoshoot } from './services/geminiService';
import { optimizeImage } from './services/imageUtils';
import ImageUploader from './components/ImageUploader';
import { AppState } from './types';
import { PHOTO_PRESETS } from './constants/photoPresets';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [mainProductImage, setMainProductImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [packagingImage, setPackagingImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = useCallback(async (file: File, index: 1 | 2) => {
    try {
      const optimized = await optimizeImage(file, 1536, 0.88);
      if (index === 1) {
        setMainProductImage(optimized);
      } else {
        setPackagingImage(optimized);
      }
      setProcessedImage(null);
      setAppState(AppState.IDLE);
      setError(null);
    } catch (e: any) {
      console.error("Image loading error", e);
      setError("Không thể đọc tệp hình ảnh. Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).");
    }
  }, []);

  const [cooldown, setCooldown] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<string>('premium_bright_studio');
  const [aspectRatio, setAspectRatio] = useState<string>('4:5');
  const [outputQuality, setOutputQuality] = useState<string>('2k');

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGeneratePhotoshoot = async () => {
    if (cooldown > 0) return;

    const imagesToProcess = [mainProductImage, packagingImage].filter((img): img is { data: string, mimeType: string } => img !== null);
    if (imagesToProcess.length === 0) return;

    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      const resultUrl = await generateProductPhotoshoot({
        images: imagesToProcess,
        presetId: selectedPreset,
        aspectRatio,
        outputQuality
      });
      setProcessedImage(resultUrl);
      setAppState(AppState.COMPLETED);
    } catch (err: any) {
      const msg = err.message || "Đã xảy ra lỗi trong quá trình tạo ảnh. Vui lòng thử lại.";
      setError(msg);
      setAppState(AppState.ERROR);

      if (err.retryAfterSeconds) {
        setCooldown(err.retryAfterSeconds);
      }
    } finally {
      if (appState === AppState.PROCESSING) {
        setAppState(AppState.IDLE);
      }
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setMainProductImage(null);
    setPackagingImage(null);
    setProcessedImage(null);
    setError(null);
    setCooldown(0);
  };

  const hasMainImage = mainProductImage !== null;
  const isGenerating = appState === AppState.PROCESSING;
  const isButtonDisabled = !hasMainImage || isGenerating || cooldown > 0;
  
  const getSelectedPresetName = () => PHOTO_PRESETS.find(p => p.id === selectedPreset)?.label || 'Custom';

  return (
    <div id="studio-glow-app" className="min-h-screen flex flex-col items-center py-12 px-4 bg-[#080808] text-white">
      <header id="app-header" className="mb-12 text-center max-w-2xl">
        <div id="badge-indicator" className="inline-block px-3 py-1 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase mb-4">
          Visual Analysis & 2K Rendering
        </div>
        <h1 id="app-title" className="text-5xl md:text-6xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
          Studio Glow <span className="text-indigo-400">2K</span>
        </h1>
        <p id="app-subtitle" className="text-zinc-400 text-base md:text-lg font-light">
          Chụp ảnh sản phẩm mỹ phẩm cao cấp tự động (Hỗ trợ mọi nhãn hàng).
        </p>
      </header>

      <main id="app-main-content" className="w-full max-w-5xl flex flex-col items-center gap-8">
        {!processedImage ? (
          <section id="uploader-section" className="w-full max-w-3xl space-y-8 bg-zinc-900/30 p-6 md:p-10 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl">
            <div className="text-center space-y-2">
              <h2 id="uploader-heading" className="text-xl md:text-2xl font-bold">Thành phần chụp hình</h2>
              <p className="text-zinc-400 text-sm">Tải lên tối đa 2 ảnh tham chiếu sản phẩm của bạn.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploader
                id="main-product"
                label="Main Product (Ảnh sản phẩm chính)"
                onImageSelect={(file) => handleImageSelect(file, 1)}
                selectedImage={mainProductImage?.data || null}
                isLoading={appState === AppState.PROCESSING}
                isRequired={true}
              />
              <ImageUploader
                id="packaging-box"
                label="Box or Packaging (Vỏ hộp / Bao bì phụ)"
                onImageSelect={(file) => handleImageSelect(file, 2)}
                selectedImage={packagingImage?.data || null}
                isLoading={appState === AppState.PROCESSING}
                isRequired={false}
              />
            </div>

            <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/80 space-y-5">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-3">Cấu hình Studio (Photo Settings)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-2 md:col-span-3">
                  <label htmlFor="preset-select" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Phong cách ảnh (Preset)</label>
                  <select 
                    id="preset-select"
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    disabled={isGenerating}
                    className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm"
                  >
                    {PHOTO_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-1">
                  <label htmlFor="aspect-ratio-select" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tỉ lệ ảnh</label>
                  <select 
                    id="aspect-ratio-select"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    disabled={isGenerating}
                    className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm"
                  >
                    <option value="1:1">1:1 (Vuông)</option>
                    <option value="4:5">4:5 (Dọc FB/Insta)</option>
                    <option value="9:16">9:16 (Story/TikTok)</option>
                    <option value="16:9">16:9 (Ngang)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="quality-select" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chất lượng Render</label>
                  <select 
                    id="quality-select"
                    value={outputQuality}
                    onChange={(e) => setOutputQuality(e.target.value)}
                    disabled={isGenerating}
                    className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm"
                  >
                    <option value="2k">Ultra HD (2K) - Chi tiết cao</option>
                    <option value="standard">Standard - Nhanh chóng</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              id="generate-photoshoot-btn"
              onClick={handleGeneratePhotoshoot}
              disabled={isButtonDisabled}
              className={`w-full py-6 px-8 rounded-[2rem] font-black text-xl transition-all duration-500 flex items-center justify-center gap-4 ${
                isButtonDisabled
                  ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50'
                  : 'bg-white text-black hover:bg-zinc-100 shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.97]'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-6 w-6 border-4 border-black/10 border-t-black rounded-full"></div>
                  <span>Đang dựng ảnh cao cấp 2K...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Thử lại sau {cooldown}s</span>
              ) : (
                'Generate Product Photoshoot'
              )}
            </button>

            {error && (
              <div id="error-banner" className="flex flex-col gap-3 p-5 bg-red-950/40 border border-red-800/50 rounded-2xl">
                <p className="text-red-300 text-sm text-center font-medium leading-relaxed">
                  {error}
                </p>
                {error.includes("ai.studio/spend") || error.includes("chi tiêu") || error.includes("Spend Cap") ? (
                  <a
                    id="spend-cap-link"
                    href="https://ai.studio/spend"
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all self-center text-center inline-block"
                  >
                    Mở trang quản lý Spend Cap (ai.studio/spend) ↗
                  </a>
                ) : null}
                <button
                  id="retry-button"
                  onClick={handleGeneratePhotoshoot}
                  className="py-2.5 px-5 bg-red-900/50 hover:bg-red-800 text-red-100 rounded-xl text-xs font-bold transition-all self-center"
                >
                  Thử lại ngay
                </button>
              </div>
            )}
          </section>
        ) : (
          <section id="result-section" className="w-full max-w-4xl flex flex-col items-center gap-8">
            <div id="result-card" className="w-full max-w-2xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col relative group">
              <img
                id="result-image"
                src={processedImage}
                alt="Studio Result"
                className="w-full h-auto max-h-[80vh] object-contain bg-black"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white w-max">
                  2K Studio Composition
                </div>
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-medium tracking-wide text-zinc-300 w-max">
                  {getSelectedPresetName()} • {aspectRatio}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <a
                id="download-result-btn"
                href={processedImage}
                download="studio-glow-photoshoot-2k.png"
                className="flex-1 bg-white hover:bg-zinc-200 text-black py-4 px-6 rounded-2xl font-bold text-center transition-all active:scale-[0.98] shadow-md text-sm"
              >
                Download HD
              </a>
              <button
                id="reset-state-btn"
                onClick={reset}
                className="flex-1 py-4 px-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold transition-all active:scale-[0.98] text-sm"
              >
                Reset & New Photo
              </button>
            </div>
          </section>
        )}
      </main>

      <footer id="app-footer" className="mt-20 text-zinc-600 text-xs font-semibold tracking-widest uppercase flex flex-col items-center gap-4">
        <div className="h-px w-20 bg-zinc-800"></div>
        <div className="flex gap-8">
          <span>Intelligent Lighting</span>
          <span>Brand Preservation</span>
          <span>Studio Depth</span>
        </div>
        <div className="mt-4 opacity-50 text-[10px]">
          Studio Glow version: 1.1.0 (Production)
        </div>
      </footer>
    </div>
  );
};

export default App;
