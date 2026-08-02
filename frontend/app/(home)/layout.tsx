import { PropsWithChildren } from "react";

import Navbar from "../common/components/Layout/Navbar";
import ScrollArea from "../common/components/ScrollArea";
import ScrollToTop from "../common/components/Layout/ScrollToTop";
import HomeAuthHydrator from "./_components/HomeAuthHydrator";
import VisitBeacon from "./_components/VisitBeacon";
import { jetBrainsMono } from "../fonts";

const scrollElId = "root-scroll-area";

const HomeLayout = ({ children }: PropsWithChildren) => {
  return (
    <ScrollArea id={scrollElId} className={`h-screen font-poppins ${jetBrainsMono.variable}`}>
      <div className='relative'>
        <Navbar scrollElId={scrollElId} />
      </div>
      {children}
      <ScrollToTop id={scrollElId} />
      <HomeAuthHydrator />
      <VisitBeacon />
    </ScrollArea>
  );
};

export default HomeLayout;
