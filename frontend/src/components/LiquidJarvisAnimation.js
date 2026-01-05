import React from 'react';
import { motion } from 'framer-motion';
import '../styles/LiquidJarvisAnimation.css';

const LiquidJarvisAnimation = ({ state }) => {
  // state: 'idle', 'listening', 'speaking'
  const orbRef = React.useRef(null);

  React.useEffect(() => {
    let animationFrameId;
    
    const animate = () => {
      if (state === 'speaking' && orbRef.current) {
        // Simulate voice modulation with random scaling
        // Scale between 0.95 and 1.15 for visible "talking" effect
        const scale = 0.95 + Math.random() * 0.2;
        orbRef.current.style.transform = `scale(${scale})`;
        
        // Update rapidly (every ~50-100ms equivalent)
        // We use setTimeout inside rAF to throttle it slightly so it's not too jittery
        setTimeout(() => {
            animationFrameId = requestAnimationFrame(animate);
        }, 50);
      } else if (orbRef.current) {
        // Reset when not speaking
        orbRef.current.style.transform = 'scale(1)';
      }
    };

    if (state === 'speaking') {
      animate();
    } else {
      if (orbRef.current) orbRef.current.style.transform = 'scale(1)';
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  return (
    <div className={`liquid-jarvis-container ${state}`}>
      <div className="liquid-environment">
        <div className="liquid-bg-gradient"></div>
        <div className="liquid-ambient-glow"></div>
      </div>

      <div className="liquid-ai-animation">
        {/* Main Orb */}
        <div className="liquid-main-orb" ref={orbRef} style={{ transition: 'transform 0.1s ease-out' }}>
          <div className="liquid-core"></div>
          <div className="liquid-gradient-layer layer-1"></div>
          <div className="liquid-gradient-layer layer-2"></div>
          <div className="liquid-gradient-layer layer-3"></div>
          <div className="liquid-shine"></div>
          <div className="liquid-specular"></div>
        </div>

        {/* State-based Effects - Controlled by CSS Opacity now */}
        <div className="liquid-wave"></div>
        <div className="liquid-wave" style={{ animationDelay: '0.5s' }}></div>
        <div className="liquid-wave" style={{ animationDelay: '1s' }}></div>

        <div className="liquid-pulse-ring ring-1"></div>
        <div className="liquid-pulse-ring ring-2"></div>
        <div className="liquid-pulse-ring ring-3"></div>

        {/* Glitter Particles (Always visible for premium feel) */}
        <div className="liquid-glitter-container">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="liquid-glitter-particle"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `-${Math.random() * 5}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiquidJarvisAnimation;
