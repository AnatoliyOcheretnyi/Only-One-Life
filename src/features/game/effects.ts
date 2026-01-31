export const EFFECT_TEXTURES = {
  rain: require('../../../assets/images/effects/rain.png'),
  snow: require('../../../assets/images/effects/snow.png'),
  leaves: require('../../../assets/images/effects/leaves.png'),
};

export const effectFromText = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('буря') || lower.includes('дощ') || lower.includes('повін')) return 'rain';
  if (lower.includes('сніг') || lower.includes('зим') || lower.includes('холод')) return 'snow';
  if (lower.includes('лист') || lower.includes('осін') || lower.includes('вітер')) return 'leaves';
  return null;
};
