/** Fecha local en formato YYYY-MM-DD. Nunca usar toISOString() para "hoy": da la fecha UTC,
 * que en Argentina (UTC−3) ya es el día siguiente desde las 21:00. */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
