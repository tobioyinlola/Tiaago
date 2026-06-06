import {
  Inter,
  Space_Grotesk,
  DM_Sans,
  Roboto,
  Urbanist,
  Poppins,
  Onest,
  JetBrains_Mono,
} from "next/font/google";
import localFont from "next/font/local";

// Google fonts
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
});

export const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
});

export const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const switzer = localFont({
  src: "./Switzer-Variable.ttf",
  variable: "--font-switzer",
});

export const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
