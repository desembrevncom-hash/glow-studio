import React from 'react';
import { UploadedProductAsset } from '../types';

interface ProductUploadHistoryProps {
  products: UploadedProductAsset[];
  isLoading: boolean;
  onReuseProduct: (product: UploadedProductAsset) => void;
  onDeleteProduct: (id: string) => void;
  activeProductId: string | null;
}

export const ProductUploadHistory: React.FC<ProductUploadHistoryProps> = ({
  products,
  isLoading,
  onReuseProduct,
  onDeleteProduct,
  activeProductId,
}) => {
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
      );
    } catch {
      return '';
    }
  };

  if (products.length === 0 && !isLoading) {
    return null; // Don't take up space if no uploaded products yet
  }

  return (
    <section id="product-upload-history-section" className="w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
            Lịch sử sản phẩm đã upload ({products.length})
          </h3>
        </div>
        <span className="text-[11px] text-zinc-500">Bấm "Dùng lại" để chụp tiếp mà không cần upload lại</span>
      </div>

      {isLoading && products.length === 0 ? (
        <div className="text-zinc-500 text-xs py-4 text-center">Đang tải sản phẩm...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {products.map((item) => {
            const isActive = activeProductId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'bg-indigo-950/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Main Product Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0">
                    <img
                      src={item.mainImageDataUrl}
                      alt={item.mainFileName || 'Main Product'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-center font-bold text-zinc-300 uppercase py-0.5">
                      Chính
                    </span>
                  </div>

                  {/* Packaging Thumbnail if available */}
                  {item.packagingImageDataUrl && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black border border-zinc-800 flex-shrink-0">
                      <img
                        src={item.packagingImageDataUrl}
                        alt="Packaging"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-center font-bold text-zinc-300 uppercase py-0.5">
                        Vỏ hộp
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {item.mainFileName || 'Sản phẩm mỹ phẩm'}
                    </span>
                    <span className="text-[10px] text-zinc-500">{formatDate(item.createdAt)}</span>
                    <div className="mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {item.renderCount || 0} ảnh đã tạo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-zinc-800/40">
                  <button
                    onClick={() => onReuseProduct(item)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    {isActive ? 'Đang chọn' : 'Dùng lại'}
                  </button>
                  <button
                    onClick={() => onDeleteProduct(item.id)}
                    title="Xoá sản phẩm này khỏi lịch sử upload"
                    className="p-1.5 px-2.5 rounded-xl bg-zinc-900/80 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 text-xs transition-colors"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
