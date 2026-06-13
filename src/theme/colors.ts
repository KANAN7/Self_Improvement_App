export const colors = {
  bg: '#111111',
  surface: '#1E1C1B',
  accentGold: '#C8A97E',
  accentSage: '#7C9E8A',
  textPrimary: '#F0EDE8',
  textSecondary: '#8A8680',
  moodAmber: '#D9A441',
  moodRose: '#C98B8B',
  moodSlate: '#7E8AA0',
  moodSage: '#7C9E8A',
} as const;

export type ColorToken = keyof typeof colors;
