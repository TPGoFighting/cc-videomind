import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        "furuya-accent": "var(--accent)",
        "furuya-surface": "var(--surface)",
        "furuya-text-primary": "var(--text-primary)",
        "furuya-text-secondary": "var(--text-secondary)",
        "furuya-text-tertiary": "var(--text-tertiary)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "PingFang SC", "Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "SF Mono", "Fira Code", "monospace"],
      }
    }
  },
  plugins: []
};

export default config;
