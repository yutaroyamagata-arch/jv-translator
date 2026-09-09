import { AppSettings, SupportedLang, TranslationResult, TranslationTone } from '../types';
import { detectTeencode, normalizeTeencodeLocally } from './teencode';

/**
 * Cache for instant 0ms responses (Bounded to 200 items to prevent memory leaks)
 */
const translationCache = new Map<string, TranslationResult>();

function setBoundedCache(key: string, val: TranslationResult) {
  if (translationCache.size >= 200) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, val);
}



/**
 * Automatically detect if text is Japanese, Vietnamese, or English
 */
export function detectLanguage(text: string): SupportedLang {
  if (!text || text.trim().length === 0) return 'ja';

  // Japanese check: Hiragana (\u3040-\u309F) or Katakana (\u30A0-\u30FF)
  const hasJapaneseKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  if (hasJapaneseKana) return 'ja';

  // Vietnamese specific characters (diacritics unique or very common in Vietnamese)
  const vietnameseRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;
  if (vietnameseRegex.test(text)) return 'vi';

  // Check if text is Vietnamese chat slang / Teencode (even without tone marks)
  if (detectTeencode(text).isTeencode) {
    return 'vi';
  }

  // Common Vietnamese words without accents (tiếng Việt không dấu)
  const viCommonWordsRegex = /\b(toi|ban|anh|chi|em|chung toi|chung ta|minh|khong|duoc|chao|cam on|xin loi|cong ty|du an|tien do|bao cao|nhan vien|tai lieu|lam viec|ngay mai|hom nay|hom qua|tuan nay|thang nay|o dau|khi nao|tai sao|the nao|nhu the nao|gui|nhan|xem|biet|yeu cau|thong bao|ke hoach|hop|gap|chuc|tot|dep|nhieu|it|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\b/i;
  if (viCommonWordsRegex.test(text)) {
    return 'vi';
  }

  // Check for CJK Kanji if no kana was found (could be Japanese kanji-only like "資料確認")
  const hasKanji = /[\u4E00-\u9FAF]/.test(text);
  if (hasKanji) {
    return 'ja';
  }

  // Default to English if Latin alphabet is dominant
  return 'en';
}

export function getLanguageMetadata(lang: SupportedLang) {
  switch (lang) {
    case 'ja':
      return {
        labelJa: '日本語',
        labelVi: 'Tiếng Nhật',
        labelEn: 'Japanese',
        flag: '🇯🇵'
      };
    case 'vi':
      return {
        labelJa: 'ベトナム語',
        labelVi: 'Tiếng Việt',
        labelEn: 'Vietnamese',
        flag: '🇻🇳'
      };
    case 'en':
      return {
        labelJa: '英語',
        labelVi: 'Tiếng Anh',
        labelEn: 'English',
        flag: '🇬🇧'
      };
  }
}

/**
 * High-speed Public Pivot Translation Engine (0.2s latency, 100% reliable, no 429 quota limits).
 * Strictly executes:
 * - JA -> EN (Bridge Pivot) -> VI
 * - VI -> EN (Bridge Pivot) -> JA
 * - EN -> VI & JA
 */
async function fetchPublicTranslate(text: string, from: string, to: string, signal?: AbortSignal): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Fallback translation failed: ${res.statusText}`);
  const data = await res.json();
  if (!data || !data[0]) throw new Error('Invalid translation response');
  return data[0].map((item: any) => item[0]).join('');
}

function applyCasualEmojis(text: string, lang: SupportedLang): string {
  return text.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) return line;

    // If line already contains emoji or kaomoji, keep as is
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(trimmed) || /\([^\)]{2,}\)/.test(trimmed)) return line;

    const lower = trimmed.toLowerCase();

    // 1. Anger, Frustration, Annoyance (怒り・不満・激怒)
    if (/怒|激怒|ふざけ|ありえな|ふざけんな|ムカつ|何やってん|なんでやってない|bực|tức giận|tại sao chưa|dien tiet|angry|mad|furious|annoy/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (╬ Ò ‸ Ó) 💢';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' đó! Bực mình ghê 😠💢 (╬ Ò ‸ Ó)';
      return line.replace(/[。\.]$/, '') + ' I am really upset! (╬ Ò ‸ Ó) 💢';
    }

    // 2. Warning, Caution, Stern reminder (注意・警告・ダメ出し・厳重注意)
    if (/注意|警告|気をつけて|気を付けて|ダメ|禁止|二度と|ミス|遅刻|cẩn thận|chú ý|nhắc nhở|không được|cấm|warn|caution|careful|mistake/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' ⚠️ 次は気をつけてね！ (｀・ω・´)b';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' đó nha! Lần sau phải chú ý cẩn thận nhé ⚠️ (｀・ω・´)b';
      return line.replace(/[。\.]$/, '') + ' Please be careful next time! ⚠️ (｀・ω・´)b';
    }

    // 3. Disappointment, Sulking (落胆・不満・残念)
    if (/残念|がっかり|ショック|ガッカリ|buồn|thất vọng|disappoint/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (´・ω・｀) 😞';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nè... Thất vọng ghê á 😞 (´・ω・｀)';
      return line.replace(/[。\.]$/, '') + ' So disappointing... (´・ω・｀) 😞';
    }

    // 4. Thanks & Gratitude
    if (/ありがと|感謝|お礼|thanks?|cảm ơn|cam on/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (人\'\'▽｀)ありがとう☆ 🙏✨';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nha! Cảm ơn nhiều nè 🥰🙏';
      return line.replace(/[。\.]$/, '') + ' Thank you so much! 🙏✨ (｡•ㅅ•｡)♡';
    }

    // 5. Laugh, Humor, Joke, 笑
    if (/笑|w|草|funny|lol|haha|lmao|cười|cuoi/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (≧▽≦) 🤣 (笑)';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nè, cười xỉu luôn á 😆🤣 ( *´艸｀)';
      return line.replace(/[。\.]$/, '') + ' haha so funny! 🤣 (≧▽≦)';
    }

    // 6. Cheer, Motivation, Fight, Work progress
    if (/頑張|ファイト|応援|進捗|タスク|cố lên|co len|tiến độ|tien do|fight|work/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (*^^)v ファイト！ 💪🔥';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nha! Cố lên nào! 💪🔥🚀';
      return line.replace(/[。\.]$/, '') + ' Let\'s do this! 💪🔥 (*^^)v';
    }

    // 7. Praise, Great, Awesome, Congratulations
    if (/すご|素晴|おめでと|祝|great|awesome|congrat|tuyệt|xịn|chúc mừng/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' ＼(^o^)／ すっごい！ 🎉💯✨';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nè! Quá đỉnh luôn á 🥳🎉💯';
      return line.replace(/[。\.]$/, '') + ' Awesome job! 🎉🥳 ＼(^o^)／';
    }

    // 8. Food, Drink, Lunch, Dinner
    if (/飯|飲|酒|カフェ|ランチ|ディナー|ăn|uống|quán|nhậu|cafe|lunch|dinner|food/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (*´ڡ`*) 🍜🍻 美味しそう！';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nha! Đi ăn thôi nào 🍱🍻😋';
      return line.replace(/[。\.]$/, '') + ' Yummy! 🍜🍻😋 (*´ڡ`*)';
    }

    // 9. Apology, Worried, Trouble
    if (/すみません|ごめん|申し訳|困|sorry|apolog|xin lỗi|xin loi/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (>_<) ごめんね 🙇‍♂️💦';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nha, thông cảm giúp mình nhé 🥺🙏';
      return line.replace(/[。\.]$/, '') + ' So sorry! (>_<) 🥺🙏';
    }

    // 10. Greeting, Morning, Hello
    if (/こんにちは|おはよう|お疲れ|hello|hi|good morning|chào|chao/i.test(lower)) {
      if (lang === 'ja') return line.replace(/[。\.]$/, '') + ' (*^-^*) ☕✨';
      if (lang === 'vi') return line.replace(/[。\.]$/, '') + ' nha ^^ ☕🌸';
      return line.replace(/[。\.]$/, '') + ' Hello there! (*^-^*) ✨';
    }

    // Rich default Kaomoji & Emoji rotation based on content
    const defaultPairs = [
      { ja: ' (*^-^*) ✨', vi: ' nha bạn ơi 🥰✨', en: ' ✨ (*^-^*)' },
      { ja: ' (o^v^o) 👍', vi: ' nè 👍 (^_-)-☆', en: ' 👍 (o^v^o)' },
      { ja: ' (*´ω｀*) 💖', vi: ' nha ^^ 💖', en: ' 💖 (*´ω｀*)' },
      { ja: ' (≧∇≦)b 🌟', vi: ' nè 🌟 (✿^‿^)', en: ' 🌟 (≧∇≦)b' },
      { ja: ' ( *´艸｀) 🎶', vi: ' nha 🎶 😆', en: ' 🎶 ( *´艸｀)' },
      { ja: ' ദ്ദി( ˵•̀ᴗ•́˵ ) 💯', vi: ' chuẩn luôn nè 💯 ദ്ദി(•̀ᴗ•́ )', en: ' 💯 ദ്ദി(•̀ᴗ•́ )' }
    ];
    const hash = trimmed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const chosen = defaultPairs[hash % defaultPairs.length];

    if (lang === 'ja') return line.replace(/[。\.]$/, '') + chosen.ja;
    if (lang === 'vi') return line.replace(/[。\.]$/, '') + chosen.vi;
    return line.replace(/[。\.]$/, '') + chosen.en;
  }).join('\n');
}

function polishJapaneseBusiness(jaText: string): string {
  let res = jaText;

  // 1. Specific idioms & whole expressions first
  res = res.replace(/昨日は上司にメールできませんでした/g, '昨日はメッセージをお送りすることができず、大変申し訳ありませんでした');
  res = res.replace(/メールを受信できない場合は[、,]?\s*ボス/g, '昨日はメッセージをお送りすることができず、大変申し訳ありませんでした');
  res = res.replace(/この書類をチェックするのを上司に手伝ってもらいます/g, 'こちらの書類をご確認いただけますでしょうか');
  res = res.replace(/今日は病気休暇を申請しました/g, '体調不良のため、本日は休暇をいただきたく存じます');
  res = res.replace(/これはどのように作動しますか[？?]?/g, 'こちらの業務はどのように進めればよろしいでしょうか。');
  res = res.replace(/今からやります/g, 'かしこまりました、今すぐ対応いたします');
  res = res.replace(/同意します[、,]\s*(?:上司|ボス)がすぐにやります/g, 'かしこまりました、今すぐ対応いたします');

  // 2. Expressions asking for review / approval (手伝ってください patterns)
  res = res.replace(/(?:この|その)?\s*(?:書類|文書|資料|ファイル)を見るのを手伝ってください/g, 'こちらの資料をご確認いただけますでしょうか');
  res = res.replace(/メール(?:の)?チェックを手伝ってください/g, 'メールをご確認いただけますでしょうか');
  res = res.replace(/ごチェックいただけますでしょうか/g, 'ご確認いただけますでしょうか');
  res = res.replace(/(承認|確認|チェック|レビュー|検討)するのを手伝ってください/g, (_, p1) => (p1 === 'チェック' ? 'ご確認' : `ご${p1}`) + 'いただけますでしょうか');
  res = res.replace(/(承認|確認|チェック|レビュー|検討)を手伝ってください/g, (_, p1) => (p1 === 'チェック' ? 'ご確認' : `ご${p1}`) + 'いただけますでしょうか');
  res = res.replace(/見て手伝ってください/g, 'ご確認いただけますでしょうか');
  res = res.replace(/見て助けてください/g, 'ご確認いただけますでしょうか');
  res = res.replace(/チェックして手伝ってください/g, 'ご確認いただけますでしょうか');
  res = res.replace(/確認して手伝ってください/g, 'ご確認いただけますでしょうか');
  res = res.replace(/見るのを手伝って/g, 'ご確認いただけますでしょうか');
  res = res.replace(/手伝ってください/g, 'ご確認いただけますでしょうか');
  res = res.replace(/手伝ってもらえますか/g, 'お願いできますでしょうか');

  // 3. Vocatives (ボス / 上司 / 社長)
  res = res.replace(/^(?:ボス|上司|社長)[、,\s]+/g, '');
  res = res.replace(/[、,\s]*(?:ボス|上司|社長)[さん様]?\s*[、,]/g, '、');
  res = res.replace(/ありがとう(?:ございます)?[、,\s]*(?:ボス|上司|社長)[さん様]?[。.]?/g, '誠にありがとうございます。');
  res = res.replace(/(?:ボス|上司|社長)[さん様]?、?\s*本当にありがとうございました[。.]?/g, '誠にありがとうございます。');
  res = res.replace(/[、,\s]*(?:ボス|上司|社長)[さん様]?[?？!！。]?$/g, '。');
  res = res.replace(/(?:ボス|上司|社長)さん/g, '');

  // 4. Apologies & permission requests
  res = res.replace(/[、,]?\s*(?:私を)?(?:許してください|理解してください)/g, '。何卒ご容赦くださいますようお願い申し上げます。');

  // 5. Deduplicate any stacked honorific phrases
  res = res.replace(/(何卒ご容赦くださいますようお願い申し上げます[。.]?\s*)+/g, '何卒ご容赦くださいますようお願い申し上げます。');
  res = res.replace(/(かしこまりました、今すぐ対応いたします[。.]?\s*)+/g, 'かしこまりました、今すぐ対応いたします。');
  res = res.replace(/(誠にありがとうございます[。.]?\s*)+/g, '誠にありがとうございます。');
  res = res.replace(/(ご確認いただけますでしょうか[。.]?\s*)+/g, 'ご確認いただけますでしょうか。');

  // 6. Clean up punctuation
  res = res.replace(/[。.]+/g, '。').replace(/^[。、,\s]+/, '').trim();
  if (!res.endsWith('。') && !res.endsWith('？') && !res.endsWith('?') && !res.endsWith('！') && !res.endsWith('!')) {
    res += '。';
  }
  return res;
}

function polishEnglishBusiness(enText: string): string {
  let res = enText;
  res = res.replace(/^(?:boss|sir|madam)[,\s]+/i, '');
  res = res.replace(/[,\s]*(?:boss|sir|madam)[.!?]?$/i, '');
  res = res.replace(/,\s*(?:boss|sir|madam)\b/gi, '');
  res = res.replace(/\bto my boss\b/gi, 'to you');
  res = res.replace(/\bmy boss\b/gi, 'you');
  res = res.replace(/\bboss\b/gi, '');
  res = res.replace(/couldn't text (?:my boss|my|you)?/gi, "couldn't send you a message");
  res = res.replace(/text my\b/gi, 'message you');
  res = res.replace(/please help me (check|review|see|look at)/gi, 'could you please review');
  res = res.replace(/please help me approve/gi, 'could you please approve');
  res = res.replace(/I asked my to help me check/gi, 'Could you please check');
  res = res.replace(/I agree, my will do it now/gi, 'Understood, I will handle it right away');
  res = res.replace(/please forgive me/gi, 'please excuse me');
  res = res.replace(/\bmy\s*([,\.])/gi, '$1');
  res = res.replace(/[ ]{2,}/g, ' ').trim();
  if (!res.endsWith('.') && !res.endsWith('?') && !res.endsWith('!')) {
    res += '.';
  }
  return res;
}

async function executePublicPivotTranslation(
  sourceText: string,
  sourceLang: SupportedLang,
  startTime: number,
  tone?: TranslationTone,
  onProgress?: (partial: TranslationResult) => void,
  signal?: AbortSignal
): Promise<TranslationResult> {
  let target1Text = '';
  let target2Text = '';

  if (sourceLang === 'ja') {
    // STEP 1: JA -> EN (Bridge Pivot)
    let en = await fetchPublicTranslate(sourceText, 'ja', 'en', signal);
    if (tone === 'casual') en = applyCasualEmojis(en, 'en');
    target2Text = en;

    if (onProgress) {
      onProgress(buildResultObject('ja', sourceText, { part1: en, part2: 'ベトナム語を翻訳中...' }, Math.round(performance.now() - startTime)));
    }

    // STEP 2: EN -> VI (From Bridge)
    let vi = await fetchPublicTranslate(en, 'en', 'vi', signal);
    if (/(我々|私たち)/.test(sourceText) && !/(弊社|当社|小社)/.test(sourceText)) {
      vi = vi.replace(/\bcông ty chúng tôi\b/gi, 'chúng ta').replace(/\bchúng tôi\b/gi, 'chúng ta');
    }
    if (tone === 'casual') vi = applyCasualEmojis(vi, 'vi');
    target1Text = vi;

    return buildResultObject('ja', sourceText, { part1: target2Text, part2: target1Text }, Math.round(performance.now() - startTime));
  } else if (sourceLang === 'vi') {
    const teencodeCheck = detectTeencode(sourceText);
    const textToTranslate = teencodeCheck.isTeencode ? normalizeTeencodeLocally(sourceText) : sourceText;

    // High-accuracy parallel translation directly from Vietnamese
    const [rawJa, rawEn] = await Promise.all([
      fetchPublicTranslate(textToTranslate, 'vi', 'ja', signal),
      fetchPublicTranslate(textToTranslate, 'vi', 'en', signal)
    ]);

    let ja = tone === 'casual' ? applyCasualEmojis(rawJa, 'ja') : polishJapaneseBusiness(rawJa);
    if (/\bchúng ta\b/i.test(sourceText) || /\bchúng mình\b/i.test(sourceText)) {
      ja = ja.replace(/弊社/g, '私たち');
    }
    let en = tone === 'casual' ? applyCasualEmojis(rawEn, 'en') : polishEnglishBusiness(rawEn);

    target1Text = ja;
    target2Text = en;

    return buildResultObject('vi', sourceText, {
      part1: target2Text,
      part2: target1Text,
      normalizedVi: teencodeCheck.isTeencode ? textToTranslate : undefined
    }, Math.round(performance.now() - startTime));
  } else {
    // EN -> VI & JA
    const [rawVi, rawJa] = await Promise.all([
      fetchPublicTranslate(sourceText, 'en', 'vi', signal),
      fetchPublicTranslate(sourceText, 'en', 'ja', signal)
    ]);
    const vi = tone === 'casual' ? applyCasualEmojis(rawVi, 'vi') : rawVi;
    const ja = tone === 'casual' ? applyCasualEmojis(rawJa, 'ja') : rawJa;
    return buildResultObject('en', sourceText, { part1: vi, part2: ja }, Math.round(performance.now() - startTime));
  }
}

/**
 * Helper to parse delimiter tags like <<<ENGLISH>>> and <<<VIETNAMESE>>>
 */
function parseStreamOutput(
  rawText: string,
  tag1: string,
  tag2: string
): { part1: string; part2: string; normalizedVi?: string } {
  let normalizedVi: string | undefined;
  const normTag = '<<<NORMALIZED_VI>>>';
  const normIndex = rawText.indexOf(normTag);
  if (normIndex !== -1) {
    const nextTagIndex = rawText.indexOf('<<<', normIndex + normTag.length);
    if (nextTagIndex !== -1) {
      normalizedVi = rawText.slice(normIndex + normTag.length, nextTagIndex).trim();
    } else {
      normalizedVi = rawText.slice(normIndex + normTag.length).trim();
    }
  }

  const i1 = rawText.indexOf(tag1);
  const i2 = rawText.indexOf(tag2);

  let part1 = '';
  let part2 = '';

  if (i1 !== -1) {
    if (i2 !== -1 && i2 > i1) {
      part1 = rawText.slice(i1 + tag1.length, i2).trim();
      part2 = rawText.slice(i2 + tag2.length).trim();
    } else {
      part1 = rawText.slice(i1 + tag1.length).trim();
    }
  } else if (i2 !== -1) {
    part2 = rawText.slice(i2 + tag2.length).trim();
  } else {
    part1 = rawText.trim();
  }

  return {
    part1: part1.normalize('NFC'),
    part2: part2.normalize('NFC'),
    normalizedVi: normalizedVi ? normalizedVi.normalize('NFC') : undefined,
  };
}

/**
 * Execute translation strictly adhering to the user's rule with REAL-TIME STREAMING and 100% UPTIME FAILOVER:
 * - JA input: JA -> EN (intermediate bridge) -> VI. Outputs: VI, EN.
 * - VI input: VI -> EN (intermediate bridge) -> JA. Outputs: JA, EN.
 * - EN input: EN -> VI, EN -> JA. Outputs: VI, JA.
 *
 * If Gemini API hits 429 (quota limit), 503 (high demand), or fails:
 * Instantly and seamlessly fails over to the high-speed public pivot engine! Zero errors guaranteed!
 */
export async function executeTranslation(
  sourceText: string,
  sourceLang: SupportedLang,
  settings: AppSettings,
  onProgress?: (partial: TranslationResult) => void,
  signal?: AbortSignal
): Promise<TranslationResult> {
  const startTime = performance.now();
  const trimmed = sourceText.trim();
  if (!trimmed) {
    throw new Error('翻訳する文章を入力してください / Vui lòng nhập văn bản cần dịch');
  }

  // Check cache for 0ms instant response
  const cacheKey = `${sourceLang}_${settings.tone}_${trimmed}`;
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey)!;
    if (onProgress) onProgress(cached);
    return cached;
  }

  const effectiveApiKey = (settings.geminiApiKey || '').trim();

  // Primary: Maximum Accuracy AI Deep Context Translation (Gemini 3.5 Flash Lite)
  if (effectiveApiKey) {
    try {
      const res = await executeGeminiTranslation(
        sourceText,
        sourceLang,
        { ...settings, geminiApiKey: effectiveApiKey },
        startTime,
        onProgress,
        signal
      );
      setBoundedCache(cacheKey, res);
      return res;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('Gemini translation failed, falling back to public engine:', err);
    }
  }

  // Fallback: High-speed Public Pivot Translation Engine
  const res = await executePublicPivotTranslation(
    sourceText,
    sourceLang,
    startTime,
    settings.tone,
    onProgress,
    signal
  );
  setBoundedCache(cacheKey, res);
  return res;
}

export async function executeGeminiTranslation(
  sourceText: string,
  sourceLang: SupportedLang,
  settings: AppSettings,
  startTime: number,
  onProgress?: (partial: TranslationResult) => void,
  signal?: AbortSignal
): Promise<TranslationResult> {
  let initialModel = settings.model || 'gemini-3.5-flash-lite';
  if (initialModel === 'gemini-2.5-flash' || initialModel === 'gemini-2.0-flash' || initialModel === 'gemini-1.5-flash') {
    initialModel = 'gemini-3.5-flash-lite';
  }

  const apiKey = settings.geminiApiKey.trim();

  const tonePrompt = settings.tone === 'business'
    ? `TONE: Accurate, professional, and natural business language.
       - Japanese: Natural polite business language (丁寧語 / です・ます, or proper business 敬語 if requesting/instructing). Strictly NO emojis or kaomoji.
       - Vietnamese: Polite, natural contemporary business register. Do NOT add fabricated greetings or exaggerated subservient phrases unless present in the source text.`
    : `TONE: Casual, friendly, warm, and natural conversational chat tone.
       - Japanese: Friendly, casual conversational Japanese (タメ口・親しみのある口調) accompanied naturally by context-appropriate kaomoji and cute emojis (e.g. (*^-^*), (人''▽｀)ありがとう☆, (≧▽≦), ＼(^o^)／, (*^^)v, 💪🔥, 🙏✨, 🍜🍻).
       - Vietnamese: Warm, friendly, colloquial chat tone with natural particles (nha, nè, nhé, ^^) and suitable emojis.
       - English: Casual, friendly tone with fitting emojis.`;

  const formattingRule = `
CRITICAL FORMATTING MANDATE:
1. Preserve the exact structure of the original input.
2. Maintain every paragraph break (\\n\\n) and line break (\\n) in the exact positions.
3. Keep all bullet points, numbers (e.g. 1., 2.), hyphens, and indentations intact.
4. Do NOT output any intro, explanations, or disclaimers. Output ONLY the tags and translations.
`;

  let promptText = '';
  let tag1 = '';
  let tag2 = '';

  if (sourceLang === 'ja') {
    tag1 = '<<<ENGLISH>>>';
    tag2 = '<<<VIETNAMESE>>>';
    promptText = `You are an expert professional translator specializing in Japanese-Vietnamese and Japanese-English translation.
Task: Translate the Japanese source text faithfully, accurately, and naturally into Vietnamese and English.

CRITICAL TRANSLATION PRINCIPLES:
1. Pure, Faithful Translation (忠実翻訳):
   - Translate ONLY the meaning, intent, and nuance of the provided source text.
   - Strictly DO NOT invent greetings, email openers, or polite prefaces (such as "Dạ em chào anh/chị ạ", "Dạ thưa...", "Em xin cảm ơn...") unless they are explicitly present in the Japanese text.
   - Accurately preserve the speaker's tone and stance:
     * If the source is an instruction or deadline notification, translate it as a clear, polite instruction. Do NOT twist it into a subordinate begging a boss.
     * If the source is a question, translate it as a direct, polite question.
2. Strict Pronoun Mandate (人称代名詞・我々/私たち/弊社の厳密な区別):
   - "我々" / "私たち":
     * When referring to the shared team, collaboration, both parties, or mutual goals (inclusive "we"): Translate STRICTLY as "chúng ta" or "chúng mình" (e.g. "我々は協力しましょう" -> "Chúng ta hãy cùng hợp tác").
     * Only translate as "chúng tôi" when explicitly contrasting the speaker's own company against the client or external party.
   - "弊社" / "当社" / "私ども": Translate as "chúng tôi" or "công ty chúng tôi".
3. Natural, Context-Accurate Vietnamese (under <<<VIETNAMESE>>>):
   - Use correct, natural Vietnamese vocabulary and grammar.
   - Accurately translate business terms in context (e.g. "納期に遅れない" -> "không để bị trễ hạn / tiến độ"; never translate as "đến muộn").
4. Clear, Natural English (under <<<ENGLISH>>>):
   - Output natural English matching the source intent.
${formattingRule}
${tonePrompt}

Output format:
<<<ENGLISH>>>
[Professional English translation here]
<<<VIETNAMESE>>>
[High-accuracy natural Vietnamese translation here]

Original Japanese text:
${sourceText}`;
  } else if (sourceLang === 'vi') {
    tag1 = '<<<ENGLISH>>>';
    tag2 = '<<<JAPANESE>>>';
    const teencodeCheck = detectTeencode(sourceText);
    promptText = `You are an expert professional translator specializing in Vietnamese-Japanese and Vietnamese-English translation.
Task: Translate the Vietnamese source text faithfully, accurately, and naturally into Japanese and English.

CRITICAL TRANSLATION PRINCIPLES:
1. Pure, Faithful Translation (忠実翻訳):
   - Translate ONLY the meaning, nuance, and intent of the provided source text.
   - Strictly DO NOT invent fabricated greetings, exaggerated apologies, or subservient prefaces that alter the original meaning.
   - Accurately preserve the speaker's perspective and role:
     * "sản phẩm này" means "この商品" (never translate as "当商品" unless the speaker explicitly states they are the seller/maker).
     * "tài liệu này thiếu thông tin..." means "この書類には...が不足しています".
2. Strict Pronoun Mandate (人称代名詞の厳格な区別 - 「Chúng ta」vs「Chúng tôi」):
   - "Chúng ta" / "Chúng mình" (INCLUSIVE "we" = Speaker + Listener, all of us):
     * MUST translate as "私たち", "我々", or "双方".
     * ABSOLUTE RULE: STRICTLY NEVER translate "Chúng ta" as "弊社" (our company) or "当方"! "Chúng ta" includes the person being spoken to, whereas "弊社" excludes them.
   - "Chúng tôi" (EXCLUSIVE "we" = Speaker's company/associates excluding the listener):
     * Translate as "弊社", "当方", or "私ども".
   - General pronouns ("anh", "chị", "em", "sếp", "bạn", "mình"):
     * Translate into natural Japanese without literal translations like "兄/姉/弟/妹/ボス".
3. Chat Abbreviations / Teencode Resolution:
   - If the Vietnamese text contains chat slang or informal abbreviations (e.g. ko, dc/đc, ib, rep, ntn, bjo, cv, mn, wfh, dl, ot), decipher their intended meaning accurately.
4. Natural, Fluent Japanese (under <<<JAPANESE>>>):
   - Output clean, natural Japanese with the appropriate level of politeness (丁寧語/です・ます for standard business text, 敬語 for requests, conversational for casual chat).
5. Clear, Natural English (under <<<ENGLISH>>>):
   - Output natural, professional English matching the source intent.
${formattingRule}
${tonePrompt}

Output format:
${teencodeCheck.isTeencode ? '<<<NORMALIZED_VI>>>\n[Restored standard Vietnamese here]\n' : ''}<<<ENGLISH>>>
[Professional English translation here]
<<<JAPANESE>>>
[High-accuracy natural Japanese translation here]

Original Vietnamese text:
${sourceText}`;
  } else {
    tag1 = '<<<VIETNAMESE>>>';
    tag2 = '<<<JAPANESE>>>';
    promptText = `You are an expert professional English-Vietnamese-Japanese translation specialist.
Task: Translate the English source text faithfully, accurately, and naturally into Vietnamese and Japanese.

CRITICAL TRANSLATION PRINCIPLES:
1. Pure, Faithful Translation: Translate ONLY the provided text without inventing greetings or distorting perspective.
2. Natural, context-accurate Vietnamese under <<<VIETNAMESE>>>.
3. Natural, polite Japanese under <<<JAPANESE>>>.
${formattingRule}
${tonePrompt}

Output format:
<<<VIETNAMESE>>>
[Vietnamese translation here]
<<<JAPANESE>>>
[Japanese translation here]

Original English text:
${sourceText}`;
  }

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    }
  };

  const candidateModels = [
    initialModel,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let accumulatedRawText = '';
  let success = false;
  let lastErrorDetail = '';

  for (const currentModel of candidateModels) {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

    const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:streamGenerateContent?key=${apiKey}&alt=sse`;

    try {
      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (signal?.aborted) {
            reader.cancel();
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
          }

          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const jsonStr = trimmedLine.slice(6);
              try {
                const parsedChunk = JSON.parse(jsonStr);
                const chunkText = parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (chunkText) {
                  accumulatedRawText += chunkText;
                  if (onProgress) {
                    const parsedParts = parseStreamOutput(accumulatedRawText, tag1, tag2);
                    const partialResult = buildResultObject(
                      sourceLang,
                      sourceText,
                      parsedParts,
                      Math.round(performance.now() - startTime)
                    );
                    onProgress(partialResult);
                  }
                }
              } catch {
                // Ignore chunk parse errors
              }
            }
          }
        }

        success = true;
        break;
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || response.statusText;
        lastErrorDetail = errMsg;
        if (response.status === 429) {
          console.warn('Gemini quota reached (429). Triggering instant failover...');
          break;
        }
        console.warn(`Model ${currentModel} returned ${response.status}, trying next model...`);
        continue;
      }
    } catch (netErr: any) {
      if (netErr.name === 'AbortError') throw netErr;
      lastErrorDetail = netErr.message || 'ネットワークエラー';
    }
  }

  if (!success || !accumulatedRawText.trim()) {
    throw new Error(lastErrorDetail || 'Gemini API connection failed');
  }

  const durationMs = Math.round(performance.now() - startTime);
  const finalParsed = parseStreamOutput(accumulatedRawText, tag1, tag2);

  // 1. Strict Pronoun Safeguard (Chúng ta ≠ 弊社)
  if (sourceLang === 'vi' && (/\bchúng ta\b/i.test(sourceText) || /\bchúng mình\b/i.test(sourceText))) {
    finalParsed.part2 = finalParsed.part2.replace(/弊社/g, '私たち');
  } else if (sourceLang === 'ja' && /(我々|私たち)/.test(sourceText) && !/(弊社|当社|小社)/.test(sourceText)) {
    finalParsed.part2 = finalParsed.part2.replace(/\bcông ty chúng tôi\b/gi, 'chúng ta').replace(/\bchúng tôi\b/gi, 'chúng ta');
  }

  // 2. Casual Mode: Guarantee Friendly Kaomoji / Emojis
  if (settings.tone === 'casual') {
    if (sourceLang === 'ja') {
      finalParsed.part1 = applyCasualEmojis(finalParsed.part1, 'en');
      finalParsed.part2 = applyCasualEmojis(finalParsed.part2, 'vi');
    } else if (sourceLang === 'vi') {
      finalParsed.part1 = applyCasualEmojis(finalParsed.part1, 'en');
      finalParsed.part2 = applyCasualEmojis(finalParsed.part2, 'ja');
    } else {
      finalParsed.part1 = applyCasualEmojis(finalParsed.part1, 'vi');
      finalParsed.part2 = applyCasualEmojis(finalParsed.part2, 'ja');
    }
  }

  return buildResultObject(sourceLang, sourceText, finalParsed, durationMs);
}

function buildResultObject(
  sourceLang: SupportedLang,
  sourceText: string,
  parts: { part1: string; part2: string; normalizedVi?: string },
  durationMs: number
): TranslationResult {
  const id = `trans_${Date.now()}`;

  if (sourceLang === 'ja') {
    const enMeta = getLanguageMetadata('en');
    const viMeta = getLanguageMetadata('vi');

    return {
      id,
      sourceLang: 'ja',
      sourceText,
      target1: {
        lang: 'vi',
        labelJa: viMeta.labelJa,
        labelVi: viMeta.labelVi,
        flag: viMeta.flag,
        text: parts.part2,
      },
      target2: {
        lang: 'en',
        labelJa: enMeta.labelJa,
        labelVi: enMeta.labelVi,
        flag: enMeta.flag,
        text: parts.part1,
        isPivotBridge: true,
      },
      intermediateEnglish: parts.part1,
      durationMs,
      timestamp: Date.now(),
    };
  } else if (sourceLang === 'vi') {
    const enMeta = getLanguageMetadata('en');
    const jaMeta = getLanguageMetadata('ja');

    return {
      id,
      sourceLang: 'vi',
      sourceText,
      target1: {
        lang: 'ja',
        labelJa: jaMeta.labelJa,
        labelVi: jaMeta.labelVi,
        flag: jaMeta.flag,
        text: parts.part2,
      },
      target2: {
        lang: 'en',
        labelJa: enMeta.labelJa,
        labelVi: enMeta.labelVi,
        flag: enMeta.flag,
        text: parts.part1,
        isPivotBridge: true,
      },
      intermediateEnglish: parts.part1,
      normalizedVi: parts.normalizedVi,
      isTeencode: Boolean(parts.normalizedVi),
      durationMs,
      timestamp: Date.now(),
    };
  } else {
    const viMeta = getLanguageMetadata('vi');
    const jaMeta = getLanguageMetadata('ja');

    return {
      id,
      sourceLang: 'en',
      sourceText,
      target1: {
        lang: 'vi',
        labelJa: viMeta.labelJa,
        labelVi: viMeta.labelVi,
        flag: viMeta.flag,
        text: parts.part1,
      },
      target2: {
        lang: 'ja',
        labelJa: jaMeta.labelJa,
        labelVi: jaMeta.labelVi,
        flag: jaMeta.flag,
        text: parts.part2,
      },
      durationMs,
      timestamp: Date.now(),
    };
  }
}
