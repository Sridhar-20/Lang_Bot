import React from 'react';
import '../styles/AuroraBackground.css';

const AuroraBackground = ({ children, className = '', showRadialGradient = true, ...props }) => {
  return (
    <div className={`aurora-container ${className}`} {...props}>
      <div className="aurora-background">
        <div className="aurora-effect"></div>
        {/* Radial Gradient Mask overlay if needed */}
        {showRadialGradient && (
            <div 
                className="aurora-mask"
            />
        )}
      </div>
      <div className="aurora-content">
        {children}
      </div>
    </div>
  );
};

export default AuroraBackground;
