import React from 'react';
import { PhotoshootJob } from '../types';
import { PHOTO_PRESETS } from '../constants/photoPresets';

interface RenderHistoryProps {
  history: PhotoshootJob[];
  isLoading: boolean;
  onRerender: (job: PhotoshootJob) => void;
  onVariation: (job: PhotoshootJob) => void;
  onDelete: (jobId: string) => void;
  onSelectResult: (job: PhotoshootJob) => void;
  onReuseJobProduct?: (job: PhotoshootJob) => void;
  onReuseProductFromJob?: (job: PhotoshootJob) => void;
  onClearHistory: () => void;
  actionInProgressId: string | null;
}

export const RenderHistory: React.FC<RenderHistoryProps> = ({
  history,
  isLoading,
  onRerender,
  onVariation,
  onDelete,
  onSelectResult,
  onReuseJobProduct,
  onReuseProductFromJob,
  onClearHistory,
  actionInProgressId
}) => {
  const handleReuse = onReuseProductFromJob || onReuseJobProduct;

  const getPresetName = (presetId: string) => {
    return PHOTO_PRESETS.find((p) => p.id === presetId)?.label || presetId;
  };

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

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử render của phiên làm việc này?')) {
      onClearHistory();
    }
  };

  return (
    <section id="history-section" className="w-full max-w-5xl space-y-6 mt-12">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Lịch sử Render</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold">
              {history.length}
            </span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1">Các ảnh render trong phiên làm việc hiện tại</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-zinc-500 hover:text-red-400 py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-900/50 transition-colors"
          >
            Xoá lịch sử phiên này
          </button>
        )}
      </div>

      {isLoading && history.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
          <div className="animate-spin h-5 w-5 border-2 border-zinc-600 border-t-white rounded-full mr-3"></div>
          <span>Đang tải lịch sử...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/20 rounded-3xl border border-zinc-800/60 p-8">
          <p className="text-zinc-500 text-sm">Chưa có ảnh render nào trong phiên này.</p>
          <p className="text-zinc-600 text-xs mt-1">Các ảnh bạn tạo sẽ tự động được lưu và hiển thị tại đây.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {history.map((job) => {
            const isProcessing = actionInProgressId === job.id;
            const hasImage = Boolean(job.resultImageUrl);
            const hasSourceImage = Boolean(job.mainImageUrl);

            return (
              <div
                key={job.id}
                className="bg-zinc-900/40 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col hover:border-zinc-700 transition-all group"
              >
                {/* Thumbnail & Badges */}
                <div
                  className="relative aspect-square bg-black overflow-hidden cursor-pointer flex items-center justify-center"
                  onClick={() => hasImage && onSelectResult(job)}
                >
                  {hasImage ? (
                    <img
                      src={job.resultImageUrl}
                      alt={getPresetName(job.presetId)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-zinc-600 text-xs flex flex-col items-center gap-2">
                      <span>Không có ảnh kết quả</span>
                      {job.status === 'FAILED' && (
                        <span className="text-red-400 text-[10px]">Lỗi render</span>
                      )}
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-zinc-300 border border-white/10">
                      {getPresetName(job.presetId)}
                    </span>
                    <span className="bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-semibold text-zinc-400 border border-white/10">
                      {job.aspectRatio}
                    </span>
                  </div>

                  {job.durationMs && (
                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-zinc-400 font-mono">
                      {(job.durationMs / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>

                {/* Info & Actions */}
                <div className="p-4 flex flex-col gap-3 flex-1 justify-between">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{formatDate(job.createdAt)}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        job.status === 'COMPLETED'
                          ? 'bg-green-950/60 text-green-400 border border-green-800/40'
                          : job.status === 'FAILED'
                          ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                          : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/60">
                    <div className="grid grid-cols-4 gap-1.5">
                      {hasImage ? (
                        <a
                          href={job.resultImageUrl}
                          download={`studio-glow-${job.id}.png`}
                          title="Tải ảnh về"
                          className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center transition-colors text-center"
                        >
                          Tải
                        </a>
                      ) : (
                        <div className="p-2 rounded-xl bg-zinc-800/30 text-zinc-600 text-xs flex items-center justify-center cursor-not-allowed">
                          Tải
                        </div>
                      )}

                      <button
                        onClick={() => onRerender(job)}
                        disabled={isProcessing}
                        title="Render lại với thông số gốc"
                        className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? '...' : 'Re-render'}
                      </button>

                      <button
                        onClick={() => onVariation(job)}
                        disabled={isProcessing}
                        title="Tạo biến thể góc/bố cục mới"
                        className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? '...' : 'Biến thể'}
                      </button>

                      <button
                        onClick={() => onDelete(job.id)}
                        disabled={isProcessing}
                        title="Xoá ảnh này"
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        Xoá
                      </button>
                    </div>

                    {hasSourceImage && handleReuse && (
                      <button
                        onClick={() => handleReuse(job)}
                        className="w-full py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors text-center"
                      >
                        ↩ Dùng lại sản phẩm này
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
