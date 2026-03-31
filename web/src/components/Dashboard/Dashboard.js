import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import './Dashboard.css';
import { supabase } from '../../config/supabaseClient';

function Dashboard() {
  const ADMIN_EMAIL = 'cit.admin@cit.edu';
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [verificationUsers, setVerificationUsers] = useState([]);
  const [verificationSource, setVerificationSource] = useState('profiles');
  const [loadingVerificationUsers, setLoadingVerificationUsers] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const avatarObjectUrlRef = useRef('');

  const getDefaultAvatarUrl = (nameOrEmail) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrEmail)}&background=4a0000&color=fff`;

  const getSignedAvatarUrl = async (avatarPath) => {
    if (!avatarPath) {
      return '';
    }

    const { data, error } = await supabase.storage
      .from('profile-images')
      .createSignedUrl(avatarPath, 60 * 60);

    if (error) {
      return '';
    }

    return data?.signedUrl || '';
  };

  const getAvatarBlobUrl = async (avatarPath) => {
    if (!avatarPath) {
      return '';
    }

    const { data, error } = await supabase.storage
      .from('profile-images')
      .download(avatarPath);

    if (error || !data) {
      return '';
    }

    return URL.createObjectURL(data);
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const {
          data: { user: authUser },
          error
        } = await supabase.auth.getUser();

        if (error || !authUser) {
          window.location.href = '/login';
          return;
        }

        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        let resolvedRole = authUser.user_metadata?.role || localUser.role || 'student';

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileData?.role) {
          resolvedRole = profileData.role;
        }

        if (authUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          resolvedRole = 'admin';
        }

        await supabase.from('profiles').upsert({
          id: authUser.id,
          email: authUser.email,
          username: authUser.user_metadata?.username || localUser.username || authUser.email,
          role: resolvedRole,
          created_at: authUser.created_at || new Date().toISOString()
        });

        const avatarPath = authUser.user_metadata?.avatar_path || '';
        const blobAvatarUrl = await getAvatarBlobUrl(avatarPath);
        const signedAvatarUrl = blobAvatarUrl || await getSignedAvatarUrl(avatarPath);

        if (avatarObjectUrlRef.current) {
          URL.revokeObjectURL(avatarObjectUrlRef.current);
        }

        if (blobAvatarUrl) {
          avatarObjectUrlRef.current = blobAvatarUrl;
        } else {
          avatarObjectUrlRef.current = '';
        }

        const normalizedUser = {
          userId: authUser.id,
          email: authUser.email,
          username: authUser.user_metadata?.username || localUser.username || authUser.email,
          role: resolvedRole,
          accountCreated: authUser.created_at || localUser.accountCreated || '',
          avatarPath,
          avatarUrl: signedAvatarUrl || authUser.user_metadata?.avatar_url || ''
        };

        if (avatarPath && !signedAvatarUrl && !authUser.user_metadata?.avatar_url) {
          setProfileMessage('Image exists but cannot be read. Check Storage SELECT policy for profile-images.');
        }

        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      } catch (err) {
        console.error('Failed to load user profile', err);
        window.location.href = '/login';
      }
    };

    loadUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleMenuClick = (menuItem) => {
    if (menuItem === 'user-verification' && user?.role !== 'admin') {
      setProfileMessage('Only admins can access User Verification.');
      return;
    }

    setActiveMenu(menuItem);
    setProfileMessage('');
    setShowPasswordForm(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const loadVerificationUsers = async () => {
    setLoadingVerificationUsers(true);
    setVerificationError('');
    try {
      let profileErrorMessage = '';
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, username, role, created_at')
        .order('created_at', { ascending: true });

      if (profileError) {
        profileErrorMessage = profileError.message || 'Unable to load users from profiles.';
      }

      let normalizedUsers = (profileRows || []).map((entry) => ({
        id: entry.id,
        idField: 'id',
        email: entry.email,
        username: entry.username || entry.email?.split('@')[0] || 'N/A',
        role: entry.role || 'student',
        created_at: entry.created_at
      }));

      normalizedUsers = normalizedUsers.filter(
        (entry) => (entry.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      );

      let source = 'profiles';

      // Fallback: support projects that already store users in a users table.
      if (normalizedUsers.length === 0) {
        const { data: userRows, error: usersError } = await supabase
          .from('users')
          .select('*');

        if (!usersError && Array.isArray(userRows) && userRows.length > 0) {
          source = 'users';
          normalizedUsers = userRows
            .map((entry) => {
              const resolvedId = entry.id || entry.user_id;
              const idField = entry.id ? 'id' : 'user_id';

              if (!resolvedId) {
                return null;
              }

              return {
                id: resolvedId,
                idField,
                email: entry.email || 'N/A',
                username: entry.username || entry.email?.split('@')[0] || 'N/A',
                role: entry.role || 'student',
                created_at: entry.created_at || ''
              };
            })
            .filter(
              (entry) =>
                entry && (entry.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()
            );
        } else if (usersError && profileErrorMessage) {
          setVerificationError(`${profileErrorMessage} Fallback users query also failed: ${usersError.message || 'Unable to load users table.'}`);
        } else if (usersError && !profileErrorMessage) {
          setVerificationError(usersError.message || 'Unable to load users for verification.');
        }
      }

      if (normalizedUsers.length === 0 && profileErrorMessage && !verificationError) {
        setVerificationError(profileErrorMessage);
      }

      setVerificationSource(source);
      setVerificationUsers(normalizedUsers);
    } catch (err) {
      console.error('Failed to load verification users', err);
      setVerificationError('Unable to load users for verification.');
    } finally {
      setLoadingVerificationUsers(false);
    }
  };

  const updateUserRole = async (targetUserId, nextRole) => {
    if (user?.role !== 'admin') {
      setProfileMessage('Only admins can update user roles.');
      return;
    }

    if (targetUserId === user.userId) {
      setProfileMessage('Admin account role cannot be changed.');
      return;
    }

    try {
      const targetEntry = verificationUsers.find((entry) => entry.id === targetUserId);
      const targetIdField = targetEntry?.idField || 'id';

      const { error } = await supabase
        .from(verificationSource)
        .update({ role: nextRole })
        .eq(targetIdField, targetUserId);

      if (error) {
        setProfileMessage(error.message || 'Failed to update user role.');
        return;
      }

      setVerificationUsers((prevUsers) =>
        prevUsers.map((entry) =>
          entry.id === targetUserId
            ? {
                ...entry,
                role: nextRole
              }
            : entry
        )
      );
      setProfileMessage(
        nextRole === 'teacher'
          ? 'User promoted to teacher successfully.'
          : 'Teacher demoted to student successfully.'
      );
    } catch (err) {
      console.error('Failed to update user role', err);
      setProfileMessage('Failed to update user role.');
    }
  };

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setProfileMessage('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setProfileMessage('Please fill out all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setProfileMessage('New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setProfileMessage('Passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      });

      if (authError) {
        setProfileMessage('Current password is incorrect.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        setProfileMessage(error.message || 'Unable to change password.');
        return;
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      setProfileMessage('Password changed successfully.');
    } catch (err) {
      console.error('Password update failed', err);
      setProfileMessage('Unable to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setProfileMessage('');

    if (!file.type.startsWith('image/')) {
      setProfileMessage('Please select a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage('Image size must be 2MB or less.');
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        setProfileMessage(uploadError.message || 'Failed to upload profile image.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          username: user.username,
          avatar_url: avatarUrl,
          avatar_path: filePath
        }
      });

      if (updateError) {
        setProfileMessage(updateError.message || 'Image uploaded but profile update failed.');
        return;
      }

      const updatedUser = {
        ...user,
        avatarPath: filePath,
        avatarUrl: ''
      };

      const blobAvatarUrl = await getAvatarBlobUrl(filePath);
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }

      if (blobAvatarUrl) {
        avatarObjectUrlRef.current = blobAvatarUrl;
        updatedUser.avatarUrl = blobAvatarUrl;
      }

      const signedUrl = await getSignedAvatarUrl(filePath);
      if (!updatedUser.avatarUrl && signedUrl) {
        updatedUser.avatarUrl = signedUrl;
      } else if (!updatedUser.avatarUrl) {
        updatedUser.avatarUrl = avatarUrl;
        setProfileMessage('Uploaded, but image may not show for private bucket without SELECT policy.');
      }

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfileMessage('');
    } catch (err) {
      console.error('Avatar upload failed', err);
      setProfileMessage('Upload failed. Please try again.');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeMenu === 'user-verification' && user?.role === 'admin') {
      loadVerificationUsers();
    }
  }, [activeMenu, user]);

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  const studentUsers = verificationUsers.filter((entry) => (entry.role || 'student') === 'student');
  const teacherUsers = verificationUsers.filter((entry) => (entry.role || 'student') === 'teacher');

  const renderVerificationCard = (entry) => (
    <div className="verification-card" key={entry.id}>
      <div className="verification-meta">
        <p><strong>Username:</strong> {entry.username || 'N/A'}</p>
        <p><strong>Email:</strong> {entry.email}</p>
        <p>
          <strong>Role:</strong>{' '}
          <span className={`role-pill role-${entry.role || 'student'}`}>
            {(entry.role || 'student').charAt(0).toUpperCase() + (entry.role || 'student').slice(1)}
          </span>
        </p>
      </div>
      <button
        className="btn-action"
        disabled={entry.role === 'admin'}
        onClick={() =>
          updateUserRole(
            entry.id,
            entry.role === 'teacher' ? 'student' : 'teacher'
          )
        }
      >
        {entry.role === 'admin'
          ? 'Admin Account'
          : entry.role === 'teacher'
            ? 'Demote to Student'
            : 'Promote to Teacher'}
      </button>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Sidebar 
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
        onLogout={handleLogout}
        isAdmin={user?.role === 'admin'}
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
            </>
          )}

          {activeMenu === 'poll-request' && (
            <div className="content-section">
              <h2>Poll Reqest</h2>
              {user.role === 'admin' ? (
                <p>Admin can review and verify poll requests in this section.</p>
              ) : (
                <p>Students can submit poll requests here and wait for admin verification.</p>
              )}
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
              <div className="profile-layout">
                <div className="profile-avatar-section">
                  <img
                    className="profile-avatar"
                    src={user.avatarUrl || getDefaultAvatarUrl(user.username || user.email)}
                    alt="Profile"
                    onError={(event) => {
                      event.currentTarget.src = getDefaultAvatarUrl(user.username || user.email);
                    }}
                  />
                  <label className="btn-action profile-upload-btn" htmlFor="profileImageInput">
                    {uploadingAvatar ? 'Uploading...' : 'Upload Profile Image'}
                  </label>
                  <input
                    id="profileImageInput"
                    className="profile-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                  <p className="profile-hint">Allowed file types: image only, max 2MB.</p>
                </div>

                <div className="profile-right-panel">
                  <div className="profile-info-card">
                    <div className="profile-info-row">
                      <span className="profile-info-label">Email:</span>
                      <span className="profile-info-value">{user.email}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">Username:</span>
                      <span className="profile-info-value">{user.username || 'N/A'}</span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">Account Created:</span>
                      <span className="profile-info-value">
                        {user.accountCreated ? new Date(user.accountCreated).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="profile-info-row">
                      <span className="profile-info-label">Role:</span>
                      <span className="profile-info-value">{user.role || 'student'}</span>
                    </div>

                    <button
                      type="button"
                      className="btn-action password-toggle-btn"
                      onClick={() => {
                        setProfileMessage('');
                        setShowPasswordForm((prev) => !prev);
                      }}
                    >
                      Change Password
                    </button>
                  </div>

                  {showPasswordForm && (
                    <form className="password-form" onSubmit={handlePasswordChange}>
                      <h3>Change Password</h3>
                      <div className="password-field-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordInputChange}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="password-field-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordInputChange}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="password-field-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordInputChange}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <div className="password-actions">
                        <button type="submit" className="btn-action" disabled={changingPassword}>
                          {changingPassword ? 'Updating...' : 'Save New Password'}
                        </button>
                        <button
                          type="button"
                          className="btn-action password-cancel-btn"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setProfileMessage('');
                            setPasswordForm({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                          }}
                          disabled={changingPassword}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
              {profileMessage && <p className="profile-message">{profileMessage}</p>}
            </div>
          )}

          {activeMenu === 'user-verification' && (
            <div className="content-section">
              <h2>User Verification</h2>
              {user.role !== 'admin' ? (
                <p>Only admins can access this section.</p>
              ) : loadingVerificationUsers ? (
                <p>Loading users...</p>
              ) : verificationError ? (
                <div className="verification-error">
                  <p><strong>Unable to load users:</strong> {verificationError}</p>
                  <p>Check your `profiles` table RLS SELECT policy for admin access.</p>
                </div>
              ) : verificationUsers.length === 0 ? (
                <p>No users found. Register users first to manage roles.</p>
              ) : (
                <div className="verification-groups">
                  <section className="verification-group">
                    <h3>Students ({studentUsers.length})</h3>
                    {studentUsers.length === 0 ? (
                      <p>No students found.</p>
                    ) : (
                      <div className="verification-list">
                        {studentUsers.map((entry) => renderVerificationCard(entry))}
                      </div>
                    )}
                  </section>

                  <section className="verification-group">
                    <h3>Teachers ({teacherUsers.length})</h3>
                    {teacherUsers.length === 0 ? (
                      <p>No teachers found.</p>
                    ) : (
                      <div className="verification-list">
                        {teacherUsers.map((entry) => renderVerificationCard(entry))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
