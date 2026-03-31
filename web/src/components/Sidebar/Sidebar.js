import React from 'react';
import './Sidebar.css';
import HomeIcon from './Sidebar Icons/Home.png';
import VotePollIcon from './Sidebar Icons/Vote Poll.png';
import ResultIcon from './Sidebar Icons/Result.png';
import ProfileIcon from './Sidebar Icons/Profile.png';
import VerifiedUserIcon from './Sidebar Icons/verified-user.png';
import LogoutIcon from './Sidebar Icons/logout.png';

function Sidebar({ activeMenu, onMenuClick, onLogout, isAdmin }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>WildChoice</h2>
      </div>
      <nav className="sidebar-menu">
        <button
          className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
          onClick={() => onMenuClick('dashboard')}
        >
          <img src={HomeIcon} alt="Dashboard" className="menu-icon" />
          <span>Dashboard</span>
        </button>
        <button
          className={`menu-item ${activeMenu === 'poll-request' ? 'active' : ''}`}
          onClick={() => onMenuClick('poll-request')}
        >
          <img src={VotePollIcon} alt="Poll Reqest" className="menu-icon" />
          <span>Poll Reqest</span>
        </button>
        {isAdmin && (
          <button
            className={`menu-item ${activeMenu === 'user-verification' ? 'active' : ''}`}
            onClick={() => onMenuClick('user-verification')}
          >
            <img src={VerifiedUserIcon} alt="User Verification" className="menu-icon" />
            <span>User Verification</span>
          </button>
        )}
        <button
          className={`menu-item ${activeMenu === 'result' ? 'active' : ''}`}
          onClick={() => onMenuClick('result')}
        >
          <img src={ResultIcon} alt="Result" className="menu-icon" />
          <span>Result</span>
        </button>
        <button
          className={`menu-item ${activeMenu === 'profile' ? 'active' : ''}`}
          onClick={() => onMenuClick('profile')}
        >
          <img src={ProfileIcon} alt="Profile" className="menu-icon" />
          <span>Profile</span>
        </button>
        <button
          className="menu-item logout"
          onClick={onLogout}
        >
          <img src={LogoutIcon} alt="Logout" className="menu-icon" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
