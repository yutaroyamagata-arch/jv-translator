import React from 'react';
import { X, Trash2, Clock, Copy, Check, ShieldCheck } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem?: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onClearHistory,
  onDeleteItem,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteItem) {
      onDeleteItem(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-700" />
            <div>
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span>翻訳履歴</span>
                <span className="text-xs font-normal text-slate-500">/ Lịch sử dịch</span>
              </h2>
            </div>
            <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full" title="最大30件まで保持 (Tối đa 30 mục)">
              {history.length} / 30件
            </span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1 border border-slate-200"
                title="履歴をすべて完全消去 (Xóa tất cả)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>全消去 (Xóa hết)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Information leakage protection banner */}
        <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-start gap-2 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong className="text-emerald-950 font-bold">情報漏洩防止（直近30件のみ保持）:</strong>
            <p className="mt-0.5 text-emerald-800">
              機密保持のため、履歴は<strong>直近30件のみ</strong>自動保存され、古い履歴は自動的に完全抹消されます。
              また、外部サーバーには保存されず、お使いの端末内（ブラウザ）にのみ隔離保存されます。
            </p>
            <p className="text-emerald-700 text-[10px] mt-0.5">
              (Chỉ lưu tối đa 30 mục gần nhất để bảo mật thông tin, mục cũ tự động xóa vĩnh viễn.)
            </p>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <p className="font-medium">翻訳履歴はありません</p>
              <p className="mt-1 text-slate-400">Chưa có lịch sử dịch thuật</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all space-y-2 group relative"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600 uppercase">
                    {item.sourceLang} ➔ {item.target1.lang} & {item.target2.lang}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {onDeleteItem && (
                      <button
                        onClick={(e) => handleDeleteSingle(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="この項目を削除 (Xóa mục này)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Source text snippet */}
                <p className="text-xs text-slate-800 line-clamp-2 font-medium">
                  {item.sourceText}
                </p>

                {/* Output snippet */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {item.target1.text}
                  </p>
                  <button
                    onClick={(e) => handleCopy(e, item.target1.text, item.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0"
                    title="コピー (Sao chép)"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
