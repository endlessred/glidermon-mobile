// components/shop/shopTimeFormat.ts
// "New stock in 7h 24m" rather than a raw timestamp -- see ShopHeader.
export function formatRestockCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "New stock any moment";
  const totalMinutes = Math.ceil(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `New stock in ${minutes}m`;
  if (minutes === 0) return `New stock in ${hours}h`;
  return `New stock in ${hours}h ${minutes}m`;
}
