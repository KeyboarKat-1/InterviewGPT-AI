import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import InterviewSession from './pages/InterviewSession';
import ProfileSettings from './pages/ProfileSettings';

// Placeholder Pages
const Analytics = () => <div style={{padding: '2rem', textAlign: 'center'}}><h1>Analytics Page Coming Soon</h1></div>;
const Results = () => <div style={{padding: '2rem', textAlign: 'center'}}><h1>Interview Results</h1></div>;

// A wrapper for protected routes
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <Router>
      <div className="app-container">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <ProfileSettings />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/interview/setup" 
              element={
                <PrivateRoute>
                  <InterviewSetup />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/interview/session/:id" 
              element={
                <PrivateRoute>
                  <InterviewSession />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/interview/results/:id" 
              element={
                <PrivateRoute>
                  <Results />
                </PrivateRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
