// Ant Design React 19 Compatibility Configuration
// This file contains settings to resolve compatibility warnings between Ant Design v5 and React 19

export const antdCompatibilityConfig = {
  // Theme configuration for React 19 compatibility
  theme: {
    token: {
      // Custom theme tokens that work well with React 19
      borderRadius: 6,
      colorPrimary: '#6366f1',
      colorSuccess: '#22c55e',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#6366f1',
    },
    // Enable React 19 compatibility features
    hashed: true,
  },
  
  // Global component configuration
  componentSize: "middle",
  space: { size: 'middle' },
  
  // Button configuration using new format (instead of deprecated autoInsertSpaceInButton)
  button: {
    autoInsertSpace: false,
  },
  
  // Enable modern React features
  virtual: false,
  
  // React 19 specific compatibility settings
  suppressHydrationWarning: true,
  legacy: false,
  
  // Fix for React 19 compatibility warnings
  wave: {
    disabled: false,
  },
  
  // Disable legacy features that cause warnings
  autoInsertSpaceInButton: false,
  
  // Use modern CSS-in-JS approach
  cssVar: true,
  
  // Disable deprecated features
  motion: true,
};

// CSS import configuration
export const cssConfig = {
  // For Ant Design v5, we don't need to import reset.css manually
  // The theme system handles this automatically
  importResetCSS: false,
  
  // Use CSS-in-JS for better React 19 compatibility
  useCSSInJS: true,
};

// Component-specific compatibility settings
export const componentConfig = {
  // Table component settings
  table: {
    // Disable virtual scrolling for better React 19 compatibility
    virtual: false,
    // Use modern scroll behavior
    scroll: { x: true, y: true },
  },
  
  // Form component settings
  form: {
    // Use modern form validation
    validateTrigger: ['onChange', 'onBlur'],
  },
  
  // Modal component settings
  modal: {
    // Use modern modal behavior
    destroyOnClose: true,
    maskClosable: true,
  },
  
  // Message component settings for React 19
  message: {
    // Use App component context instead of static methods
    useApp: true,
  },
};

export default {
  antdCompatibilityConfig,
  cssConfig,
  componentConfig,
}; 