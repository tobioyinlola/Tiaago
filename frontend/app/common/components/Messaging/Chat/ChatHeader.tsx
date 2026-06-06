import { toId } from "@/app/common/utils";
import CustomBadge from "../../CustomBadge";
import { AvatarWithVerifiedBadge } from "../../UserAvatar";
import ChatOptions, { ChatOptionsProps } from "./ChatOptions";

const ChatHeader = ({
  online,
  user,
  currentUserType,
  roles,
  disableScheduleMeeting,
}: ChatOptionsProps) => {
  const isSimpleUSer = !("country" in user);
  const isTalent = !isSimpleUSer && user.user_type === "T";
  const isVerified = isTalent ? user.has_passed_assessment : user.verified;
  return (
    <header className='px-6 h-[77px] flex items-center border-b border-gray-200'>
      <div className='flex'>
        <AvatarWithVerifiedBadge
          firstName={user.first_name}
          lastName={user.last_name}
          verified={isVerified}
          profilePic={user.profile_pic}
          className='w-14'
          containerClass='h-14'
        />
        <div className='ml-4 mr-2'>
          <h4 className='text-lg text-gray-900 font-medium'>
            {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
          </h4>
          <p className='text-sm text-gray-500'>
            @{toId(user.first_name || user.last_name || user.username || "")}
          </p>
        </div>
        {online && <CustomBadge text='Online' />}
      </div>
      <ChatOptions
        user={user}
        online={online}
        currentUserType={currentUserType}
        roles={roles}
        disableScheduleMeeting={disableScheduleMeeting}
      />
    </header>
  );
};

export default ChatHeader;
