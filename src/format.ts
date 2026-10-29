// "10:42 am" and "Oct 22 2025"
export function formatWhen(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).replace(",", "");
  return { time, date };
}
