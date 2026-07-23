import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiCode, FiUsers, FiBriefcase, FiCpu, FiFileText, FiUploadCloud } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import './InterviewSetup.css';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedType, setSelectedType] = useState('HR');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Extract type from URL params if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type) {
      setSelectedType(type);
    }
  }, [location]);

  const interviewTypes = [
    { id: 'HR', title: 'HR Interview', icon: <FiUsers />, desc: 'General behavioral and cultural fit questions.' },
    { id: 'Technical', title: 'Technical Interview', icon: <FiCode />, desc: 'Coding, system design, and technical concepts.' },
    { id: 'Behavioral', title: 'Behavioral Interview', icon: <FiBriefcase />, desc: 'Past experiences and situational judgment.' },
    { id: 'Aptitude', title: 'Aptitude Test', icon: <FiCpu />, desc: 'Logical reasoning and problem-solving skills.' },
    { id: 'Resume', title: 'Resume-Based', icon: <FiFileText />, desc: 'Upload your resume to get customized questions.' }
  ];

  const handleStart = async () => {
    if (selectedType === 'Resume') {
      if (!resumeFile) return;
      try {
        setLoading(true);
        setError(null);
        
        const formData = new FormData();
        formData.append('file', resumeFile);
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/resume/analyze`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to analyze resume');
        }
        
        const data = await response.json();
        const sessionId = Date.now().toString(36);
        
        // Pass fullResumeText and parsing result to the session page
        navigate(`/interview/session/${sessionId}?type=${selectedType}`, {
          state: {
            resumeText: data.fullResumeText,
            resumeAnalysis: data
          }
        });
      } catch (err) {
        console.error("Resume analysis failed:", err);
        setError(err.message || 'Failed to process resume. Please ensure it is a valid text-based PDF.');
      } finally {
        setLoading(false);
      }
    } else {
      const sessionId = Date.now().toString(36);
      navigate(`/interview/session/${sessionId}?type=${selectedType}`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setError(null);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-header text-center">
        <h1>Configure Your Interview</h1>
        <p className="subtitle">Select the type of interview you want to practice today</p>
      </div>

      <div className="types-grid">
        {interviewTypes.map((type) => (
          <div 
            key={type.id}
            className={`type-card glass-panel ${selectedType === type.id ? 'selected' : ''}`}
            onClick={() => setSelectedType(type.id)}
          >
            <div className="type-icon">{type.icon}</div>
            <h3>{type.title}</h3>
            <p>{type.desc}</p>
          </div>
        ))}
      </div>

      {selectedType === 'Resume' && (
        <div className="resume-upload-section glass-panel">
          <h3>Upload Your Resume</h3>
          <p>We'll analyze your skills and experience to ask relevant questions.</p>
          <div className="upload-area">
            <input 
              type="file" 
              id="resume-upload" 
              accept=".pdf,.doc,.docx" 
              onChange={handleFileChange} 
              className="hidden-input"
            />
            <label htmlFor="resume-upload" className="upload-label">
              <FiUploadCloud size={48} className="upload-icon" />
              <span>{resumeFile ? resumeFile.name : 'Click to upload or drag and drop'}</span>
              <span className="file-hint">PDF (Max 5MB)</span>
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="setup-error-banner glass-panel" style={{ color: 'var(--danger-color)', padding: '1rem', marginTop: '1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)' }}>
          {error}
        </div>
      )}

      <div className="start-action text-center mt-4">
        <button 
          className="btn-primary start-btn" 
          onClick={handleStart}
          disabled={(selectedType === 'Resume' && !resumeFile) || loading}
        >
          {loading ? 'Processing...' : `Start ${selectedType} Interview`}
        </button>
      </div>

      {loading && (
        <LoadingSpinner 
          fullPage={true} 
          message="Analyzing resume and generating custom interview questions..." 
        />
      )}
    </div>
  );
};

export default InterviewSetup;
