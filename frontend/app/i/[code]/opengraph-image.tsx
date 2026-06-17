import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "TIAAGO Talent Pipeline Invite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

function loadAsset(relativePath: string, mime: string): string {
  const buf = readFileSync(join(process.cwd(), "public", relativePath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

type Props = { params: Promise<{ code: string }> };

export default async function OGImage({ params }: Props) {
  const { code } = await params;

  const logoSrc = loadAsset("emails/assets/Tiaago_logo_white.png", "image/png");
  const patternSrc = loadAsset(
    "assets/images/Auth Background pattern.png",
    "image/png"
  );

  let companyName = "";
  let categoryName = "";
  try {
    const res = await fetch(
      `${API_URL}/api/sourcing/invite/resolve/${code}/`,
      { cache: "force-cache" }
    );
    if (res.ok) {
      const data = await res.json();
      companyName = data.company_name || "";
      categoryName = data.category_name || "";
    }
  } catch {
    // fall through to generic invite card
  }

  const hasDetails = companyName && categoryName;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #5465FF 0%, #3A47CC 50%, #2D3AA0 100%)",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern overlay */}
        <img
          src={patternSrc}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.08,
          }}
        />

        {/* Top bar: TIAAGO logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <img src={logoSrc} style={{ height: "36px" }} />
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: "16px",
            position: "relative",
          }}
        >
          {/* Badge */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: "20px",
                padding: "8px 20px",
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
                letterSpacing: "1px",
                textTransform: "uppercase" as const,
                display: "flex",
              }}
            >
              Talent Pipeline Invite
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: hasDetails ? "56px" : "64px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {hasDetails ? (
              <>
                <span>Join {companyName}&apos;s</span>
                <span style={{ color: "rgba(255,255,255,0.85)" }}>
                  {categoryName} Pipeline
                </span>
              </>
            ) : (
              <span>You&apos;re Invited!</span>
            )}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.5,
              maxWidth: "700px",
              display: "flex",
            }}
          >
            {hasDetails
              ? `${companyName} is hiring through TIAAGO. Apply now to get discovered.`
              : "Join a talent pipeline and get discovered by top startups on TIAAGO."}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 500,
            }}
          >
            tiaago.com
          </span>
          <span
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.4)",
              fontWeight: 500,
            }}
          >
            Hire Vetted Tech Talent in Africa
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
