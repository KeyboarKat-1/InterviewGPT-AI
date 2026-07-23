import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium', fullPage = false }) => {
  const spinnerClass = `spinner-container ${fullPage ? 'full-page' : ''} ${size}`;

  return (
    <div className={spinnerClass} id="loading-spinner">
      <div className="spinner-ring">
        <div className="spinner-ring-inner"></div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
