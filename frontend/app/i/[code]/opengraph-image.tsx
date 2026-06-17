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
            "linear-gradient(135deg, #4455DD 0%, #2E3AB0 50%, #1E2878 100%)",
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
            opacity: 0.55,
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
          <img src={logoSrc} style={{ height: "64px" }} />
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
          {/* Headline */}
          <div
            style={{
              fontSize: hasDetails ? "68px" : "80px",
              fontWeight: 900,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-2px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {hasDetails ? (
              <>
                <span>Join {companyName}&apos;s</span>
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
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
              fontSize: "26px",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
              fontWeight: 600,
              maxWidth: "750px",
              display: "flex",
            }}
          >
            {hasDetails
              ? `${companyName} is hiring through TIAAGO. Apply now to get discovered.`
              : "Join a talent pipeline and get discovered by top recruiters on TIAAGO."}
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
            Hire Vetted Tech Talents in Africa
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
