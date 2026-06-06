import Link from "next/link";

import { cn, toId } from "@/app/common/utils";
import { ChatInfo } from "@/app/common/store/useChat";
import { IChatListItem, ID } from "@/app/common/types";
import { AvatarWithOnlineIndicator } from "../../UserAvatar";
import RenderDate from "../../RenderDate";

type ChatListItemProps = {
  chat: IChatListItem;
  activeChatID?: IChatListItem["id"];
  userID: ID;
  talentID?: ID;
  divider?: boolean;
  chatInfo?: ChatInfo;
};

const ChatListItem = ({
  chat,
  activeChatID,
  talentID,
  userID,
  divider,
  chatInfo,
}: ChatListItemProps) => {
  const otherUser = chat.other_user;
  const lastMessage = chatInfo?.lastMessage || chat.last_message;
  const isActive = activeChatID == chat.id || talentID === otherUser?.id;
  const isLastMessageSentByCurrentUser = userID == lastMessage?.sender;

  return (
    <Link
      href={{
        query: {
          chat: chat.id,
        },
      }}
    >
      <div
        className={cn(
          "p-4 border-gray-200",
          isActive && "bg-gray-50",
          divider && "border-b"
        )}
      >
        <div className='flex mb-4'>
          <div className='w-5 flex items-center mr-3'>
            <div
              className={cn(
                "w-2 h-2 rounded-full bg-[#9E77ED]",
                lastMessage?.read && "hidden"
              )}
            />
          </div>
          <AvatarWithOnlineIndicator
            firstName={otherUser?.first_name}
            lastName={otherUser?.last_name}
            profilePic={otherUser?.profile_pic}
            isActive={isActive}
            online={false}
          />
          <div className='ml-3'>
            <h6 className='text-sm text-gray-700 font-medium'>
              {`${otherUser?.first_name || ""} ${
                otherUser?.last_name || ""
              }`.trim()}
            </h6>
            <p className='text-sm text-gray-500'>
              @{toId(otherUser?.first_name || otherUser?.last_name || "")}
            </p>
          </div>
          <p className='text-sm text-gray-500 ml-auto'>
            {lastMessage?.timestamp ? (
              <RenderDate date={lastMessage.timestamp} formatStr='h:mm a' />
            ) : (
              ""
            )}
          </p>
        </div>
        {!!lastMessage && (
          <p className='text-sm text-gray-500 ml-7 line-clamp-1'>
            {isLastMessageSentByCurrentUser && (
              <span className='font-medium'>You: </span>
            )}
            {lastMessage.text}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ChatListItem;
