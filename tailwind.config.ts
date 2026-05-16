import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nachtblau: '#000000',
        tiefblau: '#1a1a1a',
        cognac: '#d2d2dc',
        cognacDark: '#b8b8c6',
        bordeaux: '#7A2D42',
        creme: '#F6F1E9',
        stone: '#E8E2D8',
        anthrazit: '#2D3748',
        stahlgrau: '#5A6478',
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        body: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
