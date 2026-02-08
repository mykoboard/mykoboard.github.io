
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px',
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        mint: {
          50: '#f2fbf9',
          100: '#d3f4ed',
          200: '#a7e9dc',
          300: '#74d4c4',
          400: '#48b7a7',
          500: '#2f9b8d',
          600: '#257c71',
          700: '#23635c',
          800: '#214f4a',
          900: '#1f403d',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        'fade-in': 'fade-in 1s ease-out forwards',
        float: 'float 3s ease-in-out infinite'
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      },
      backdropBlur: {
        'glass': '10px',
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }: any) {
      const newUtilities = {
        '.glass-dark': {
          background: 'rgba(15, 15, 25, 0.7)',
          backdropFilter: 'blur(10px)',
        },
        '.text-gradient': {
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
          '-webkit-background-clip': 'text',
          'background-clip': 'text',
          color: 'transparent',
        },
        '.neon-border': {
          border: '1px solid rgba(16, 185, 129, 0.2)',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)',
        },
        '.shadow-neon': {
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
        },
        '.shadow-glass-dark': {
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
