import { create } from "zustand";

import { ID, Message } from "../types";

export type ChatInfo = {
  lastMessage?: Message;
};

type ChatStore = {
  chatInfo: Record<ID, ChatInfo>;
  setChatInfo: (chatInfo: ChatInfo, key: ID) => void;
};

export const useChat = create<ChatStore>(set => ({
  chatInfo: {},
  setChatInfo: (chatInfo, key) =>
    set(prev => ({
      chatInfo: {
        ...prev.chatInfo,
        [key]: chatInfo,
      },
    })),
}));
