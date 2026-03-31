import React, { useState } from 'react';
import './Auth.css';
import { supabase } from '../../config/supabaseClient';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (loginError) {
        setError(loginError.message || 'Login failed');
        return;
      }

      // Save user data to localStorage
      const username = authData.user.user_metadata?.username || authData.user.email.split('@')[0];
      const profileRole = authData.user.user_metadata?.role || 'student';

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();

      const role = profileData?.role || profileRole;

      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: authData.user.email,
        username,
        role,
        created_at: authData.user.created_at || new Date().toISOString()
      });

      localStorage.setItem('token', authData.session.access_token);
      localStorage.setItem('user', JSON.stringify({
        userId: authData.user.id,
        username: username,
        email: authData.user.email,
        role,
        accountCreated: authData.user.created_at || ''
      }));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login request failed', err);
      setError('Network error. Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
