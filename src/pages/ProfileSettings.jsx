import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const { currentUser, updateProfile, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setPhotoURL(currentUser.photoURL || '');
    }
  }, [currentUser]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await updateProfile(displayName, photoURL);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile: ' + error.message });
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await resetPassword(currentUser.email);
      setMessage({ type: 'success', text: 'Password reset email sent. Please check your inbox.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send password reset email: ' + error.message });
    }
    setLoading(false);
  };

  const renderProfileTab = () => (
    <form onSubmit={handleProfileUpdate} className="settings-form">
      <h3>Profile Information</h3>
      <div className="form-group">
        <label>Email (Read-only)</label>
        <input type="email" value={currentUser?.email} disabled />
      </div>
      <div className="form-group">
        <label>Full Name</label>
        <input 
          type="text" 
          value={displayName} 
          onChange={(e) => setDisplayName(e.target.value)} 
          placeholder="Enter your full name"
        />
      </div>
      <div className="form-group">
        <label>Profile Picture URL</label>
        <input 
          type="url" 
          value={photoURL} 
          onChange={(e) => setPhotoURL(e.target.value)} 
          placeholder="https://example.com/photo.jpg"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );

  const renderAccountTab = () => (
    <div className="settings-section">
      <h3>Account Management</h3>
      <div className="account-actions">
        <div className="action-item">
          <div className="action-text">
            <h4>Reset Password</h4>
            <p>We will send a password reset link to your email.</p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handlePasswordReset}
            disabled={loading}
          >
            Send Link
          </button>
        </div>
        <div className="action-item danger-zone">
          <div className="action-text">
            <h4>Delete Account</h4>
            <p>Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button className="btn btn-danger" disabled>Delete Account</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-container fade-in">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account settings and preferences.</p>
      </div>

      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-content">
        <div className="settings-sidebar">
          <ul>
            <li className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              Profile
            </li>
            <li className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}>
              Account
            </li>
          </ul>
        </div>
        
        <div className="settings-panel">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'account' && renderAccountTab()}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
