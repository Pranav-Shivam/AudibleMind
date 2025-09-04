import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, StarOff, TrendingUp, Clock, CheckCircle, BarChart3, Zap } from 'lucide-react';

const ResponseToggle = ({ responses, selectedIndex, onResponseSelect, onMarkPreferred }) => {
  const [showAnalytics, setShowAnalytics] = useState(false);

  if (!responses || responses.length === 0) return null;

  const selectedResponse = responses[selectedIndex];

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'var(--color-success)';
    if (confidence >= 0.7) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="response-toggle"
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'linear-gradient(135deg, var(--color-surface-secondary) 0%, var(--color-surface-primary) 100%)',
        padding: 'var(--spacing-4) var(--spacing-6)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-4)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)'
        }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{
              background: 'var(--gradient-primary)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--spacing-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Zap size={16} color="white" />
          </motion.div>
          
          <div>
            <h4 style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.2
            }}>
              AI Response Variants
            </h4>
            <p style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              margin: 0,
              lineHeight: 1.3
            }}>
              Choose the response that best fits your needs
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)'
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAnalytics(!showAnalytics)}
            style={{
              background: showAnalytics ? 'var(--color-primary-light)' : 'var(--color-surface-primary)',
              border: `1px solid ${showAnalytics ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-2)',
              cursor: 'pointer',
              color: showAnalytics ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            title="View Analytics"
          >
            <BarChart3 size={16} />
          </motion.button>

          <div style={{
            background: 'var(--color-surface-primary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-2) var(--spacing-3)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            fontWeight: 'var(--font-weight-medium)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-1)'
          }}>
            <CheckCircle size={12} />
            {responses.length} options
          </div>
        </div>
      </motion.div>

      {/* Response Selection Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-3)',
          marginBottom: 'var(--spacing-4)'
        }}
      >
        {responses.map((response, index) => (
          <motion.button
            key={response.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResponseSelect(index)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              background: selectedIndex === index
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                : 'var(--color-surface-primary)',
              color: selectedIndex === index ? 'white' : 'var(--color-text-primary)',
              border: selectedIndex === index
                ? '2px solid var(--color-primary)'
                : '2px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-4)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: selectedIndex === index ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
            }}
          >
            {/* Background Pattern */}
            {selectedIndex === index && (
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

            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-3)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)'
              }}>
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-lg)',
                    background: selectedIndex === index 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: selectedIndex === index ? 'white' : 'var(--color-primary-dark)'
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </motion.div>
                
                <div>
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
                      <TrendingUp size={10} />
                      {getConfidenceLabel(response.confidence)} confidence
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred Star */}
              <motion.div
                whileHover={{ scale: 1.2, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  cursor: 'pointer',
                  color: response.isPreferred 
                    ? (selectedIndex === index ? 'white' : 'var(--color-warning)')
                    : (selectedIndex === index ? 'rgba(255,255,255,0.5)' : 'var(--color-text-tertiary)')
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkPreferred(response.id);
                }}
              >
                {response.isPreferred ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
              </motion.div>
            </div>

            {/* Content Preview */}
            <div style={{
              fontSize: 'var(--text-xs)',
              lineHeight: 1.4,
              opacity: 0.9,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 'var(--spacing-3)'
            }}>
              {response.content.substring(0, 120)}...
            </div>

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
                    background: getConfidenceColor(response.confidence)
                  }} />
                  {Math.round(response.confidence * 100)}%
                </div>
              )}

              {response.sources && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1)'
                }}>
                  <Clock size={10} />
                  {response.sources.length} sources
                </div>
              )}
            </div>

            {/* Selection Indicator */}
            {selectedIndex === index && (
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
          </motion.button>
        ))}
      </motion.div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'var(--color-surface-primary)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}
          >
            <h5 style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)'
            }}>
              <BarChart3 size={16} />
              Response Analytics
            </h5>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--spacing-3)'
            }}>
              {responses.map((response, index) => (
                <div
                  key={response.id}
                  style={{
                    padding: 'var(--spacing-3)',
                    background: selectedIndex === index 
                      ? 'var(--color-primary-light)' 
                      : 'var(--color-surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: selectedIndex === index 
                      ? '1px solid var(--color-primary)' 
                      : '1px solid var(--color-border-subtle)'
                  }}
                >
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-2)'
                  }}>
                    Response {String.fromCharCode(65 + index)}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-2)'
                  }}>
                    {response.confidence && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: 'var(--text-xs)' }}>Confidence</span>
                        <span style={{ 
                          fontSize: 'var(--text-xs)', 
                          fontWeight: 'var(--font-weight-semibold)',
                          color: getConfidenceColor(response.confidence)
                        }}>
                          {Math.round(response.confidence * 100)}%
                        </span>
                      </div>
                    )}

                    {response.sources && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: 'var(--text-xs)' }}>Sources</span>
                        <span style={{ 
                          fontSize: 'var(--text-xs)', 
                          fontWeight: 'var(--font-weight-semibold)'
                        }}>
                          {response.sources.length}
                        </span>
                      </div>
                    )}

                    {response.reasoning && (
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontStyle: 'italic',
                        lineHeight: 1.3,
                        marginTop: 'var(--spacing-1)'
                      }}>
                        {response.reasoning}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-surface-primary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-3) var(--spacing-4)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)'
        }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Star size={18} style={{ color: 'var(--color-warning)' }} />
          </motion.div>
          
          <div>
            <div style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.2
            }}>
              {selectedResponse?.isPreferred ? 'Preferred Response' : 'Mark as Preferred'}
            </div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.3
            }}>
              {selectedResponse?.isPreferred 
                ? 'This response has been marked as your preference'
                : 'Help improve AI by marking your preferred response'
              }
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onMarkPreferred(selectedResponse.id)}
          disabled={selectedResponse?.isPreferred}
          style={{
            background: selectedResponse?.isPreferred 
              ? 'var(--color-success)' 
              : 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-2) var(--spacing-4)',
            cursor: selectedResponse?.isPreferred ? 'default' : 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            opacity: selectedResponse?.isPreferred ? 0.8 : 1,
            transition: 'all var(--transition-fast)'
          }}
        >
          {selectedResponse?.isPreferred ? (
            <>
              <CheckCircle size={16} />
              Preferred
            </>
          ) : (
            <>
              <Star size={16} />
              Mark Preferred
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Current Selection Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: 'var(--spacing-4)',
          background: 'var(--color-surface-primary)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-4)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          marginBottom: 'var(--spacing-3)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'white'
          }}>
            {String.fromCharCode(65 + selectedIndex)}
          </div>
          
          <div style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)'
          }}>
            Currently Selected: Response {String.fromCharCode(65 + selectedIndex)}
          </div>

          {selectedResponse?.confidence && (
            <div style={{
              fontSize: 'var(--text-xs)',
              background: getConfidenceColor(selectedResponse.confidence) + '20',
              color: getConfidenceColor(selectedResponse.confidence),
              padding: 'var(--spacing-1) var(--spacing-2)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              {Math.round(selectedResponse.confidence * 100)}% confidence
            </div>
          )}
        </div>

        <div style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.6,
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          {selectedResponse?.content}
        </div>

        {selectedResponse?.sources && (
          <div style={{
            marginTop: 'var(--spacing-3)',
            paddingTop: 'var(--spacing-3)',
            borderTop: '1px solid var(--color-border-subtle)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            <strong>Sources:</strong> {selectedResponse.sources.join(', ')}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ResponseToggle;