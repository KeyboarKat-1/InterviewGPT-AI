import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSun, FiMoon, FiUser, FiLogOut } from 'react-icons/fi';
import './Navbar.css'; // Let's also create this or we can use global utilities

const Navbar = ({ theme, toggleTheme }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="gradient-text">InterviewGPT</span> AI
        </Link>
        
        <div className="navbar-menu">
          {currentUser ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/analytics" className="nav-link">Analytics</Link>
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
              </button>
              <div className="user-menu">
                <Link to="/profile" className="profile-btn"><FiUser /></Link>
                <button onClick={handleLogout} className="logout-btn"><FiLogOut /></button>
              </div>
            </>
          ) : (
            <>
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
              </button>
              <Link to="/login" className="btn-secondary">Log In</Link>
              <Link to="/register" className="btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
