import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-oxanium)', 'system-ui', 'sans-serif'],
        stencil: ['var(--font-stencil)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
