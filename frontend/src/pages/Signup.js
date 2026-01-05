import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import toast from 'react-hot-toast';
import '../styles/Auth.css';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { signup, googleLogin, error } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Calculate validation state on render
    const passwordsMatch = password === confirmPassword || confirmPassword === '';
    const isFormValid = username && email && password && confirmPassword && (password === confirmPassword) && password.length >= 6;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        const result = await signup(username, email, password);
        if (result.success) {
            toast.success('Account created successfully! Logging you in...');
            navigate('/');
        } else {
            toast.error(result.error || 'Failed to create account. Please try again.');
        }
        setLoading(false);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        const result = await googleLogin(credentialResponse.credential);
        if (result.success) {
            toast.success('Account created successfully! Welcome!');
            navigate('/');
        } else {
            toast.error(result.error || 'Google Signup failed.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Start your journey today</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                            placeholder="Choose a username"
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            placeholder="Enter your email"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                placeholder="Create a password (min 6 chars)"
                                minLength="6"
                            />
                            <button 
                                type="button" 
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <div className="password-input-wrapper">
                            <input 
                                type={showConfirmPassword ? "text" : "password"} 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                                placeholder="Confirm your password"
                                className={!passwordsMatch ? 'input-error' : ''}
                            />
                            <button 
                                type="button" 
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                            </button>
                        </div>
                        {!passwordsMatch && (
                            <div className="inline-error">Passwords do not match</div>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        className={`auth-button ${!isFormValid ? 'disabled' : ''}`} 
                        disabled={loading || !isFormValid}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                
                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => {
                           toast.error('Google Signup Failed');
                        }}
                        theme="filled_black"
                        shape="pill"
                        text="signup_with"
                        width="100%"
                    />
                </div>
                
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
