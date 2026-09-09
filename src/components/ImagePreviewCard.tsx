import React from 'react';
import { Camera, X, CheckCircle2, Loader2 } from 'lucide-react';

interface ImagePreviewCardProps {
  imageUrl: string;
  isOcrLoading: boolean;
  onClear: () => void;
}

export const ImagePreviewCard: React.FC<ImagePreviewCardProps> = ({
  imageUrl,
  isOcrLoading,
  onClear,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 p-2 bg-blue-50/70 border border-blue-200 rounded-xl mb-2 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Image thumbnail */}
        <div className="relative w-12 h-10 rounded-lg overflow-hidden border border-blue-300 shrink-0 bg-white shadow-2xs">
          <img
            src={imageUrl}
            alt="OCR Target"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>画像 / スクリーンショット認識 (OCR)</span>
          </div>

          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {isOcrLoading ? (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                画像内の文字を高精度AI認識中 (Đang nhận dạng văn bản)...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                文字認識＆3言語翻訳完了 (Đã nhận dạng và dịch xong)
              </span>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={onClear}
        className="p-1 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-red-600 transition-colors shrink-0"
        title="画像をクリア (Xóa ảnh)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
