import ChatFile from "./ChatFile";
import { cn } from "@/app/common/utils";
import { Message, SimpleUser } from "@/app/common/types";
import { AvatarWithOnlineIndicator } from "../../UserAvatar";
import RenderDate from "../../RenderDate";

const ChatBubble = ({
  message,
  sender,
  online,
}: {
  message: Message;
  sender?: SimpleUser;
  online: boolean;
}) => {
  // const name = sender
  //   ? `${sender.first_name || ""} ${sender.last_name || ""}`.trim()
  //   : "You";
  return (
    <div className={cn("chat mt-4", sender ? "chat-start" : "chat-end")}>
      {!!sender && (
        <AvatarWithOnlineIndicator
          firstName={sender.first_name}
          lastName={sender.last_name}
          profilePic={sender.profile_pic}
          online={online}
          containerClass='chat-image self-start'
          className='w-10'
        />
      )}
      <div
        className={cn(
          "chat-bubble before:hidden rounded-lg mt-5",
          sender
            ? "rounded-tl-none !rounded-bl-lg bg-gray-100 text-gray-900"
            : "chat-bubble-primary rounded-tr-none !rounded-br-lg"
        )}
      >
        {!!message.text && <h4 className='text-base'>{message.text}</h4>}
        {!!message.attachment && <ChatFile attachment={message.attachment} />}
        <div className='absolute -top-5 left-0 right-0 flex items-center justify-end gap-2'>
          {/* <h6 className='text-gray-700 font-medium line-clamp-1'>{name}</h6> */}
          <RenderDate
            className='text-gray-500 text-xs'
            date={message.timestamp}
            formatStr='h:mm a'
          />
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
