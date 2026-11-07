export function restorePreferences(raw: string | null, validIds: string[], countries: string[]) {
  const fallback = { saved: [] as string[], country: countries[0] ?? 'UAE' };
  if (!raw) return fallback;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return fallback;
    const preferences = data as { saved?: unknown; country?: unknown };
    return {
      saved: Array.isArray(preferences.saved)
        ? [...new Set(preferences.saved.filter((id): id is string => typeof id === 'string' && validIds.includes(id)))] : [],
      country: typeof preferences.country === 'string' && countries.includes(preferences.country) ? preferences.country : fallback.country,
    };
  } catch { return fallback; }
}
