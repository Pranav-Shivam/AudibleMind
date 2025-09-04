import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ThumbsUp, ThumbsDown, MoreVertical, Bot, User, Star } from 'lucide-react';
import { Button, LoadingSpinner } from '../shared';

const ChatPanel = ({ messages, isLoading, error, currentThread, selectedResponseIndex, onResponseSelect, onMarkPreferred, onRetryMessage, onEditMessage, onDeleteMessage, onCopyMessage }) => {
  const messagesEndRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  // Removed hoveredMessageId state to prevent UI fluctuation

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Removed hover timeout cleanup - no longer needed

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const MessageBubble = React.memo(({ message, isBot = false }) => {
    // Use message-specific selected response or fall back to global index
    const messageSelectedIndex = message.selectedResponse !== undefined ? message.selectedResponse : selectedResponseIndex;
    const displayContent = useMemo(() => 
      message.content || 
      (message.responses && message.responses[messageSelectedIndex]?.content) || '', 
      [message.content, message.responses, messageSelectedIndex]
    );

    // Memoize handlers to prevent unnecessary re-renders with defensive programming
    const handleResponseClick = useCallback((index) => {
      if (typeof index === 'number' && index >= 0 && onResponseSelect) {
        onResponseSelect(index, message.id);
      }
    }, [onResponseSelect, message.id]);

    const handlePreferredClick = useCallback((responseId) => {
      if (responseId && onMarkPreferred) {
        onMarkPreferred(responseId, message.id);
      }
    }, [onMarkPreferred, message.id]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="message-bubble message-container"
        style={{
          display: 'flex',
          justifyContent: isBot ? 'flex-start' : 'flex-end',
          marginBottom: 'var(--spacing-4)'
        }}
      >
        <div style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: isBot ? 'row' : 'row-reverse',
          alignItems: 'flex-start',
          gap: 'var(--spacing-3)'
        }}>
          {/* Enhanced Avatar */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: isBot 
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                : 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'white',
              fontSize: 'var(--text-base)',
              boxShadow: 'var(--shadow-sm)',
              border: '2px solid var(--color-surface-primary)'
            }}
          >
            {isBot ? <Bot size={20} /> : <User size={20} />}
          </motion.div>

          {/* Enhanced Message Container */}
          <div style={{
            position: 'relative',
            maxWidth: '100%'
          }}>
            {/* Message Bubble */}
            <div
              className="message-bubble-content"
              style={{
                background: isBot 
                  ? 'var(--color-surface-primary)'
                  : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                color: isBot ? 'var(--color-text-primary)' : 'white',
                padding: 'var(--spacing-4)',
                borderRadius: isBot
                  ? 'var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)'
                  : 'var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl)',
                boxShadow: 'var(--shadow-md)',
                border: isBot ? '1px solid var(--color-border-subtle)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Message Content with Markdown Support */}
              <div style={{
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
                wordBreak: 'break-word'
              }}>
                {isBot ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p style={{ 
                          margin: '0 0 var(--spacing-2) 0',
                          fontSize: 'var(--text-sm)',
                          lineHeight: 1.6
                        }}>
                          {children}
                        </p>
                      ),
                      code: ({ inline, children }) => (
                        <code style={{
                          background: inline ? 'rgba(0,0,0,0.1)' : 'var(--color-surface-secondary)',
                          padding: inline ? '2px 4px' : 'var(--spacing-2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'Monaco, Consolas, monospace',
                          display: inline ? 'inline' : 'block',
                          margin: inline ? '0' : 'var(--spacing-2) 0'
                        }}>
                          {children}
                        </code>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ 
                          margin: 'var(--spacing-2) 0',
                          paddingLeft: 'var(--spacing-4)'
                        }}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ 
                          margin: 'var(--spacing-2) 0',
                          paddingLeft: 'var(--spacing-4)'
                        }}>
                          {children}
                        </ol>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote style={{
                          borderLeft: '3px solid var(--color-primary)',
                          paddingLeft: 'var(--spacing-3)',
                          margin: 'var(--spacing-2) 0',
                          fontStyle: 'italic',
                          opacity: 0.9
                        }}>
                          {children}
                        </blockquote>
                      ),
                      h1: ({ children }) => (
                        <h1 style={{ 
                          fontSize: 'var(--text-lg)',
                          fontWeight: 'var(--font-weight-bold)',
                          margin: 'var(--spacing-3) 0 var(--spacing-2) 0'
                        }}>
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 style={{ 
                          fontSize: 'var(--text-base)',
                          fontWeight: 'var(--font-weight-semibold)',
                          margin: 'var(--spacing-2) 0 var(--spacing-1) 0'
                        }}>
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 style={{ 
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          margin: 'var(--spacing-2) 0 var(--spacing-1) 0'
                        }}>
                          {children}
                        </h3>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 'var(--font-weight-bold)' }}>
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ fontStyle: 'italic' }}>
                          {children}
                        </em>
                      ),
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            color: 'var(--color-primary)',
                            textDecoration: 'underline'
                          }}
                        >
                          {children}
                        </a>
                      )
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                ) : (
                  displayContent
                )}
              </div>

              {/* Message Status for User Messages */}
              {!isBot && message.status && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: 'var(--spacing-2)',
                  gap: 'var(--spacing-1)'
                }}>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    opacity: 0.8
                  }}>
                    {formatTime(message.timestamp)}
                  </span>
                  <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>
                    {message.status === 'sending' && '⏳'}
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'failed' && '❌'}
                  </div>
                </div>
              )}

              {/* Bot Message Metadata */}
              {isBot && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'var(--spacing-3)',
                  paddingTop: 'var(--spacing-2)',
                  borderTop: '1px solid var(--color-border-subtle)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-tertiary)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)'
                  }}>
                    <span>{formatTime(message.timestamp)}</span>
                    {message.metadata && (
                      <>
                        <span>•</span>
                        <span>
                          {message.metadata.model} 
                          {message.metadata.confidence && 
                            ` (${Math.round(message.metadata.confidence * 100)}%)`
                          }
                        </span>
                        {message.metadata.processingTime && (
                          <>
                            <span>•</span>
                            <span>{(message.metadata.processingTime / 1000).toFixed(1)}s</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced Response Selection Cards for Bot Messages */}
              {isBot && Array.isArray(message.responses) && message.responses.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 'var(--spacing-3)',
                    marginTop: 'var(--spacing-4)',
                    paddingTop: 'var(--spacing-3)',
                    borderTop: '1px solid var(--color-border-subtle)'
                  }}
                >
                  {message.responses.map((response, index) => response ? (
                    <motion.div
                      key={response.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{
                        background: messageSelectedIndex === index
                          ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                          : 'var(--color-surface-primary)',
                        color: messageSelectedIndex === index ? 'white' : 'var(--color-text-primary)',
                        border: messageSelectedIndex === index
                          ? '2px solid var(--color-primary)'
                          : '2px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-4)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: messageSelectedIndex === index ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                      }}
                    >
                      {/* Background Pattern for Selected */}
                      {messageSelectedIndex === index && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.1 }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}

                      {/* Header with Response Label and Star */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--spacing-3)'
                      }}>
                        <motion.button
                          onClick={() => handleResponseClick(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)',
                            color: 'inherit'
                          }}
                        >
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.3 }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-lg)',
                              background: messageSelectedIndex === index 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'var(--color-primary-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 'var(--font-weight-bold)',
                              color: messageSelectedIndex === index ? 'white' : 'var(--color-primary-dark)'
                            }}
                          >
                            {String.fromCharCode(65 + index)}
                          </motion.div>
                          
                          <div style={{ textAlign: 'left' }}>
                            <div style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 'var(--font-weight-bold)',
                              marginBottom: '2px'
                            }}>
                              Response {String.fromCharCode(65 + index)}
                            </div>
                            
                            {response.confidence && (
                              <div style={{
                                fontSize: 'var(--text-xs)',
                                opacity: 0.8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-1)'
                              }}>
                                {Math.round(response.confidence * 100)}% confidence
                              </div>
                            )}
                          </div>
                        </motion.button>

                        {/* Clickable Star for Preferred Selection */}
                        <motion.button
                          whileHover={{ scale: 1.2, rotate: 180 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreferredClick(response.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 'var(--spacing-1)',
                            borderRadius: 'var(--radius-md)',
                            color: response.isPreferred 
                              ? (messageSelectedIndex === index ? 'white' : 'var(--color-warning)')
                              : (messageSelectedIndex === index ? 'rgba(255,255,255,0.6)' : 'var(--color-text-tertiary)'),
                            transition: 'all var(--transition-fast)'
                          }}
                          title={response.isPreferred ? 'Preferred Response' : 'Mark as Preferred'}
                        >
                          <Star 
                            size={18} 
                            fill={response.isPreferred ? 'currentColor' : 'none'}
                            stroke={response.isPreferred ? 'none' : 'currentColor'}
                          />
                        </motion.button>
                      </div>

                      {/* Content Preview */}
                      <motion.div
                        onClick={() => handleResponseClick(index)}
                        style={{
                          fontSize: 'var(--text-xs)',
                          lineHeight: 1.4,
                          opacity: 0.9,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          marginBottom: 'var(--spacing-3)',
                          cursor: 'pointer'
                        }}
                      >
                        {response.content.substring(0, 150)}...
                      </motion.div>

                      {/* Metadata */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 'var(--text-xs)',
                        opacity: 0.7
                      }}>
                        {response.confidence && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-1)'
                          }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: 'var(--radius-full)',
                              background: response.confidence >= 0.9 
                                ? 'var(--color-success)' 
                                : response.confidence >= 0.7 
                                  ? 'var(--color-warning)' 
                                  : 'var(--color-error)'
                            }} />
                            {Math.round(response.confidence * 100)}%
                          </div>
                        )}

                        {response.isPreferred && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--spacing-1)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-weight-medium)',
                              color: 'var(--color-warning)'
                            }}
                          >
                            <Star size={12} fill="currentColor" />
                            Preferred
                          </motion.div>
                        )}
                      </div>

                      {/* Selection Indicator */}
                      {messageSelectedIndex === index && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '0 0 var(--radius-xl) var(--radius-xl)'
                          }}
                        />
                      )}
                    </motion.div>
                  ) : null)}
                </motion.div>
              )}
            </div>

            {/* Static Message Actions - NO HOVER FLUCTUATION */}
            <div 
              className="message-actions"
              style={{
                position: 'absolute',
                top: '-8px',
                right: isBot ? 'auto' : '8px',
                left: isBot ? '8px' : 'auto',
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease',
                display: 'flex',
                gap: 'var(--spacing-1)',
                background: 'var(--color-surface-primary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-1)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10
              }}
            >
              <button
                onClick={() => copyToClipboard(displayContent, message.id)}
                className="message-action-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--spacing-1)',
                  borderRadius: 'var(--radius-md)',
                  color: copiedMessageId === message.id 
                    ? 'var(--color-success)' 
                    : 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
              >
                {copiedMessageId === message.id ? <Check size={14} /> : <Copy size={14} />}
              </button>

              {isBot && (
                <>
                  <button
                    className="message-action-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--spacing-1)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Good response"
                  >
                    <ThumbsUp size={14} />
                  </button>

                  <button
                    className="message-action-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--spacing-1)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Poor response"
                  >
                    <ThumbsDown size={14} />
                  </button>
                </>
              )}

              <button
                className="message-action-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--spacing-1)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="More options"
              >
                <MoreVertical size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  });

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: 'var(--spacing-4)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-3)',
        maxWidth: '70%'
      }}>
        {/* Avatar */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'white',
            fontSize: 'var(--text-base)',
            boxShadow: 'var(--shadow-sm)',
            border: '2px solid var(--color-surface-primary)'
          }}
        >
          <Bot size={20} />
        </motion.div>

        {/* Typing Bubble */}
        <motion.div
          animate={{ 
            scale: [1, 1.02, 1],
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: 'var(--color-surface-primary)',
            color: 'var(--color-text-primary)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)'
          }}
        >
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-1)',
            alignItems: 'center'
          }}>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="typing-dot"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "easeInOut"
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary)'
                }}
              />
            ))}
          </div>
          <span style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic'
          }}>
            AI is thinking...
          </span>
        </motion.div>
      </div>
    </motion.div>
  );

  const WelcomeMessage = ({ currentThread }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        padding: 'var(--spacing-8)',
        minHeight: '400px',
        background: 'var(--color-surface-primary)'
      }}
    >
      <motion.div
        animate={{ 
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          width: '80px',
          height: '80px',
          background: 'var(--gradient-primary)',
          borderRadius: 'var(--radius-2xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--spacing-6)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <Bot size={40} color="white" />
      </motion.div>
      
      <h3 style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--font-weight-bold)',
        marginBottom: 'var(--spacing-3)',
        color: 'var(--color-text-primary)'
      }}>
        Ready to assist you
      </h3>
      
      <p style={{
        fontSize: 'var(--text-base)',
        lineHeight: 1.6,
        maxWidth: '500px',
        marginBottom: 'var(--spacing-6)'
      }}>
        I'm here to help you with document analysis, answer questions, and provide insights. 
        Start a conversation by typing your message below.
      </p>

      {currentThread && (
        <div style={{
          background: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-3) var(--spacing-4)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-primary-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)'
        }}>
          <i className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            info
          </i>
          Connected to: {currentThread.title}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="chat-messages" style={{
      flex: 1,
      overflowY: 'auto',
      padding: 'var(--spacing-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-4)',
      background: 'var(--color-surface-primary)',
      minHeight: '200px'
    }}>
      {messages.length === 0 && !isLoading && !error ? (
        <WelcomeMessage currentThread={currentThread} />
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isBot={message.type === 'bot'}
            />
          ))}
          
          {isLoading && <TypingIndicator />}
        </AnimatePresence>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="message-bubble message-bubble-error"
        >
          <p className="font-semibold text-error">Error</p>
          <p>{error}</p>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatPanel;