import React, { useState } from 'react';

const Input = React.forwardRef(({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  onBlur,
  onFocus,
  error = '',
  helperText = '',
  required = false,
  disabled = false,
  readOnly = false,
  size = 'md',
  variant = 'default',
  leftIcon = null,
  rightIcon = null,
  maxLength,
  rows = 4,
  className = '',
  containerClassName = '',
  labelClassName = '',
  id,
  name,
  autoComplete,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const isTextarea = type === 'textarea';
  
  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // Base input styles
  const baseStyles = {
    width: '100%',
    transition: 'all var(--transition-normal)',
    border: '2px solid var(--color-border-subtle)',
    borderRadius: 'var(--radius-lg)',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: 'var(--text-base)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-surface-primary)',
    resize: 'vertical'
  };

  // Size styles
  const sizeStyles = {
    sm: {
      padding: 'var(--spacing-2) var(--spacing-3)',
      fontSize: 'var(--text-sm)',
      minHeight: '36px'
    },
    md: {
      padding: 'var(--spacing-3) var(--spacing-4)',
      fontSize: 'var(--text-base)',
      minHeight: '44px'
    },
    lg: {
      padding: 'var(--spacing-4) var(--spacing-5)',
      fontSize: 'var(--text-lg)',
      minHeight: '52px'
    }
  };

  // Variant styles
  const getVariantStyles = () => {
    if (error) {
      return {
        borderColor: 'var(--color-error)',
        backgroundColor: 'var(--color-error-light)'
      };
    }
    
    if (isFocused) {
      return {
        borderColor: 'var(--color-primary)',
        backgroundColor: 'var(--color-surface-primary)',
        boxShadow: '0 0 0 3px var(--color-primary-light)'
      };
    }
    
    return {
      borderColor: 'var(--color-border-subtle)',
      backgroundColor: 'var(--color-surface-primary)'
    };
  };

  // Icon sizing
  const iconSize = {
    sm: '16px',
    md: '20px', 
    lg: '24px'
  };

  // Combine input styles
  const inputStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...getVariantStyles(),
    paddingLeft: leftIcon ? (size === 'sm' ? '36px' : size === 'lg' ? '48px' : '40px') : sizeStyles[size].padding.split(' ')[1],
    paddingRight: rightIcon ? (size === 'sm' ? '36px' : size === 'lg' ? '48px' : '40px') : sizeStyles[size].padding.split(' ')[1],
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    pointerEvents: disabled ? 'none' : 'auto'
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const InputComponent = isTextarea ? 'textarea' : 'input';

  return (
    <div style={{ position: 'relative' }} className={containerClassName}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-2)'
          }}
          className={labelClassName}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--color-error)', marginLeft: 'var(--spacing-1)' }}>*</span>
          )}
        </label>
      )}
      
      {/* Input container */}
      <div style={{ position: 'relative' }}>
        {/* Left icon */}
        {leftIcon && (
          <div 
            style={{
              position: 'absolute',
              left: 'var(--spacing-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)',
              width: iconSize[size],
              height: iconSize[size],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            {leftIcon}
          </div>
        )}
        
        {/* Input element */}
        <InputComponent
          ref={ref}
          id={inputId}
          name={name}
          type={isTextarea ? undefined : type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          rows={isTextarea ? rows : undefined}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || helperText ? `${inputId}-description` : undefined}
          style={inputStyles}
          className={className}
          {...props}
        />
        
        {/* Right icon */}
        {rightIcon && (
          <div 
            style={{
              position: 'absolute',
              right: 'var(--spacing-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)',
              width: iconSize[size],
              height: iconSize[size],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            {rightIcon}
          </div>
        )}
        
        {/* Character count for textarea with maxLength */}
        {isTextarea && maxLength && (
          <div 
            style={{
              position: 'absolute',
              bottom: 'var(--spacing-2)',
              right: 'var(--spacing-3)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            {value?.length || 0}/{maxLength}
          </div>
        )}
      </div>
      
      {/* Helper text or error message */}
      {(error || helperText) && (
        <div 
          id={`${inputId}-description`}
          style={{
            marginTop: 'var(--spacing-2)',
            fontSize: 'var(--text-sm)',
            color: error ? 'var(--color-error)' : 'var(--color-text-secondary)'
          }}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 