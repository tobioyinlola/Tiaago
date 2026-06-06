import { PropsWithChildren } from "react";

import Nav from "@/app/common/components/dashboard/Nav";
import ScrollArea from "@/app/common/components/ScrollArea";
import { getCurrentUser } from "@/app/common/services/profile";
import SetUserProfile from "@/app/common/components/Layout/SetUserProfile";
import { VerifiedBadgeIndicator } from "@/app/common/components/UserAvatar";
import SetTalentProfile from "@/app/talents/(dashboard)/components/SetTalentProfile";

const AssessmentLayout = async ({ children }: PropsWithChildren) => {
  const { currentUser: user, removeAuthCookies } = await getCurrentUser(
    "talent"
  );

  return (
    <div className='bg-white min-h-[100svh] font-poppins'>
      <SetTalentProfile profile={user} />
      <SetUserProfile profile={user} removeAuthCookies={removeAuthCookies} />
      <Nav
        // subscribedPlan={user.subscribed_plan}
        firstName={user.first_name}
        lastName={user.last_name}
        profilePic={user.profile_pic}
        indicator={
          user.has_passed_assessment ? (
            <VerifiedBadgeIndicator size={18} />
          ) : undefined
        }
       hideMenuIcon 
        email={user.email}
        className='bg-[#FDFDFD] border-[#F0F2F5]'
      />
      <ScrollArea className='h-[calc(100svh-5rem)] flex-1 px-3 md:px-8'>
        <div className='h-3 md:h-5' />
        {children}
        <div className='h-3 md:h-5' />
      </ScrollArea>
    </div>
  );
};

export default AssessmentLayout;
