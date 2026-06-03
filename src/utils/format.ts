// Always use Indian number system: 1,00,000 not 100,000
export function formatINR(value: number): string {
  if (isNaN(value)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

// For crores: ₹1,234.56 Cr
export function formatCr(value: number): string {
  if (isNaN(value)) return "₹0.00 Cr";
  return `₹${formatINR(value / 1_00_00_000)} Cr`;
}

// Format relative date (e.g. "3 min ago", "2 hours ago")
export function relativeTime(pubDateStr: string): string {
  const now = new Date();
  const pubDate = new Date(pubDateStr);
  const diffMs = now.getTime() - pubDate.getTime();
  
  if (diffMs < 0) return "Just now";
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
}

// Format absolute date to IST for clock displays
export function formatIST(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date) + " IST";
}
