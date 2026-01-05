import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiAward } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PracticeSession from '../components/PracticeSession';
import SegmentedControl from '../components/SegmentedControl';
import '../styles/Practice.css';

// Simple Diff View Component
const DiffView = ({ target, spoken }) => {
  if (!target || !spoken || typeof target !== 'string' || typeof spoken !== 'string') return null;
  
  const targetWords = target.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(/\s+/);
  const spokenWords = spoken.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(/\s+/);
  
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px', border: '1px solid var(--border-color)' }}>
      <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🆚 Comparison
      </h3>
      
      <div style={{ marginBottom: '15px' }}>
        <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>TARGET SENTENCE</span>
        <div style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>
          {targetWords.map((word, i) => {
            const match = spokenWords[i] === word;
            return (
              <span key={i} style={{ 
                color: match ? 'var(--success)' : 'var(--text-secondary)',
                opacity: match ? 1 : 0.7,
                marginRight: '6px',
                display: 'inline-block'
              }}>
                {word}
              </span>
            );
          })}
        </div>
      </div>

      <div>
        <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>YOU SAID</span>
        <div style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>
          {spokenWords.map((word, i) => {
            const match = targetWords[i] === word;
            return (
              <span key={i} style={{ 
                color: match ? 'var(--success)' : 'var(--error)',
                fontWeight: match ? 'normal' : 'bold',
                textDecoration: match ? 'none' : 'underline',
                marginRight: '6px',
                display: 'inline-block'
              }}>
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const GrammarPractice = () => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionResults, setSessionResults] = useState(null);
  const [sessionKey, setSessionKey] = useState(0); // Key to force remount
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [difficulty, setDifficulty] = useState('intermediate');

  const fetchQuestion = async () => {
    setLoading(true);
    setSessionResults(null);
    setSessionKey(prev => prev + 1); // Reset session
    try {
      const response = await fetch(`http://localhost:5000/api/practice/questions/grammar?difficulty=${difficulty}`);
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('Failed to load sentence. Using offline fallback.');
      setQuestion({ id: 999, text: "The quick brown fox jumps over the lazy dog." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, [difficulty]);

  const handleSessionComplete = async (data) => {
    setIsAnalyzing(true);
    try {
      // Calculate additional metrics
      const wordCount = data.transcript.trim().split(/\s+/).length;
      const wpm = Math.round(wordCount / (data.duration / 60)) || 0;

      const response = await fetch('http://localhost:5000/api/practice/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          ...data, 
          type: 'grammar',
          question: question, // Explicitly pass the question object
          wordCount,
          wpm
        }),
      });
      const results = await response.json();
      setSessionResults({ ...results, transcript: data.transcript });
      
      const history = JSON.parse(localStorage.getItem('practiceHistory') || '[]');
      history.unshift({
        id: Date.now(),
        type: 'Grammar Practice',
        topic: "Sentence Repetition",
        score: results.overallScore,
        date: new Date().toISOString()
      });
      localStorage.setItem('practiceHistory', JSON.stringify(history));
      
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (error) {
      console.error('Error submitting session:', error);
      toast.error('Failed to submit session.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startNewSession = () => {
    fetchQuestion();
  };

  if (loading && !question) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Loading Sentence...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      {/* Practice Section - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
            <FiArrowLeft /> Back to Home
          </Link>
          <h1 className="gradient-text">Grammar Practice</h1>
        </div>
        
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <SegmentedControl
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' }
            ]}
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>
        
        {question && (
          <PracticeSession 
            key={sessionKey}
            practiceType="grammar"
            question={question}
            onNewQuestion={fetchQuestion}
            onSessionComplete={handleSessionComplete}
            isAnalyzing={isAnalyzing}
          />
        )}
      </motion.div>

      {/* Results Section - Appears Below */}
      {sessionResults && (
        <motion.div
          id="results-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ marginTop: '60px', paddingTop: '40px', borderTop: '2px solid var(--border-color)' }}
        >
          <div className="results-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <FiAward style={{ fontSize: '4rem', color: 'var(--accent-secondary)', marginBottom: '20px' }} />
              <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Practice Complete!</h2>
            </div>

            {/* Diff View Comparison */}
            <DiffView target={question?.text} spoken={sessionResults.transcript} />

            {/* Grammar Metrics - Only show for grammar practice */}
            {sessionResults.grammarMetrics && (
              <div style={{ background: 'rgba(0, 212, 255, 0.05)', padding: '30px', borderRadius: '20px', marginBottom: '30px', border: '1px solid var(--accent-primary)' }}>
                <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)' }}>
                  📊 Performance Metrics
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  {/* Accuracy Score */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', color: sessionResults.grammarMetrics.accuracyScore >= 90 ? 'var(--success)' : sessionResults.grammarMetrics.accuracyScore >= 70 ? 'var(--warning)' : 'var(--error)' }}>
                      {sessionResults.grammarMetrics.accuracyScore}%
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>Accuracy</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      {sessionResults.grammarMetrics.details.correctWords}/{sessionResults.grammarMetrics.details.totalWords} words correct
                    </div>
                  </div>

                  {/* Fluency Rating */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', color: sessionResults.grammarMetrics.fluencyRating >= 90 ? 'var(--success)' : sessionResults.grammarMetrics.fluencyRating >= 70 ? 'var(--warning)' : 'var(--error)' }}>
                      {sessionResults.grammarMetrics.fluencyRating}%
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>Fluency</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      {sessionResults.grammarMetrics.details.fillerCount} fillers, {sessionResults.grammarMetrics.details.repeatCount} repeats
                    </div>
                  </div>

                  {/* Pronunciation Score */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', color: sessionResults.grammarMetrics.pronunciationScore >= 90 ? 'var(--success)' : sessionResults.grammarMetrics.pronunciationScore >= 70 ? 'var(--warning)' : 'var(--error)' }}>
                      {sessionResults.grammarMetrics.pronunciationScore}%
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>Pronunciation</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      Estimated clarity
                    </div>
                  </div>

                  {/* Speed Score */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px', color: sessionResults.grammarMetrics.speedScore >= 90 ? 'var(--success)' : sessionResults.grammarMetrics.speedScore >= 70 ? 'var(--warning)' : 'var(--error)' }}>
                      {sessionResults.grammarMetrics.speedScore}%
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>Speed</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      {sessionResults.grammarMetrics.wpm} WPM (ideal: 120-150)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Score & Fluency Breakdown - HIDDEN for Grammar Practice as per user request */}
            {!sessionResults.grammarMetrics && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginBottom: '40px' }}>
              <div className="score-card" style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '30px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ color: 'var(--accent-secondary)', fontSize: '4rem', fontWeight: '800', margin: 0 }}>{sessionResults.overallScore}</h3>
                <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Overall Score</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {sessionResults.fluencyBreakdown && Object.entries(sessionResults.fluencyBreakdown).map(([key, value]) => (
                  <div key={key} className="stat-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                    <h4 style={{ textTransform: 'capitalize', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <div className="progress-bar" style={{ height: '8px', background: 'rgba(255,255,255,0.1)' }}>
                      <div style={{ 
                        width: `${value}%`, 
                        height: '100%', 
                        borderRadius: '4px',
                        background: value > 80 ? 'var(--success)' : value > 60 ? 'var(--warning)' : 'var(--error)' 
                      }}></div>
                    </div>
                    <span style={{ display: 'block', textAlign: 'right', marginTop: '5px', fontWeight: 'bold' }}>{value}%</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Grammar Errors */}
            {sessionResults.grammarErrors && sessionResults.grammarErrors.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>Grammar Corrections</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {sessionResults.grammarErrors.map((error, idx) => (
                    <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid var(--error)' }}>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                        <span style={{ color: 'var(--error)', textDecoration: 'line-through', opacity: 0.7 }}>{error.original}</span>
                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>→ {error.corrected}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>{error.rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pronunciation & Improvements */}
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

            {/* Overall Feedback */}
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '24px', borderRadius: '16px', marginBottom: '30px' }}>
              <h3>Coach's Feedback</h3>
              <p style={{ marginTop: '10px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{sessionResults.overallFeedback}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button onClick={startNewSession} className="neon-button">Next Sentence</button>
              <Link to="/dashboard" className="neon-button-outline">Go to Dashboard</Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GrammarPractice;
