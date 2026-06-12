/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f10',
          2: '#1a1a1c',
          3: '#252527',
        },
        border: {
          DEFAULT: '#282829',
          faint: '#1c1c1e',
        },
        text: {
          DEFAULT: '#f5f5f7',
          muted: '#86868b',
          faint: '#3d3d40',
        },
        accent: {
          DEFAULT: '#0071e3',
          dim: 'rgba(0,113,227,0.13)',
          text: '#2997ff',
        },
        success: {
          DEFAULT: '#30d158',
          dim: 'rgba(48,209,88,0.12)',
        },
        warning: {
          DEFAULT: '#ff9f0a',
          dim: 'rgba(255,159,10,0.12)',
        },
        error: {
          DEFAULT: '#ff453a',
          dim: 'rgba(255,69,58,0.12)',
        },
        offer: {
          DEFAULT: '#bf5af2',
          dim: 'rgba(191,90,242,0.12)',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
