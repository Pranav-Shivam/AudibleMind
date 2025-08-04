import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChunksPage from './pages/ChunksPage';
import SummaryPage from './pages/SummaryPage';
import Chat from './components/Chat';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ChunksViewer from './components/ChunksViewer';
import ProtectedRoute from './components/ProtectedRoute';
import { NavBar } from './components/shared';
import { authApi } from './services/authApi';
import { ConfigProvider, App as AntdApp, theme } from 'antd'
import enUS from 'antd/locale/en_US'
import { antdCompatibilityConfig } from './config/antd-compatibility'
import './App.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = determined

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      const token = localStorage.getItem('authToken');
      
      // Call logout API if token exists
      if (token) {
        try {
          await authApi.logout(token);
          console.log('Server logout successful');
        } catch (error) {
          // Even if API logout fails, we still proceed with local logout
          console.warn('Server logout failed, proceeding with local logout:', error);
        }
      }
      
      // Clear local storage
      localStorage.removeItem('authToken');
      console.log('Token removed from localStorage');
      
      // Update authentication state
      setIsAuthenticated(false);
      console.log('Authentication state set to false');
      
      // Force page reload to clear all state
      setTimeout(() => {
        console.log('Reloading page to complete logout');
        window.location.href = '/login';
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, force logout locally
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  };

  // Detect system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check authentication status on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const isValid = await authApi.verifyToken(token);
        setIsAuthenticated(isValid);
        if (!isValid) {
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    };

    checkAuthStatus();
  }, []);

  // Create theme configuration based on dark mode
  const themeConfig = {
    ...antdCompatibilityConfig,
    theme: {
      ...antdCompatibilityConfig.theme,
      algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    },
  };

  return (
    <ConfigProvider
      locale={enUS}
      {...themeConfig}
    >
      <AntdApp>
        <ErrorBoundary>
          <Router>
            <div className="App">
              {/* Navigation Bar - shown on all pages */}
              <NavBar 
                isAuthenticated={isAuthenticated === true} 
                onLogout={handleLogout}
              />
              
              {/* Main Content */}
              <Routes>
                {/* Root route - redirect based on auth status */}
                <Route path="/" element={
                  isAuthenticated === null ? (
                    <div style={{
                      height: 'calc(100vh - 64px)', // Account for NavBar height
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, white 50%, var(--color-surface-secondary) 100%)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'var(--gradient-primary)',
                          borderRadius: 'var(--radius-lg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto var(--spacing-4)',
                          animation: 'pulse 2s infinite'
                        }}>
                          <span style={{ color: 'white', fontSize: 'var(--text-xl)' }}>📄</span>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
                      </div>
                    </div>
                  ) : isAuthenticated === true ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } />

                {/* Public routes */}
                <Route path="/landing" element={
                  <ErrorBoundary>
                    <LandingPage />
                  </ErrorBoundary>
                } />
                <Route path="/login" element={
                  <ErrorBoundary>
                    <Login />
                  </ErrorBoundary>
                } />
                <Route path="/register" element={
                  <ErrorBoundary>
                    <Register />
                  </ErrorBoundary>
                } />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/chunks/:documentId" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <ChunksViewer />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/summary/:documentId" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <SummaryPage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/chat" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                
                {/* Fallback route - redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </Router>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
