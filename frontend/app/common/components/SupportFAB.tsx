"use client";
import { useEffect } from "react";

const SupportFAB = () => {
  useEffect(() => {
    const global = globalThis as any;
    if (global?.Tawk_API) {
      global.Tawk_API.showWidget?.();
      return;
    }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = `
    var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
    (function(){
    var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
    s1.async=true;
    s1.src='https://embed.tawk.to/66dc833e50c10f7a00a561a8/1i76m1c39';
    s1.charset='UTF-8';
    s1.setAttribute('crossorigin','*');
    s0.parentNode.insertBefore(s1,s0);
    })();
    `;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      global?.Tawk_API?.hideWidget?.();
    };
  }, []);
  return null;
  // return (
  //   <Link
  //     href={ `mailto:${SUPPORT_EMAIL}`}
  //     target='_blank'
  //     className='w-12 h-12 rounded-full bg-primary fixed right-8 bottom-8 flex items-center justify-center'
  //   >
  //     <BiSolidChat className='text-white text-3xl' />
  //   </Link>
  // );
};

export default SupportFAB;
