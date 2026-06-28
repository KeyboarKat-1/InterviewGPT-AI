import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiCode, FiUsers, FiBriefcase, FiCpu, FiFileText, FiUploadCloud } from 'react-icons/fi';
import './InterviewSetup.css';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedType, setSelectedType] = useState('HR');
  const [resumeFile, setResumeFile] = useState(null);
  
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

  const handleStart = () => {
    // Generate a unique ID for the session
    const sessionId = Date.now().toString(36);
    navigate(`/interview/session/${sessionId}?type=${selectedType}`);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
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
              <span className="file-hint">PDF, DOC, DOCX (Max 5MB)</span>
            </label>
          </div>
        </div>
      )}

      <div className="start-action text-center mt-4">
        <button 
          className="btn-primary start-btn" 
          onClick={handleStart}
          disabled={selectedType === 'Resume' && !resumeFile}
        >
          Start {selectedType} Interview
        </button>
      </div>
    </div>
  );
};

export default InterviewSetup;
