"use client";
import { cn } from "@/app/common/utils";
import ChatListItem from "./ChatListItem";
import ScrollArea from "../../ScrollArea";
import ChatListHeader from "./ChatListHeader";
import { useChat } from "@/app/common/store/useChat";
import { useSearch } from "@/app/common/store/useSearch";
import { IChatListItem, Talent, User } from "@/app/common/types";

type ChatListProps = {
  activeChatID?: IChatListItem["id"];
  talentID?: IChatListItem["id"];
  chats: IChatListItem[];
  currentUser: User;
  talents: Talent[];
};

const ChatList = ({
  activeChatID,
  talentID,
  chats,
  currentUser,
  talents,
}: ChatListProps) => {
  const searchText = useSearch(state => state.searchText);
  const chatInfo = useChat(state => state.chatInfo);
  const filteredChats = chats.filter(chat => {
    if (!searchText) return true;
    const otherUser = chat.other_user;
    const search = (searchText.search ?? "").toLowerCase();
    return (
      otherUser?.first_name.toLowerCase().includes(search) ||
      otherUser?.last_name.toLowerCase().includes(search)
    );
  });
  return (
    <ScrollArea
      className={cn(
        "md:border-r border-gray-200 col-span-2 h-[calc(100svh-65px-7.5rem)]",
        (activeChatID || talentID) && "max-md:hidden"
      )}
    >
      <ChatListHeader
        noOfUnreadMsgs={
          chats.filter(chat => chat.last_message?.read === false).length
        }
        hideCreateChat={currentUser.user_type === "T"}
        talents={talents}
      />
      {filteredChats.map((chat, i) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          activeChatID={activeChatID}
          userID={currentUser.pk}
          divider={i !== filteredChats.length - 1}
          chatInfo={chatInfo[chat.id]}
        />
      ))}
      {/* Chat empty */}
      {!filteredChats.length && (
        <div className='mt-2'>
          <h5 className='text-gray-500 text-center text-base lg:text-lg'>
            No chats{" "}
            {searchText.search
              ? `found for "${searchText.search}"`
              : "available"}
          </h5>
        </div>
      )}
    </ScrollArea>
  );
};

export default ChatList;
