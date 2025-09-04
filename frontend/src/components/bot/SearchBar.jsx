import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

const SearchBar = ({ searchQuery, setSearchQuery, onClose }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: 'var(--spacing-4) var(--spacing-6)',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)'
      }}
    >
      <div style={{
        position: 'relative',
        flex: 1
      }}>
        <Search 
          size={18} 
          style={{
            position: 'absolute',
            left: 'var(--spacing-3)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none'
          }}
        />
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search conversations, messages, or tags..."
          style={{
            width: '100%',
            padding: 'var(--spacing-2) var(--spacing-3) var(--spacing-2) var(--spacing-10)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface-secondary)',
            outline: 'none',
            transition: 'all var(--transition-fast)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-primary)';
            e.target.style.boxShadow = '0 0 0 3px var(--color-primary-light)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border-subtle)';
            e.target.style.boxShadow = 'none';
          }}
        />
        
        {searchQuery && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: 'var(--spacing-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              padding: 'var(--spacing-1)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={14} />
          </motion.button>
        )}
      </div>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 'var(--spacing-2)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-secondary)',
          transition: 'all var(--transition-fast)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        className="search-close-button"
      >
        <X size={18} />
      </motion.button>
    </motion.div>
  );
};

export default SearchBar;
