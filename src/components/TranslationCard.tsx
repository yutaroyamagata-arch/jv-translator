import React, { useState, useEffect } from 'react';
import { Copy, Check, Volume2, VolumeX } from 'lucide-react';
import { TranslationTarget } from '../types';

interface TranslationCardProps {
  target: TranslationTarget;
  isPrimary?: boolean;
}

export const TranslationCard: React.FC<TranslationCardProps> = ({
  target,
  isPrimary = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!target.text) return;
    try {
      await navigator.clipboard.writeText(target.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSpeech = () => {
    if (!('speechSynthesis' in window) || !target.text) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(target.text);

    if (target.lang === 'ja') {
      utterance.lang = 'ja-JP';
    } else if (target.lang === 'vi') {
      utterance.lang = 'vi-VN';
    } else if (target.lang === 'en') {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const charCount = target.text.length;
  const lineCount = target.text ? target.text.split('\n').length : 0;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 flex flex-col bg-white overflow-hidden shadow-2xs h-full min-h-0 ${
        isPrimary
          ? 'border-blue-300 ring-2 ring-blue-500/10'
          : 'border-slate-200'
      }`}
    >
      {/* Header bar */}
      <div className="px-3 py-1.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base" role="img" aria-label={target.labelJa}>
            {target.flag}
          </span>
          <div className="truncate">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1 truncate">
              <span>{target.labelJa}</span>
              <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">
                ({target.labelVi})
              </span>
            </h3>
          </div>

          {target.isPivotBridge && (
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              英語経由 (Bridge)
            </span>
          )}
          {isPrimary && (
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
              目的言語 (Đích)
            </span>
          )}
        </div>

        {/* Card action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Audio TTS button */}
          <button
            onClick={handleSpeech}
            disabled={!target.text}
            className={`p-1 rounded-md border transition-all text-xs flex items-center ${
              isPlayingAudio
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border-slate-200'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="音声読み上げ (Phát âm)"
          >
            {isPlayingAudio ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!target.text}
            className={`px-2 py-1 rounded-md font-medium text-[11px] flex items-center gap-1 transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 active:scale-95'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="翻訳文をコピー (Sao chép)"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-white stroke-[2.5]" />
                <span className="font-semibold">コピー済</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span>コピー</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body content with strict formatting preservation */}
      <div className="p-3 flex-1 flex flex-col justify-between overflow-y-auto min-h-0 bg-white">
        <div className="whitespace-pre-wrap break-words font-sans text-[13px] sm:text-[14px] leading-relaxed text-slate-800 selection:bg-blue-100">
          {target.text || (
            <span className="text-slate-400 italic text-xs">
              翻訳結果がここに表示されます (Kết quả dịch sẽ hiển thị ở đây)
            </span>
          )}
        </div>

        {/* Footer info */}
        {target.text && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
            <span>
              {charCount} 文字 • {lineCount} 行
            </span>
            <span className="text-[10px] text-slate-400">
              改行・書式保持済
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
