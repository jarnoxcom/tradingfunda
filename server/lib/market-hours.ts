// Year-independent Indian NSE Market Holidays (MM-DD)
export const NSE_HOLIDAYS = [
  "01-26", // Republic Day
  "03-03", // Holi
  "04-03", // Good Friday
  "04-14", // Ambedkar Jayanti
  "05-01", // Maharashtra Day
  "08-15", // Independence Day
  "09-15", // Ganesh Chaturthi
  "10-20", // Dussehra
  "11-08", // Diwali Laxmi Pujan
  "11-09", // Diwali Balipratipada
  "11-24", // Gurunanak Jayanti
  "12-25", // Christmas
];

export function isMarketOpen(): boolean {
  const now = new Date();
  // Get time in IST
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  
  const day = istDate.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  // Check holidays
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  const dd = String(istDate.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;
  
  if (NSE_HOLIDAYS.includes(mmdd)) return false;

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMin = hours * 60 + minutes;

  // 09:15 to 15:35 IST
  return timeInMin >= 555 && timeInMin <= 935;
}
