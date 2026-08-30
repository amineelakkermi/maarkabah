// Shared calendar-grid math for DatePicker and DateTimePicker.

export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
// Saudi weekend (Fri/Sat)
export const WEEKEND_INDEXES = [5, 6];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export interface DayCell {
  y: number;
  m: number;
  d: number;
  inMonth: boolean;
}

export function buildMonthCells(viewY: number, viewM: number): DayCell[] {
  const firstOfMonth = new Date(viewY, viewM - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewY, viewM, 0).getDate();
  const daysInPrevMonth = new Date(viewY, viewM - 1, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const pm = viewM === 1 ? 12 : viewM - 1;
    const py = viewM === 1 ? viewY - 1 : viewY;
    cells.push({ y: py, m: pm, d: daysInPrevMonth - i, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ y: viewY, m: viewM, d, inMonth: true });

  const nm = viewM === 12 ? 1 : viewM + 1;
  const ny = viewM === 12 ? viewY + 1 : viewY;
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ y: ny, m: nm, d: nextDay, inMonth: false });
    nextDay++;
    if (cells.length >= 42) break;
  }
  return cells;
}

export function goMonth(viewY: number, viewM: number, delta: number): { y: number; m: number } {
  let ny = viewY;
  let nm = viewM + delta;
  if (nm < 1) { nm = 12; ny -= 1; }
  if (nm > 12) { nm = 1; ny += 1; }
  return { y: ny, m: nm };
}