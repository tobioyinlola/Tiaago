"use server";
import axiosInstance from "../utils/axios.instance";
import { Chat, IChatListItem, ID, User } from "../types";
import serverKyInstance from "../utils/server-ky.instance";

export const getChatList = async () => {
  const data = await serverKyInstance.get<IChatListItem[]>("chats").json();
  console.log("Chat list data: ", data);
  return Array.isArray(data)
    ? data
    : (((data as any)?.results || []) as IChatListItem[]);
};

export const getChat = async (convoID: ID) => {
  const data = await serverKyInstance
    .get<Chat>(`chats/get-conversation/${convoID}`)
    .json();
  return data;
};

export const startChat = async (userID: ID, message?: string) => {
  const data = {
    messages: message
      ? [
          {
            text: message,
          },
        ]
      : [],
    initiator: {},
    receiver: {},
  };
  const response = await axiosInstance.post<Chat>(
    `chats/start/${userID}/`,
    data
  );
  return response.data;
};

export const getUnreadMessageCounts = async () => {
  const data = await serverKyInstance
    .get("chats/unread-messages")
    .json();
  const results = Array.isArray(data)
    ? data
    : ((data as any)?.results || []);
  return results as {
    conversation_id: string;
    unread_messages: number;
  }[];
};

export const getChatHealth = async () => {
  const data = await serverKyInstance
    .get<{
      status: string;
      message: string;
      user_id: ID;
      user_type: User["user_type"];
      conversations_count: number;
      websocket_url: string;
      websocket_url_secure: string;
    }>("chats/health-check")
    .json();
  return data;
};
