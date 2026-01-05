import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiSquare, FiPlay, FiCpu, FiUser, FiVolume2, FiVolumeX, FiSettings, FiRotateCcw } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import LiquidJarvisAnimation from '../components/LiquidJarvisAnimation';
import AIInterviewSettingsModal from '../components/AIInterviewSettingsModal';
import SegmentedControl from '../components/SegmentedControl'; // Imported
import { useWhisper } from '../contexts/WhisperContext';
import browserSTT from '../services/browserSTTService';
import '../styles/AIInterviewer.css';

const AIInterviewer = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Imported
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState(''); // Current live transcript
  const [chatHistory, setChatHistory] = useState([]); // Full conversation
  const [aiState, setAiState] = useState('idle'); // idle, listening, speaking, processing
  // Initialize mode from navigation state if available
  const [aiMode, setAiMode] = useState(location.state?.mode || 'interviewer');
  
  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [interviewSettings, setInterviewSettings] = useState({
    voice: 'us-female',
    type: 'hr'
  });
  
  // Whisper & Audio Refs
  const { transcribe, status: whisperStatus } = useWhisper();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  
  // TTS State
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Load Settings from localStorage
  useEffect(() => {
    const savedVoice = localStorage.getItem('ai_interview_voice') || 'us-female';
    const savedType = localStorage.getItem('ai_interview_type') || 'hr';
    const savedSpeed = localStorage.getItem('ai_interview_speed') || 'medium';
    setInterviewSettings({ voice: savedVoice, type: savedType, speed: savedSpeed });
  }, []);

  // Load Voices and apply saved preference
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      
      // Map voice preference to actual voice
      let preferred = null;
      
      // Helper function for case-insensitive search
      const findVoice = (criteria) => {
        return available.find(v => {
          const nameLower = v.name.toLowerCase();
          const langLower = v.lang.toLowerCase();
          
          if (criteria.name && nameLower.includes(criteria.name.toLowerCase())) {
            if (criteria.lang) {
              return langLower.startsWith(criteria.lang.toLowerCase());
            }
            return true;
          }
          if (criteria.lang && langLower.startsWith(criteria.lang.toLowerCase())) {
            if (criteria.gender) {
              return nameLower.includes(criteria.gender.toLowerCase());
            }
            return true;
          }
          return false;
        });
      };
      
      switch(interviewSettings.voice) {
        case 'uk-english':
          preferred = findVoice({ lang: 'en-GB' }) || 
                      findVoice({ name: 'UK' }) ||
                      findVoice({ name: 'British' });
          break;
          
        case 'us-female':
          // Try multiple strategies to find a female voice
          preferred = available.find(v => v.name.toLowerCase().includes('google us english female')) ||
                      available.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en-US')) ||
                      available.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('zira')) ||
                      available.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('susan')) ||
                      available.find(v => v.lang.startsWith('en-US') && !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('david'));
          break;
          
        case 'us-male':
          preferred = available.find(v => v.name.toLowerCase().includes('google us english male')) ||
                      available.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en-US')) ||
                      available.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('david')) ||
                      available.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('mark'));
          break;
          
        case 'indian-male':
          preferred = findVoice({ lang: 'en-IN', gender: 'male' }) ||
                      findVoice({ lang: 'en-IN', name: 'male' }) ||
                      available.find(v => v.lang.startsWith('en-IN') && v.name.toLowerCase().includes('male')) ||
                      findVoice({ lang: 'en-IN' });
          break;
          
        case 'indian-female':
          preferred = findVoice({ lang: 'en-IN', gender: 'female' }) ||
                      findVoice({ lang: 'en-IN', name: 'female' }) ||
                      available.find(v => v.lang.startsWith('en-IN') && !v.name.toLowerCase().includes('male')) ||
                      findVoice({ lang: 'en-IN' });
          break;
          
        default:
          preferred = findVoice({ lang: 'en-US' });
      }
      
      // Final fallback to any English voice
      if (!preferred) {
        preferred = available.find(v => v.lang.startsWith('en')) || available[0];
      }
      
      console.log('Selected voice:', preferred?.name, 'for setting:', interviewSettings.voice);
      
      setVoices(available);
      setSelectedVoice(preferred || available[0]);
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [interviewSettings.voice]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, transcript]);

  // Browser STT for Live Preview
  useEffect(() => {
    browserSTT.setCallbacks({
      onTranscript: (final, interim) => {
        if (isRecording) {
            setTranscript(final + (interim ? ' ' + interim : ''));
            setAiState('listening');
        }
      },
      onError: (err) => console.error("Browser STT Error:", err)
    });
  }, [isRecording]);

  const startSession = async () => {
    setIsSessionActive(true);
    setChatHistory([]);
    sessionStartTimeRef.current = Date.now();
    setAiState('processing'); // Show processing state while fetching greeting
    
    try {
        const response = await fetch('http://localhost:5000/api/interview/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: [],
                start: true,
                interviewType: interviewSettings.type
            })
        });

        const data = await response.json();
        
        if (data.text) {
            addMessage('ai', data.text);
            speak(data.text);
        }
    } catch (err) {
        console.error("Failed to start interview:", err);
        toast.error("Failed to start interview. Please try again.");
        setIsSessionActive(false); // Reset if failed
        setAiState('idle');
    }
  };

  const stopSession = async () => {
    setIsSessionActive(false);
    setIsRecording(false);
    stopAudio();
    window.speechSynthesis.cancel();
    setAiState('idle');

    // Save Session to Backend
    if (chatHistory.length > 2) { // Only save if there was actual interaction
        const duration = Math.round((Date.now() - (sessionStartTimeRef.current || Date.now())) / 1000);
        const fullTranscript = chatHistory.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n');
        
        try {
            await fetch('http://localhost:5000/api/practice/submit', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    type: 'interview', // Use generic interview type for analysis
                    topic: `AI Interview (${interviewSettings.type})`,
                    transcript: fullTranscript,
                    duration: duration,
                    wordCount: fullTranscript.split(/\s+/).length,
                    wpm: 0 // Estimate or leave 0
                })
            });
            toast.success("Session saved to Dashboard!");
        } catch (err) {
            console.error("Failed to save session:", err);
        }
    }
  };

  const addMessage = (role, text) => {
    setChatHistory(prev => [...prev, { role, text, timestamp: new Date() }]);
  };

  const speak = (text) => {
    if (!text) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Adjusted speed values for more natural, smooth speech
    const speedMap = {
      'slow': 0.9,      // Slower and clearer
      'medium': 1.1,    // Natural, comfortable pace
      'fast': 1.3       // Quick but not rushed
    };
    utterance.rate = speedMap[interviewSettings.speed] || 1.1;
    
    // Lower pitch slightly for more professional, less robotic sound
    utterance.pitch = 0.95;
    
    // Set volume to maximum for clarity
    utterance.volume = 1.0;
    
    // Ensure proper language setting
    utterance.lang = selectedVoice?.lang || 'en-US';
    
    utterance.onstart = () => {
        setIsSpeaking(true);
        setAiState('speaking');
    };
    
    utterance.onend = () => {
        setIsSpeaking(false);
        setAiState('idle');
    };
    
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        setAiState('idle');
    };
    
    // Small delay to ensure previous speech is fully cancelled
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const stopAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
    browserSTT.stopRecording();
  };

  const clearTranscript = (e) => {
    e.stopPropagation(); // Prevent bubbling
    setTranscript('');
    browserSTT.restartRecording();
  };

  const handleMicClick = async () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setAiState('idle');
        return;
    }

    if (!isRecording) {
      // START RECORDING
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
            audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            // Processing logic
            setIsProcessing(true);
            setAiState('processing');
            
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // 1. Try Whisper first (High Accuracy)
            let finalUserText = "";
            try {
                if (whisperStatus === 'ready') {
                    // Convert to AudioBuffer for Whisper
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const audioData = audioBuffer.getChannelData(0);
                    
                    const result = await transcribe(audioData);
                    finalUserText = result.text || result[0]?.text || "";
                }
            } catch (e) {
                console.error("Whisper failed, falling back to browser transcript", e);
            }

            // 2. Fallback to Browser Transcript if Whisper failed or empty
            if (!finalUserText || finalUserText.trim().length === 0) {
                finalUserText = transcript;
            }

            if (!finalUserText || finalUserText.trim().length === 0) {
                toast.error("I didn't hear anything. Please try again.");
                setIsProcessing(false);
                setAiState('idle');
                return;
            }

            // 3. Add User Message
            addMessage('user', finalUserText);
            setTranscript('');

            // 4. Send to Backend
            try {
                const response = await fetch('http://localhost:5000/api/interview/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        history: chatHistory.map(m => ({ role: m.role, text: m.text })),
                        userResponse: finalUserText,
                        interviewType: interviewSettings.type
                    })
                });

                const data = await response.json();
                
                if (data.text) {
                    addMessage('ai', data.text);
                    speak(data.text);
                }
            } catch (err) {
                console.error("API Error:", err);
                toast.error("Failed to get response from AI.");
                setAiState('idle');
            } finally {
                setIsProcessing(false);
            }
        };

        mediaRecorderRef.current.start();
        browserSTT.startRecording();
        setIsRecording(true);
        setAiState('listening');
        setTranscript('');

      } catch (err) {
        console.error("Mic Error:", err);
        toast.error("Could not access microphone.");
      }
    } else {
      // STOP RECORDING
      setIsRecording(false);
      stopAudio(); // This triggers onstop handler above
    }
  };

  const handleSettingsSave = (settings) => {
    setInterviewSettings(settings);
  };

  return (
    <div className="ai-interviewer-container">
      {/* Settings Modal */}
      <AIInterviewSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSettingsSave}
      />

      <div className="ai-header">
        <h1 className="ai-title">AI Interviewer Pro</h1>
        <p className="ai-subtitle">Master your interview skills with real-time AI feedback</p>
        
        {/* Interview Type Badge */}
        <div className="interview-type-badge">
          {interviewSettings.type === 'hr' && '💼 HR Interview'}
          {interviewSettings.type === 'technical' && '💻 Technical Interview'}
          {interviewSettings.type === 'behavioral' && '🎯 Behavioral Interview'}
          {interviewSettings.type === 'mixed' && '🔀 Mixed Interview'}
          {interviewSettings.type === 'domain-specific' && '🎓 Domain Specific Interview'}
        </div>
        
        {/* Settings Button */}
        <button 
          className="settings-button"
          onClick={() => setIsSettingsModalOpen(true)}
          title="Interview Settings"
        >
          <FiSettings />
        </button>
      </div>

      <div className="ai-content">
        {/* Left Panel: Avatar & Status */}
        <motion.div 
          className="glass-card interviewer-section"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ marginBottom: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <SegmentedControl
              options={[
                { value: 'bot', label: 'AI Bot' },
                { value: 'interviewer', label: 'AI Interviewer' }
              ]}
              value={aiMode}
              onChange={setAiMode}
            />
          </div>
          <div className="avatar-wrapper">
            <LiquidJarvisAnimation state={aiState} />
          </div>
          
          <div className="interviewer-status">
            {aiState === 'idle' && "Ready"}
            {aiState === 'listening' && "Listening..."}
            {aiState === 'processing' && "Thinking..."}
            {aiState === 'speaking' && "Speaking..."}
          </div>

          <div className="controls-container">
             {!isSessionActive ? (
                <button className="control-btn btn-start" onClick={startSession}>
                    <FiPlay /> Start Interview
                </button>
             ) : (
                <div className="active-controls">
                    <button 
                        className={`control-btn ${isRecording ? 'btn-stop-rec' : 'btn-mic'} ${isProcessing ? 'disabled' : ''}`}
                        onClick={handleMicClick}
                        disabled={isProcessing}
                    >
                        {isRecording ? <FiSquare /> : <FiMic />}
                        {isRecording ? "Stop Speaking" : "Tap to Speak"}
                    </button>
                    
                    <button className="control-btn btn-end" onClick={stopSession}>
                        End Session
                    </button>
                </div>
             )}
          </div>
        </motion.div>

        {/* Right Panel: Chat History */}
        <motion.div 
          className="glass-card chat-section"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
            <div className="chat-window">
                {chatHistory.length === 0 && (
                    <div className="empty-state">
                        <FiCpu size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                        <p>Start the session to begin your interview.</p>
                    </div>
                )}
                
                {chatHistory.map((msg, idx) => (
                    <motion.div 
                        key={idx}
                        className={`chat-message ${msg.role}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="message-avatar">
                            {msg.role === 'ai' ? <FiCpu /> : <FiUser />}
                        </div>
                        <div className="message-bubble">
                            {msg.text}
                        </div>
                    </motion.div>
                ))}

                {/* Live Transcript Preview */}
                {isRecording && transcript && (
                    <motion.div 
                        className="chat-message user interim"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="message-avatar"><FiUser /></div>
                        <div className="message-bubble">
                            {transcript}<span className="cursor">|</span>
                        </div>
                        <button 
                            className="reset-transcript-btn"
                            onClick={clearTranscript}
                            title="Reset current text"
                        >
                            <FiRotateCcw />
                        </button>
                    </motion.div>
                )}
                
                {/* Processing Indicator */}
                {isProcessing && (
                     <motion.div className="chat-message ai processing">
                        <div className="message-avatar"><FiCpu /></div>
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                     </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIInterviewer;
