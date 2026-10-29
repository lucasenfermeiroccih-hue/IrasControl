import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Onest", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["DM Sans", "Onest", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        forest: {
          50: "#F2F8F6", 100: "#E1EFE8", 300: "#96C3AD", 500: "#3F8568",
          700: "#265543", 900: "#1D392F", 950: "#0A1814",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        soft: "0 1px 2px hsl(163 41% 9% / 0.04), 0 8px 24px -12px hsl(163 41% 9% / 0.10)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.18), 0 14px 34px -14px hsl(var(--glow) / 0.55)",
        "glow-strong": "0 0 30px hsl(var(--glow) / 0.45), 0 0 60px hsl(var(--glow) / 0.25)",
        "btn-primary": "0 12px 28px -12px hsl(var(--primary) / 0.75), inset 0 1px 0 hsl(0 0% 100% / 0.35), inset 0 -2px 0 hsl(163 94% 15% / 0.35)",
      },
      transitionTimingFunction: {
        spectra: "cubic-bezier(.2,.8,.2,1)",
        auralis: "cubic-bezier(.22,1,.36,1)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "glow-pulse": {
          from: { boxShadow: "0 0 0 0 hsl(var(--glow) / 0.0)" },
          to: { boxShadow: "0 0 24px 2px hsl(var(--glow) / 0.45)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "xp-float": {
          "0%": { transform: "translate(-50%, 0) scale(0.8)", opacity: "0" },
          "15%": { transform: "translate(-50%, -8px) scale(1.05)", opacity: "1" },
          "100%": { transform: "translate(-50%, -64px) scale(1)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "rise-in": "rise-in 0.6s cubic-bezier(.22,1,.36,1) both",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite alternate",
        pop: "pop 0.5s cubic-bezier(.22,1,.36,1) both",
        "xp-float": "xp-float 1.4s cubic-bezier(.22,1,.36,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
