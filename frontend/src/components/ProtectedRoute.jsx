import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/authApi';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = determined

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.log('ProtectedRoute: No token found, redirecting to login');
        setIsAuthenticated(false);
        return;
      }

      try {
        const isValid = await authApi.verifyToken(token);
        console.log('ProtectedRoute: Token verification result:', isValid);
        setIsAuthenticated(isValid);
        if (!isValid) {
          localStorage.removeItem('authToken');
          console.log('ProtectedRoute: Invalid token removed, redirecting to login');
        }
      } catch (error) {
        console.error('ProtectedRoute: Token verification failed:', error);
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    };

    checkAuth();
    
    // Listen for storage changes (like logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && !e.newValue) {
        console.log('ProtectedRoute: Token removed from storage, logging out');
        setIsAuthenticated(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isAuthenticated === null) {
    // Show loading state while checking authentication
    return (
      <div style={{
        height: 'calc(100vh - 64px)', // Account for NavBar
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
            <span style={{ color: 'white', fontSize: 'var(--text-xl)' }}>🔒</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;