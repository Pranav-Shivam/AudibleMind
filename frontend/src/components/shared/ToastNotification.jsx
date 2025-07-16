import React, { useEffect, useState } from 'react';

const ToastNotification = ({ 
  type = 'info', 
  message = '', 
  title = '',
  duration = 5000, 
  onClose = () => {}, 
  show = false,
  position = 'top-right',
  variant = 'default',
  icon = null,
  actions = null,
  persistent = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);
      
      if (!persistent) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [show, duration, persistent]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Match animation duration
  };

  // Position styles
  const positionStyles = {
    'top-right': { top: 'var(--spacing-4)', right: 'var(--spacing-4)' },
    'top-left': { top: 'var(--spacing-4)', left: 'var(--spacing-4)' }, 
    'top-center': { top: 'var(--spacing-4)', left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: 'var(--spacing-4)', right: 'var(--spacing-4)' },
    'bottom-left': { bottom: 'var(--spacing-4)', left: 'var(--spacing-4)' },
    'bottom-center': { bottom: 'var(--spacing-4)', left: '50%', transform: 'translateX(-50%)' }
  };

  // Animation styles based on position
  const getAnimationStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s ease-out',
      transform: isExiting ? 'scale(0.95)' : 'scale(1)',
      opacity: isExiting ? 0 : 1
    };
    
    if (position.includes('right')) {
      return {
        ...baseStyles,
        transform: isExiting ? 'translateX(100%) scale(0.95)' : 'translateX(0) scale(1)'
      };
    } else if (position.includes('left')) {
      return {
        ...baseStyles,
        transform: isExiting ? 'translateX(-100%) scale(0.95)' : 'translateX(0) scale(1)'
      };
    } else if (position.includes('top')) {
      return {
        ...baseStyles,
        transform: isExiting ? 'translateY(-100%) scale(0.95)' : 'translateY(0) scale(1)'
      };
    } else {
      return {
        ...baseStyles,
        transform: isExiting ? 'translateY(100%) scale(0.95)' : 'translateY(0) scale(1)'
      };
    }
  };

  // Variant styles
  const variantStyles = {
    default: {
      success: {
        backgroundColor: 'var(--color-surface-primary)',
        borderLeft: '4px solid var(--color-success)',
        boxShadow: 'var(--shadow-lg)'
      },
      error: {
        backgroundColor: 'var(--color-surface-primary)',
        borderLeft: '4px solid var(--color-error)',
        boxShadow: 'var(--shadow-lg)'
      }, 
      warning: {
        backgroundColor: 'var(--color-surface-primary)',
        borderLeft: '4px solid var(--color-warning)',
        boxShadow: 'var(--shadow-lg)'
      },
      info: {
        backgroundColor: 'var(--color-surface-primary)',
        borderLeft: '4px solid var(--color-primary)',
        boxShadow: 'var(--shadow-lg)'
      }
    },
    filled: {
      success: {
        backgroundColor: 'var(--color-success)',
        color: 'white',
        boxShadow: 'var(--shadow-lg)'
      },
      error: {
        backgroundColor: 'var(--color-error)',
        color: 'white',
        boxShadow: 'var(--shadow-lg)'
      },
      warning: {
        backgroundColor: 'var(--color-warning)',
        color: 'white',
        boxShadow: 'var(--shadow-lg)'
      }, 
      info: {
        backgroundColor: 'var(--color-primary)',
        color: 'white',
        boxShadow: 'var(--shadow-lg)'
      }
    },
    minimal: {
      success: {
        backgroundColor: 'var(--color-success-light)',
        border: '1px solid var(--color-success)',
        color: 'var(--color-success-dark)'
      },
      error: {
        backgroundColor: 'var(--color-error-light)',
        border: '1px solid var(--color-error)',
        color: 'var(--color-error-dark)'
      },
      warning: {
        backgroundColor: 'var(--color-warning-light)',
        border: '1px solid var(--color-warning)',
        color: 'var(--color-warning-dark)'
      },
      info: {
        backgroundColor: 'var(--color-primary-subtle)',
        border: '1px solid var(--color-primary)',
        color: 'var(--color-primary-dark)'
      }
    },
    glass: {
      success: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        color: 'var(--color-success-dark)'
      },
      error: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: 'var(--color-error-dark)'
      },
      warning: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        color: 'var(--color-warning-dark)'
      },
      info: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        color: 'var(--color-primary-dark)'
      }
    }
  };

  // Default icons for each type
  const defaultIcons = {
    success: (
      <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  };

  // Icon color styles
  const iconColorStyles = {
    default: {
      success: { color: 'var(--color-success)' },
      error: { color: 'var(--color-error)' },
      warning: { color: 'var(--color-warning)' },
      info: { color: 'var(--color-primary)' }
    },
    filled: {
      success: { color: 'white' },
      error: { color: 'white' },
      warning: { color: 'white' },
      info: { color: 'white' }
    },
    minimal: {
      success: { color: 'var(--color-success-dark)' },
      error: { color: 'var(--color-error-dark)' },
      warning: { color: 'var(--color-warning-dark)' },
      info: { color: 'var(--color-primary-dark)' }
    },
    glass: {
      success: { color: 'var(--color-success-dark)' },
      error: { color: 'var(--color-error-dark)' },
      warning: { color: 'var(--color-warning-dark)' },
      info: { color: 'var(--color-primary-dark)' }
    }
  };

  if (!show && !isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        zIndex: 9999,
        maxWidth: '24rem',
        width: '100%',
        pointerEvents: 'auto',
        ...positionStyles[position]
      }}
    >
      <div 
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-4)',
          position: 'relative',
          ...variantStyles[variant][type],
          ...getAnimationStyles()
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Icon */}
          <div style={{
            flexShrink: 0,
            marginRight: 'var(--spacing-3)',
            ...iconColorStyles[variant][type]
          }}>
            {icon || defaultIcons[type]}
          </div>
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <h4 style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-1)',
                color: variant === 'filled' ? 'white' : 'inherit'
              }}>
                {title}
              </h4>
            )}
            <p style={{
              fontSize: 'var(--text-sm)',
              lineHeight: 1.25,
              color: variant === 'filled' ? 'white' : 'var(--color-text-secondary)'
            }}>
              {message}
            </p>
            
            {/* Actions */}
            {actions && (
              <div style={{
                marginTop: 'var(--spacing-3)',
                display: 'flex',
                gap: 'var(--spacing-2)'
              }}>
                {actions}
              </div>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              marginLeft: 'var(--spacing-4)',
              display: 'inline-flex',
              flexShrink: 0,
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              transition: 'all var(--transition-normal)',
              outline: 'none',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: variant === 'filled' ? 'white' : 'var(--color-text-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = variant === 'filled' ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-secondary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Progress bar for non-persistent toasts */}
        {!persistent && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderBottomLeftRadius: 'var(--radius-lg)',
            borderBottomRightRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}>
            <div 
              style={{
                height: '100%',
                transition: 'width ease-linear',
                backgroundColor: variant === 'filled' ? 'rgba(255,255,255,0.3)' : 'currentColor',
                opacity: variant === 'filled' ? 1 : 0.2,
                width: isExiting ? '0%' : '100%',
                transitionDuration: `${duration}ms`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ToastNotification; 