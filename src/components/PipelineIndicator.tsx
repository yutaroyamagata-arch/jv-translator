import React from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { SupportedLang } from '../types';

interface PipelineIndicatorProps {
  sourceLang: SupportedLang;
  isLoading: boolean;
  durationMs?: number;
}

export const PipelineIndicator: React.FC<PipelineIndicatorProps> = ({
  sourceLang,
  isLoading,
  durationMs,
}) => {
  const renderFlow = () => {
    if (sourceLang === 'ja') {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
          <span className="font-semibold text-slate-700">🇯🇵 日本語</span>
          <ArrowRight className={`w-3 h-3 text-blue-500 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0 font-bold">
            ✨ AI深層文脈翻訳
          </span>
          <ArrowRight className={`w-3 h-3 text-blue-500 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
            🇻🇳 ベトナム語 & 🇬🇧 英語
          </span>
        </div>
      );
    } else if (sourceLang === 'vi') {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
          <span className="font-semibold text-slate-700">🇻🇳 Tiếng Việt</span>
          <ArrowRight className={`w-3 h-3 text-blue-500 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0 font-bold">
            ✨ AI深層文脈翻訳
          </span>
          <ArrowRight className={`w-3 h-3 text-blue-500 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
            🇯🇵 日本語（敬語） & 🇬🇧 英語
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
          <span className="font-semibold text-slate-700">🇬🇧 English</span>
          <ArrowRight className={`w-3 h-3 text-blue-500 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0 font-bold">
            ✨ AI深層文脈翻訳
          </span>
          <ArrowRight className={`w-3 h-3 text-blue-500 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
            🇻🇳 Tiếng Việt & 🇯🇵 日本語
          </span>
        </div>
      );
    }
  };

  return (
    <div className="bg-slate-100/80 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center justify-between gap-2 shrink-0 text-xs">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-bold text-slate-500 shrink-0">フロー:</span>
        {renderFlow()}
      </div>

      <div className="shrink-0 text-[11px]">
        {isLoading ? (
          <div className="flex items-center gap-1 text-blue-600 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>翻訳中...</span>
          </div>
        ) : durationMs ? (
          <div className="flex items-center gap-1 text-emerald-700 font-mono text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{(durationMs / 1000).toFixed(2)}s</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
