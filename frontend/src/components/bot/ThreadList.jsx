import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Archive, Hash, Clock, MessageSquare, MoreHorizontal } from 'lucide-react';
import { Button } from '../shared';

const ThreadList = ({
  threads,
  currentThread,
  onThreadSelect,
  onNewThread,
  isCollapsed,
  onToggleCollapse,
  searchQuery
}) => {
  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      analysis: 'analytics',
      technical: 'code',
      general: 'chat',
      research: 'search'
    };
    return icons[category] || 'chat';
  };

  const getCategoryColor = (category) => {
    const colors = {
      analysis: 'var(--color-primary)',
      technical: 'var(--color-success)', 
      general: 'var(--color-text-secondary)',
      research: 'var(--color-warning)'
    };
    return colors[category] || 'var(--color-text-secondary)';
  };

  // Collapsed view with enhanced UX
  if (isCollapsed) {
    return (
      <motion.div
        className="thread-list thread-list-collapsed"
        initial={false}
        animate={{ width: '60px' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'var(--spacing-4)',
          gap: 'var(--spacing-3)',
          height: '100%'
        }}
      >
        {/* Expand Toggle */}
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'var(--color-surface-primary)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--spacing-2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            transition: 'all var(--transition-fast)',
            fontSize: 'var(--text-lg)'
          }}
        >
          <i className="material-symbols-outlined">chevron_right</i>
        </motion.button>

        {/* New Thread Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewThread}
          style={{
            background: 'var(--gradient-primary)',
            border: 'none',
            cursor: 'pointer',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-lg)',
            color: 'white',
            transition: 'all var(--transition-fast)',
            fontSize: 'var(--text-lg)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Plus size={20} />
        </motion.button>

        {/* Thread Indicators */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
          alignItems: 'center',
          flex: 1,
          width: '100%'
        }}>
          {threads.slice(0, 8).map((thread, index) => (
            <button
              key={thread.id}
              className="thread-indicator-btn"
              onClick={() => onThreadSelect(thread)}
              style={{
                position: 'relative',
                background: currentThread?.id === thread.id ? 'var(--color-primary)' : 'var(--color-surface-primary)',
                border: 'none',
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-lg)',
                color: currentThread?.id === thread.id ? 'white' : getCategoryColor(thread.category),
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                boxShadow: currentThread?.id === thread.id ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <i className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {getCategoryIcon(thread.category)}
              </i>
              
              {/* Unread indicator */}
              {thread.unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--color-error)',
                    color: 'white',
                    borderRadius: 'var(--radius-full)',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-bold)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="thread-list thread-list-expanded"
      initial={false}
      animate={{ width: '320px' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Enhanced Header */}
      <motion.div 
        style={{
          padding: 'var(--spacing-4)',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)'
        }}>
          <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            margin: 0
          }}>
            Conversations
          </h3>
          <span style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            background: 'var(--color-surface-primary)',
            padding: 'var(--spacing-1) var(--spacing-2)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            {threads.length}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'var(--color-surface-primary)' }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--spacing-1)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <i className="material-symbols-outlined">chevron_left</i>
        </motion.button>
      </motion.div>

      {/* New Thread Button */}
      <motion.div 
        style={{ padding: 'var(--spacing-4)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewThread}
          style={{
            width: '100%',
            background: 'var(--gradient-primary)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-3)',
            color: 'white',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-2)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Plus size={16} />
          New Conversation
        </motion.button>
      </motion.div>

      {/* Threads List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--spacing-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-1)'
      }}>
        <AnimatePresence>
          {threads.map((thread, index) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="thread-item-wrapper"
            >
              <button
                onClick={() => onThreadSelect(thread)}
                style={{
                  width: '100%',
                  background: currentThread?.id === thread.id 
                    ? 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-subtle) 100%)'
                    : 'transparent',
                  border: currentThread?.id === thread.id 
                    ? '1px solid var(--color-primary)'
                    : '1px solid transparent',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--spacing-3)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                className={`thread-item ${currentThread?.id === thread.id ? 'thread-active' : ''}`}
              >
                {/* Thread Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 'var(--spacing-2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    flex: 1,
                    minWidth: 0
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: 'var(--radius-full)',
                      background: getCategoryColor(thread.category),
                      flexShrink: 0
                    }} />
                    
                    <div style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: currentThread?.id === thread.id ? 'var(--font-weight-bold)' : 'var(--font-weight-semibold)',
                      color: currentThread?.id === thread.id ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1
                    }}>
                      {searchQuery && thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                        <span dangerouslySetInnerHTML={{
                          __html: thread.title.replace(
                            new RegExp(searchQuery, 'gi'),
                            `<mark style="background: var(--color-warning-light); color: var(--color-text-primary);">$&</mark>`
                          )
                        }} />
                      ) : (
                        thread.title
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                    flexShrink: 0
                  }}>
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-tertiary)',
                      fontWeight: 'var(--font-weight-medium)'
                    }}>
                      {formatTime(thread.timestamp)}
                    </span>
                    
                    {thread.unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          background: 'var(--color-error)',
                          color: 'white',
                          borderRadius: 'var(--radius-full)',
                          minWidth: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'var(--font-weight-bold)',
                          padding: '0 var(--spacing-1)'
                        }}
                      >
                        {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Last Message Preview */}
                <div style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.4
                }}>
                  {searchQuery && thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                    <span dangerouslySetInnerHTML={{
                      __html: thread.lastMessage.replace(
                        new RegExp(searchQuery, 'gi'),
                        `<mark style="background: var(--color-warning-light); color: var(--color-text-primary);">$&</mark>`
                      )
                    }} />
                  ) : (
                    thread.lastMessage
                  )}
                </div>

                {/* Thread Metadata */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'var(--spacing-1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)'
                  }}>
                    {/* Category Badge */}
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      color: getCategoryColor(thread.category),
                      background: `${getCategoryColor(thread.category)}20`,
                      padding: 'var(--spacing-1) var(--spacing-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {thread.category}
                    </span>

                    {/* Tags */}
                    {thread.tags && thread.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: 'var(--spacing-1)',
                        flexWrap: 'wrap'
                      }}>
                        {thread.tags.slice(0, 2).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            style={{
                              fontSize: '10px',
                              color: 'var(--color-text-tertiary)',
                              background: 'var(--color-surface-primary)',
                              padding: '2px var(--spacing-1)',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 'var(--font-weight-medium)'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    <MessageSquare size={12} />
                    <span>{thread.messageCount}</span>
                  </div>
                </div>

                {/* Active indicator */}
                {currentThread?.id === thread.id && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      background: 'var(--color-primary)',
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                    }}
                  />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {threads.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 'var(--spacing-6)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Archive size={32} style={{ marginBottom: 'var(--spacing-3)', opacity: 0.5 }} />
            <h4 style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-2)',
              color: 'var(--color-text-primary)'
            }}>
              No conversations yet
            </h4>
            <p style={{
              fontSize: 'var(--text-xs)',
              lineHeight: 1.4,
              maxWidth: '200px'
            }}>
              Start your first conversation to begin chatting with AI
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ThreadList;