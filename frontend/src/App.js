import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/App.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Components
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import TopicPractice from './pages/TopicPractice';
import GrammarPractice from './pages/GrammarPractice';
import AIInterviewer from './pages/AIInterviewer';
import ListenReadPractice from './pages/ListenReadPractice';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { WhisperProvider } from './contexts/WhisperContext';
import ModelSuggestionModal from './components/ModelSuggestionModal';

function App() {
  return (
    <GoogleOAuthProvider clientId="129650731610-69qg6kihp52n1gfi9fbia0mh9mdss5le.apps.googleusercontent.com">
      <WhisperProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <div className="App">
                <ModelSuggestionModal />
                <Navigation />
                <Routes>
                  <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route path="/topic-practice" element={
                <ProtectedRoute>
                  <TopicPractice />
                </ProtectedRoute>
              } />
              <Route path="/grammar-practice" element={
                <ProtectedRoute>
                  <GrammarPractice />
                </ProtectedRoute>
              } />
              <Route path="/ai-interviewer" element={
                <ProtectedRoute>
                  <AIInterviewer />
                </ProtectedRoute>
              } />
              <Route path="/listen-and-read" element={
                <ProtectedRoute>
                  <ListenReadPractice />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster 
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #333',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
       </AuthProvider>
      </ThemeProvider>
      </WhisperProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
