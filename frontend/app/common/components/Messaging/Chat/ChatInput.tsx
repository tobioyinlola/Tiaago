"use client";
// import { toast } from "sonner";
import dynamic from "next/dynamic";
import { compareDesc } from "date-fns";
import { Button } from "react-daisyui";
import { FiSend } from "react-icons/fi";
import { IoLink } from "react-icons/io5";
import { FaRegSmile } from "react-icons/fa";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { FormEvent, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { BASE_URL } from "@/app/common/constants";
import { ID, Message } from "@/app/common/types";
import { useChat } from "@/app/common/store/useChat";
import { useAlert } from "@/app/common/store/useAlert";
import { startChat } from "@/app/common/services/chat";
import { handleFormSubmissionError } from "@/app/common/utils";

const EmojiPicker = dynamic(() => import("./EmojiPicker"), {
  ssr: false,
  loading: () => <FaRegSmile className='text-2xl text-gray-500' />,
});

type ChatInputProps = {
  chatID?: ID;
  otherUserID?: ID;
  authToken: string;
  addMessage: (msg: Message) => void;
  addMessages: (msgs: Message[]) => void;
  websocket_url: string;
  websocket_url_secure: string;
};

const sortMessages = (msgs: Message[]) =>
  msgs.sort((a, b) =>
    compareDesc(new Date(a.timestamp), new Date(b.timestamp))
  );

const ChatInput = ({
  chatID,
  otherUserID,
  authToken,
  addMessage,
  addMessages,
  websocket_url,
  websocket_url_secure,
}: ChatInputProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const setAlert = useAlert(state => state.setAlert);
  const setChatInfo = useChat(state => state.setChatInfo);
  const isSecure = BASE_URL.startsWith("https://");
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${
      isSecure ? websocket_url_secure : websocket_url
    }${chatID}/?token=${authToken}`,
    // `ws://16.171.147.30:8000/ws/chat/${chatID}/?token=${authToken}&my-app-auth=${authToken}`,
    {
      onError(event) {
        // toast.error("Failed to connect to the chat server");
        handleFormSubmissionError(
          new Error("Failed to connect to the chat server"),
          undefined,
          setAlert
        );
      },
    }
  );

  const onSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const text = inputRef.current?.value;
    console.log("text: ", text);
    if (!text) return;
    console.log("chatID: ", chatID);
    console.log("otherUserID: ", otherUserID);
    console.log("readyState: ", readyState);
    console.log("loading: ", loading);
    if (!chatID && otherUserID) {
      try {
        setLoading(true);
        const data = await startChat(otherUserID, text);
        router.push(`?chat=${data.id}`);
      } catch (error) {
        handleFormSubmissionError(error, undefined, setAlert);
      } finally {
        setLoading(false);
      }
    } else if (chatID && readyState === ReadyState.OPEN) {
      if (loading) return;
      setLoading(true);
      const data = {
        type: "text",
        message: text,
        receiver_id: otherUserID!,
      };
      console.log("data: ", data);
      console.log("JSON.stringify(data): ", JSON.stringify(data));
      sendMessage(JSON.stringify(data));
    }
  };

  useEffect(() => {
    try {
      const data = lastMessage?.data ? JSON.parse(lastMessage.data) : null;
      console.log(data);
      if (data && chatID) {
        const chatBottom = document.getElementById("chat-bottom");
        switch (data.type) {
          case "chat_message":
            const message = {
              ...data,
              text: data.text || data.message,
              id:
                data.id ||
                `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sender: data.sender_id,
            };
            addMessage(message);
            setChatInfo(
              {
                lastMessage: message,
              },
              chatID
            );
            chatBottom?.scrollIntoView({ behavior: "smooth" });
            inputRef.current!.value = "";
            setLoading(false);
            break;
          case "message_history":
            const messages = data.messages.map((msg: any) => ({
              ...msg,
              text: msg.text || msg.message,
              sender: msg.sender_id,
            }));
            addMessages(messages);
            setChatInfo(
              {
                lastMessage: sortMessages(messages)[0],
              },
              chatID
            );
            chatBottom?.scrollIntoView({ behavior: "smooth" });
            break;
          case "error":
            handleFormSubmissionError(
              new Error(data.message || "An error occurred"),
              undefined,
              setAlert
            );
            setLoading(false);
            break;
          default:
            console.log(data);
            break;
        }
      }
    } catch (error) {
      console.log("error: ", error);
      console.log(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  // submit on ctrl+enter
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        onSubmit();
      }
    };
    textarea.addEventListener("keydown", handleKeyDown);
    return () => textarea.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserID, chatID, readyState, loading]);

  return (
    <form
      className='max-md:flex gap-2 items-center h-10 md:h-[100px] md:border rounded-lg mt-1 mb-2 mx-4 md:mx-8 p-1'
      onSubmit={onSubmit}
    >
      <textarea
        className='h-full md:h-1/2 textarea max-md:textarea-bordered w-full md:focus:outline-none md:focus:border-transparent'
        name='text'
        ref={inputRef}
        placeholder='Send a message'
        autoFocus
      />
      <div className='flex items-center justify-end md:pr-3 md:pb-3 gap-3'>
        <div className='max-md:hidden'>
          <EmojiPicker inputRef={inputRef} />
        </div>
        <label className='cursor-pointer max-md:hidden'>
          <input type='file' name='file' className='hidden' />
          <IoLink className='text-3xl text-gray-500' />
        </label>
        <Button
          aria-label='send message'
          loading={loading}
          size='sm'
          type='submit'
          color='primary'
          className='px-4 py-2'
        >
          {!loading && (
            <>
              <span className='max-md:hidden'>Send</span>
              <FiSend className='text-xl md:hidden' />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;
