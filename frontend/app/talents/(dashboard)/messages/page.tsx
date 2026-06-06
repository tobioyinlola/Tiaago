import { getAuthCookiesAsync } from "@/app/common/actions";
import { getCurrentUser } from "@/app/common/services/profile";
import CurrentChat from "@/app/common/components/Messaging/Chat";
import ChatList from "@/app/common/components/Messaging/ChatList";
import {
  getChat,
  getChatHealth,
  getChatList,
} from "@/app/common/services/chat";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

type MessagesPageProps = {
  searchParams: Promise<{
    chat?: string;
  }>;
};

export const metadata = {
  title: "Messages",
};

const MessagesPage = async ({
  searchParams,
}: MessagesPageProps) => {
  const { chat: activeChatID } = await searchParams;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const conversations = await getChatList().catch(async e => {
    const error = await handleServerApiCallError(e);
    console.log("Get chat list error (talents chat page): ", error);
    errors.push({
      message: error,
      title: "Error getting chat list",
    });
    return [];
  });
  const { access } = await getAuthCookiesAsync();
  const currentUser = (await getCurrentUser("talent")).currentUser;
  const activeConversation = conversations.find(
    conversation => conversation.id == activeChatID
  );
  const activeChat = activeConversation
    ? await getChat(activeConversation.id)
    : undefined;
  const { websocket_url, websocket_url_secure } = await getChatHealth().catch(
    async e => {
      const error = await handleServerApiCallError(e);
      console.log("Get chat health error (talents chat page): ", error);
      errors.push({
        message: error,
        title: "Error getting chat health",
      });
      return {
        websocket_url: "",
        websocket_url_secure: "",
      };
    }
  );
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-2 h-[65px]'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Messages</h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Connect with various recruiters and your work pals
        </h4>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-5'>
        <ChatList
          activeChatID={activeChat?.id}
          chats={conversations}
          currentUser={currentUser}
          talents={[]}
        />
        <CurrentChat
          chat={activeChat}
          currentUser={currentUser}
          roles={[]}
          authToken={access?.value ?? ""}
          websocket_url={websocket_url}
          websocket_url_secure={websocket_url_secure}
        />
      </div>
    </>
  );
};

export default MessagesPage;
