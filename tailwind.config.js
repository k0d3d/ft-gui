/** @type {import('tailwindcss').Config} */
export default {
  content: ['./gui/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lavender: '#c4b5fd',
        periwinkle: '#a5b4fc',
        peach: '#fdba74',
        mint: '#6ee7b7',
        coral: '#fca5a5',
        amber: '#fcd34d',
      },
    },
  },
  plugins: [],
}
