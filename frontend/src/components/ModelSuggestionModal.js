import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiCpu } from 'react-icons/fi';
import { useWhisper } from '../contexts/WhisperContext';

const ModelSuggestionModal = () => {
  const { status, progress, loadModel } = useWhisper();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = localStorage.getItem('whisper_installed') === 'true';
    
    // Show if not installed and not currently loading/ready
    if (!isInstalled && status === 'idle') {
      // Small delay to not be annoying immediately on load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else if (status === 'ready') {
        setIsVisible(false);
    }
  }, [status]);

  const handleInstall = () => {
    loadModel();
    // Don't close immediately, let the user see progress in the modal or UI
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 0 30px rgba(0, 243, 255, 0.2)',
              position: 'relative'
            }}
          >
            <button 
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              <FiX />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: 'rgba(0, 243, 255, 0.1)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 15px',
                color: 'var(--accent-primary)',
                fontSize: '1.8rem'
              }}>
                <FiCpu />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Enhance Your Experience</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Download the <b>Offline AI Model</b> for high-accuracy speech recognition. 
                It runs 100% on your device, is private, and works without internet.
              </p>
            </div>

            {status === 'loading' ? (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span>Downloading Model...</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }}></div>
                </div>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Please wait, this happens only once (~75MB).
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                <button 
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Maybe Later
                </button>
                <button 
                  onClick={handleInstall}
                  className="neon-button"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <FiDownload /> Install Now
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModelSuggestionModal;
