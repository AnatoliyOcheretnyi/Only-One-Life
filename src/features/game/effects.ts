export const effectFromText = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('буря') || lower.includes('дощ') || lower.includes('повін')) return 'rain';
  if (lower.includes('сніг') || lower.includes('зим') || lower.includes('холод')) return 'snow';
  if (lower.includes('лист') || lower.includes('осін') || lower.includes('вітер')) return 'leaves';
  return null;
};

export const snowIntensityFromText = (text: string) => {
  const lower = text.toLowerCase();
  if (
    lower.includes('замет') ||
    lower.includes('хуртов') ||
    lower.includes('сніжна буря') ||
    lower.includes('завірю') ||
    lower.includes('буря')
  ) {
    return 'blizzard' as const;
  }
  return 'gentle' as const;
};
