import { Logtail } from "@logtail/browser";

const token = process.env.NEXT_PUBLIC_BETTERSTACK_SOURCE_TOKEN;
const host = process.env.NEXT_PUBLIC_BETTERSTACK_HOST;

const options = host ? { endpoint: `https://${host}` } : undefined;

export const logtail = token ? new Logtail(token, options) : null;
