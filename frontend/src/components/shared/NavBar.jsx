import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './index';

const NavBar = ({ isAuthenticated = false, onLogout }) => {
  const location = useLocation();

  const handleLogout = async () => {
    console.log('NavBar logout clicked');
    if (onLogout) {
      try {
        await onLogout();
        console.log('Logout completed');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  const isCurrentPage = (path) => {
    return location.pathname === path;
  };

  // If user is on protected routes, they must be authenticated
  const protectedRoutes = ['/dashboard', '/chat', '/chunks', '/summary'];
  const isOnProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));
  const userIsAuthenticated = isAuthenticated || isOnProtectedRoute;



  return (
    <header style={{
      flexShrink: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-sm)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '0 var(--spacing-4)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}>
          {/* Logo and Branding */}
          <Link 
            to={isAuthenticated ? "/dashboard" : "/login"} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)',
              textDecoration: 'none'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--gradient-primary)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                color: 'white',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-bold)'
              }}>📄</span>
            </div>
            <div>
              <h1 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                margin: 0,
                lineHeight: 1
              }}>AudibleMind</h1>
              <p style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                lineHeight: 1
              }}>Turning Research into Resonance</p>
            </div>
          </Link>

          {/* Right Side - Authentication Actions Only */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)'
          }}>
            {userIsAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Logout button clicked!');
                  handleLogout();
                }}
              >
                Logout
              </Button>
            ) : (
              !isCurrentPage('/register') && (
                <Link to="/register">
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    Sign Up
                  </Button>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavBar;