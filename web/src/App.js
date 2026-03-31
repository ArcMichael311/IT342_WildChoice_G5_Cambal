import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabaseClient';
import Login from './components/Authentication/Login';
import Register from './components/Authentication/Register';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const ensureDefaultAdmin = async (currentSession) => {
      if (currentSession) {
        return;
      }

      if (localStorage.getItem('default_admin_seed_done') === '1') {
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: 'cit.admin@cit.edu',
          password: 'Cit.123456',
          options: {
            data: {
              username: 'Cit Admin',
              role: 'admin'
            }
          }
        });

        if (error) {
          const message = (error.message || '').toLowerCase();
          if (!message.includes('already registered') && !message.includes('already exists')) {
            console.warn('Default admin seeding skipped:', error.message);
          }
        }

        if (data?.user?.id) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: 'cit.admin@cit.edu',
            username: 'Cit Admin',
            role: 'admin',
            created_at: data.user.created_at || new Date().toISOString()
          });
        }

        if (data?.session) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.warn('Default admin seeding failed:', error);
      } finally {
        localStorage.setItem('default_admin_seed_done', '1');
      }
    };

    // Check if user has an active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await ensureDefaultAdmin(session);
        setSession(session);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setInitialized(true);
      }
    };

    checkSession();

    // Listen for auth changes (logout, login, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Show nothing until we've checked the session once
  if (!initialized) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
