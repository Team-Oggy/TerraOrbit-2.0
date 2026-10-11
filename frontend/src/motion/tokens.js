export const motionTokens = {
  durations: {
    small: 150,
    standard: 250,
    entrance: 500,
    fast: 0.15,
    section: 0.5,
    logoIntro: 2.0
  },
  easing: {
    standard: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
    entrance: [0.0, 0, 0.2, 1],
    exit: [0.4, 0, 1, 1]
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.5 }
  }
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.25 }
  }
};

export function injectMotionTokens() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--motion-duration-small', `${motionTokens.durations.small}ms`);
  root.style.setProperty('--motion-duration-standard', `${motionTokens.durations.standard}ms`);
  root.style.setProperty('--motion-duration-entrance', `${motionTokens.durations.entrance}ms`);
  root.style.setProperty('--motion-ease-standard', motionTokens.easing.standard);
  root.style.setProperty('--motion-ease-smooth', motionTokens.easing.smooth);
  
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.setAttribute('data-reduced-motion', 'true');
  }
}
