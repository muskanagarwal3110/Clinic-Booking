const time = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const timeRange = (start, end) => `${time(start)} – ${time(end)}`;
export const startTime = time;

export const dayKey = (d) => new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD, local zone
export const dayLabel = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const shortDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

export function groupByDay(items, getDate) {
  const groups = new Map();
  for (const item of items) {
    const key = dayKey(getDate(item));
    if (!groups.has(key)) groups.set(key, { key, label: dayLabel(getDate(item)), items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

// value for <input type="datetime-local"> in the user's local zone
export function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
