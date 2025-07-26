/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Voice Matrix Design System
        'primary-blue': '#4F46E5',
        'primary-white': '#FFFFFF',
        'indigo-light': '#6366F1',
        'indigo-dark': '#312E81',
        'accent-pink': '#EC4899',
        'accent-teal': '#14B8A6',
        'success-green': '#22C55E',
        'error-red': '#EF4444',
        'warning-yellow': '#FBBF24',
        'bg-dark': '#111827',
        'bg-surface': '#1F2937',
        'border-subtle': '#374151',
        'text-primary': '#F9FAFB',
        'text-secondary': '#9CA3AF',
        'text-disabled': '#4B5563',
        'bg-light': '#F9FAFB',
        'bg-surface-light': '#FFFFFF',
        'border-subtle-light': '#E5E7EB',
        'text-primary-light': '#111827',
        'text-secondary-light': '#6B7280',
        'text-disabled-light': '#D1D5DB',
        
        // Keep existing shadcn colors for compatibility
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontSize: {
        'h1': ['30px', { lineHeight: '36px', letterSpacing: '-0.5px' }],
        'h2': ['24px', { lineHeight: '32px', letterSpacing: '-0.4px' }],
        'h3': ['20px', { lineHeight: '28px', letterSpacing: '-0.2px' }],
        'body-large': ['16px', { lineHeight: '24px' }],
        'body': ['14px', { lineHeight: '20px' }],
        'label': ['12px', { lineHeight: '16px', letterSpacing: '0.1px' }],
        'button': ['15px', { lineHeight: '24px' }],
        'code': ['14px', { lineHeight: '22px' }],
      },
      spacing: {
        '4dp': '4px',
        '8dp': '8px', 
        '12dp': '12px',
        '16dp': '16px',
        '24dp': '24px',
        '32dp': '32px',
        '48dp': '48px',
      },
      borderRadius: {
        '8dp': '8px',
        '12dp': '12px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      height: {
        '44dp': '44px',
        '48dp': '48px',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '350': '350ms', 
        '400': '400ms',
      },
    },
  },
  plugins: [],
}