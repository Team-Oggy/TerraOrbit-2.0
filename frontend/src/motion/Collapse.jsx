import React, { useRef, useEffect, useState } from 'react';
import './motion.css';

export default function Collapse({ isOpen, children }) {
    const [renderChildren, setRenderChildren] = useState(isOpen);
    const contentRef = useRef(null);

    useEffect(() => {
        if (isOpen) setRenderChildren(true);
    }, [isOpen]);

    const handleTransitionEnd = (e) => {
        if (e.propertyName === 'grid-template-rows' && !isOpen) {
            setRenderChildren(false);
        }
    };

    return (
        <div 
            className={`motion-accordion-wrapper ${isOpen ? 'expanded' : ''}`} 
            onTransitionEnd={handleTransitionEnd}
        >
            <div className="motion-accordion-inner" ref={contentRef}>
                {renderChildren ? children : null}
            </div>
        </div>
    );
}
