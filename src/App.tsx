/**
 * Studio Glow - AI Product Photographer
 * Version 1.2.0 - Product Workspace & Multi-level Reset
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  generateProductPhotoshoot,
  getPhotoshootHistory,
  rerenderPhotoshoot,
  variationPhotoshoot,
  deletePhotoshoot,
} from './services/geminiService';
import {
  saveUploadedProduct,
  getUploadedProducts,
  deleteUploadedProduct,
  incrementProductRenderCount,
} from './services/productWorkspaceService';
import { optimizeImage } from './services/imageUtils';
import ImageUploader from './components/ImageUploader';
import { RenderHistory } from './components/RenderHistory';
import { ProductUploadHistory } from './components/ProductUploadHistory';
import {
  AppState,
  PhotoshootJob,
  PhotoshootMetadata,
  UploadedProductAsset,
  SecondaryReferenceRole,
  CompositionMode
} from './types';
import { PHOTO_PRESETS } from './constants/photoPresets';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [mainProductImage, setMainProductImage] = useState<{ data: string; mimeType: string; name?: string } | null>(null);
  const [packagingImage, setPackagingImage] = useState<{ data: string; mimeType: string; name?: string } | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<string>('premium_bright_studio');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [outputQuality, setOutputQuality] = useState<string>('2k');
  const [secondaryRole, setSecondaryRole] = useState<SecondaryReferenceRole>('packaging');
  const [compositionMode, setCompositionMode] = useState<CompositionMode>('product_with_packaging');
  const [resultMetadata, setResultMetadata] = useState<PhotoshootMetadata | null>(null);

  // Product upload history state
  const [uploadedProducts, setUploadedProducts] = useState<UploadedProductAsset[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Render history state
  const [history, setHistory] = useState<PhotoshootJob[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Load product history from IndexedDB
  const loadProductHistory = useCallback(async () => {
    try {
      setIsProductsLoading(true);
      const items = await getUploadedProducts();
      setUploadedProducts(items);
    } catch (e) {
      console.warn('Could not load product upload history:', e);
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  // Load render history from server
  const loadRenderHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const jobs = await getPhotoshootHistory();
      setHistory(jobs);
    } catch (e) {
      console.warn('Could not load photoshoot history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProductHistory();
    loadRenderHistory();
  }, [loadProductHistory, loadRenderHistory]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleImageSelect = useCallback(
    async (file: File, index: 1 | 2) => {
      try {
        const optimized = await optimizeImage(file, 1536, 0.88);
        const imagePayload = { ...optimized, name: file.name };

        if (index === 1) {
          setMainProductImage(imagePayload);
          // Auto-save to Product Upload History
          const saved = await saveUploadedProduct({
            mainImageDataUrl: optimized.data,
            mainMimeType: optimized.mimeType,
            mainFileName: file.name,
            packagingImageDataUrl: packagingImage?.data,
            packagingMimeType: packagingImage?.mimeType,
            packagingFileName: packagingImage?.name,
            lastPresetId: selectedPreset,
          });
          setActiveProductId(saved.id);
          loadProductHistory();
        } else {
          setPackagingImage(imagePayload);
          if (mainProductImage) {
            const saved = await saveUploadedProduct({
              mainImageDataUrl: mainProductImage.data,
              mainMimeType: mainProductImage.mimeType,
              mainFileName: mainProductImage.name,
              packagingImageDataUrl: optimized.data,
              packagingMimeType: optimized.mimeType,
              packagingFileName: file.name,
              lastPresetId: selectedPreset,
            });
            setActiveProductId(saved.id);
            loadProductHistory();
          }
        }
        setProcessedImage(null);
        setAppState(AppState.IDLE);
        setError(null);
      } catch (e: any) {
        console.error('Image loading error', e);
        setError('Không thể đọc tệp hình ảnh. Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).');
      }
    },
    [mainProductImage, packagingImage, selectedPreset, loadProductHistory]
  );

  const handleRoleChange = (role: SecondaryReferenceRole) => {
    setSecondaryRole(role);
    switch (role) {
      case 'packaging':
        setCompositionMode('product_with_packaging');
        break;
      case 'smaller_size':
      case 'larger_size':
        setCompositionMode('two_sizes');
        break;
      case 'companion_product':
        setCompositionMode('product_pair');
        break;
      case 'background_packaging':
        setCompositionMode('packaging_background');
        break;
    }
  };

  const handleGeneratePhotoshoot = async () => {
    if (cooldown > 0) return;

    const imagesToProcess = [mainProductImage, packagingImage].filter(
      (img): img is { data: string; mimeType: string } => img !== null
    );
    if (imagesToProcess.length === 0) return;

    const effectiveCompositionMode = packagingImage ? compositionMode : 'single_product';

    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      const result = await generateProductPhotoshoot({
        images: imagesToProcess,
        presetId: selectedPreset,
        aspectRatio,
        outputQuality,
        secondaryRole: packagingImage ? secondaryRole : undefined,
        compositionMode: effectiveCompositionMode,
      });
      setProcessedImage(result.imageUrl);
      setResultMetadata(result.metadata || null);
      setAppState(AppState.COMPLETED);

      // Increment render count for current active product
      if (activeProductId) {
        await incrementProductRenderCount(activeProductId);
        loadProductHistory();
      }
      loadRenderHistory();
    } catch (err: any) {
      const msg = err.message || 'Đã xảy ra lỗi trong quá trình tạo ảnh. Vui lòng thử lại.';
      setError(msg);
      setAppState(AppState.ERROR);

      if (err.retryAfterSeconds) {
        setCooldown(err.retryAfterSeconds);
      }
      loadRenderHistory();
    }
  };

  const handleRerender = async (job: PhotoshootJob) => {
    if (actionInProgressId || appState === AppState.PROCESSING) return;
    setActionInProgressId(job.id);
    setError(null);

    try {
      const result = await rerenderPhotoshoot(job.id);
      setProcessedImage(result.imageUrl);
      setResultMetadata(result.metadata || null);
      setAppState(AppState.COMPLETED);
      loadRenderHistory();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Không thể render lại ảnh. Vui lòng thử lại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleVariation = async (job: PhotoshootJob) => {
    if (actionInProgressId || appState === AppState.PROCESSING) return;
    setActionInProgressId(job.id);
    setError(null);

    try {
      const result = await variationPhotoshoot(job.id);
      setProcessedImage(result.imageUrl);
      setResultMetadata(result.metadata || null);
      setAppState(AppState.COMPLETED);
      loadRenderHistory();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo biến thể ảnh. Vui lòng thử lại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeleteRenderJob = async (jobId: string) => {
    if (actionInProgressId) return;
    setActionInProgressId(jobId);

    try {
      await deletePhotoshoot(jobId);
      setHistory((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleClearRenderHistory = async () => {
    try {
      for (const job of history) {
        await deletePhotoshoot(job.id);
      }
      setHistory([]);
    } catch (e) {
      console.warn('Clear history error:', e);
    }
  };

  const handleSelectResult = (job: PhotoshootJob) => {
    if (!job.resultImageUrl) return;
    setProcessedImage(job.resultImageUrl);
    setResultMetadata({
      presetId: job.presetId,
      aspectRatio: job.aspectRatio,
      outputQuality: job.outputQuality,
      model: job.model,
      durationMs: job.durationMs,
    });
    setAppState(AppState.COMPLETED);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reuse product from Product Upload History
  const handleReuseProduct = (product: UploadedProductAsset) => {
    setMainProductImage({
      data: product.mainImageDataUrl,
      mimeType: product.mainMimeType || 'image/png',
      name: product.mainFileName,
    });

    if (product.packagingImageDataUrl) {
      setPackagingImage({
        data: product.packagingImageDataUrl,
        mimeType: product.packagingMimeType || 'image/png',
        name: product.packagingFileName,
      });
    } else {
      setPackagingImage(null);
    }

    if (product.lastPresetId) {
      setSelectedPreset(product.lastPresetId);
    }
    setActiveProductId(product.id);
    setProcessedImage(null);
    setAppState(AppState.IDLE);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProductAsset = async (id: string) => {
    await deleteUploadedProduct(id);
    if (activeProductId === id) {
      setActiveProductId(null);
    }
    loadProductHistory();
  };

  // Reuse source product from a Render History Job
  const handleReuseJobProduct = (job: PhotoshootJob) => {
    if (!job.mainImageUrl) return;

    setMainProductImage({
      data: job.mainImageUrl,
      mimeType: 'image/png',
      name: 'Product from History',
    });

    if (job.packagingImageUrl) {
      setPackagingImage({
        data: job.packagingImageUrl,
        mimeType: 'image/png',
        name: 'Secondary Image from History',
      });
      if (job.secondaryRole) setSecondaryRole(job.secondaryRole);
      if (job.compositionMode) setCompositionMode(job.compositionMode);
    } else {
      setPackagingImage(null);
      setCompositionMode('single_product');
    }

    setSelectedPreset(job.presetId || 'premium_bright_studio');
    setAspectRatio(job.aspectRatio || '1:1');
    setOutputQuality(job.outputQuality || '2k');
    setProcessedImage(null);
    setAppState(AppState.IDLE);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset Level 1: "Tạo ảnh khác" / "Reset kết quả" (Keeps uploaded product & settings)
  const handleResetResultOnly = () => {
    setProcessedImage(null);
    setResultMetadata(null);
    setError(null);
    setAppState(AppState.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset Level 2: "Reset cấu hình" (Keeps uploaded product, resets settings to defaults)
  const handleResetSettings = () => {
    setSelectedPreset('premium_bright_studio');
    setAspectRatio('1:1');
    setOutputQuality('2k');
    setSecondaryRole('packaging');
    setCompositionMode('product_with_packaging');
    setError(null);
    setCooldown(0);
  };

  // Reset Level 3: "Bắt đầu sản phẩm mới" (Clears workspace, keeps history)
  const handleStartNewProduct = () => {
    if (
      mainProductImage &&
      !window.confirm(
        'Bạn chắc chắn muốn bắt đầu sản phẩm mới? Ảnh upload hiện tại sẽ bị xoá khỏi workspace (sản phẩm cũ vẫn được lưu trong lịch sử upload).'
      )
    ) {
      return;
    }

    setMainProductImage(null);
    setPackagingImage(null);
    setProcessedImage(null);
    setResultMetadata(null);
    setActiveProductId(null);
    setError(null);
    setCooldown(0);
    setSelectedPreset('premium_bright_studio');
    setAspectRatio('1:1');
    setOutputQuality('2k');
    setSecondaryRole('packaging');
    setCompositionMode('product_with_packaging');
    setAppState(AppState.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasMainImage = mainProductImage !== null;
  const isGenerating = appState === AppState.PROCESSING;
  const isButtonDisabled = !hasMainImage || isGenerating || cooldown > 0;

  const getPresetLabel = (id?: string) =>
    PHOTO_PRESETS.find((p) => p.id === (id || selectedPreset))?.label || 'Custom';

  return (
    <div id="studio-glow-app" className="min-h-screen flex flex-col items-center py-12 px-4 bg-[#080808] text-white">
      {/* Header */}
      <header id="app-header" className="mb-10 text-center max-w-2xl">
        <div
          id="badge-indicator"
          className="inline-block px-3 py-1 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase mb-4"
        >
          Visual Analysis & 2K Rendering
        </div>
        <h1
          id="app-title"
          className="text-5xl md:text-6xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500"
        >
          Studio Glow <span className="text-indigo-400">2K</span>
        </h1>
        <p id="app-subtitle" className="text-zinc-400 text-base md:text-lg font-light">
          Chụp ảnh sản phẩm mỹ phẩm cao cấp tự động (Hỗ trợ mọi nhãn hàng).
        </p>
      </header>

      <main id="app-main-content" className="w-full max-w-5xl flex flex-col items-center gap-8">
        {/* Product Upload History (if any saved products exist) */}
        <ProductUploadHistory
          products={uploadedProducts}
          isLoading={isProductsLoading}
          onReuseProduct={handleReuseProduct}
          onDeleteProduct={handleDeleteProductAsset}
          activeProductId={activeProductId}
        />

        {/* Main Workspace Section */}
        {!processedImage ? (
          <section
            id="uploader-section"
            className="w-full max-w-3xl space-y-8 bg-zinc-900/30 p-6 md:p-10 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl"
          >
            {/* Header with Workspace Action */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 id="uploader-heading" className="text-xl md:text-2xl font-bold">
                  Thành phần chụp hình
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">Tải lên tối đa 2 ảnh tham chiếu sản phẩm của bạn.</p>
              </div>

              {hasMainImage && (
                <button
                  onClick={handleStartNewProduct}
                  className="text-xs font-semibold py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors"
                >
                  + Bắt đầu sản phẩm mới
                </button>
              )}
            </div>

            {/* Upload Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploader
                id="main-product"
                label="Main Product (Ảnh sản phẩm chính)"
                description="Ảnh chai/lọ/hũ sản phẩm chính cần chụp hình."
                onImageSelect={(file) => handleImageSelect(file, 1)}
                selectedImage={mainProductImage?.data || null}
                isLoading={appState === AppState.PROCESSING}
                isRequired={true}
              />
              <ImageUploader
                id="packaging-box"
                label="Secondary Reference (Ảnh phụ tuỳ chọn)"
                description="Có thể là vỏ hộp, chai size nhỏ/lớn hoặc sản phẩm khác cùng bộ."
                onImageSelect={(file) => handleImageSelect(file, 2)}
                selectedImage={packagingImage?.data || null}
                isLoading={appState === AppState.PROCESSING}
                isRequired={false}
              />
            </div>

            {/* Photo Settings Panel */}
            <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/80 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                  Cấu hình Studio (Photo Settings)
                </h3>
                <button
                  onClick={handleResetSettings}
                  title="Đặt lại cài đặt về mặc định"
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Reset cấu hình
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-2 md:col-span-3">
                  <label htmlFor="preset-select" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Phong cách ảnh (Preset)
                  </label>
                  <select
                    id="preset-select"
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    disabled={isGenerating}
                    className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm"
                  >
                    {PHOTO_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-1">
                  <label htmlFor="aspect-ratio-select" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Tỉ lệ ảnh
                  </label>
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
                  <label htmlFor="quality-select" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Chất lượng Render
                  </label>
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

                {/* Secondary Reference Role & Composition Controls */}
                {packagingImage && (
                  <div className="md:col-span-3 pt-3 border-t border-zinc-800/80 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="secondary-role-select" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          Ảnh phụ là gì?
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Chọn đúng loại ảnh ở ô thứ 2 để AI hiểu đó là vỏ hộp, size nhỏ, size lớn hay sản phẩm combo.
                        </p>
                        <select
                          id="secondary-role-select"
                          value={secondaryRole}
                          onChange={(e) => handleRoleChange(e.target.value as SecondaryReferenceRole)}
                          disabled={isGenerating}
                          className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm mt-1"
                        >
                          <option value="packaging">Vỏ hộp / Bao bì sản phẩm</option>
                          <option value="smaller_size">Chai/hũ size nhỏ</option>
                          <option value="larger_size">Chai/hũ size lớn</option>
                          <option value="companion_product">Sản phẩm khác cùng bộ</option>
                          <option value="background_packaging">Vỏ hộp đặt mờ phía sau</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="composition-mode-select" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          Muốn sắp xếp ảnh như thế nào?
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Chọn cách AI đặt sản phẩm chính và ảnh phụ trong ảnh cuối.
                        </p>
                        <select
                          id="composition-mode-select"
                          value={compositionMode}
                          onChange={(e) => setCompositionMode(e.target.value as CompositionMode)}
                          disabled={isGenerating}
                          className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm mt-1"
                        >
                          <option value="product_with_packaging">Sản phẩm chính + vỏ hộp</option>
                          <option value="two_sizes">Chai lớn + chai nhỏ</option>
                          <option value="product_pair">Bộ sản phẩm / Combo</option>
                          <option value="packaging_background">Vỏ hộp mờ phía sau</option>
                          <option value="single_product">Chỉ sản phẩm chính</option>
                        </select>
                      </div>
                    </div>

                    {/* Dynamic Helper Note */}
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300 flex flex-col gap-1.5">
                      <div className="flex items-start gap-2 text-zinc-400">
                        <span className="text-sm leading-none">💡</span>
                        <span className="leading-relaxed">
                          <strong className="text-indigo-200">Mẹo:</strong> Chọn đúng vai trò ảnh phụ giúp AI không biến vỏ hộp thành chai/lọ hoặc bỏ sót sản phẩm phụ.
                        </span>
                      </div>
                      <div className="pl-5 text-indigo-200 leading-relaxed border-t border-indigo-500/20 pt-1.5 mt-0.5">
                        {secondaryRole === 'packaging' &&
                          'Dùng khi ảnh phụ là hộp giấy, bao bì hoặc vỏ hộp. AI sẽ đặt hộp sau hoặc cạnh sản phẩm chính.'}
                        {secondaryRole === 'smaller_size' &&
                          'Dùng khi ảnh phụ là phiên bản mini/travel-size. AI sẽ đặt chai nhỏ cạnh chai chính.'}
                        {secondaryRole === 'larger_size' &&
                          'Dùng khi ảnh phụ là phiên bản dung tích lớn. AI sẽ đặt chai lớn và chai chính cạnh nhau.'}
                        {secondaryRole === 'companion_product' &&
                          'Dùng khi ảnh phụ là sản phẩm khác cùng bộ, ví dụ serum + cleanser.'}
                        {secondaryRole === 'background_packaging' &&
                          'Dùng khi bạn muốn vỏ hộp chỉ làm nền nhẹ phía sau, không nổi bật hơn sản phẩm chính.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
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

            {/* Error Banner */}
            {error && (
              <div id="error-banner" className="flex flex-col gap-3 p-5 bg-red-950/40 border border-red-800/50 rounded-2xl">
                <p className="text-red-300 text-sm text-center font-medium leading-relaxed">{error}</p>
                {error.includes('ai.studio/spend') || error.includes('chi tiêu') || error.includes('Spend Cap') ? (
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
          /* Result Section */
          <section id="result-section" className="w-full max-w-4xl flex flex-col items-center gap-8">
            <div
              id="result-card"
              className="w-full max-w-2xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col relative group"
            >
              <img
                id="result-image"
                src={processedImage}
                alt="Studio Result"
                className="w-full h-auto max-h-[80vh] object-contain bg-black"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase text-white w-max">
                  {resultMetadata?.outputQuality === '2k' || outputQuality === '2k'
                    ? '2K Studio Composition'
                    : 'Standard Composition'}
                </div>
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-medium tracking-wide text-zinc-300 w-max">
                  {getPresetLabel(resultMetadata?.presetId)} • {resultMetadata?.aspectRatio || aspectRatio}
                  {resultMetadata?.durationMs ? ` • ${(resultMetadata.durationMs / 1000).toFixed(1)}s` : ''}
                </div>
              </div>
            </div>

            {/* Result Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <a
                id="download-result-btn"
                href={processedImage}
                download="studio-glow-photoshoot-2k.png"
                className="flex-1 bg-white hover:bg-zinc-200 text-black py-4 px-6 rounded-2xl font-bold text-center transition-all active:scale-[0.98] shadow-md text-sm"
              >
                Tải ảnh HD
              </a>
              <button
                id="reset-state-btn"
                onClick={handleResetResultOnly}
                title="Giữ sản phẩm và tạo góc/phong cách khác"
                className="flex-1 py-4 px-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold transition-all active:scale-[0.98] text-sm"
              >
                Tạo ảnh khác
              </button>
            </div>
          </section>
        )}

        {/* Render History Section */}
        <RenderHistory
          history={history}
          isLoading={isHistoryLoading}
          onRerender={handleRerender}
          onVariation={handleVariation}
          onDelete={handleDeleteRenderJob}
          onSelectResult={handleSelectResult}
          onReuseProductFromJob={handleReuseJobProduct}
          onReuseJobProduct={handleReuseJobProduct}
          onClearHistory={handleClearRenderHistory}
          actionInProgressId={actionInProgressId}
        />
      </main>

      {/* Footer */}
      <footer
        id="app-footer"
        className="mt-20 text-zinc-600 text-xs font-semibold tracking-widest uppercase flex flex-col items-center gap-4"
      >
        <div className="h-px w-20 bg-zinc-800"></div>
        <div className="flex gap-8">
          <span>Intelligent Lighting</span>
          <span>Brand Preservation</span>
          <span>Studio Depth</span>
        </div>
        <div className="mt-4 opacity-50 text-[10px]">Studio Glow version: 1.2.0 (Production)</div>
      </footer>
    </div>
  );
};

export default App;
