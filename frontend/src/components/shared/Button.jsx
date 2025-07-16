import React from 'react';

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  
  // Base button styles
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'var(--font-weight-semibold)',
    transition: 'all var(--transition-normal)',
    outline: 'none',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--text-base)',
    gap: 'var(--spacing-2)',
    textDecoration: 'none'
  };

  // Size variants
  const sizeStyles = {
    xs: {
      padding: 'var(--spacing-1) var(--spacing-3)',
      fontSize: 'var(--text-xs)',
      borderRadius: 'var(--radius-md)',
      gap: 'var(--spacing-1)'
    },
    sm: {
      padding: 'var(--spacing-2) var(--spacing-4)',
      fontSize: 'var(--text-sm)',
      borderRadius: 'var(--radius-md)',
      gap: 'var(--spacing-1)'
    },
    md: {
      padding: 'var(--spacing-2) var(--spacing-6)',
      fontSize: 'var(--text-base)',
      borderRadius: 'var(--radius-lg)',
      gap: 'var(--spacing-2)'
    },
    lg: {
      padding: 'var(--spacing-3) var(--spacing-8)',
      fontSize: 'var(--text-lg)',
      borderRadius: 'var(--radius-lg)',
      gap: 'var(--spacing-2)'
    },
    xl: {
      padding: 'var(--spacing-4) var(--spacing-10)',
      fontSize: 'var(--text-xl)',
      borderRadius: 'var(--radius-xl)',
      gap: 'var(--spacing-3)'
    }
  };

  // Variant styles
  const variantStyles = {
    primary: {
      background: 'var(--gradient-primary)',
      color: 'white',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-md)'
    },
    
    secondary: {
      background: 'white',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)'
    },
    
    success: {
      background: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%)',
      color: 'white',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-md)'
    },
    
    warning: {
      background: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-dark) 100%)',
      color: 'white',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-md)'
    },
    
    error: {
      background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-dark) 100%)',
      color: 'white',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-md)'
    },
    
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1px solid transparent'
    },
    
    outline: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '2px solid var(--color-primary)'
    },
    
    glass: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)'
    }
  };

  // Loading spinner component
  const LoadingSpinner = ({ size }) => {
    const spinnerSize = {
      xs: '12px',
      sm: '16px', 
      md: '20px',
      lg: '24px',
      xl: '28px'
    };

    return (
      <div 
        style={{
          width: spinnerSize[size],
          height: spinnerSize[size],
          border: '2px solid currentColor',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
    );
  };

  // Combine all styles
  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || loading ? 0.6 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    pointerEvents: disabled || loading ? 'none' : 'auto'
  };

  // Hover and focus styles
  const handleMouseEnter = (e) => {
    if (!disabled && !loading) {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = 'var(--shadow-lg)';
    }
  };

  const handleMouseLeave = (e) => {
    if (!disabled && !loading) {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = variantStyles[variant].boxShadow || 'none';
    }
  };

  const handleFocus = (e) => {
    e.target.style.outline = '2px solid var(--color-primary)';
    e.target.style.outlineOffset = '2px';
  };

  const handleBlur = (e) => {
    e.target.style.outline = 'none';
  };

  return (
    <button
      ref={ref}
      type={type}
      style={combinedStyles}
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {/* Shimmer effect for loading state */}
      {loading && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: 'shimmer 2s linear infinite'
          }}
        />
      )}
      
      {/* Left icon or loading spinner */}
      {loading ? (
        <LoadingSpinner size={size} />
      ) : leftIcon ? (
        <span style={{ flexShrink: 0 }}>{leftIcon}</span>
      ) : null}
      
      {/* Button content */}
      <span style={{ opacity: loading ? 0.7 : 1 }}>{children}</span>
      
      {/* Right icon */}
      {rightIcon && !loading && (
        <span style={{ flexShrink: 0 }}>{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button; 