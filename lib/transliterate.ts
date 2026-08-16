// Best-effort Arabic → Latin name transliteration, used to pre-fill the
// (now optional) English name field from the (now required) Arabic one.
// It's a starting point the employee can still edit by hand — not a
// replacement for an official transliteration authority.
//
// Arabic doesn't write short vowels, so a pure letter-by-letter mapping
// can't recover them ("أحمد" -> "Ahmd" instead of "Ahmed"). A lookup table
// of common Gulf/Saudi given names and family names covers the common case
// with the spelling people actually expect; anything not in the table falls
// back to the generic per-letter mapping below.
const KNOWN_WORDS: Record<string, string> = {
  "أحمد": "Ahmed", "احمد": "Ahmed", "محمد": "Mohammed", "خالد": "Khaled",
  "عبدالله": "Abdullah", "عبدالعزيز": "Abdulaziz", "عبدالرحمن": "Abdulrahman",
  "فهد": "Fahad", "سعود": "Saud", "سلطان": "Sultan", "تركي": "Turki",
  "بندر": "Bandar", "ماجد": "Majed", "ناصر": "Nasser", "سلمان": "Salman",
  "يوسف": "Yousef", "إبراهيم": "Ibrahim", "ابراهيم": "Ibrahim", "عمر": "Omar",
  "علي": "Ali", "حسن": "Hassan", "حسين": "Hussein", "طلال": "Talal",
  "فيصل": "Faisal", "رائد": "Raed", "وليد": "Waleed", "زياد": "Ziad",
  "منصور": "Mansour", "عبدالمجيد": "Abdulmajeed", "مشعل": "Mishaal",
  "فارس": "Fares", "أنس": "Anas", "انس": "Anas", "يزيد": "Yazeed",
  "عبدالإله": "Abdulilah", "نايف": "Nayef", "عبدالوهاب": "Abdulwahhab",
  "فوزي": "Fawzi", "عادل": "Adel", "كريم": "Karim", "طارق": "Tariq",

  "فاطمة": "Fatimah", "عائشة": "Aisha", "مريم": "Maryam", "نورة": "Noura",
  "سارة": "Sarah", "منيرة": "Muneera", "هند": "Hind",
  "لطيفة": "Latifah", "ريم": "Reem", "لينا": "Lina", "دانة": "Dana",
  "شيخة": "Sheikha", "العنود": "Alanoud", "غادة": "Ghada", "ريما": "Rima",
  "أمل": "Amal", "امل": "Amal", "هيا": "Haya", "جواهر": "Jawaher",
  "وفاء": "Wafa", "أروى": "Arwa", "بشاير": "Bashayer",

  "المطيري": "Al-Mutairi", "العتيبي": "Al-Otaibi", "القحطاني": "Al-Qahtani",
  "الحربي": "Al-Harbi", "الغامدي": "Al-Ghamdi", "الزهراني": "Al-Zahrani",
  "الشهري": "Al-Shahrani", "الدوسري": "Al-Dosari", "السبيعي": "Al-Subaie",
  "الشمري": "Al-Shammari", "العنزي": "Al-Anzi", "المالكي": "Al-Malki",
  "الحارثي": "Al-Harthi", "البقمي": "Al-Baqami", "الرشيدي": "Al-Rashidi",
  "السلمي": "Al-Sulami", "اليامي": "Al-Yami", "العمري": "Al-Omari",
  "الفيفي": "Al-Faifi", "آل سعود": "Al Saud",
};

const CHAR_MAP: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "e", "آ": "aa", "ٱ": "a",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "th", "ر": "r", "ز": "z",
  "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z",
  "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l",
  "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y", "ى": "a",
  "ة": "ah", "ء": "", "ئ": "e", "ؤ": "o",
  // Diacritics — dropped entirely
  "َ": "", "ُ": "", "ِ": "", "ّ": "", "ْ": "", "ً": "", "ٌ": "", "ٍ": "",
};

function transliterateWord(word: string): string {
  if (KNOWN_WORDS[word]) return KNOWN_WORDS[word];

  // "ال" (definite article) prefix reads naturally as "Al" glued to the noun
  const stripped = word.startsWith("ال") && word.length > 2 ? "al" + word.slice(2) : word;
  let out = "";
  for (const ch of stripped) {
    out += CHAR_MAP[ch] ?? ch;
  }
  return out;
}

export function transliterateArabicName(arabic: string): string {
  return arabic
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const t = transliterateWord(word);
      // Known-word hits are already properly cased (e.g. "Al-Mutairi").
      return KNOWN_WORDS[word] ? t : t.charAt(0).toUpperCase() + t.slice(1);
    })
    .join(" ");
}
