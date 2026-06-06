import { useRef } from "react";
import { BiEdit } from "react-icons/bi";
import { useRouter } from "next/navigation";

import { cn } from "@/app/common/utils";
import SearchBar from "../../SearchBar";
import { Talent } from "@/app/common/types";
import Modal from "@/app/common/components/Modal";
import { useSearch } from "@/app/common/store/useSearch";
import { AvatarWithVerifiedBadge } from "../../UserAvatar";

type ChatListHeaderProps = {
  noOfUnreadMsgs?: number;
  hideCreateChat?: boolean;
  talents: Talent[];
};

const ChatListHeader = ({
  noOfUnreadMsgs = 40,
  hideCreateChat = false,
  talents,
}: ChatListHeaderProps) => {
  const router = useRouter();
  const modalRef = useRef<HTMLDialogElement>(null);
  const searchKey = "new-chats";
  const searchText = useSearch(state => state.searchText[searchKey] ?? "");
  const filteredTalents = talents.filter(talent => {
    const search = searchText.toLowerCase();
    return (
      talent.first_name.toLowerCase().includes(search) ||
      talent.last_name.toLowerCase().includes(search)
    );
  });
  const onTalentClick = (talent: Talent) => {
    router.push(`?user=${talent.id}`);
    modalRef.current?.close();
  };
  return (
    <>
      <div className='p-6 flex items-center gap-2'>
        <h5 className='text-gray-900 text-lg font-medium'>Inbox</h5>
        <div className='badge bg-[#F9F5FF] text-primary border-0 text-xs font-medium'>
          {noOfUnreadMsgs}
        </div>
        {!hideCreateChat && (
          <>
            <button
              onClick={() => modalRef.current?.showModal()}
              className='ml-auto btn btn-square shadow-sm bg-white border-gray-300 hover:border-gray-300 px-[10px] py-[10px]'
            >
              <BiEdit className='text-xl text-gray-700' />
            </button>
            <Modal id='create-chat-modal' modalRef={modalRef} autoHeight>
              <div className='w-[80svw] max-w-md px-1'>
                <h3 className='text-[26px] leading-[38px] -tracking-[0.5px] font-semibold'>
                  Create a chat
                </h3>
                <p className='text-[#999] text-sm -tracking-[0.1px]'>
                  Start a conversation with a talent
                </p>
                <SearchBar searchKey={searchKey} className='my-5' />
                <div className='flex flex-col gap-3'>
                  {filteredTalents.map((talent, i) => (
                    <div
                      role='button'
                      key={talent.id}
                      className={cn(
                        "py-2 border-gray-200",
                        i !== filteredTalents.length - 1 && "border-b"
                      )}
                      onClick={() => onTalentClick(talent)}
                    >
                      <div className='flex mb-4 items-center'>
                        <AvatarWithVerifiedBadge
                          firstName={talent.first_name}
                          lastName={talent.last_name}
                          profilePic={talent.profile_pic}
                          verified={talent.has_passed_assessment}
                        />
                        <div className='ml-3'>
                          <h6 className='text-sm text-gray-700 font-medium'>
                            {`${talent.first_name || ""} ${
                              talent.last_name || ""
                            }`.trim()}
                          </h6>
                          <p className='text-xs text-gray-500 capitalize'>
                            {talent.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Modal>
          </>
        )}
      </div>
      <SearchBar className='mx-4 mb-3' />
    </>
  );
};

export default ChatListHeader;
