import { buildGpsSampleRecord } from '@/lib/domainWorkflows';

const STORAGE_KEY_PREFIX = 'ccg:gps-session:';

function getStorageKey(sessionId) {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

export function loadStoredGpsSession(sessionId) {
  if (!sessionId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(sessionId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredGpsSession(sessionId, samples = []) {
  if (!sessionId || typeof window === 'undefined') return;
  window.localStorage.setItem(getStorageKey(sessionId), JSON.stringify(samples));
}

export function clearStoredGpsSession(sessionId) {
  if (!sessionId || typeof window === 'undefined') return;
  window.localStorage.removeItem(getStorageKey(sessionId));
}

export function appendGpsSample(sessionId, coords) {
  const nextSample = buildGpsSampleRecord({ fieldSessionReference: sessionId, coords });
  const nextSamples = [...loadStoredGpsSession(sessionId), nextSample];
  saveStoredGpsSession(sessionId, nextSamples);
  return nextSamples;
}
