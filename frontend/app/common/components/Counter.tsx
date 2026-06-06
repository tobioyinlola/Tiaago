"use client";
import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";

type CounterProps = {
  from: number;
  to: number;
  Component?: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  className?: string;
  suffix?: string;
  noOfDecimalPoints?: number;
  duration?: number;
};

const Counter = ({
  from,
  to,
  Component = "p",
  className,
  suffix,
  noOfDecimalPoints = 0,
  duration = 1,
}: CounterProps) => {
  const nodeRef = useRef<HTMLParagraphElement>(null);
  const inView = useInView(nodeRef);

  useEffect(() => {
    if (!inView) return;
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(from, to, {
      duration,
      type: "tween",
      onUpdate(value) {
        node.textContent = `${value.toFixed(noOfDecimalPoints)}${
          suffix ? suffix : ""
        }`;
      },
      ease: "easeInOut",
    });

    return () => controls.stop();
  }, [from, to, inView, suffix, noOfDecimalPoints, duration]);

  return <Component className={className} ref={nodeRef} />;
};

export default Counter;
