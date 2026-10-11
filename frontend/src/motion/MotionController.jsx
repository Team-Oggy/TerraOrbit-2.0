import React, { useEffect } from 'react';
import { initMotion } from './useMotion';
import LogoIntro from './LogoIntro';
import './motion.css';

export default function MotionController() {
    useEffect(() => {
        initMotion();
    }, []);

    return <LogoIntro />;
}
