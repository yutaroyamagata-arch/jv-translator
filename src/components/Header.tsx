import React, { useRef } from 'react';
import { History } from 'lucide-react';
import { TranslationTone } from '../types';
import { HEART_ICON_DATA_URL } from '../assets/iconData';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  tone: TranslationTone;
  onChangeTone: (tone: TranslationTone) => void;
  hasApiKey: boolean;
  hideSettingsButton?: boolean;
  onSecretAdminTrigger?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenHistory,
  tone,
  onChangeTone,
  onSecretAdminTrigger,
}) => {
  const logoClickCountRef = useRef(0);
  const logoClickTimerRef = useRef<any>(null);

  const handleLogoClick = () => {
    logoClickCountRef.current += 1;
    if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);

    if (logoClickCountRef.current >= 3) {
      logoClickCountRef.current = 0;
      if (onSecretAdminTrigger) {
        onSecretAdminTrigger();
      } else {
        onOpenSettings();
      }
      return;
    }

    // 2.0 second window to comfortably register 3 clicks
    logoClickTimerRef.current = setTimeout(() => {
      logoClickCountRef.current = 0;
    }, 2000);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs shrink-0 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
        {/* Logo and title */}
        <div className="flex items-center gap-2 min-w-0">
          {/* JV Mark with Heart photo background - 3 clicks trigger Admin Settings */}
          <button
            onClick={handleLogoClick}
            className="relative w-8 h-8 rounded-lg overflow-hidden shadow-xs border border-slate-300 shrink-0 select-none active:scale-90 transition-all bg-slate-200 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 group"
            title="JVマーク（3回連打で設定画面を表示）"
          >
            <img
              src={HEART_ICON_DATA_URL}
              alt="JV"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-black text-[11px] tracking-wider drop-shadow-md">
              JV
            </span>
          </button>

          <div className="flex items-center gap-1.5 truncate">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1 truncate">
              <span>日越英 翻訳</span>
              <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
                / Dịch Nhật-Việt
              </span>
            </h1>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hidden md:inline shrink-0">
              AI高精度ビジネス翻訳
            </span>
          </div>
        </div>

        {/* Right actions: Tone switcher + History (NO Settings button visible) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Tone Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200 text-[11px]">
            <button
              onClick={() => onChangeTone('business')}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                tone === 'business'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ビジネス・丁寧語 (Lịch sự)"
            >
              💼 ビジネス
            </button>
            <button
              onClick={() => onChangeTone('casual')}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                tone === 'casual'
                  ? 'bg-white text-rose-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="カジュアル・絵文字 (Thân mật 😊)"
            >
              💬 カジュアル😊
            </button>
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 text-[11px] font-medium"
            title="翻訳履歴 (Lịch sử)"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">履歴</span>
          </button>
        </div>
      </div>
    </header>
  );
};
