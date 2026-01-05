import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiMic, FiSquare, FiPause, FiPlay, FiCheck, FiRefreshCw, FiShuffle, FiCpu, FiZap, FiRefreshCcw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import browserSTT from '../services/browserSTTService';
import LiquidJarvisAnimation from './LiquidJarvisAnimation';
import { useWhisper } from '../contexts/WhisperContext';
import '../styles/Practice.css';

const FILLER_WORDS = [
  // Basic fillers
  'um', 'uh', 'umm', 'uhh', 'er', 'ah', 'hmm',
  
  // Common discourse markers
  'like', 'so', 'well', 'right', 'okay', 'ok', 'alright',
  
  // Hedges and qualifiers
  'kind of', 'sort of', 'kinda', 'sorta', 'basically', 'actually', 'literally',
  'pretty much', 'more or less', 'somewhat',
  
  // Thinking phrases
  'you know', 'i mean', 'let me see', 'let me think',
  
  // Transitional fillers
  'anyway', 'anyways', 'so yeah', 'yeah so', 'and stuff', 'or something',
  'or whatever', 'and everything', 'and all that',
  
  // Emphasis fillers
  'just', 'really', 'very', 'totally', 'absolutely', 'definitely',
  
  // Others
  'obviously', 'clearly', 'honestly', 'frankly', 'essentially'
];

const PracticeSession = ({ practiceType, question, onNewQuestion, onSessionComplete, externalVoice, isAnalyzing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [detectedFillers, setDetectedFillers] = useState([]);
  const [repeatingWords, setRepeatingWords] = useState([]);
  const [aiState, setAiState] = useState('idle'); // idle, listening, speaking
  const [countdown, setCountdown] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing speech...');
  
  // Rotating loading messages
  useEffect(() => {
    if (isAnalyzing) {
      const messages = [
        "Analyzing grammar...",
        "Checking pronunciation...",
        "Evaluating fluency...",
        "Measuring vocabulary...",
        "Generating feedback..."
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);
  
  // Whisper Integration
  const { status: whisperStatus, transcribe } = useWhisper();
  const [useHighAccuracy, setUseHighAccuracy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Internal voice state (used only if externalVoice is not provided)
  const [voices, setVoices] = useState([]);
  const [internalSelectedVoice, setInternalSelectedVoice] = useState(null);

  const activeVoice = externalVoice || internalSelectedVoice;

  const timerRef = useRef(null);

  // Load voices only if externalVoice is not provided
  useEffect(() => {
    if (externalVoice) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const googleVoices = availableVoices.filter(v => 
        v.name.includes('Google') && 
        (v.lang.includes('en-US') || v.lang.includes('en-GB') || v.lang.includes('en-IN'))
      );
      const finalVoices = googleVoices.length > 0 ? googleVoices : availableVoices.filter(v => v.lang.includes('en'));
      setVoices(finalVoices);
      if (finalVoices.length > 0) setInternalSelectedVoice(finalVoices[0]);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [externalVoice]);

  // Initialize STT callbacks (Always run for Hybrid Mode)
  useEffect(() => {
    browserSTT.setCallbacks({
      onTranscript: (final, interim) => {
        // If processing Whisper, don't update UI with browser results anymore
        if (isProcessing) return;
        
        setTranscript(final);
        setInterimTranscript(interim);
        detectIssues(final + ' ' + interim);
        setAiState('listening');
        
        clearTimeout(window.silenceTimer);
        window.silenceTimer = setTimeout(() => {
            if (isRecording && !isPaused) setAiState('idle');
        }, 2000);
      },
      onError: (error) => {
        // Only show error if NOT using high accuracy (since Whisper might still be working)
        if (!useHighAccuracy) {
            toast.error(`Microphone error: ${error}`);
            stopRecording();
        }
      },
      onStart: () => {
        setAiState('listening');
      },
      onEnd: () => {
        // Handled by service
      }
    });
  }, [isRecording, isPaused, isProcessing, useHighAccuracy]);

  // Timer Logic
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  // ... (Auto-speak remains same)

  // ... (speakText remains same)

  // ... (detectIssues remains same)

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (activeVoice) {
        utterance.voice = activeVoice;
      }
      utterance.onstart = () => setAiState('speaking');
      utterance.onend = () => setAiState('idle');
      utterance.onerror = () => setAiState('idle');
      window.speechSynthesis.speak(utterance);
    }
  };

  const detectIssues = (text) => {
    const words = text.toLowerCase().split(/\s+/);
    const fillers = words.filter(w => FILLER_WORDS.includes(w));
    setDetectedFillers([...new Set(fillers)]);
    
    const recentWords = words.slice(-50);
    const counts = {};
    recentWords.forEach(w => {
        if (w.length > 3) counts[w] = (counts[w] || 0) + 1;
    });
    const repeats = Object.keys(counts).filter(w => counts[w] > 2);
    setRepeatingWords(repeats);
  };

  const startRecordingFlow = async () => {
    if (useHighAccuracy && whisperStatus !== 'ready') {
      toast.error('Whisper model not installed or ready. Please install it from the Home page.');
      return;
    }

    // Pre-initialize microphone stream to avoid lag
    let stream = null;
    if (useHighAccuracy) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error(err);
            toast.error('Failed to access microphone');
            return;
        }
    }

    setCountdown(3);
    let count = 3;
    const countTimer = setInterval(async () => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countTimer);
        setIsRecording(true);
        setIsPaused(false);
        setTranscript('');
        setInterimTranscript('');
        
        // Always start Browser STT for Live Preview
        browserSTT.startRecording();

        if (useHighAccuracy && stream) {
          // ALSO Start MediaRecorder for Whisper (Hybrid Mode)
          try {
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
              audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.start();
            toast.success('Hybrid Recording started! (Live Preview + High Accuracy)');
          } catch (err) {
            console.error(err);
            toast.error('Failed to start recording');
            setIsRecording(false);
          }
        } else {
          toast.success('Recording started!');
        }
      }
    }, 1000);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsPaused(false);
    setAiState('idle');
    
    // Always stop Browser STT
    browserSTT.stopRecording();

    if (useHighAccuracy) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = async () => {
          setIsProcessing(true);
          
          // Use the actual mime type of the recorder
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log(`Audio recorded: ${audioBlob.size} bytes, Type: ${mimeType}`);
          
          // Convert Blob to AudioBuffer
          const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          let audioData = audioBuffer.getChannelData(0);

          // Check for silence
          let sum = 0;
          for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
          }
          const rms = Math.sqrt(sum / audioData.length);
          console.log("Audio RMS Level:", rms);

          if (rms < 0.005) {
             toast.error(`Microphone audio is silent! (Level: ${rms.toFixed(4)})`);
             console.warn("Audio is silent. Check microphone input.");
             setIsProcessing(false);
             return;
          } else {
             toast(`Audio Level OK: ${rms.toFixed(3)}`, { icon: '🔊' });
          }

          // Resample if necessary (though AudioContext constructor should handle it, explicit check is safer)
          if (audioBuffer.sampleRate !== 16000) {
            console.log(`Resampling from ${audioBuffer.sampleRate} to 16000Hz`);
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start();
            const resampledBuffer = await offlineCtx.startRendering();
            audioData = resampledBuffer.getChannelData(0);
          }

          try {
            const result = await transcribe(audioData);
            console.log("Whisper Result:", result); // Debugging
            
            // Handle different result formats just in case
            const finalText = result.text || (Array.isArray(result) ? result[0]?.text : "") || "";
            
            if (finalText && finalText.trim().length > 0) {
                setTranscript(finalText);
                setInterimTranscript(''); // Clear interim
                detectIssues(finalText);
                toast.success('Enhanced with High Accuracy!');
            } else {
                console.warn("Whisper returned empty text. Keeping browser transcript.");
                // DEBUG: Show what Whisper actually returned
                toast(`Debug: Whisper said "${JSON.stringify(result)}"`, { icon: '🐛' });
                toast('Kept browser transcript (Whisper uncertain)', { icon: 'ℹ️' });
            }
          } catch (err) {
            console.error("Whisper Error:", err);
            toast.error('High Accuracy failed. Keeping browser transcript.');
          } finally {
            setIsProcessing(false);
          }
        };
      }
    }
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      browserSTT.startRecording(); // Always resume browser STT for live preview
      if (useHighAccuracy) {
        mediaRecorderRef.current?.resume();
      }
    } else {
      setIsPaused(true);
      browserSTT.stopRecording(); // Always pause browser STT
      if (useHighAccuracy) {
        mediaRecorderRef.current?.pause();
      }
    }
  };

  const resetSession = () => {
    stopRecording();
    setTranscript('');
    setInterimTranscript('');
    setDuration(0);
    setDetectedFillers([]);
    setRepeatingWords([]);
    setAiState('idle');
    toast.success('Session reset');
  };

  const handleFinish = () => {
    stopRecording();
    onSessionComplete({
      transcript: transcript + ' ' + interimTranscript,
      duration,
      fillerWords: detectedFillers,
      repeatingWords,
      question: question
    });
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="practice-container">
      {/* Voice Selector - Only show if no external control */}
      {!externalVoice && (
        <div style={{ gridColumn: '1 / -1', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI Voice:</label>
          <select 
            value={internalSelectedVoice?.name || ''}
            onChange={(e) => {
              const voice = voices.find(v => v.name === e.target.value);
              setInternalSelectedVoice(voice);
            }}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            {voices.map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="practice-left">
        <div className="ai-visualizer">
          <LiquidJarvisAnimation state={aiState} />
        </div>
        
        <div className="controls-area">
          {/* Accuracy Toggle */}
          {!isRecording && (
            <div 
              onClick={() => setUseHighAccuracy(!useHighAccuracy)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${useHighAccuracy ? 'var(--accent-primary)' : 'var(--border-color)'}`
              }}
            >
              {useHighAccuracy ? <FiCpu color="var(--accent-primary)" /> : <FiZap color="var(--warning)" />}
              <span style={{ fontSize: '0.9rem', color: useHighAccuracy ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                {useHighAccuracy ? 'High Accuracy (Whisper)' : 'Fast Mode (Browser)'}
              </span>
            </div>
          )}

          {isRecording && (
            <div className="timer-display">
              <span className="recording-dot"></span>
              {formatTime(duration)}
            </div>
          )}

          <div className="main-controls">
            {!isRecording ? (
              countdown > 0 ? (
                <div className="countdown">{countdown}</div>
              ) : (
                <button className="control-btn start-btn" onClick={startRecordingFlow} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : <><FiMic /> Start Speaking</>}
                </button>
              )
            ) : (
              <>
                <button className="control-btn pause-btn" onClick={togglePause}>
                  {isPaused ? <FiPlay /> : <FiPause />}
                </button>
                <button className="control-btn stop-btn" onClick={stopRecording}>
                  <FiSquare /> Stop
                </button>
              </>
            )}
            

          </div>

          {(transcript || interimTranscript) && !isRecording && !isProcessing && (
            !isAnalyzing ? (
              <button className="finish-btn" onClick={handleFinish}>
                <FiCheck /> End Session & View Results
              </button>
            ) : (
              <div className="analyzing-status" style={{
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '12px',
                padding: '15px',
                textAlign: 'center',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%'
              }}>
                <FiCpu className="spin" style={{ fontSize: '1.2rem' }} />
                <span style={{ fontWeight: 500 }}>{loadingMessage}</span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="practice-right">
        <div className="prompt-card">
          <div className="prompt-header">
            <h3>Current Topic</h3>
            <div className="prompt-actions">
              <button onClick={() => speakText(question?.text)} title="Listen again">
                <FiRefreshCw />
              </button>
              <button onClick={onNewQuestion} title="New Topic">
                <FiShuffle />
              </button>
            </div>
          </div>
          <p className="prompt-text">{question?.text || "Loading question..."}</p>
        </div>

        <div className="transcript-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Live Transcript</h3>
            <button 
              onClick={resetSession}
              title="Reset Session"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <FiRefreshCcw size={18} />
            </button>
          </div>
          <div className="transcript-content" style={{ position: 'relative' }}>
            {/* Show transcript (Browser result) even while processing */}
            {transcript || interimTranscript ? (
              practiceType === 'grammar' && question?.text ? (
                // Live Grammar Diff View
                <div className="live-diff" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                  {(() => {
                    const fullText = (transcript + ' ' + interimTranscript).trim();
                    // Strip ALL punctuation and special characters, keep only letters and numbers
                    const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
                    
                    const spokenWords = cleanText(fullText).split(' ');
                    const targetWords = cleanText(question.text).split(' ');
                    
                    return spokenWords.map((word, i) => {
                      if (!word) return null;
                      // Check if word matches target at this position
                      const isMatch = targetWords[i] === word;
                      // Check if it's an extra word (beyond target length)
                      const isExtra = i >= targetWords.length;
                      
                      let color = 'var(--text-primary)';
                      if (isMatch) color = 'var(--success)';
                      else if (isExtra) color = 'var(--warning)'; // Extra words are warning
                      else color = 'var(--error)'; // Wrong words are error

                      return (
                        <span key={i} style={{ 
                          color: color,
                          marginRight: '6px',
                          display: 'inline-block',
                          fontWeight: isMatch ? 'bold' : 'normal',
                          textDecoration: !isMatch && !isExtra ? 'underline' : 'none'
                        }}>
                          {word}
                        </span>
                      );
                    });
                  })()}
                </div>
              ) : (
                // Standard Transcript View
                <>
                  <span className="final-text" style={{ opacity: 1 }}>{transcript}</span>
                  <span className="interim-text">{interimTranscript}</span>
                </>
              )
            ) : (
              <span className="placeholder-text">
                {useHighAccuracy 
                  ? "Start speaking... (Live preview + High Accuracy polishing)" 
                  : "Start speaking to see your words appear here..."}
              </span>
            )}

            {/* Processing Overlay - Subtle & Non-blocking */}
            {isProcessing && (
              <div style={{ 
                position: 'absolute', 
                bottom: '10px', 
                right: '10px', 
                background: 'rgba(0,0,0,0.6)', 
                padding: '4px 8px', 
                borderRadius: '12px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                backdropFilter: 'blur(4px)'
              }}>
                <FiCpu className="spin" /> Polishing...
              </div>
            )}
          </div>
          
          {detectedFillers.length > 0 && (
            <div className="feedback-tag-container warning">
              <span className="tag-label">Filler Words:</span>
              {detectedFillers.map((w, i) => (
                <span key={i} className="feedback-tag">{w}</span>
              ))}
            </div>
          )}

          {repeatingWords.length > 0 && (
            <div className="feedback-tag-container info">
              <span className="tag-label">Repeating:</span>
              {repeatingWords.map((w, i) => (
                <span key={i} className="feedback-tag">{w}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeSession;
