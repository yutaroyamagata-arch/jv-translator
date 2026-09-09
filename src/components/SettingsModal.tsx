import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, Eye, EyeOff, HelpCircle, ShieldCheck, Lock, LockKeyhole } from 'lucide-react';
import { AppSettings, TranslationTone } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onLockAdmin?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onLockAdmin,
}) => {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [tone, setTone] = useState<TranslationTone>(settings.tone || 'business');
  const [model, setModel] = useState(
    settings.model && !settings.model.includes('2.0') && !settings.model.includes('1.5') && !settings.model.includes('2.5')
      ? settings.model
      : 'gemini-3.5-flash-lite'
  );
  const [adminPassword, setAdminPassword] = useState(settings.adminPassword || 'admin');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [hideSettingsButton, setHideSettingsButton] = useState(Boolean(settings.hideSettingsButton));
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      geminiApiKey: apiKey.trim(),
      tone,
      model,
      adminPassword: adminPassword.trim() || 'admin',
      hideSettingsButton,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                管理者専用設定 (Cài đặt Quản trị viên)
              </h2>
              <p className="text-xs text-slate-500">
                Google Gemini 無料枠連携 (Hoàn toàn miễn phí 100%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Gemini API Key Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Google AI Studio API Key (無料 / Miễn phí)</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  無料枠 (Miễn phí)
                </span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium"
              >
                <span>無料キー取得 (Lấy mã)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* How to get key explanation */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                無料キーの取得手順 (Cách lấy mã API miễn phí - 1 phút):
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed text-slate-600">
                <li>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline font-medium"
                  >
                    Google AI Studio
                  </a>{' '}
                  にGoogleアカウントでログイン（クレジットカード不要 / Không cần thẻ tín dụng）。
                </li>
                <li>「Create API key」をクリックして「Default Gemini Project」を選択。</li>
                <li>表示されたキーを上記に貼り付けて保存してください。</li>
              </ol>
              <div className="pt-1 border-t border-slate-200/80 flex items-center gap-1 text-[11px] text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>キーはあなたの端末内のみに安全保存されます (Chỉ lưu an toàn trên trình duyệt này).</span>
              </div>
            </div>
          </div>

          {/* Translation Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              翻訳エンジンモデル (Mô hình AI)
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
            >
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (推奨・最高精度＆超高速 / Khuyên dùng)</option>
              <option value="gemini-flash-lite-latest">Gemini Flash Lite 最新版 (Tự động cập nhật)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ổn định)</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash (Tiêu chuẩn)</option>
            </select>
          </div>

          {/* Translation Tone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              標準の文体・トーン (Văn phong dịch thuật)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTone('business')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tone === 'business'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span>💼</span> ビジネス・丁寧語
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Lịch sự / Công việc<br />
                  <span className="text-[10px] text-slate-400">敬語・丁寧語・Trang trọng</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTone('casual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tone === 'casual'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span>💬</span> カジュアル・絵文字
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Thân mật / Biểu cảm 😊<br />
                  <span className="text-[10px] text-rose-500 font-medium">絵文字・顔文字を豊富に使用</span>
                </div>
              </button>
            </div>
          </div>

          {/* Administrator Security Settings Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>管理者アクセス制御 (Bảo mật cho riêng bạn)</span>
            </div>

            {/* Change Admin Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                管理者パスワードの変更 (Đổi mật khẩu quản trị):
              </label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="新しいパスワードを入力..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Toggle Hide Settings Button on Header */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSettingsButton}
                  onChange={(e) => setHideSettingsButton(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-amber-900">
                  ヘッダーの設定ボタンを非表示にする (Ẩn nút Cài đặt trên menu)
                </span>
              </label>
              <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
                チェックを入れるとスタッフの画面に「設定」ボタンが表示されなくなります。<br />
                <strong>※あなたが再度設定を開く方法:</strong> 左上の「JV」ロゴを3回連続クリックするか、キーボードで <kbd className="bg-white px-1 py-0.5 rounded border border-amber-300 text-[10px] font-mono font-bold">Ctrl + Shift + S</kbd> を押せば開けます。
              </p>
            </div>

            {/* Lock Now button */}
            {onLockAdmin && (
              <button
                type="button"
                onClick={() => {
                  onLockAdmin();
                  onClose();
                }}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 underline pt-1"
              >
                <LockKeyhole className="w-3.5 h-3.5" />
                <span>今すぐ管理者権限をロックする (Khóa quyền quản trị ngay)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            キャンセル (Đóng)
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>保存しました (Đã lưu)</span>
              </>
            ) : (
              <span>設定を保存 (Lưu cài đặt)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
