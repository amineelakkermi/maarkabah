/**
 * Hijri <-> Gregorian conversion utilities.
 *
 * Wraps the `hijri-converter` package (Umm al-Qura algorithm, zero deps).
 *
 * Hijri format used throughout the app: 8-digit string "YYYYMMDD"
 * Gregorian format used throughout the app: ISO string "YYYY-MM-DD"
 */
import { toHijri, toGregorian } from "hijri-converter";

/* Hijri month names — canonical source, re-exported by HijriDatePicker. */
export const HIJRI_MONTHS = [
  { n: 1, ar: "محرم", en: "Muharram" },
  { n: 2, ar: "صفر", en: "Safar" },
  { n: 3, ar: "ربيع الأول", en: "Rabi' al-awwal" },
  { n: 4, ar: "ربيع الآخر", en: "Rabi' al-thani" },
  { n: 5, ar: "جمادى الأولى", en: "Jumada al-awwal" },
  { n: 6, ar: "جمادى الآخرة", en: "Jumada al-thani" },
  { n: 7, ar: "رجب", en: "Rajab" },
  { n: 8, ar: "شعبان", en: "Sha'ban" },
  { n: 9, ar: "رمضان", en: "Ramadan" },
  { n: 10, ar: "شوال", en: "Shawwal" },
  { n: 11, ar: "ذو القعدة", en: "Dhu al-Qi'dah" },
  { n: 12, ar: "ذو الحجة", en: "Dhu al-Hijjah" },
];

/* ------------------------------------------------------------------ */
/*  Core converters                                                    */
/* ------------------------------------------------------------------ */

/**
 * Convert an 8-digit Hijri string ("YYYYMMDD") to an ISO Gregorian string
 * ("YYYY-MM-DD").  Returns `""` when the input is invalid or incomplete.
 */
export function hijriToGregorianStr(hijri: string): string {
  if (!hijri || hijri.length !== 8) return "";
  const hy = parseInt(hijri.slice(0, 4), 10);
  const hm = parseInt(hijri.slice(4, 6), 10);
  const hd = parseInt(hijri.slice(6, 8), 10);
  if (!hy || !hm || !hd) return "";
  try {
    const { gy, gm, gd } = toGregorian(hy, hm, hd);
    return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * Convert an ISO Gregorian string ("YYYY-MM-DD") to an 8-digit Hijri string
 * ("YYYYMMDD").  Returns `""` when the input is invalid or incomplete.
 */
export function gregorianToHijriStr(greg: string): string {
  if (!greg) return "";
  const parts = greg.split("-");
  if (parts.length !== 3) return "";
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);
  if (!gy || !gm || !gd) return "";
  try {
    const { hy, hm, hd } = toHijri(gy, gm, gd);
    return `${hy}${String(hm).padStart(2, "0")}${String(hd).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Display helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Format a Hijri 8-digit string into a human-readable label.
 * e.g. "14100521" -> "21 Jumada al-awwal 1410" (en) / "٢١ جمادى الأولى ١٤١٠" (ar)
 */
export function formatHijriDisplay(hijri: string, ar: boolean): string {
  if (!hijri || hijri.length !== 8) return "";
  const y = parseInt(hijri.slice(0, 4), 10);
  const m = parseInt(hijri.slice(4, 6), 10);
  const d = parseInt(hijri.slice(6, 8), 10);
  if (!y || !m || !d) return "";
  const month = HIJRI_MONTHS.find((mo) => mo.n === m);
  if (!month) return "";
  return ar
    ? `${d} ${month.ar} ${y}`
    : `${d} ${month.en} ${y}`;
}
