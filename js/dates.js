// Shared local-time date helpers.
// All functions use the 'T00:00:00' suffix when parsing ISO strings to avoid UTC drift.

export function localIso(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Return today's date in YYYY-MM-DD using local clock (not UTC).
export function today() {
  return localIso(new Date());
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localIso(d);
}

export function daysBetween(isoA, isoB) {
  return Math.floor(
    (new Date(isoB + 'T00:00:00') - new Date(isoA + 'T00:00:00')) / 86400000
  );
}

export function snapToMonday(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return localIso(d);
}
