export async function register() {
  const token = process.env.NEXT_PUBLIC_BETTERSTACK_SOURCE_TOKEN;
  if (!token) return;

  const { Logtail } = await import("@logtail/browser");
  const host = process.env.NEXT_PUBLIC_BETTERSTACK_HOST;
  const options = host ? { endpoint: `https://${host}` } : undefined;
  const logtail = new Logtail(token, options);

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    logtail.error(args.map(String).join(" "));
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    logtail.warn(args.map(String).join(" "));
    originalConsoleWarn.apply(console, args);
  };
}
