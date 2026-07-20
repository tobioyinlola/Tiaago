import { isSameMonth } from "date-fns";

import { getTalentRoles } from "@/app/common/services";
import { getAuthCookiesAsync } from "@/app/common/actions";
import { getSchedule } from "@/app/common/services/schedule";
import CurrentChat from "@/app/common/components/Messaging/Chat";
import ChatList from "@/app/common/components/Messaging/ChatList";
import {
  getChat,
  getChatHealth,
  getChatList,
} from "@/app/common/services/chat";
import { FREE_RECRUITER_MAX_MEETINGS_PER_MONTH } from "@/app/common/constants";
import { getAllTalents, getCurrentUser } from "@/app/common/services/profile";
import DisplayErrorMessages, {
  DisplayErrorMessagesProps,
} from "@/app/common/components/DisplayErrorMessages";
import { handleServerApiCallError } from "@/app/common/utils";

type MessagesPageProps = {
  searchParams: Promise<{
    chat?: string;
    user?: string;
  }>;
};

export const metadata = {
  title: "Messages",
};

const MessagesPage = async ({
  searchParams,
}: MessagesPageProps) => {
  const { chat: activeChatID, user: talentID } = await searchParams;
  const errors: DisplayErrorMessagesProps["errors"] = [];
  const { access } = await getAuthCookiesAsync();
  // currentUser, talents, conversations, roles, and chat health are all
  // independent requests -- fetch them together instead of one after another.
  const [userRes, talentsRes, conversations, roles, chatHealth] =
    await Promise.all([
      getCurrentUser("recruiter"),
      getAllTalents().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get talents error (recruiters chat page): ", error);
        errors.push({
          message: error,
          title: "Error getting talents",
        });
        return {
          results: [],
        };
      }),
      getChatList().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get chat list error (recruiters chat page): ", error);
        errors.push({
          message: error,
          title: "Error getting chat list",
        });
        return [];
      }),
      getTalentRoles().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get talent roles error (recruiters chat page): ", error);
        errors.push({
          message: error,
          title: "Error getting talent roles",
        });
        return [];
      }),
      getChatHealth().catch(async e => {
        const error = await handleServerApiCallError(e);
        console.log("Get chat health error (recruiters chat page): ", error);
        errors.push({
          message: error,
          title: "Error getting chat health",
        });
        return { websocket_url: "", websocket_url_secure: "" };
      }),
    ]);
  const currentUser = userRes.currentUser;
  const talents = talentsRes.results;
  const talent = talents.find(talent => talent.id == talentID);
  const activeConversation = conversations.find(
    conversation => conversation.id == activeChatID
  );
  const isApproved = currentUser.verified;

  // activeChat depends on activeConversation, schedule depends on
  // currentUser -- both independent of each other, so fetch in parallel.
  const [activeChat, schedule] = await Promise.all([
    activeConversation
      ? getChat(activeConversation.id).catch(async e => {
          const error = await handleServerApiCallError(e);
          console.log("Get chat error (recruiters chat page): ", error);
          errors.push({
            message: error,
            title: "Error getting chat",
          });
          return undefined;
        })
      : Promise.resolve(undefined),
    isApproved
      ? getSchedule().catch(async e => {
          const error = await handleServerApiCallError(e);
          console.log("Get schedule error (recruiters chat page): ", error);
          errors.push({
            message: error,
            title: "Error getting schedule",
          });
          return [];
        })
      : Promise.resolve([]),
  ]);
  const noOfSchedulesThisMonth = schedule.filter(meeting =>
    // meeting.accepted !== false &&
    isSameMonth(new Date(meeting.created_on), new Date())
  ).length;
  const canScheduleMeeting = currentUser.subscribed_plan
    ? true
    : noOfSchedulesThisMonth < FREE_RECRUITER_MAX_MEETINGS_PER_MONTH;
  const { websocket_url, websocket_url_secure } = chatHealth;
  return (
    <>
      <DisplayErrorMessages errors={errors} />
      <div className='border-b w-full border-gray-200 pb-1 mb-2 h-[65px]'>
        <h1 className='text-2xl font-bold mb-1 font-space-grotesk'>Messages</h1>
        <h4 className='text-gray-900 text-sm md:text-base'>
          Connect with various talents and your work pals
        </h4>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-5'>
        <ChatList
          activeChatID={activeConversation?.id}
          chats={conversations}
          talentID={talent?.pk}
          currentUser={currentUser}
          talents={talents}
        />
        <CurrentChat
          chat={activeChat}
          currentUser={currentUser}
          talent={talent}
          roles={roles}
          disableScheduleMeeting={!canScheduleMeeting}
          authToken={access?.value ?? ""}
          websocket_url={websocket_url}
          websocket_url_secure={websocket_url_secure}
        />
      </div>
    </>
  );
};

export default MessagesPage;
