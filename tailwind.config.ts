import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'rgba(var(--primary-rgb), <alpha-value>)', foreground: '#ffffff' },
        secondary: { DEFAULT: 'rgba(var(--secondary-rgb), <alpha-value>)', foreground: '#f4f4fa' },
        card: { DEFAULT: '#14141e', foreground: '#f4f4fa' },
        popover: { DEFAULT: '#1e1e2d', foreground: '#f4f4fa' },
        muted: { DEFAULT: '#1e1e2d', foreground: '#9c9cb4' },
        accent: { DEFAULT: '#1e1e2d', foreground: '#f4f4fa' },
        destructive: { DEFAULT: '#b34258', foreground: '#ffffff' },
        input: '#2d2d41', ring: '#7c74ff', warm: '#f0a868',
        border: 'rgba(var(--border-rgb), <alpha-value>)',
        background: 'rgba(var(--background-start-rgb), <alpha-value>)',
        foreground: 'rgba(var(--foreground-rgb), <alpha-value>)',
      },
    },
  },
  plugins: [],
}
export default config