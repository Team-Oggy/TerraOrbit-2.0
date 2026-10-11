import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../motion/tokens';

export default function LogoReveal({ onComplete }) {
  const shouldReduceMotion = useReducedMotion();
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    try {
      const hasPlayed = sessionStorage.getItem('terraorbit_intro_played');
      if (hasPlayed || shouldReduceMotion) {
        setSkip(true);
        setTimeout(onComplete, 400); // Short fade for reduced motion or skip
      } else {
        sessionStorage.setItem('terraorbit_intro_played', 'true');
        // Total duration is roughly 2.4s + 0.4s handoff
        setTimeout(onComplete, 2800);
      }
    } catch (e) {
      setSkip(true);
      onComplete();
    }
  }, [onComplete, shouldReduceMotion]);

  useEffect(() => {
    const handleSkip = () => {
        setSkip(true);
        onComplete();
    };
    window.addEventListener('keydown', handleSkip);
    window.addEventListener('click', handleSkip);
    return () => {
      window.removeEventListener('keydown', handleSkip);
      window.removeEventListener('click', handleSkip);
    };
  }, [onComplete]);

  if (skip) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] pointer-events-none bg-[#0F172A]"
      />
    );
  }

  // Phase timings
  // P1: Dark Opening (0-0.3)
  // P2: Orbital Light (0.3-0.8)
  // P3: Logo Reveal (0.8-1.3)
  // P4: Wordmark Reveal (1.3-1.7)
  // P5: Ambient Highlight (1.7-2.0)
  // P6: Handoff (2.4-2.8)

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F172A] overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 2.4, ease: motionTokens.easing.exit }}
    >
      {/* P1: Dark Opening & Glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ background: 'radial-gradient(circle at center, rgba(31,138,77,0) 0%, rgba(15,23,42,1) 50%)' }}
        animate={{ background: 'radial-gradient(circle at center, rgba(31,138,77,0.15) 0%, rgba(15,23,42,1) 50%)' }}
        transition={{ duration: 0.3, ease: motionTokens.easing.entrance }}
      />

      <div className="relative flex flex-col items-center">
        {/* P2: Orbital Light */}
        <motion.div
          className="absolute border border-[#1D4ED8] rounded-full opacity-0 pointer-events-none"
          style={{ width: 140, height: 60, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', rotate: -15 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: motionTokens.easing.entrance }}
        >
          <motion.div 
            className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-[#1D4ED8] rounded-full shadow-[0_0_8px_2px_rgba(29,78,216,0.8)]"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, delay: 0.3, ease: "linear" }}
            style={{ originX: 0, originY: '30px' }}
          />
        </motion.div>

        {/* P3: Logo Reveal */}
        <motion.div
          className="relative z-10 flex items-center justify-center rounded-full bg-[#143823] shadow-lg border border-[#1F8A4D]/30"
          style={{ width: 64, height: 64 }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8, ease: motionTokens.easing.entrance }}
        >
            <span className="material-symbols-outlined text-[32px] text-[#22C55E]">eco</span>
            {/* P5: Ambient Highlight sweep over logo */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#1F8A4D]/40 to-transparent skew-x-12"
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '100%', opacity: [0, 1, 0] }}
                transition={{ duration: 0.3, delay: 1.7, ease: motionTokens.easing.smooth }}
            />
        </motion.div>

        {/* P4: Wordmark Reveal */}
        <motion.div
          className="mt-6 flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.3, ease: motionTokens.easing.entrance }}
        >
          <span className="text-3xl font-extrabold tracking-tight text-white">
            Terra<span className="text-[#22C55E]">Orbit</span>
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
