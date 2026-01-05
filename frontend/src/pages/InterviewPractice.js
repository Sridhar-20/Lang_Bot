import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiAward } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PracticeSession from '../components/PracticeSession';
import useVoices from '../hooks/useVoices';
import '../styles/Practice.css';

const FALLBACK_QUESTION = {
  id: 9001,
  text: 'Tell me about a time you had to solve a difficult problem at work.'
};

const InterviewPractice = () => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionResults, setSessionResults] = useState(null);

  const { voices, selectedVoice, setSelectedVoice } = useVoices();

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/practice/questions/interview');
      if (!response.ok) throw new Error('Failed to fetch interview prompt');
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      console.error('Error fetching interview question:', error);
      toast.error('Unable to load interview prompt. Using fallback question.');
      setQuestion(FALLBACK_QUESTION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, []);

  const handleSessionComplete = async (data) => {
    try {
      const transcript = (data.transcript || '').trim();
      const wordCount = transcript ? transcript.split(/\s+/).length : 0;
      const wpm = Math.round(wordCount / (data.duration / 60 || 1)) || 0;

      const response = await fetch('http://localhost:5000/api/practice/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          type: 'interview',
          wordCount,
          wpm
        })
      });

      if (!response.ok) throw new Error('Failed to submit interview session');

      const results = await response.json();
      setSessionResults(results);

      const history = JSON.parse(localStorage.getItem('practiceHistory') || '[]');
      history.unshift({
        id: Date.now(),
        type: 'Interview Practice',
        topic: data.question?.text || 'Interview Prompt',
        score: results.overallScore,
        date: new Date().toISOString()
      });
      localStorage.setItem('practiceHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error submitting interview session:', error);
      toast.error('Could not analyze your session. Please try again.');
    }
  };

  const startNewSession = () => {
    setSessionResults(null);
    fetchQuestion();
  };

  if (loading && !question) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Loading interview prompt...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <AnimatePresence mode="wait">
        {!sessionResults ? (
          <motion.div
            key="practice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              style={{
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  to="/"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}
                >
                  <FiArrowLeft /> Back
                </Link>
                <h1 className="gradient-text" style={{ margin: 0, fontSize: '1.8rem' }}>
                  Interview Practice
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                  AI Voice:
                </span>
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = voices.find((v) => v.name === e.target.value);
                    setSelectedVoice(voice);
                  }}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    outline: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    minWidth: '200px'
                  }}
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name.replace('Google', '').replace('English', '').trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {question && (
              <PracticeSession
                practiceType='interview'
                question={question}
                onNewQuestion={fetchQuestion}
                onSessionComplete={handleSessionComplete}
                externalVoice={selectedVoice}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="results-container"
            style={{
              maxWidth: '1000px',
              margin: '40px auto',
              padding: '40px',
              background: 'var(--bg-secondary)',
              borderRadius: '24px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <FiAward style={{ fontSize: '4rem', color: 'var(--accent-primary)', marginBottom: '20px' }} />
              <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Interview Review</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Here is how you handled the scenario.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginBottom: '40px' }}>
              <div
                className="score-card"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '30px',
                  borderRadius: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <h3 style={{ color: 'var(--accent-primary)', fontSize: '4rem', fontWeight: '800', margin: 0 }}>
                  {sessionResults.overallScore}
                </h3>
                <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Overall Score</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {sessionResults.fluencyBreakdown &&
                  Object.entries(sessionResults.fluencyBreakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="stat-item"
                      style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}
                    >
                      <h4 style={{ textTransform: 'capitalize', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <div className="progress-bar" style={{ height: '8px', background: 'rgba(255,255,255,0.1)' }}>
                        <div
                          style={{
                            width: `${value}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: value > 80 ? 'var(--success)' : value > 60 ? 'var(--warning)' : 'var(--error)'
                          }}
                        ></div>
                      </div>
                      <span style={{ display: 'block', textAlign: 'right', marginTop: '5px', fontWeight: 'bold' }}>
                        {value}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {sessionResults.grammarErrors && sessionResults.grammarErrors.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
                  Grammar Corrections
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {sessionResults.grammarErrors.map((error, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '15px',
                        borderRadius: '12px',
                        borderLeft: '4px solid var(--error)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                        <span style={{ color: 'var(--error)', textDecoration: 'line-through', opacity: 0.7 }}>
                          {error.original}
                        </span>
                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>→ {error.corrected}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>{error.rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div>
                <h3 style={{ marginBottom: '15px', color: 'var(--accent-primary)' }}>Pronunciation Tips</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {sessionResults.pronunciationTips?.map((tip, i) => (
                    <li key={i} style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: 'var(--accent-primary)' }}>•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 style={{ marginBottom: '15px', color: 'var(--success)' }}>Strengths</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {sessionResults.strengths?.map((strength, i) => (
                    <li key={i} style={{ marginBottom: '10px', paddingLeft: '20px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: 'var(--success)' }}>✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '24px', borderRadius: '16px', marginBottom: '30px' }}>
              <h3>Coach's Feedback</h3>
              <p style={{ marginTop: '10px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {sessionResults.overallFeedback}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button onClick={startNewSession} className="neon-button">
                New Interview
              </button>
              <Link to="/dashboard" className="neon-button-outline">
                Go to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InterviewPractice;


