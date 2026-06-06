"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCallFrame } from "@daily-co/daily-react";
import { useAlert } from "@/app/common/store/useAlert";

const VideoCall = ({ url, token }: { url: string; token: string }) => {
  const router = useRouter();
  const [hasLeft, setHasLeft] = useState(false);
  const setAlert = useAlert(state => state.setAlert);
  const call = useCallFrame({
    options: {
      showLeaveButton: true,
      iframeStyle: {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
      },
      theme: {
        colors: {
          accent: "#5465FF",
          mainAreaBg: "#fff",
          accentText: "#fff",
          mainAreaBgAccent: "#1c3477",
        },
      },
    },
    shouldCreateInstance: () => true,
  });

  useEffect(() => {
    const onError = (errorMsg: string) =>
      setAlert({
        icon: "error",
        title: "An error occured",
        message: errorMsg,
      });
    if (call && !hasLeft) {
      call
        .join({ url, token })
        .then(() => {
          call.on("left-meeting", e => {
            setHasLeft(true);
            call.destroy();
            router.replace("/");
          });
          call.on("error", e => {
            console.log("on error");
            console.error(e);
            if (e?.errorMsg) onError(e.errorMsg);
            call.destroy();
          });
        })
        .catch(e => {
          console.log("catch");
          console.error(e);
          if (e?.errorMsg) onError(e.errorMsg);
          call.destroy();
        });
      return () => {
        if (!call.isDestroyed()) {
          console.log("destoying call");
          call.destroy();
        }
        router.replace("/");
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token, call, hasLeft]);
  return (
    <div className='bg-black/20 flex items-center justify-center w-screen h-screen'>
      <span className='loading loading-dots loading-lg text-primary' />
    </div>
  );
};

export default VideoCall;
