import React, { createContext, useState, useEffect, useRef, useContext } from 'react';

const WhisperContext = createContext();

export const useWhisper = () => useContext(WhisperContext);

export const WhisperProvider = ({ children }) => {
  const [status, setStatus] = useState('idle'); // idle, loading, ready, error
  const [progress, setProgress] = useState(0); // 0-100
  const [error, setError] = useState(null);
  const worker = useRef(null);

  useEffect(() => {
    // Initialize worker
    worker.current = new Worker(new URL('../workers/whisper.worker.js', import.meta.url), { type: 'module' });

    worker.current.onmessage = (event) => {
      const { type, data, status: workerStatus } = event.data;

      switch (type) {
        case 'status':
          setStatus(workerStatus);
          if (workerStatus === 'ready') {
            localStorage.setItem('whisper_installed', 'true');
          }
          break;
        case 'download':
          // data is { status, file, name, progress, loaded, total }
          if (data.status === 'progress') {
            setProgress(Math.round(data.progress));
          }
          break;
        case 'error':
          setError(data);
          setStatus('error');
          break;
        default:
          break;
      }
    };

    // Auto-load model if previously installed
    const wasInstalled = localStorage.getItem('whisper_installed') === 'true';
    if (wasInstalled) {
      // Give worker time to initialize, then auto-load
      setTimeout(() => {
        setStatus('loading');
        worker.current.postMessage({ type: 'load' });
      }, 500);
    }

    return () => {
      worker.current.terminate();
    };
  }, []);

  const loadModel = () => {
    if (status === 'ready') return;
    setStatus('loading');
    setProgress(0);
    worker.current.postMessage({ type: 'load' });
  };

  const transcribe = (audioData) => {
    return new Promise((resolve, reject) => {
      if (status !== 'ready') {
        reject(new Error('Model not ready'));
        return;
      }

      const handleMessage = (event) => {
        const { type, data } = event.data;
        if (type === 'result') {
          worker.current.removeEventListener('message', handleMessage);
          resolve(data);
        } else if (type === 'error') {
          worker.current.removeEventListener('message', handleMessage);
          reject(data);
        }
      };

      // Add temporary listener for this specific transcription
      // Note: In a real app with concurrent requests, we'd need IDs. 
      // For this single-user app, this simple approach works.
      const originalOnMessage = worker.current.onmessage;
      worker.current.onmessage = (e) => {
        handleMessage(e);
        originalOnMessage(e); // Keep the global listener active
      };

      worker.current.postMessage({ type: 'transcribe', audio: audioData });
    });
  };

  return (
    <WhisperContext.Provider value={{ status, progress, error, loadModel, transcribe }}>
      {children}
    </WhisperContext.Provider>
  );
};
