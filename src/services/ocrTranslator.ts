import { AppSettings, SupportedLang, TranslationResult, TranslationTarget } from '../types';

export interface OcrTranslationResult {
  extractedText: string;
  detectedLang: SupportedLang;
  translation: TranslationResult;
}

/**
 * Executes high-precision Multimodal Vision OCR and Instant 3-Language Pivot Translation
 * Powered by Google Gemini Multimodal Vision API
 */
export async function executeOcrTranslation(
  imageBase64: string,
  mimeType: string,
  settings: AppSettings,
  signal?: AbortSignal
): Promise<OcrTranslationResult> {
  const startTime = Date.now();
  const apiKey = settings.geminiApiKey?.trim() || '';
  if (!apiKey) {
    throw new Error('画像OCR文字認識を行うには、管理者設定でGoogle AI Studio APIキーを設定してください (Cần nhập Google API Key để nhận dạng ảnh).');
  }

  // Clean base64 string if data URL prefix exists
  let cleanBase64 = imageBase64;
  if (imageBase64.includes('base64,')) {
    cleanBase64 = imageBase64.split('base64,')[1];
  }

  const candidateModels = [
    settings.model || 'gemini-3.5-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const prompt = `You are a world-class multimodal OCR and translation system for Japanese, Vietnamese, and English.

TASK INSTRUCTIONS:
1. Scan the provided image and extract ALL text exactly as written with 100% precision.
   - Preserve line breaks, paragraphs, numbers, bullet points, and formatting structure.
   - Accurately recognize Vietnamese diacritics/tones and Japanese Kanji/Kana.
2. Output the extracted text under <<<EXTRACTED_TEXT>>>.
3. Detect the primary language of the text ('ja', 'vi', or 'en') under <<<DETECTED_LANG>>>.
4. Translate the extracted text:
   - If original is Japanese (ja):
     * Intermediate bridge translation into English under <<<ENGLISH>>>
     * Final translation into natural Vietnamese under <<<VIETNAMESE>>>
   - If original is Vietnamese (vi):
     * Intermediate bridge translation into English under <<<ENGLISH>>>
     * Final translation into polite, natural Japanese business under <<<JAPANESE>>>
   - If original is English (en):
     * Target translation into Vietnamese under <<<VIETNAMESE>>>
     * Target translation into Japanese under <<<JAPANESE>>>

TONE INSTRUCTION:
- If business: Use formal, respectful, professional vocabulary.
- If casual: Use lively, empathetic natural expressions.

OUTPUT FORMAT (STRICT):
<<<EXTRACTED_TEXT>>>
(exact text extracted from the image)

<<<DETECTED_LANG>>>
(ja or vi or en)

<<<ENGLISH>>>
(English translation)

<<<VIETNAMESE>>>
(Vietnamese translation)

<<<JAPANESE>>>
(Japanese translation)`;

  let responseText = '';
  let success = false;

  for (const model of candidateModels) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/png',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (raw.trim()) {
          responseText = raw;
          success = true;
          break;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn(`Vision OCR failed with model ${model}:`, err);
    }
  }

  if (!success || !responseText) {
    throw new Error('画像からの文字認識（OCR）に失敗しました。画像が不鮮明か、文字が含まれていない可能性があります。');
  }

  // Parse sections
  const extractedText = extractSection(responseText, 'EXTRACTED_TEXT').trim();
  const rawDetectedLang = extractSection(responseText, 'DETECTED_LANG').trim().toLowerCase();
  const detectedLang: SupportedLang = rawDetectedLang === 'vi' || rawDetectedLang === 'en' ? rawDetectedLang : 'ja';

  const englishText = extractSection(responseText, 'ENGLISH').trim();
  const vietnameseText = extractSection(responseText, 'VIETNAMESE').trim();
  const japaneseText = extractSection(responseText, 'JAPANESE').trim();

  let target1: TranslationTarget;
  let target2: TranslationTarget;

  if (detectedLang === 'ja') {
    target1 = {
      lang: 'vi',
      labelJa: 'ベトナム語',
      labelVi: 'Tiếng Việt',
      flag: '🇻🇳',
      text: vietnameseText,
    };
    target2 = {
      lang: 'en',
      labelJa: '英語',
      labelVi: 'Tiếng Anh',
      flag: '🇬🇧',
      text: englishText,
      isPivotBridge: true,
    };
  } else if (detectedLang === 'vi') {
    target1 = {
      lang: 'ja',
      labelJa: '日本語',
      labelVi: 'Tiếng Nhật',
      flag: '🇯🇵',
      text: japaneseText,
    };
    target2 = {
      lang: 'en',
      labelJa: '英語',
      labelVi: 'English',
      flag: '🇬🇧',
      text: englishText,
      isPivotBridge: true,
    };
  } else {
    target1 = {
      lang: 'vi',
      labelJa: 'ベトナム語',
      labelVi: 'Tiếng Việt',
      flag: '🇻🇳',
      text: vietnameseText,
    };
    target2 = {
      lang: 'ja',
      labelJa: '日本語',
      labelVi: 'Tiếng Nhật',
      flag: '🇯🇵',
      text: japaneseText,
    };
  }

  const durationMs = Date.now() - startTime;

  const translation: TranslationResult = {
    id: `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sourceText: extractedText,
    sourceLang: detectedLang,
    target1,
    target2,
    timestamp: Date.now(),
    durationMs,
  };

  return {
    extractedText,
    detectedLang,
    translation,
  };
}

function extractSection(text: string, tag: string): string {
  const pattern = new RegExp(`<<<${tag}>>>([\\s\\S]*?)(?:<<<[A-Z_]+>>>|$)`, 'i');
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}
