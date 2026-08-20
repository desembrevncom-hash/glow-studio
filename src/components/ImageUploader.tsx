import React, { useState } from 'react';

interface ImageUploaderProps {
  id: string;
  label: string;
  description?: string;
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
  isLoading: boolean;
  isRequired?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  label,
  description,
  onImageSelect,
  selectedImage,
  isLoading,
  isRequired = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  return (
    <div id={`uploader-container-${id}`} className="w-full flex flex-col justify-between">
      <div className="mb-2.5">
        <div className="flex items-center justify-between">
          <p id={`uploader-label-${id}`} className="text-zinc-300 text-xs uppercase tracking-wider font-semibold">
            {label}
          </p>
          <span
            className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
              isRequired ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {isRequired ? 'Bắt buộc' : 'Tuỳ chọn'}
          </span>
        </div>
        {description && (
          <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
            {description}
          </p>
        )}
      </div>
      <div
        id={`dropzone-${id}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : selectedImage
            ? 'border-zinc-700 bg-zinc-900/60'
            : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
        } flex flex-col items-center justify-center min-h-[200px] cursor-pointer group overflow-hidden`}
        onClick={() => !isLoading && document.getElementById(`fileInput-${id}`)?.click()}
      >
        <input
          id={`fileInput-${id}`}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {selectedImage ? (
          <div id={`preview-wrapper-${id}`} className="relative w-full h-full flex items-center justify-center">
            <img
              id={`preview-img-${id}`}
              src={selectedImage}
              alt="Preview"
              className="max-h-40 object-contain rounded-lg"
            />
            {!isLoading && (
              <div
                id={`hover-overlay-${id}`}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm"
              >
                <span className="text-white text-xs font-semibold uppercase tracking-wider">Thay đổi ảnh</span>
              </div>
            )}
          </div>
        ) : (
          <div id={`empty-state-${id}`} className="text-center p-4">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform border border-zinc-700">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-zinc-300 text-xs font-medium">Chọn hoặc kéo thả ảnh (PNG, JPG, WebP)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
