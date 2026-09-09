/**
 * Comprehensive Vietnamese Chat Slang / Teencode Dictionary & Decipher Engine
 * Specially designed for young Vietnamese workforce communication (Slack, Zalo, Teams)
 */

export interface TeencodeDetectionResult {
  isTeencode: boolean;
  matchedTerms: string[];
  normalizedPreview: string;
}

// Common Vietnamese Teencode & Chat Slang terms mapping to clean Standard Vietnamese
export const TEENCODE_DICTIONARY: Record<string, string> = {
  // Negation & Questions
  'ko': 'không',
  'k': 'không',
  'kh': 'không',
  'hong': 'không',
  'hơm': 'không',
  'hem': 'không',
  'hum': 'không',
  'hổng': 'không',
  'hok': 'không',
  'j': 'gì',
  'ji': 'gì',
  'chi': 'gì',
  'ntn': 'như thế nào',
  'lms': 'làm sao',
  'lm': 'làm',
  'dc': 'được',
  'đc': 'được',
  'dk': 'được',

  // Time expressions
  'bjo': 'bây giờ',
  'bgio': 'bây giờ',
  'bh': 'bây giờ',
  'hnay': 'hôm nay',
  'hqua': 'hôm qua',
  'hqa': 'hôm qua',
  'hki': 'hôm kia',
  'hnao': 'hôm nào',
  't2': 'thứ Hai',
  't3': 'thứ Ba',
  't4': 'thứ Tư',
  't5': 'thứ Năm',
  't6': 'thứ Sáu',
  't7': 'thứ Bảy',
  'cn': 'Chủ Nhật',

  // Messaging & Workplace terms
  'ib': 'nhắn tin',
  'inb': 'nhắn tin',
  'rep': 'trả lời',
  'tl': 'trả lời',
  'tloi': 'trả lời',
  'cf': 'xác nhận',
  'conf': 'xác nhận',
  'mn': 'mọi người',
  'mng': 'mọi người',
  'ng': 'người',
  'nv': 'nhân viên',
  'cv': 'công việc',
  'cviec': 'công việc',
  'ot': 'tăng ca',
  'wf': 'làm việc',
  'wfh': 'làm việc tại nhà',
  'dl': 'hạn chót',
  'bt': 'bình thường',
  'bthg': 'bình thường',
  'ms': 'mới',
  'chua': 'chưa',

  // Pronouns & Address
  'mik': 'mình',
  'mềnh': 'mình',
  'tui': 'mình',
  'ce': 'chị em',
  'ae': 'anh em',

  // Particles, Adverbs & Fillers
  'wa': 'quá',
  'lun': 'luôn',
  'thui': 'thôi',
  'nhìu': 'nhiều',
  'nhiu': 'nhiều',
  'cx': 'cũng',
  'vs': 'với',
  'zới': 'với',
  'nè': 'này',
  'nhe': 'nhé',
  'nha': 'nhé',
  'nhóa': 'nhé',
  'nhoé': 'nhé',
  'oki': 'đồng ý',
  'oke': 'đồng ý',
  'okela': 'đồng ý',
  'okie': 'đồng ý',
  'zậy': 'vậy',
  'zay': 'vậy',
  'zồi': 'rồi',
  'ùi': 'rồi',
  'bik': 'biết',
  'bit': 'biết',
  'biek': 'biết',
  'thik': 'thích',
  'tks': 'cảm ơn',
  'thx': 'cảm ơn',
  'cmon': 'cảm ơn',
  'camon': 'cảm ơn',
  'pls': 'làm ơn',
};

/**
 * Detects if the given text contains Vietnamese chat slang / Teencode
 */
export function detectTeencode(text: string): TeencodeDetectionResult {
  if (!text || text.trim().length === 0) {
    return { isTeencode: false, matchedTerms: [], normalizedPreview: '' };
  }

  // Check specific idiom patterns first (Unicode safe)
  const hasTeencodePatterns = /(?:^|[^\p{L}\p{N}])(ko|k|kh|dc|đc|dk|j|ji|ntn|bjo|bgio|bh|hqua|hnay|ib|inb|rep|mn|mng|lun|thui|nhìu|cx|vs|oki|okela|wfh|ot|dl|cv|tks|thx)(?=[^\p{L}\p{N}]|$)/gui.test(text) ||
    /(?:check\s+(?:mail|email|giúp)|duyệt\s+giúp)/i.test(text);

  // Check pronoun 'e' in Vietnamese context
  const hasVietnameseE = /(?:^|[^\p{L}\p{N}])e(?=[^\p{L}\p{N}]|$)/gui.test(text) &&
    /(?:sếp|sep|nhờ|gửi|gui|check|làm|lm|báo cáo|xin phép|chào|cảm ơn|đã|đang|hiểu|biết|thấy|nghĩ|đi)/i.test(text);

  const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const matched = new Set<string>();

  for (const rawWord of words) {
    const word = rawWord.toLowerCase();
    if (TEENCODE_DICTIONARY[word]) {
      matched.add(rawWord);
    }
  }

  if (hasVietnameseE) {
    matched.add('e');
  }

  const matchedTerms = Array.from(matched);
  const isTeencode = hasTeencodePatterns || hasVietnameseE || matchedTerms.length >= 1;

  let normalizedPreview = '';
  if (isTeencode) {
    normalizedPreview = normalizeTeencodeLocally(text);
  }

  return {
    isTeencode,
    matchedTerms,
    normalizedPreview,
  };
}

/**
 * Fast deterministic local normalizer for Vietnamese Teencode into Standard Vietnamese
 */
export function normalizeTeencodeLocally(text: string): string {
  if (!text) return '';

  let res = text;

  // 1. Idioms & compound chat expressions (Unicode safe)
  res = res.replace(/(?:^|[^\p{L}\p{N}])(?:e\s+)?(?:ko|k|kh)\s+(?:ib|inb)\s+(?:dc|đc)(?=[^\p{L}\p{N}]|$)/gui, ' em không thể nhắn tin được cho ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])thông\s+cảm\s+(?:nha|nhé|nhe)(?=[^\p{L}\p{N}]|$)/gui, ' mong thông cảm cho em nhé ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])(?:gui|gửi)\s+rep(?=[^\p{L}\p{N}]|$)/gui, ' gửi câu trả lời ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])vậy\s+sếp(?=[^\p{L}\p{N}]|$)/gui, ' ạ ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])sếp\s+cho\s+em\s+hỏi(?=[^\p{L}\p{N}]|$)/gui, ' cho em hỏi ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])check\s+(?:mail|email)\s+giúp\s+(?:e|em)(?=[^\p{L}\p{N}]|$)/gui, ' kiểm tra email giúp em ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])check\s+giúp\s+(?:e|em)(?=[^\p{L}\p{N}]|$)/gui, ' kiểm tra giúp em ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])duyệt\s+giúp\s+(?:e|em)(?=[^\p{L}\p{N}]|$)/gui, ' phê duyệt giúp em ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])(?:em\s+)?nhờ\s+sếp(?=[^\p{L}\p{N}]|$)/gui, ' sếp ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])oki\s+sếp(?:\s+e)?(?=[^\p{L}\p{N}]|$)/gui, ' dạ vâng em ');
  res = res.replace(/(?:^|[^\p{L}\p{N}])công\s+việc\s+này\s+làm\s+như\s+thế\s+nào(?=[^\p{L}\p{N}]|$)/gui, ' công việc này tiến hành như thế nào ');

  // Normalize 'r' at end of phrases like 'xong r', 'gửi r'
  res = res.replace(/(?<=(?:xong|gửi|gui|nhận|nhan|biết|biet|được|dc|đc|rồi)\s+)r(?=[^\p{L}\p{N}]|$)/gui, 'rồi');

  // Normalize 'e' to 'em' when used as pronoun
  res = res.replace(/(?<=^|[^\p{L}\p{N}])e(?=\s+(?:nhờ|gửi|gui|làm|lm|xin|chào|cảm ơn|đã|đang|sẽ|muốn|biết|chưa|vừa|ms|mới|hiểu|thấy|nghĩ|đi))/gui, 'em');
  res = res.replace(/(?<=(?:^|[^\p{L}\p{N}])(?:cho|giúp|với|nhờ|gửi|tặng)\s+)e(?=[^\p{L}\p{N}]|$)/gui, 'em');

  // 2. Word by word dictionary replacement using Unicode properties
  res = res.replace(/(?<=^|[^\p{L}\p{N}])(\p{L}+)(?=[^\p{L}\p{N}]|$)/gu, (match) => {
    const lower = match.toLowerCase();
    const replacement = TEENCODE_DICTIONARY[lower];
    if (replacement) {
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    }
    return match;
  });

  // Clean extra spaces
  res = res.replace(/[ ]{2,}/g, ' ').trim();

  return res;
}
