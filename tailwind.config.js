/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        display: ['Lora_600SemiBold', 'serif'],
        body: ['Inter_400Regular', 'sans-serif'],
        bodyMedium: ['Inter_500Medium', 'sans-serif'],
        journal: ['Lora_400Regular', 'serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
        pill: '999px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
      },
    },
  },
  plugins: [],
};
