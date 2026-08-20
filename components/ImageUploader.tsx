
import React from 'react';

interface ImageUploaderProps {
  id: string;
  label: string;
  onImageSelect: (file: File) => void;
  selectedImage: string | null;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageSelect, selectedImage, isLoading }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 font-semibold">{label}</p>
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-4 transition-all duration-300 ${
          selectedImage ? 'border-zinc-500 bg-white/5' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'
        } flex flex-col items-center justify-center min-h-[220px] cursor-pointer group overflow-hidden`}
        onClick={() => !isLoading && document.getElementById(`fileInput-${id}`)?.click()}
      >
        <input 
          id={`fileInput-${id}`}
          type="file" 
          accept="image/png, image/jpeg" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isLoading}
        />
        
        {selectedImage ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="max-h-40 object-contain rounded-xl"
            />
            {!isLoading && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-sm">
                <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-zinc-800">
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-zinc-500 text-xs font-medium">Add PNG</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
