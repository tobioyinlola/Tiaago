"use client";
import { compareAsc } from "date-fns";
import { useEffect, useState } from "react";

import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";
import ChatBubble from "./ChatBubble";
import ScrollArea from "../../ScrollArea";
import EmptyState from "../../dashboard/EmptyState";
import { Chat, Message, Talent, TalentRole, User } from "@/app/common/types";

const CurrentChat = ({
  chat,
  talent,
  currentUser,
  roles,
  disableScheduleMeeting,
  authToken,
  websocket_url,
  websocket_url_secure,
}: {
  chat?: Chat;
  talent?: Talent;
  currentUser: User;
  roles: TalentRole[];
  disableScheduleMeeting?: boolean;
  authToken: string;
  websocket_url: string;
  websocket_url_secure: string;
}) => {
  const sortMessages = (msgs: Message[]) =>
    msgs.sort((a, b) =>
      compareAsc(new Date(a.timestamp), new Date(b.timestamp))
    );
  const currentUserType = currentUser.user_type;
  const [messages, setMessages] = useState(sortMessages(chat?.messages ?? []));
  const addMessage = (msg: Message) => {
    console.log("addMessage: ", msg);
    setMessages(prev =>
      sortMessages([...prev.filter(m => m.id !== msg.id), msg])
    );
  };
  const addMessages = (msgs: Message[]) => {
    setMessages(prev =>
      sortMessages([
        ...prev.filter(m => !msgs.map(m => m.id).includes(m.id)),
        ...msgs,
      ])
    );
  };
  useEffect(() => {
    if (chat) setMessages(sortMessages(chat.messages ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]);
  const otherUser =
    chat?.initiator.id == currentUser.pk ? chat.receiver : chat?.initiator;
  return (
    <section className='col-span-3'>
      {chat || talent ? (
        <>
          <ChatHeader
            user={(otherUser ?? talent)!}
            online={!!chat?.online.includes(currentUser.id)}
            currentUserType={currentUserType}
            roles={roles}
            disableScheduleMeeting={disableScheduleMeeting}
          />
          <ScrollArea
            id='chat-scroll'
            className='h-[calc(100svh-50px-10.5rem-100px)] md:h-[calc(100svh-50px-8rem-200px)] py-2 pl-2 md:pl-4 pr-1'
          >
            {messages.map(msg => (
              <ChatBubble
                key={msg.id}
                message={msg}
                sender={msg.sender == currentUser.pk ? undefined : otherUser}
                online={!!chat?.online.includes(msg.sender)}
              />
            ))}
            {/* chat empty */}
            {!messages.length && (
              <div className='mt-2'>
                <h5 className='text-gray-500 text-center text-base lg:text-lg'>
                  No messages available
                </h5>
              </div>
            )}
            <div id='chat-bottom' />
          </ScrollArea>
          <ChatInput
            chatID={chat?.id}
            otherUserID={otherUser?.id ?? talent?.pk}
            authToken={authToken}
            addMessage={addMessage}
            addMessages={addMessages}
            websocket_url={websocket_url}
            websocket_url_secure={websocket_url_secure}
          />
        </>
      ) : (
        <EmptyState
          className='max-md:hidden'
          text='Open on a chat to start messaging...'
        />
      )}
    </section>
  );
};

export default CurrentChat;
