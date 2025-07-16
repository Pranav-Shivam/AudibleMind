import React from 'react';

const Card = React.forwardRef(({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  rounded = 'lg',
  interactive = false,
  hover = false,
  className = '',
  onClick,
  ...props
}, ref) => {
  
  // Base card styles
  const baseStyles = {
    background: 'var(--color-surface-primary)',
    border: '1px solid var(--color-border-subtle)',
    transition: 'all var(--transition-normal)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)'
  };

  // Variant styles
  const variantStyles = {
    default: {
      background: 'var(--color-surface-primary)',
      border: '1px solid var(--color-border-subtle)'
    },
    elevated: {
      background: 'var(--color-surface-primary)',
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-lg)'
    },
    outlined: {
      background: 'var(--color-surface-primary)',
      border: '1px solid var(--color-border)'
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)'
    },
    gradient: {
      background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
      border: '1px solid var(--color-border-subtle)'
    }
  };

  // Padding styles
  const paddingStyles = {
    none: { padding: 0 },
    xs: { padding: 'var(--spacing-3)' },
    sm: { padding: 'var(--spacing-4)' },
    md: { padding: 'var(--spacing-6)' },
    lg: { padding: 'var(--spacing-8)' },
    xl: { padding: 'var(--spacing-10)' }
  };

  // Shadow styles
  const shadowStyles = {
    none: { boxShadow: 'none' },
    xs: { boxShadow: 'var(--shadow-sm)' },
    sm: { boxShadow: 'var(--shadow-sm)' },
    md: { boxShadow: 'var(--shadow-md)' },
    lg: { boxShadow: 'var(--shadow-lg)' },
    xl: { boxShadow: 'var(--shadow-xl)' },
    '2xl': { boxShadow: 'var(--shadow-2xl)' }
  };

  // Rounded styles
  const roundedStyles = {
    none: { borderRadius: 0 },
    sm: { borderRadius: 'var(--radius-sm)' },
    md: { borderRadius: 'var(--radius-md)' },
    lg: { borderRadius: 'var(--radius-lg)' },
    xl: { borderRadius: 'var(--radius-xl)' },
    '2xl': { borderRadius: 'var(--radius-2xl)' },
    '3xl': { borderRadius: 'var(--radius-2xl)' },
    full: { borderRadius: 'var(--radius-full)' }
  };

  // Combine all styles
  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...paddingStyles[padding],
    ...shadowStyles[shadow],
    ...roundedStyles[rounded],
    cursor: (interactive || onClick) ? 'pointer' : 'default'
  };

  // Hover and interactive styles
  const handleMouseEnter = (e) => {
    if (interactive || onClick || hover) {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = 'var(--shadow-lg)';
    }
  };

  const handleMouseLeave = (e) => {
    if (interactive || onClick || hover) {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = shadowStyles[shadow].boxShadow;
    }
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      ref={ref}
      style={combinedStyles}
      className={className}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

// Card subcomponents
const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div 
      style={{
        paddingBottom: 'var(--spacing-4)',
        borderBottom: '1px solid var(--color-border-subtle)'
      }}
      className={className} 
      {...props}
    >
      {children}
    </div>
  );
};

const CardBody = ({ children, className = '', ...props }) => {
  return (
    <div 
      style={{
        padding: 'var(--spacing-4) 0'
      }}
      className={className} 
      {...props}
    >
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div 
      style={{
        paddingTop: 'var(--spacing-4)',
        borderTop: '1px solid var(--color-border-subtle)'
      }}
      className={className} 
      {...props}
    >
      {children}
    </div>
  );
};

const CardTitle = ({ children, className = '', level = 2, ...props }) => {
  const Component = `h${level}`;
  const sizeStyles = {
    1: { fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)' },
    2: { fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-semibold)' },
    3: { fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-semibold)' },
    4: { fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' },
    5: { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' },
    6: { fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }
  };

  return (
    <Component 
      style={{
        color: 'var(--color-text-primary)',
        ...sizeStyles[level]
      }}
      className={className} 
      {...props}
    >
      {children}
    </Component>
  );
};

const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p 
      style={{
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.6
      }}
      className={className} 
      {...props}
    >
      {children}
    </p>
  );
};

// Attach subcomponents to Card
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Title = CardTitle;
Card.Description = CardDescription;

export default Card; 