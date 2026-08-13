"use client";

import { m, Variants } from "framer-motion";

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

/** Fades + slides content up as it scrolls into view, once. `as='section'`
 * renders a real <section> (so id anchors like #pricing/#how-it-works and
 * section semantics keep working) instead of always emitting a <div>. */
const Reveal = ({
  children,
  className,
  delay = 0,
  as = "div",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
  id?: string;
}) => {
  const Comp = as === "section" ? m.section : m.div;
  return (
    <Comp
      id={id}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, amount: 0.2 }}
      variants={revealVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </Comp>
  );
};

export default Reveal;
