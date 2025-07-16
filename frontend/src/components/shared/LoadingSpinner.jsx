import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'primary',
  text = '', 
  className = '',
  overlay = false,
  fullScreen = false,
  ...props 
}) => {
  const sizeStyles = {
    xs: { width: '12px', height: '12px' },
    sm: { width: '16px', height: '16px' },
    md: { width: '32px', height: '32px' },
    lg: { width: '48px', height: '48px' },
    xl: { width: '64px', height: '64px' },
    '2xl': { width: '80px', height: '80px' }
  };

  const variantStyles = {
    primary: {
      borderColor: 'var(--color-primary-light)',
      borderTopColor: 'var(--color-primary)'
    },
    secondary: {
      borderColor: 'var(--color-border-subtle)',
      borderTopColor: 'var(--color-text-secondary)'
    },
    success: {
      borderColor: 'var(--color-success-light)',
      borderTopColor: 'var(--color-success)'
    },
    warning: {
      borderColor: 'var(--color-warning-light)',
      borderTopColor: 'var(--color-warning)'
    },
    error: {
      borderColor: 'var(--color-error-light)',
      borderTopColor: 'var(--color-error)'
    },
    white: {
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderTopColor: 'white'
    },
    gradient: {
      borderColor: 'transparent'
    }
  };

  const textSizeStyles = {
    xs: { fontSize: 'var(--text-xs)' },
    sm: { fontSize: 'var(--text-sm)' },
    md: { fontSize: 'var(--text-base)' },
    lg: { fontSize: 'var(--text-lg)' },
    xl: { fontSize: 'var(--text-xl)' },
    '2xl': { fontSize: 'var(--text-2xl)' }
  };

  // Gradient spinner (special case)
  const GradientSpinner = ({ size }) => (
    <div style={{ ...sizeStyles[size], animation: 'spin 1s linear infinite' }}>
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: 'var(--gradient-primary)',
        padding: '2px'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: 'white'
        }}></div>
      </div>
    </div>
  );

  // Dots spinner variant
  const DotsSpinner = ({ size, variant }) => {
    const dotSize = {
      xs: { width: '4px', height: '4px' },
      sm: { width: '6px', height: '6px' },
      md: { width: '8px', height: '8px' },
      lg: { width: '12px', height: '12px' },
      xl: { width: '16px', height: '16px' },
      '2xl': { width: '20px', height: '20px' }
    };

    const dotColors = {
      primary: { backgroundColor: 'var(--color-primary)' },
      secondary: { backgroundColor: 'var(--color-text-secondary)' },
      success: { backgroundColor: 'var(--color-success)' },
      warning: { backgroundColor: 'var(--color-warning)' },
      error: { backgroundColor: 'var(--color-error)' },
      white: { backgroundColor: 'white' }
    };

    return (
      <div style={{ display: 'flex', gap: 'var(--spacing-1)' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              ...dotSize[size],
              ...dotColors[variant],
              borderRadius: '50%',
              animation: 'pulse 1s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    );
  };

  // Pulse spinner variant
  const PulseSpinner = ({ size, variant }) => {
    const pulseColors = {
      primary: { backgroundColor: 'var(--color-primary)' },
      secondary: { backgroundColor: 'var(--color-text-secondary)' },
      success: { backgroundColor: 'var(--color-success)' },
      warning: { backgroundColor: 'var(--color-warning)' },
      error: { backgroundColor: 'var(--color-error)' },
      white: { backgroundColor: 'white' }
    };

    return (
      <div style={{
        ...sizeStyles[size],
        ...pulseColors[variant],
        borderRadius: '50%',
        animation: 'pulse 1s ease-in-out infinite'
      }} />
    );
  };

  const SpinnerComponent = () => {
    if (variant === 'gradient') {
      return <GradientSpinner size={size} />;
    } else if (variant === 'dots') {
      return <DotsSpinner size={size} variant="primary" />;
    } else if (variant === 'pulse') {
      return <PulseSpinner size={size} variant="primary" />;
    } else {
      return (
        <div 
          style={{
            ...sizeStyles[size],
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            border: '2px solid',
            ...variantStyles[variant]
          }}
        />
      );
    }
  };

  const content = (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-3)'
      }}
      className={className} 
      {...props}
    >
      <SpinnerComponent />
      {text && (
        <p style={{
          ...textSizeStyles[size],
          color: 'var(--color-text-secondary)',
          fontWeight: 'var(--font-weight-medium)',
          animation: 'pulse 1s ease-in-out infinite'
        }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(4px)'
      }}>
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(4px)',
        borderRadius: 'var(--radius-lg)'
      }}>
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner; 