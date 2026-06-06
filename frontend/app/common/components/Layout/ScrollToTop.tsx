"use client";
import { useState } from "react";
import { FaArrowUp } from "react-icons/fa";

import useScroll from "../../hooks/useScroll";

const ScrollToTop = ({ id = "" }) => {
  const [isVisible, setIsVisible] = useState(false);

  useScroll(
    id,
    () => {
      const element = document.getElementById(id) ?? document.documentElement;
      const scrollY = element.scrollTop;
      if (scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    },
    [id]
  );

  const scrollToTop = () => {
    const element = document.getElementById(id) ?? document.documentElement;
    element.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div style={{ position: "fixed", right: 30, bottom: 30, zIndex: 20 }}>
      {isVisible && (
        <button onClick={scrollToTop} className='btn btn-primary opacity-70 hover:opacity-100 transition-all'>
          <FaArrowUp size={20} color='#fff' />
          <h6 className='font-semibold'>Top</h6>
        </button>
      )}
    </div>
  );
};

export default ScrollToTop;
