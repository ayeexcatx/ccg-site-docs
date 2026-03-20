export function formatLabel(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatTimestamp(seconds, fallback = '—') {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return fallback;
  const totalSeconds = Math.max(0, Math.floor(Number(seconds)));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const remainingSeconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export function getVisibilityLabel(visibility) {
  return formatLabel(visibility);
}

export function getWorkflowStateLabel(status) {
  return formatLabel(status);
}
