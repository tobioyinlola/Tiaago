import type { Metadata } from "next";
import { PropsWithChildren } from "react";

import {
  dmSans,
  inter,
  spaceGrotesk,
  roboto,
  poppins,
  switzer,
  onest,
} from "./fonts";
import "./globals.css";
import { cn } from "./common/utils";
import Providers from "./common/components/Layout/Providers";
import { TailwindIndicator } from "./common/components/TailwindIndicator";

const title = "TIAAGO";
const description =
  "Source/Screen candidates, run assessments, build talent pipelines, and customize your hiring workflow end to end.";

export const metadata: Metadata = {
  title: {
    default: title + ": " + description,
    template: `%s | ${title}`,
  },
  description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_VERCEL ?? "https://tiaago.com"),
  openGraph: {
    title: "TIAAGO: The OS for Hiring",
    description:
      "Source/Screen candidates, run assessments, build talent pipelines, and customize your hiring workflow end to end.",
    siteName: "TIAAGO",
    type: "website",
    locale: "en_US",
    url: "https://tiaago.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIAAGO: The OS for Hiring",
    description:
      "Source/Screen candidates, run assessments, build talent pipelines, and customize your hiring workflow end to end.",
    creator: "@TiaagoHq",
  },
  keywords: [
    "hire developers Africa",
    "tech talent Africa",
    "AI hiring platform",
    "recruitment software",
    "talent pipeline",
    "skill assessments",
    "remote developers",
  ],
  robots: { index: true, follow: true },
};

const RootLayout = ({ children }: PropsWithChildren<{}>) => {
  return (
    <html lang='en' data-theme='light' className='scroll-smooth' suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          inter.variable,
          spaceGrotesk.variable,
          dmSans.variable,
          roboto.variable,
          poppins.variable,
          switzer.variable,
          onest.variable,
          "min-h-[100svh] w-[100svw] bg-[#F7F7FB] text-black"
        )}
      >
        <Providers>
          {children}
          <button
            type='button'
            id='dropdown-close-helper'
            className='h-0 w-0 absolute z-[-1]'
          />
          <TailwindIndicator />
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
