import ky from "ky";

type Room = {
  id: string;
  url: string;
};

const { DAILY_API_KEY, NODE_ENV, NEXT_PUBLIC_VERCEL } = process.env;
if (!DAILY_API_KEY && NODE_ENV === "production" && NEXT_PUBLIC_VERCEL)
  throw new Error("DAILY_API_KEY is not defined");
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: "Bearer " + DAILY_API_KEY,
};
const BASE_URL = "https://api.daily.co/v1/rooms";

export const getRoom = async (roomId: string) => {
  try {
    const data = await ky.get(`${BASE_URL}/${roomId}`, {
      headers,
    }).json<Room>();
    return data;
  } catch (err) {
    console.error("error:" + err);
    return null;
  }
};

export const createRoom = async (roomId: string) => {
  try {
    const data = await ky.post(BASE_URL, {
      headers,
      json: {
        name: roomId,
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: true,
          start_audio_off: false,
          lang: "en",
        },
      },
    }).json<Room>();
    return data;
  } catch (err) {
    console.error("error:" + err);
    return null;
  }
};

export const getOrCreateRoom = async (roomId: string) => {
  const room = await getRoom(roomId);
  if (room) return room;
  return createRoom(roomId);
};
