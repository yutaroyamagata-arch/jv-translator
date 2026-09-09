import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Loader2,
  Trash2,
  Clipboard,
  AlertCircle,
  Copy,
  Check,
  Camera
} from 'lucide-react';
import { Header } from './components/Header';
import { TranslationCard } from './components/TranslationCard';
import { PipelineIndicator } from './components/PipelineIndicator';
import { ImagePreviewCard } from './components/ImagePreviewCard';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AdminAuthModal } from './components/AdminAuthModal';
import {
  AppSettings,
  HistoryItem,
  SourceLangOption,
  SupportedLang,
  TranslationResult,
  TranslationTarget,
  TranslationTone,
} from './types';
import { detectLanguage, executeTranslation, getLanguageMetadata } from './services/translator';
import { detectTeencode } from './services/teencode';
import { executeOcrTranslation } from './services/ocrTranslator';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || '',
  tone: 'business',
  model: 'gemini-3.5-flash-lite',
  adminPassword: 'admin',
  hideSettingsButton: true,
};



export const App: React.FC = () => {
  // Persistence states
  const [settings, setSettings] = useState<AppSettings>(() => {
    const envKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY || '').trim();
    try {
      const saved = localStorage.getItem('jv_trans_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.geminiApiKey && envKey) {
          parsed.geminiApiKey = envKey;
        }
        if (!parsed.model || parsed.model.includes('2.0') || parsed.model.includes('1.5') || parsed.model.includes('2.5') || parsed.model === 'gemini-3.5-flash') {
          parsed.model = 'gemini-3.5-flash-lite';
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return { ...DEFAULT_SETTINGS, geminiApiKey: envKey };
    } catch {
      return { ...DEFAULT_SETTINGS, geminiApiKey: envKey };
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('jv_trans_history');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch {
      return [];
    }
  });

  // Editor states
  const [sourceText, setSourceText] = useState('');
  const [sourceLangOption, setSourceLangOption] = useState<SourceLangOption>('auto');
  const [activeSourceLang, setActiveSourceLang] = useState<SupportedLang>('ja');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedBoth, setCopiedBoth] = useState(false);

  // OCR & Image state
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin access control states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('jv_admin_unlocked') === 'true';
  });
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState<number>(() => {
    const saved = localStorage.getItem('jv_trans_input_height');
    return saved ? parseInt(saved, 10) : 110;
  });

  const handleSetInputHeight = (h: number) => {
    setInputHeight(h);
    localStorage.setItem('jv_trans_input_height', h.toString());
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('jv_trans_settings', JSON.stringify(settings));
  }, [settings]);

  // Save history when changed (strictly limited to max 30 items for information protection)
  useEffect(() => {
    localStorage.setItem('jv_trans_history', JSON.stringify(history.slice(0, 30)));
  }, [history]);

  // Handle language detection dynamically
  useEffect(() => {
    if (sourceLangOption === 'auto') {
      const detected = detectLanguage(sourceText);
      setActiveSourceLang(detected);
    } else {
      setActiveSourceLang(sourceLangOption);
    }
  }, [sourceText, sourceLangOption]);

  const handleRequestOpenSettings = useCallback(() => {
    if (isAdminUnlocked) {
      setIsSettingsOpen(true);
    } else {
      setIsAdminAuthOpen(true);
    }
  }, [isAdminUnlocked]);

  // Keyboard shortcut Ctrl + Shift + S and URL query param (?admin=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1' || params.get('admin') === 'true') {
      handleRequestOpenSettings();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleRequestOpenSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestOpenSettings]);

  const runTranslation = useCallback(async (textToTranslate: string) => {
    const trimmed = textToTranslate.trim();
    if (!trimmed) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Determine language synchronously right at execution time!
    const effectiveLang = sourceLangOption === 'auto' ? detectLanguage(trimmed) : sourceLangOption;
    setActiveSourceLang(effectiveLang);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);
    setIsLoading(true);

    try {
      const translation = await executeTranslation(
        trimmed,
        effectiveLang,
        settings,
        (partialResult) => {
          setResult(partialResult);
        },
        controller.signal
      );

      setResult(translation);

      // Save to local history (max 30 items)
      const newHistoryItem: HistoryItem = {
        id: translation.id,
        timestamp: translation.timestamp,
        sourceLang: translation.sourceLang,
        sourceText: translation.sourceText,
        target1: {
          lang: translation.target1.lang,
          text: translation.target1.text,
        },
        target2: {
          lang: translation.target2.lang,
          text: translation.target2.text,
        },
      };

      setHistory((prev) => [newHistoryItem, ...prev.filter((i) => i.sourceText !== translation.sourceText)].slice(0, 30));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Translation error:', err);
      setError(err.message || '翻訳処理中にエラーが発生しました (Đã xảy ra lỗi dịch thuật).');
    } finally {
      setIsLoading(false);
    }
  }, [sourceLangOption, settings]);

  // Update active source language indicator dynamically as user types
  useEffect(() => {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      setResult(null);
      setError(null);
      return;
    }
    if (sourceLangOption === 'auto') {
      const detected = detectLanguage(trimmed);
      setActiveSourceLang(detected);
    }
  }, [sourceText, sourceLangOption]);

  // Handle image processing with Gemini Multimodal Vision OCR
  const handleProcessImage = useCallback(async (dataUrlOrBase64: string) => {
    setActiveImage(dataUrlOrBase64);
    setIsOcrLoading(true);
    setError(null);
    try {
      const mime = dataUrlOrBase64.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
      const ocrResult = await executeOcrTranslation(
        dataUrlOrBase64,
        mime,
        settings
      );
      setSourceText(ocrResult.extractedText);
      setActiveSourceLang(ocrResult.detectedLang);
      setSourceLangOption(ocrResult.detectedLang);
      setResult(ocrResult.translation);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err.message || '画像からの文字読み取りに失敗しました (Lỗi nhận dạng ảnh).');
    } finally {
      setIsOcrLoading(false);
    }
  }, [settings]);

  // Global paste handler (supports both text and images from Win+Shift+S snipping tool)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                handleProcessImage(base64);
              }
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handleProcessImage]);

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            handleProcessImage(base64);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Trigger screen snip / file selector
  const handleTriggerScreenCapture = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.selectImage) {
      try {
        const dataUrl = await electronAPI.selectImage();
        if (dataUrl) {
          handleProcessImage(dataUrl);
        }
      } catch (err) {
        console.error('Failed to select image', err);
      }
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          handleProcessImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setActiveImage(null);
    setIsOcrLoading(false);
  };

  const handleManualTranslate = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    runTranslation(sourceText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleManualTranslate();
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && (navigator.clipboard as any).read) {
        try {
          const clipboardItems = await (navigator.clipboard as any).read();
          for (const item of clipboardItems) {
            const imageType = item.types.find((t: string) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target?.result as string;
                if (base64) {
                  handleProcessImage(base64);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        } catch {
          // Fallback to text reading
        }
      }

      const text = await navigator.clipboard.readText();
      setSourceText(text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      if (text.trim()) {
        runTranslation(text.trim());
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSourceText('');
    setActiveImage(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
    setIsOcrLoading(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleToneChange = (tone: TranslationTone) => {
    setSettings((prev) => ({ ...prev, tone }));
  };


  // One-Click copy BOTH languages at once
  const handleCopyBoth = async () => {
    if (!result || !result.target1.text) return;
    const t1 = result.target1;
    const t2 = result.target2;

    const formattedBoth = `[${t1.labelJa} / ${t1.labelVi}]\n${t1.text}\n\n[${t2.labelJa} / ${t2.labelVi}]\n${t2.text}`;
    try {
      await navigator.clipboard.writeText(formattedBoth);
      setCopiedBoth(true);
      setTimeout(() => setCopiedBoth(false), 2200);
    } catch (err) {
      console.error('Failed to copy both', err);
    }
  };

  const hasApiKey = Boolean(settings.geminiApiKey && settings.geminiApiKey.trim().length > 0);

  // Teencode detection status
  const teencodeInfo = detectTeencode(sourceText);

  // Default placeholder targets so all 3 languages are ALWAYS visible on screen simultaneously!
  const defaultTarget1: TranslationTarget = {
    lang: activeSourceLang === 'vi' ? 'ja' : 'vi',
    labelJa: activeSourceLang === 'vi' ? '日本語' : 'ベトナム語',
    labelVi: activeSourceLang === 'vi' ? 'Tiếng Nhật' : 'Tiếng Việt',
    flag: activeSourceLang === 'vi' ? '🇯🇵' : '🇻🇳',
    text: '',
  };

  const defaultTarget2: TranslationTarget = {
    lang: activeSourceLang === 'en' ? 'ja' : 'en',
    labelJa: activeSourceLang === 'en' ? '日本語' : '英語',
    labelVi: activeSourceLang === 'en' ? 'Tiếng Nhật' : 'Tiếng Anh',
    flag: activeSourceLang === 'en' ? '🇯🇵' : '🇬🇧',
    text: '',
    isPivotBridge: activeSourceLang !== 'en',
  };

  const currentTarget1 = result ? result.target1 : defaultTarget1;
  const currentTarget2 = result ? result.target2 : defaultTarget2;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* Hidden file input for web fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header Bar (Ultra-compact, single line) */}
      <Header
        onOpenSettings={handleRequestOpenSettings}
        onOpenHistory={() => setIsHistoryOpen(true)}
        tone={settings.tone}
        onChangeTone={handleToneChange}
        hasApiKey={hasApiKey}
        hideSettingsButton={settings.hideSettingsButton && !isAdminUnlocked}
        onSecretAdminTrigger={handleRequestOpenSettings}
      />

      {/* Main Container: 3-Language All-In-View Dashboard */}
      <main className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col gap-2 min-h-0 max-w-7xl w-full mx-auto">
        {/* PANEL 1: SOURCE INPUT PANEL (言語①: 入力原文) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={`bg-white rounded-xl border shadow-2xs overflow-hidden flex flex-col shrink-0 transition-all ${
            isDraggingOver
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
              : 'border-slate-200/90 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10'
          }`}
        >
          {/* Top Bar of Input: Language Selector Tabs + Instant Toggle + Quick buttons */}
          <div className="px-2.5 py-1.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            {/* Language Selector Pills */}
            <div className="flex items-center gap-0.5 bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-medium">
              <button
                onClick={() => setSourceLangOption('auto')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  sourceLangOption === 'auto'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>自動 (Tự động)</span>
                {sourceLangOption === 'auto' && sourceText.trim() && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-bold">
                    {getLanguageMetadata(activeSourceLang).flag}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSourceLangOption('ja')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  sourceLangOption === 'ja'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇯🇵 日本語</span>
              </button>

              <button
                onClick={() => setSourceLangOption('vi')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  sourceLangOption === 'vi'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇻🇳 Tiếng Việt</span>
              </button>

              <button
                onClick={() => setSourceLangOption('en')}
                className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                  sourceLangOption === 'en'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇬🇧 English</span>
              </button>
            </div>

            {/* Quick Actions (Paste, OCR Camera, Clear) */}
            <div className="flex items-center gap-1 text-[11px]">
              {/* One-Shot OCR Camera Button */}
              <button
                onClick={handleTriggerScreenCapture}
                className="px-2 py-0.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors flex items-center gap-1 text-[11px] font-medium"
                title="画像ファイル選択または画面切り抜きOCR翻訳 (Ctrl+Vで画像貼り付けも可能)"
              >
                <Camera className="w-3 h-3 text-blue-600" />
                <span>📷 画像/画面OCR</span>
              </button>

              <button
                onClick={handlePaste}
                className="px-2 py-0.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1 text-[11px]"
                title="クリップボードから貼り付け（文字またはスクリーンショット画像 Ctrl+V）"
              >
                <Clipboard className="w-3 h-3 text-slate-500" />
                <span>貼り付け</span>
              </button>

              {(sourceText || activeImage) && (
                <button
                  onClick={handleClear}
                  className="px-2 py-0.5 text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition-colors flex items-center gap-1 text-[11px]"
                  title="クリア (Xóa)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>クリア</span>
                </button>
              )}
            </div>
          </div>

          {/* Image preview if active image loaded */}
          {activeImage && (
            <div className="px-2 pt-2 bg-white">
              <ImagePreviewCard
                imageUrl={activeImage}
                isOcrLoading={isOcrLoading}
                onClear={handleClearImage}
              />
            </div>
          )}

          {/* Textarea: Resizable with memory */}
          <div className="relative p-2 bg-white">
            <textarea
              ref={textareaRef}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseUp={(e) => {
                const currentHeight = e.currentTarget.offsetHeight;
                if (currentHeight && Math.abs(currentHeight - inputHeight) > 4) {
                  handleSetInputHeight(currentHeight);
                }
              }}
              style={{ height: `${inputHeight}px` }}
              placeholder={
                activeSourceLang === 'ja'
                  ? '日本語を入力・貼り付け、または画像を貼り付け (Ctrl+V) / ドラッグしてください...'
                  : activeSourceLang === 'vi'
                  ? 'Nhập tiếng Việt (hỗ trợ giải mã Teencode/tiếng lóng: ko, dc, j, ntn, bjo, hnay, r...)'
                  : 'Enter English text (press Ctrl+Enter or click AI Translate)...'
              }
              className="w-full resize-y min-h-[70px] max-h-[460px] text-[13px] sm:text-[14px] leading-relaxed text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent overflow-y-auto"
            />
          </div>

          {/* Teencode Decipher Info Banner */}
          {teencodeInfo.isTeencode && (
            <div className="px-2.5 py-1 bg-amber-50/90 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-amber-900">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold shrink-0 flex items-center gap-1">
                  <span>📱</span>
                  <span>若手チャット略語 (Teencode) を自動解読:</span>
                </span>
                <span className="text-amber-800 truncate font-mono text-[10.5px]">
                  {result?.normalizedVi ? result.normalizedVi : teencodeInfo.normalizedPreview}
                </span>
              </div>
              <span className="text-[10px] bg-amber-200 text-amber-900 font-semibold px-1.5 py-0.2 rounded shrink-0">
                標準語復元済
              </span>
            </div>
          )}

          {/* Bottom Bar of Input */}
          <div className="px-3 py-1.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{sourceText.length} 文字</span>
              <span>•</span>
              <span>{sourceText ? sourceText.split(/\r\n|\r|\n/).length : 0} 行</span>
              <span className="text-slate-300">|</span>

              {/* Height Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 font-medium">高さ:</span>
                <button
                  type="button"
                  onClick={() => handleSetInputHeight(80)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] border transition-colors cursor-pointer ${
                    inputHeight <= 95
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="入力欄の高さ: 標準 (80px)"
                >
                  標準
                </button>
                <button
                  type="button"
                  onClick={() => handleSetInputHeight(150)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] border transition-colors cursor-pointer ${
                    inputHeight > 95 && inputHeight <= 190
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="入力欄の高さ: 中 (150px)"
                >
                  中
                </button>
                <button
                  type="button"
                  onClick={() => handleSetInputHeight(240)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] border transition-colors cursor-pointer ${
                    inputHeight > 190
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="入力欄の高さ: 広め (240px)"
                >
                  広め
                </button>
              </div>

              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Ctrl + Enter</kbd> で即時翻訳
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualTranslate}
                disabled={isLoading || !sourceText.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                title="AI高精度ビジネス翻訳を実行 (Ctrl + Enter)"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI高精度翻訳中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>AI翻訳を実行 (Dịch)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE BAR: Pipeline & Prominent "2言語まとめて一括コピー" Button */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0 px-1">
          {/* Pipeline flow */}
          <div className="flex-1 min-w-[200px]">
            <PipelineIndicator
              sourceLang={activeSourceLang}
              isLoading={isLoading || isOcrLoading}
              durationMs={result?.durationMs}
            />
          </div>

          {/* ONE-CLICK COPY BOTH LANGUAGES BUTTON */}
          <button
            onClick={handleCopyBoth}
            disabled={!result || !result.target1.text}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
              copiedBoth
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title="ベトナム語と英語（2言語）をまとめて一括コピーします"
          >
            {copiedBoth ? (
              <>
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span>2言語をコピー完了！ (Đã sao chép cả 2)</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white" />
                <span>📋 2言語まとめて一括コピー (Sao chép cả 2)</span>
              </>
            )}
          </button>
        </div>

        {/* Error message if any */}
        {error && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* PANELS 2 & 3: DUAL TRANSLATION OUTPUT CARDS (言語② & 言語③: 常に画面内に同時表示!) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {/* Card 1: Primary Target (e.g. Vietnamese / Japanese) */}
          <TranslationCard target={currentTarget1} isPrimary={true} />

          {/* Card 2: Secondary / Pivot Bridge Target (e.g. English) */}
          <TranslationCard target={currentTarget2} isPrimary={false} />
        </div>
      </main>

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        savedAdminPassword={settings.adminPassword || 'admin'}
        onSuccess={() => {
          sessionStorage.setItem('jv_admin_unlocked', 'true');
          setIsAdminUnlocked(true);
          setIsAdminAuthOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Settings Modal (Only accessible after JV mark 3-click verification) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onLockAdmin={() => {
          sessionStorage.removeItem('jv_admin_unlocked');
          setIsAdminUnlocked(false);
        }}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistoryItem={(item) => {
          setSourceText(item.sourceText);
          setActiveImage(null);
          setSourceLangOption(item.sourceLang);
          setActiveSourceLang(item.sourceLang);
          runTranslation(item.sourceText);
        }}
        onClearHistory={() => setHistory([])}
        onDeleteItem={(id) => setHistory((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
};
