import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Button, 
  Card, 
  Input, 
  LoadingSpinner, 
  ToastNotification 
} from '../components/shared';
import { authApi } from '../services/authApi';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '', title: '' });
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Check initial size
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const showToast = useCallback((type, message, title = '') => {
    setToast({ show: true, type, message, title });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = useCallback((field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('error', 'Please fix the errors above', 'Validation Error');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.login(formData.email, formData.password);
      
      // Store token in localStorage
      localStorage.setItem('authToken', data.token);
      
      showToast('success', 'Login successful! Redirecting...', 'Welcome Back');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Login error:', error);
      showToast('error', error.message || 'Failed to login. Please try again.', 'Login Failed');
    } finally {
      setIsLoading(false);
    }
  };

  // User icon
  const UserIcon = () => (
    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  // Lock icon
  const LockIcon = () => (
    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)', // Account for NavBar height
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, white 50%, var(--color-surface-secondary) 100%)'
    }}>
      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: '28rem',
        margin: '0 auto',
        padding: isMobile ? 'var(--spacing-3)' : 'var(--spacing-4)',
        width: '100%'
      }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? 'var(--spacing-4)' : 'var(--spacing-6)',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(1.5rem, 4vw, 2rem)' : 'clamp(1.75rem, 3.5vw, 2.25rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: isMobile ? 'var(--spacing-2)' : 'var(--spacing-3)',
            lineHeight: 1.1
          }}>
            Welcome 
            <span style={{
              background: 'var(--gradient-text)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {' '}Back
            </span>
          </h1>
          <p style={{
            fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4
          }}>
            Sign in to access your AI-powered document summaries and continue your research journey.
          </p>
        </div>

        {/* Login Form */}
        <Card padding="lg" shadow="lg" style={{
          animation: 'slideUp 0.6s ease-out'
        }}>
          <form onSubmit={handleLogin} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)'
          }}>
            {/* Email Field */}
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              required
              leftIcon={<UserIcon />}
              autoComplete="email"
              disabled={isLoading}
            />

            {/* Password Field */}
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              required
              leftIcon={<LockIcon />}
              autoComplete="current-password"
              disabled={isLoading}
            />

            {/* Login Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              className="rounded-full bg-purple !py-2 !px-4"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Register Link */}
            <div style={{
              textAlign: 'center',
              paddingTop: 'var(--spacing-3)',
              borderTop: '1px solid var(--color-border-subtle)'
            }}>
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-2)'
              }}>
                Don't have an account?
              </p>
              <Link 
                to="/register"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  transition: 'color var(--transition-normal)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = 'none';
                }}
              >
                Create your account →
              </Link>
            </div>
          </form>
        </Card>

      </main>

      {/* Toast Notifications */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        position="top-right"
      />
    </div>
  );
};

export default Login;