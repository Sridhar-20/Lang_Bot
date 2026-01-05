import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Navigation.css';
import '../styles/NavigationProfile.css';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

const navLinks = [
    { name: 'Home', path: '/' },
    { 
      name: 'Practice Pages', 
      path: '/practice', // This won't technically be navigated to
      children: [
        { name: 'Topic Practice', path: '/topic-practice' },
        { name: 'Grammar Practice', path: '/grammar-practice' },
        { name: 'Interview Practice', path: '/interview-practice' },
        { name: 'Listening Practice', path: '/listening-practice' },
      ]
    },
    { name: 'AI Interviewer', path: '/ai-interviewer' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 20;
          setIsScrolled(scrolled);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="navbar-floating-wrapper">
      <nav className={`navbar-pill ${isScrolled ? 'scrolled' : ''}`}>
        
        {/* Left: Logo */}
        <div className="nav-left">
          <Link to="/" className="logo-pill">
            <span className="logo-icon">LB</span>
            <span className="logo-text">LanguaBot</span>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <div className="nav-center desktop-only">
          {navLinks.map((link) => {
            if (link.children) {
              return (
                <div 
                  className="nav-item-dropdown" 
                  key={link.name}
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <span className={`pill-link ${location.pathname.includes('practice') ? 'active' : ''}`}>
                    {link.name} <FiChevronDown style={{ fontSize: '0.8em', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </span>
                  
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        className="pill-dropdown-menu"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        {link.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`pill-dropdown-link ${location.pathname === child.path ? 'active' : ''}`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`pill-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="nav-right">
          <button 
            className="theme-toggle-pill" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          
          {user ? (
             <div 
               className="nav-item-dropdown" // Reusing dropdown wrapper behavior
               onMouseEnter={() => setProfileDropdownOpen(true)}
               onMouseLeave={() => setProfileDropdownOpen(false)}
             >
                <div className="profile-pill-trigger">
                    <div className="profile-avatar">
                        {/* Simple emoji avatar or first letter */}
                        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                </div>

                <AnimatePresence>
                    {profileDropdownOpen && (
                        <motion.div
                            className="pill-dropdown-menu profile-menu"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                             <div className="profile-info">
                                <span className="profile-name">{user.username}</span>
                                <span className="profile-email">{user.email}</span>
                             </div>
                             
                             <button onClick={logout} className="pill-dropdown-link profile-logout">
                                Logout
                             </button>
                        </motion.div>
                    )}
                </AnimatePresence>
             </div>
          ) : (
            <>
              <Link to="/login" className="pill-link desktop-only">Login</Link>
              <Link to="/signup" className="pill-link" style={{ background: 'linear-gradient(45deg, #6a11cb, #2575fc)', border: 'none', color: 'white' }}>
                Sign Up
              </Link>
            </>
          )}

          <div className="mobile-menu-btn" onClick={toggleMenu}>
            {isOpen ? <FiX /> : <FiMenu />}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown (Outside Pill) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mobile-menu-floating"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            {navLinks.map((link) => {
              if (link.children) {
                return (
                  <div key={link.name} className="mobile-group">
                      <div className="mobile-group-header">{link.name}</div>
                      {link.children.map(child => (
                          <Link
                          key={child.path}
                          to={child.path}
                          className="mobile-link indented"
                          onClick={() => setIsOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                  </div>
                )
              }
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="mobile-link"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navigation;
