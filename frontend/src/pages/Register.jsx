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

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

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

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

    // Also clear confirmPassword error if password changes
    if (field === 'password' && errors.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: ''
      }));
    }
  }, [errors]);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('error', 'Please fix the errors above', 'Validation Error');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register({
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password
      });

      showToast('success', 'Account created successfully! Redirecting to login...', 'Welcome to AudibleMind');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      showToast('error', error.message || 'Failed to create account. Please try again.', 'Registration Failed');
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

  // Email icon
  const EmailIcon = () => (
    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  // Lock icon
  const LockIcon = () => (
    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  // Shield check icon
  const ShieldCheckIcon = () => (
    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
            Create Your 
            <span style={{
              background: 'var(--gradient-text)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {' '}Account
            </span>
          </h1>
          <p style={{
            fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4
          }}>
            Join researchers and professionals transforming their document workflows with AI.
          </p>
        </div>

        {/* Registration Form */}
        <Card padding="lg" shadow="lg" style={{
          animation: 'slideUp 0.6s ease-out'
        }}>
          <form onSubmit={handleRegister} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)'
          }}>
            {/* Name Field */}
            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={errors.name}
              required
              leftIcon={<UserIcon />}
              autoComplete="name"
              disabled={isLoading}
            />

            {/* Email Field */}
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              required
              leftIcon={<EmailIcon />}
              autoComplete="email"
              disabled={isLoading}
            />

            {/* Password Field */}
            <Input
              label="Password"
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              required
              leftIcon={<LockIcon />}
              autoComplete="new-password"
              disabled={isLoading}
            />

            {/* Confirm Password Field */}
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              required
              leftIcon={<ShieldCheckIcon />}
              autoComplete="new-password"
              disabled={isLoading}
            />

            {/* Register Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              className="rounded-full bg-purple !py-2 !px-4"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Login Link */}
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
                Already have an account?
              </p>
              <Link 
                to="/login"
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
                Sign in to your account →
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

export default Register;