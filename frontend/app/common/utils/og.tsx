import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function getSiteUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  ).replace(/\/$/, "");
}

export async function loadPublicAsset(path: string): Promise<ArrayBuffer> {
  const url = `${getSiteUrl()}/${path.replace(/^\//, "")}`;
  const res = await fetch(url);
  return res.arrayBuffer();
}

export function toDataUri(buf: ArrayBuffer, mime: string): string {
  return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
}

async function loadInterFonts() {
  const [bold, black] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZJhjQ.ttf"
    ).then((r) => r.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZJhjQ.ttf"
    ).then((r) => r.arrayBuffer()),
  ]);
  return { bold, black };
}

interface OGImageProps {
  headline: string;
  subtitle?: string;
  illustrationPath?: string;
  illustrationMime?: string;
  footerLeft?: string;
  footerRight?: string;
}

export async function createOGImage({
  headline,
  subtitle,
  illustrationPath,
  illustrationMime = "image/svg+xml",
  footerLeft = "tiaago.com",
  footerRight,
}: OGImageProps): Promise<ImageResponse> {
  const [logoData, patternData, fonts, illustrationData] = await Promise.all([
    loadPublicAsset("emails/assets/Tiaago_logo_white.png"),
    loadPublicAsset("assets/images/Auth Background pattern.png"),
    loadInterFonts(),
    illustrationPath ? loadPublicAsset(illustrationPath) : null,
  ]);

  const logoSrc = toDataUri(logoData, "image/png");
  const patternSrc = toDataUri(patternData, "image/png");
  const illustrationSrc = illustrationData
    ? toDataUri(illustrationData, illustrationMime)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #4455DD 0%, #2E3AB0 50%, #1E2878 100%)",
          padding: "50px 80px",
          fontFamily: "Inter",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src={patternSrc}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.4,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            position: "relative",
            maxWidth: illustrationSrc ? "620px" : "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logoSrc} style={{ height: "120px" }} />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: 900,
                color: "white",
                lineHeight: 1.05,
                letterSpacing: "-3px",
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {headline}
            </div>

            {subtitle && (
              <div
                style={{
                  fontSize: "24px",
                  color: "white",
                  lineHeight: 1.45,
                  fontWeight: 700,
                  maxWidth: "560px",
                  display: "flex",
                  letterSpacing: "-0.3px",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                color: "rgba(255,255,255,0.6)",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              {footerLeft}
            </span>
            {footerRight && (
              <span
                style={{
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 500,
                }}
              >
                {footerRight}
              </span>
            )}
          </div>
        </div>

        {illustrationSrc && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              width: "460px",
            }}
          >
            <img
              src={illustrationSrc}
              style={{
                width: "440px",
                height: "440px",
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Inter", data: fonts.bold, weight: 700 as const, style: "normal" as const },
        { name: "Inter", data: fonts.black, weight: 900 as const, style: "normal" as const },
      ],
    }
  );
}
