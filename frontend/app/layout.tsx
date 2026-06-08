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
  jetBrainsMono,
} from "./fonts";
import "./globals.css";
import { cn } from "./common/utils";
import Providers from "./common/components/Layout/Providers";
import { TailwindIndicator } from "./common/components/TailwindIndicator";

const title = "Tiaago";
const description =
  "AI-Powered Hiring Infrastructure for Recruiters and Recruitment Agencies.";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export const metadata: Metadata = {
  title: {
    default: title + ": " + description,
    template: `%s | ${title}`,
  },
  description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_VERCEL ?? "https://tiaago.com"),
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
          jetBrainsMono.variable,
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
