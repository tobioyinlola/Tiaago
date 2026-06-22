import { PropsWithChildren } from "react";

import { useUserStore } from "../common/store/useUser";
import Navbar from "../common/components/Layout/Navbar";
// import Footer from "../common/components/Layout/Footer";
import ScrollArea from "../common/components/ScrollArea";
import { getCurrentUser } from "../common/services/profile";
import { ALLOW_NULL_ARGS } from "../common/constants";
import ScrollToTop from "../common/components/Layout/ScrollToTop";
import SetUserProfile from "../common/components/Layout/SetUserProfile";
import { jetBrainsMono } from "../fonts";

export const dynamic = "force-dynamic";

const scrollElId = "root-scroll-area";

const HomeLayout = async ({ children }: PropsWithChildren) => {
  const { currentUser, removeAuthCookies } = await getCurrentUser(undefined, ALLOW_NULL_ARGS);
  useUserStore.setState({ profile: currentUser });
  return (
    <ScrollArea id={scrollElId} className={`h-screen font-poppins ${jetBrainsMono.variable}`}>
      <div className='relative'>
        <Navbar scrollElId={scrollElId} />
      </div>
      {children}
      {/* <Footer /> */}
      <ScrollToTop id={scrollElId} />
      <SetUserProfile
        profile={currentUser}
        removeAuthCookies={removeAuthCookies}
      />
    </ScrollArea>
  );
};

export default HomeLayout;
