import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      // Redirect to login if no token
      window.location.href = '/login';
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleMenuClick = (menuItem) => {
    setActiveMenu(menuItem);
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar 
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className="main-content">
        <header className="dashboard-header">
          <h1>{activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1).replace('-', ' ')}</h1>
          <div className="user-info">
            <span>Welcome, {user.username || user.email}</span>
          </div>
        </header>

        <div className="dashboard-content">
          {activeMenu === 'dashboard' && (
            <>
              <div className="welcome-card">
                <h2>Welcome, {user.username || user.email}!</h2>
                <p>You have successfully logged in to your account.</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Profile</h3>
                  <div className="stat-info">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Username:</strong> {user.username || 'N/A'}</p>
                    <p><strong>Member Since:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeMenu === 'voting-poll' && (
            <div className="content-section">
              <h2>Voting Poll</h2>
              <p>Voting poll content will be displayed here.</p>
            </div>
          )}

          {activeMenu === 'result' && (
            <div className="content-section">
              <h2>Results</h2>
              <p>Poll results will be displayed here.</p>
            </div>
          )}

          {activeMenu === 'profile' && (
            <div className="content-section">
              <h2>Profile</h2>
              <div className="stat-info">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Username:</strong> {user.username || 'N/A'}</p>
                <p><strong>Member Since:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
