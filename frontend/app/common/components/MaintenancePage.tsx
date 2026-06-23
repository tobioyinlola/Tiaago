import Image from "next/image";

export default function MaintenancePage() {
  return (
    <div className="min-h-[100svh] bg-[#F3F4F6] flex items-center justify-center px-4">
      <div className="text-center max-w-[520px]">
        <Image
          src="/assets/images/logo-dark.png"
          alt="TIAAGO"
          width={140}
          height={40}
          className="mx-auto mb-8"
        />
        <svg
          className="w-[220px] h-[220px] mx-auto mb-8"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="200" cy="200" r="160" fill="#EEF0FF" />
          <rect x="130" y="120" width="140" height="180" rx="12" fill="#1C3477" />
          <rect x="130" y="120" width="140" height="180" rx="12" stroke="#5465FF" strokeWidth="2" />
          <rect x="146" y="140" width="108" height="32" rx="4" fill="#2E4585" />
          <rect x="146" y="184" width="108" height="32" rx="4" fill="#2E4585" />
          <rect x="146" y="228" width="108" height="32" rx="4" fill="#2E4585" />
          <circle cx="160" cy="156" r="5" fill="#5465FF">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="176" cy="156" r="5" fill="#3E92CC" />
          <circle cx="160" cy="200" r="5" fill="#5465FF">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="176" cy="200" r="5" fill="#3E92CC" />
          <circle cx="160" cy="244" r="5" fill="#FFB800">
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="176" cy="244" r="5" fill="#3E92CC" />
          <circle cx="170" cy="340" r="6" fill="#5465FF">
            <animate attributeName="opacity" values="1;0.2;0.2" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="196" cy="340" r="6" fill="#5465FF">
            <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="222" cy="340" r="6" fill="#5465FF">
            <animate attributeName="opacity" values="0.2;0.2;1" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </svg>
        <h1 className="text-[28px] font-bold text-[#1C3477] mb-3 font-onest">
          Upgrading Our Systems
        </h1>
        <p className="text-base text-[#5F6264] mb-8 leading-relaxed font-onest">
          We are making TIAAGO even better. This usually takes less than 5
          minutes. Your data is safe and everything will be right where you left
          it.
        </p>
        <div className="inline-flex items-center gap-2 bg-[#EEF0FF] border border-[#C7CCFF] rounded-full px-5 py-2.5 text-sm font-medium text-[#5465FF]">
          <span className="w-2.5 h-2.5 bg-[#5465FF] rounded-full animate-pulse" />
          Deployment in progress
        </div>
        <p className="mt-12 text-[13px] text-[#98A2B3] font-onest">
          Questions?{" "}
          <a
            href="mailto:support@tiaago.com"
            className="text-[#5465FF] no-underline"
          >
            support@tiaago.com
          </a>
        </p>
      </div>
    </div>
  );
}
