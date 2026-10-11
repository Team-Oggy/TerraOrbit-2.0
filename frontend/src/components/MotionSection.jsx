import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens, fadeInUp, staggerContainer } from '../motion/tokens';

export function MotionSection({ children, className, id, stagger = false }) {
  const shouldReduceMotion = useReducedMotion();

  const variants = stagger ? staggerContainer : fadeInUp;

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      variants={shouldReduceMotion ? { hidden: { opacity: 0 }, show: { opacity: 1 } } : variants}
    >
      {children}
    </motion.section>
  );
}

export function MotionDiv({ children, className, delay = 0, variant = fadeInUp }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={shouldReduceMotion ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay } } } : variant}
    >
      {children}
    </motion.div>
  );
}
