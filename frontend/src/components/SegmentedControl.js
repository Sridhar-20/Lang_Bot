import React, { useState, useRef, useEffect } from 'react';
import '../styles/SegmentedControl.css';

const SegmentedControl = ({ options, value, onChange, className = '' }) => {
  const containerRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [isPressed, setIsPressed] = useState(false);

  // Update pill position when value changes or window resizes
  useEffect(() => {
    const updatePill = () => {
      const container = containerRef.current;
      if (!container) return;

      const activeIndex = options.findIndex((opt) => opt.value === value);
      if (activeIndex === -1) return;

      const buttons = container.querySelectorAll('.segmented-control-button');
      const activeButton = buttons[activeIndex];

      if (activeButton) {
        setPillStyle({
          left: activeButton.offsetLeft,
          width: activeButton.offsetWidth,
        });
      }
    };

    updatePill();
    
    // Optional: Add resize listener if layout might change properly
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className={`segmented-control-container ${className}`}
    >
      {/* Animated pill background */}
      <div
        className={`segmented-control-pill ${isPressed ? 'pressed' : ''}`}
        style={{
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
        }}
      />

      {/* Buttons */}
      {options.map((option) => (
        <button
          key={option.value}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onClick={() => onChange(option.value)}
          className={`segmented-control-button ${value === option.value ? 'active' : ''}`}
        >
          <span className="segmented-control-label">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
