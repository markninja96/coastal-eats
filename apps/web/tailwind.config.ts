import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
        mist: 'rgb(var(--mist) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config;
