import React, { useEffect, useState } from 'react';
import { introGate } from './introGate';
import logo from '/terra-orbit-logo.png'; // It's in public folder, so we just use the path, or import if it's in src. 

// Wait, the DashboardRaw uses <img src="terra-orbit-logo.png" /> which means it's in the public folder.

export default function LogoIntro() {
    const [shouldPlay, setShouldPlay] = useState(false);
    const [phase, setPhase] = useState('initializing'); // initializing -> playing -> fading -> done
    const [isReduced, setIsReduced] = useState(false);

    useEffect(() => {
        let play = false;
        
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setIsReduced(true);
        }

        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('intro') === '1') {
                play = true;
            } else {
                const hasPlayed = sessionStorage.getItem('terraorbit_intro_played');
                if (!hasPlayed) {
                    play = true;
                    sessionStorage.setItem('terraorbit_intro_played', '1');
                }
            }
        } catch (e) {
            play = true; 
        }

        if (play) {
            introGate.register();
            setShouldPlay(true);
            setPhase('playing');
        } else {
            // Already played, don't show overlay
        }
    }, []);

    useEffect(() => {
        if (phase !== 'playing') return;

        let skipTimer;
        let fadeTimer;
        
        const finish = () => {
            if (phase === 'done' || phase === 'fading') return;
            setPhase('fading');
            introGate.complete(); // Start hero entrance AS we fade out
            skipTimer = setTimeout(() => {
                setPhase('done');
            }, 400); 
        };

        if (isReduced) {
            // Just a quick fade for reduced motion
            fadeTimer = setTimeout(finish, 300);
        } else {
            // Normal 2.1s sequence
            fadeTimer = setTimeout(finish, 1700); // 1.7s we start fade out
        }

        // Safety timer 3.5s
        const safety = setTimeout(() => {
            if (phase !== 'done') {
                setPhase('done');
                introGate.complete();
            }
        }, 3500);

        const handleSkip = () => finish();
        
        window.addEventListener('click', handleSkip);
        window.addEventListener('keydown', handleSkip);
        window.addEventListener('touchstart', handleSkip);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(skipTimer);
            clearTimeout(safety);
            window.removeEventListener('click', handleSkip);
            window.removeEventListener('keydown', handleSkip);
            window.removeEventListener('touchstart', handleSkip);
        };
    }, [phase, isReduced]);

    if (!shouldPlay || phase === 'done') return null;

    // Overlay is pointer-events none so it doesn't block, but wait, if it's pointer events none, 
    // click listener on window will still fire!
    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity ease-in-out ${phase === 'fading' ? 'opacity-0' : 'opacity-100'} ${isReduced ? 'bg-black' : 'bg-[#0F172A]'}`}
            style={{ transitionDuration: '400ms' }}
        >
            {!isReduced && (
                <div className="relative flex flex-col items-center justify-center w-full max-w-sm px-4">
                    
                    {/* 1. Radial Glow */}
                    <div className="absolute w-64 h-64 bg-[#1F8A4D]/20 blur-3xl rounded-full motion-intro-glow"></div>
                    
                    {/* 2. Elliptical Orbit Line */}
                    <div className="absolute w-[200px] h-[100px] sm:w-[280px] sm:h-[140px] motion-intro-orbit">
                        <svg viewBox="0 0 280 140" className="w-full h-full overflow-visible">
                            <ellipse cx="140" cy="70" rx="130" ry="60" fill="none" stroke="#1D4ED8" strokeWidth="1.5" className="motion-intro-orbit-path opacity-40" />
                            <circle r="2.5" fill="#1D4ED8" filter="drop-shadow(0 0 4px #1D4ED8)" className="motion-intro-orbit-point" />
                        </svg>
                    </div>

                    {/* Logo Image */}
                    <div className="relative flex items-center justify-center mt-2 motion-intro-logo-container">
                        <img src="terra-orbit-logo.png" alt="TerraOrbit Logo" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)] motion-intro-logo" />
                        
                        {/* 5. Light Sweep */}
                        <div className="absolute inset-0 overflow-hidden rounded-full motion-intro-sweep-container">
                            <div className="w-full h-full motion-intro-sweep bg-gradient-to-tr from-transparent via-[#1F8A4D]/50 to-transparent border-t border-[#1D4ED8]/50"></div>
                        </div>
                    </div>

                    {/* 4. Wordmark */}
                    <div className="mt-6 flex items-baseline font-headline-sm text-headline-sm tracking-tight motion-intro-wordmark">
                        <span className="brand text-primary">
                            Terra<span className="brand-orbit">Orbit</span>
                        </span>
                    </div>

                </div>
            )}
        </div>
    );
}
