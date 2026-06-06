import type { Config } from "tailwindcss";
// import { fontFamily } from "tailwindcss/defaultTheme";
import daisyuiThemes from "daisyui/src/theming/themes";
import daisyui, { Config as DaisyuiConfig } from "daisyui";

const daisyuiConfig: DaisyuiConfig = {
  themes: [
    {
      light: {
        ...daisyuiThemes.light,
        primary: "#5465FF",
        error: "#F36174",
        success: "#00B849",
        "primary-content": "#ffffff",
        "error-content": "#ffffff",
        "success-content": "#ffffff",
      },
    },
  ],
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // primary: "#5465FF",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "hsl(var(--primary-foreground))",
        },
        "primary-dark": "#3A47B8",
        "deep-blue": "var(--side-bg)",
        dark: "#23262F",
        outline: "#F0F2F5",
        primaryBlack: "#2E3031",
        "primary-black": "#2E3031",
        "secondary-black": "#6C757D",
        "secondary-2": {
          DEFAULT: "#3E92CC",
          light: "#E8F4FC",
          dark: "#2A7AB2",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
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
        score: {
          high: "hsl(var(--score-high))",
          medium: "hsl(var(--score-medium))",
          low: "hsl(var(--score-low))",
        },
        badge: {
          "green-bg": "hsl(var(--badge-green-bg))",
          "green-text": "hsl(var(--badge-green-text))",
          "blue-bg": "hsl(var(--badge-blue-bg))",
          "blue-text": "hsl(var(--badge-blue-text))",
          "purple-bg": "hsl(var(--badge-purple-bg))",
          "purple-text": "hsl(var(--badge-purple-text))",
        },
      },
      fontFamily: {
        inter: ["var(--font-inter)"],
        urbanist: ["var(--font-urbanist)"],
        "space-grotesk": ["var(--font-space-grotesk)"],
        "dm-sans": ["var(--font-dm-sans)"],
        roboto: ["var(--font-roboto)"],
        poppins: ["var(--font-poppins)"],
        switzer: ["var(--font-switzer)"],
        onest: ["var(--font-onest)"],
        "jetbrains-mono": ["var(--font-jetbrains-mono)"],
      },
      backgroundImage: {
        "verify-pattern": "url('/assets/images/lines.png')",
        "talent-pic1": "url('/assets/images/home/talents_pic/talent_img1.png')",
        "talent-pic2": "url('/assets/images/home/talents_pic/talent_img2.png')",
        "talent-pic3": "url('/assets/images/home/talents_pic/talent_img3.png')",
        "talent-pic4": "url('/assets/images/home/talents_pic/talent_img4.png')",
        "talent-pic5":
          "url('/assets/images/home/talents_pic/backgroundimg.png')",
      },
      height: {
        "talant-pic-height": "700px",
        "line-height": "555px",
      },
      backdropBlur: {
        xs: "1px",
      },
      borderRadius: {
        "2lg": "10px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      screens: {
        mobile: "300px",
        card: "840px",
        menu: "550px",
      },
      boxShadow: {
        subtle: "0 2px 5px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        soft: "0 2px 8px 0 rgb(0 0 0 / 0.04)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
      transitionDuration: {
        "1s": "1s",
        "2s": "2s",
      },
    },
  },
  daisyui: daisyuiConfig,
  plugins: [
    require("tailwind-scrollbar"),
    require("tailwindcss-animate"),
    daisyui,
  ],
};
export default config;
