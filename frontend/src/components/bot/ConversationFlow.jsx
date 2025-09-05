import React from 'react';
import { motion } from 'framer-motion';

const ConversationFlow = ({ messages }) => {
  // Filter messages to show conversation flow
  const conversationMessages = messages.filter(msg => msg.type === 'user' || msg.type === 'bot');
  
  if (conversationMessages.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-surface-secondary)',
        borderBottom: '1px solid var(--color-border-subtle)',
        padding: 'var(--spacing-3) var(--spacing-4)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-secondary)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        overflowX: 'auto',
        paddingBottom: 'var(--spacing-1)'
      }}>
        <span style={{ 
          fontWeight: 'var(--font-weight-medium)',
          whiteSpace: 'nowrap'
        }}>
          Conversation Flow:
        </span>
        
        {conversationMessages.slice(-6).map((msg, index, array) => {
          const isLast = index === array.length - 1;
          const isBot = msg.type === 'bot';
          
          return (
            <React.Fragment key={msg.id}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1)',
                  padding: 'var(--spacing-1) var(--spacing-2)',
                  borderRadius: 'var(--radius-md)',
                  background: isBot 
                    ? (msg.wasContinuation 
                        ? 'var(--color-success-100)' 
                        : 'var(--color-primary-100)')
                    : 'var(--color-neutral-100)',
                  border: `1px solid ${isBot 
                    ? (msg.wasContinuation 
                        ? 'var(--color-success-200)' 
                        : 'var(--color-primary-200)')
                    : 'var(--color-neutral-200)'}`,
                  whiteSpace: 'nowrap',
                  maxWidth: '150px'
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: 'var(--radius-full)',
                  background: isBot 
                    ? (msg.wasContinuation 
                        ? 'var(--color-success)' 
                        : 'var(--color-primary)')
                    : 'var(--color-neutral-400)',
                  flexShrink: 0
                }} />
                
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: 'var(--text-xs)'
                }}>
                  {isBot 
                    ? (msg.wasContinuation ? '🔗 Context' : '✨ New')
                    : msg.content.substring(0, 20) + (msg.content.length > 20 ? '...' : '')
                  }
                </span>
              </motion.div>
              
              {!isLast && (
                <div style={{
                  width: '16px',
                  height: '1px',
                  background: 'var(--color-border-subtle)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    right: '-2px',
                    top: '-2px',
                    width: '0',
                    height: '0',
                    borderLeft: '4px solid var(--color-border-subtle)',
                    borderTop: '2px solid transparent',
                    borderBottom: '2px solid transparent'
                  }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
        
        {conversationMessages.length > 6 && (
          <span style={{
            opacity: 0.6,
            fontStyle: 'italic',
            whiteSpace: 'nowrap'
          }}>
            +{conversationMessages.length - 6} more
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default ConversationFlow;
