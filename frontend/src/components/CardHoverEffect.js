import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import '../styles/CardHoverEffect.css';

export const HoverEffect = ({ items, className }) => {
  let [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div 
      className={cn("hover-card-grid", className)}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {items.map((item, idx) => {
        const toPath = typeof item?.link === 'object' ? item.link.pathname : item.link;
        const linkState = typeof item?.link === 'object' ? item.link.state : undefined;

        return (
          <Link
            to={toPath}
            state={linkState}
            key={item?.title}
          className="hover-card-wrapper group"
          onMouseEnter={() => setHoveredIndex(idx)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="hover-card-background"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card>
            {item.icon && <div className="hover-card-icon">{item.icon}</div>}
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </Card>
        </Link>
        );
      })}
    </div>
  );
};

export const Card = ({ className, children }) => {
  return (
    <div className={cn("hover-card", className)}>
      <div className="hover-card-content">
        {children}
      </div>
    </div>
  );
};

export const CardTitle = ({ className, children }) => {
  return (
    <h4 className={cn("hover-card-title", className)}>
      {children}
    </h4>
  );
};

export const CardDescription = ({ className, children }) => {
  return (
    <p className={cn("hover-card-description", className)}>
      {children}
    </p>
  );
};

export default HoverEffect;
