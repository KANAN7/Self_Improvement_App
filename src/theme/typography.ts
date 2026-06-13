export const fontFamilies = {
  display: 'Lora_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  journal: 'Lora_400Regular',
} as const;

export const typeScale = {
  display: { fontSize: 32, lineHeight: 40 },
  title: { fontSize: 22, lineHeight: 30 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
  micro: { fontSize: 12, lineHeight: 16 },
} as const;

export type TypeVariant = keyof typeof typeScale;
