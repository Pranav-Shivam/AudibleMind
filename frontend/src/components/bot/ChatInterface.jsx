import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Settings, MoreVertical, Minimize2, Maximize2 } from 'lucide-react';
import { Card } from '../shared';
import ThreadList from './ThreadList';
import ChatPanel from './ChatPanel';
import MessageInput from './MessageInput';
import SearchBar from './SearchBar';
import ProviderToggle from './ProviderToggle';
import { botApi, BotApiError } from '../../services/botService';
import './ChatInterface.css';

const ChatInterface = ({ isVisible, onClose, showToast }) => {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentResponses, setCurrentResponses] = useState(null);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, connecting, disconnected
  
  // Provider management state
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState(null);
  const [showProviderSettings, setShowProviderSettings] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await botApi.listThreads();
      const formattedThreads = data.threads.map(t => ({
        id: t.thread_id,
        title: t.query.substring(0, 50) + (t.query.length > 50 ? '...' : ''),
        lastMessage: t.last_interaction?.sub_query || "No messages yet.",
        timestamp: new Date(t.time_updated),
        messageCount: t.interaction_count,
        isActive: false,
      }));
      setThreads(formattedThreads);

      if (formattedThreads.length > 0) {
        handleThreadSelect(formattedThreads[0]);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to load threads:", err);
      setError("Failed to load conversation threads.");
      if (showToast) showToast('error', 'Could not load conversations.', 'Network Error');
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isVisible) {
      loadThreads();
    }
  }, [isVisible, loadThreads]);

  // Provider change handler
  const handleProviderChange = useCallback((provider, model) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    console.log(`Switched to ${provider} with model: ${model}`);
    if (showToast) {
      showToast('success', `Switched to ${provider.toUpperCase()}${model ? ` (${model})` : ''}`, 'Provider Changed');
    }
  }, [showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e) => {
      // Ctrl/Cmd + Shift + P to toggle provider
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const nextProvider = selectedProvider === 'ollama' ? 'openai' : 'ollama';
        handleProviderChange(nextProvider, null);
      }
      
      // Ctrl/Cmd + Shift + S to toggle settings panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setShowProviderSettings(!showProviderSettings);
      }
    };

    if (isVisible) {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  }, [isVisible, selectedProvider, showProviderSettings, handleProviderChange]);

  // Enhanced message sending with better UX
  const handleSendMessage = useCallback(async (message, attachments = []) => {
    if (!message.trim()) return;

    // Add user message with optimistic UI
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      attachments,
      status: 'sending'
    };

    // Batch state updates to prevent UI fluctuation - optimized without setTimeout
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentResponses(null);
    setError(null);

    try {
      const response = await botApi.postMessage(currentThreadId, message, selectedProvider, selectedModel);
      
      const { 
        responses, 
        sub_queries, 
        thread_id, 
        query_type, 
        hyde_responses, 
        direct_response,
        was_continuation,
        classification_reasoning 
      } = response;
      
      setCurrentThreadId(thread_id);

      let formattedResponses = [];
      let botContent = "";
      
      // Handle new response format based on query type
      if (query_type === 'new_topic' && hyde_responses) {
        // HyDE responses for new topics
        formattedResponses = [
          { id: 'query_A', content: hyde_responses.query_A, isPreferred: false, type: 'essence' },
          { id: 'query_B', content: hyde_responses.query_B, isPreferred: false, type: 'systems' },
          { id: 'query_C', content: hyde_responses.query_C, isPreferred: false, type: 'application' }
        ];
        botContent = hyde_responses.query_A; // Default to essence response
      } else if (direct_response) {
        // Direct response for follow-ups
        const directContent = direct_response.content || direct_response;
        formattedResponses = [
          { id: 'direct', content: directContent, isPreferred: true, type: 'contextual' }
        ];
        botContent = directContent;
      } else if (responses) {
        // Legacy format fallback
        const responseKeys = Object.keys(responses);
        formattedResponses = responseKeys.map((key, index) => ({
          id: key,
          content: responses[key],
          isPreferred: false,
          type: index === 0 ? 'essence' : index === 1 ? 'systems' : 'application'
        }));
        botContent = formattedResponses[0]?.content || "";
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botContent,
        timestamp: new Date(),
        responses: formattedResponses,
        selectedResponse: 0,
        isTyping: false,
        queryType: query_type,
        wasContinuation: was_continuation,
        classificationReasoning: classification_reasoning,
        metadata: sub_queries?.[sub_queries.length-1]?.response_metadata || {},
      };
      
      // Batch all state updates to prevent UI fluctuation
      const updatedUserMessage = { ...userMessage, status: 'delivered' };
      
      setMessages(prev => [...prev.filter(m => m.id !== userMessage.id), updatedUserMessage, botMessage]);
      
      // Batch response-related state updates - optimized
      setCurrentResponses(formattedResponses);
      setSelectedResponseIndex(0);

      // Handle thread list updates without triggering a full reload
      if (!threads.some(t => t.id === thread_id)) {
        // For new threads, add to the list instead of full reload
        const newThread = {
          id: thread_id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          lastMessage: message,
          timestamp: new Date(),
          messageCount: 1,
          isActive: true
        };
        setThreads(prev => [newThread, ...prev.map(t => ({...t, isActive: false}))]);
      } else {
        // Update existing thread in the list
        setThreads(prev => prev.map(t => t.id === thread_id ? { ...t, lastMessage: message, timestamp: new Date() } : t));
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      setError("Failed to get a response from the AI.");
      if (showToast) showToast('error', err.message || 'Failed to send message.', 'API Error');
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    } finally {
      // Delay setting loading to false to prevent flicker
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  }, [currentThreadId, showToast, threads, loadThreads, selectedProvider, selectedModel]);

  // Enhanced response selection with better feedback
  // Optimized response selection - eliminated dependencies and improved performance
  const handleResponseSelect = useCallback((responseIndex, messageId = null) => {
    // Defensive programming - validate inputs
    if (typeof responseIndex !== 'number' || responseIndex < 0) return;
    
    // If messageId is provided, update that specific message (from ChatPanel)
    if (messageId) {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.responses && msg.responses[responseIndex]) {
          return {
            ...msg,
            content: msg.responses[responseIndex].content,
            selectedResponse: responseIndex
          };
        }
        return msg;
      }));
    } else {
      // If no messageId, update the global state and latest message
      setSelectedResponseIndex(responseIndex);
      
      // Update the latest message that has responses - more efficient approach
      setMessages(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex]?.responses && prev[lastIndex].responses[responseIndex]) {
          const updatedMessages = [...prev];
          updatedMessages[lastIndex] = {
            ...prev[lastIndex],
            content: prev[lastIndex].responses[responseIndex].content,
            selectedResponse: responseIndex
          };
          return updatedMessages;
        }
        return prev;
      });
    }
  }, []);

  // Enhanced preferred marking with analytics - Fixed for proper message-specific tracking
  const handleMarkPreferred = useCallback(async (responseId, messageId = null) => {
    if (!currentThreadId || !responseId) return;

    // Update currentResponses only if no specific messageId (for latest message)
    if (!messageId) {
      setCurrentResponses(prev => prev?.map(response => ({
        ...response,
        isPreferred: response.id === responseId
      })));
    }

    // Update the specific message or find the message containing this responseId
    setMessages(prev => prev.map(msg => {
      if (msg.responses) {
        // If messageId provided, update that specific message
        if (messageId && msg.id === messageId) {
          return {
            ...msg,
            responses: msg.responses.map(response => ({
              ...response,
              isPreferred: response.id === responseId
            }))
          };
        }
        // If no messageId, find the message that contains this responseId
        else if (!messageId) {
          const hasResponse = msg.responses.some(response => response.id === responseId);
          if (hasResponse) {
            return {
              ...msg,
              responses: msg.responses.map(response => ({
                ...response,
                isPreferred: response.id === responseId
              }))
            };
          }
        }
      }
      return msg;
    }));

    try {
      await botApi.markPreferredResponse(currentThreadId, responseId);
      if (showToast) showToast('success', `Response ${responseId.slice(-1)} marked as preferred.`, 'Feedback Saved');
    } catch (err) {
      console.error("Failed to mark preferred response:", err);
      if (showToast) showToast('error', 'Could not save your preference.', 'API Error');
      
      // Revert optimistic UI updates on failure - improved error handling
      if (!messageId) {
        setCurrentResponses(prev => prev?.map(response => ({
          ...response,
          isPreferred: false,
        })));
      }

      setMessages(prev => prev.map(msg => {
        if (msg.responses) {
          if (messageId && msg.id === messageId) {
            return {
              ...msg,
              responses: msg.responses.map(response => ({
                ...response,
                isPreferred: false
              }))
            };
          } else if (!messageId) {
            const hasResponse = msg.responses.some(response => response.id === responseId);
            if (hasResponse) {
              return {
                ...msg,
                responses: msg.responses.map(response => ({
                  ...response,
                  isPreferred: false
                }))
              };
            }
          }
        }
        return msg;
      }));
    }
  }, [currentThreadId, showToast]);

  // Thread management with better UX
  const handleNewThread = useCallback(() => {
    setCurrentThreadId(null);
    setMessages([{
      id: Date.now(),
      type: 'bot',
      content: 'Hello! I\'m ready to help you. What would you like to discuss today?',
      timestamp: new Date(),
    }]);
    setCurrentResponses(null);
    setThreads(prev => prev.map(t => ({...t, isActive: false})));
  }, []);

  const handleThreadSelect = useCallback(async (thread) => {
    if (!thread) return;
    
    setIsLoading(true);
    setError(null);
    setCurrentResponses(null);
    setCurrentThreadId(thread.id);
    setThreads(prev => prev.map(t => ({ 
      ...t, 
      isActive: t.id === thread.id
    })));
    
    try {
      const threadData = await botApi.getThread(thread.id);
      
      // Transform sub_queries into messages format
      const loadedMessages = threadData.sub_queries.flatMap((sq, index) => {
        const userMsg = {
          id: `user-${index}-${thread.id}`,
          type: 'user',
          content: sq.sub_query,
          timestamp: new Date(sq.time_created),
        };
        const botMsg = {
          id: `bot-${index}-${thread.id}`,
          type: 'bot',
          content: sq.sub_query_response,
          timestamp: new Date(sq.time_created),
          metadata: sq.response_metadata
        };
        return [userMsg, botMsg];
      });

      // Handle the case where the latest interaction has A/B/C responses
      if (threadData.responses) {
        const responseKeys = Object.keys(threadData.responses);
        const formattedResponses = responseKeys.map((key, index) => ({
          id: key,
          content: threadData.responses[key],
          isPreferred: false, // Preference state is not stored per-message in this model
        }));
        
        // The last bot message should contain these responses
        if (loadedMessages.length > 0) {
          const lastBotMsg = loadedMessages[loadedMessages.length - 1];
          if (lastBotMsg.type === 'bot') {
            lastBotMsg.responses = formattedResponses;
            lastBotMsg.content = formattedResponses[0].content; // Default to A
            lastBotMsg.selectedResponse = 0; // Initialize with first response selected
          }
        }
        
        // Batch the state updates to prevent UI fluctuation - optimized
        setCurrentResponses(formattedResponses);
        setSelectedResponseIndex(0);
      }

      setMessages(loadedMessages);

    } catch (err) {
      console.error("Failed to load thread messages:", err);
      setError("Failed to load messages for this conversation.");
      if (showToast) showToast('error', err.message || 'Could not load conversation.', 'API Error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Search functionality
  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible) return;
      
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            setIsSearchVisible(true);
            break;
          case 'n':
            e.preventDefault();
            handleNewThread();
            break;
          case 'w':
            e.preventDefault();
            onClose();
            break;
          case 'Enter':
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
            break;
        }
      }
      
      if (e.key === 'Escape') {
        if (isSearchVisible) {
          setIsSearchVisible(false);
          setSearchQuery('');
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isSearchVisible, isFullscreen, onClose, handleNewThread]);

  if (!isVisible) return null;

  const currentThread = threads.find(thread => thread.id === currentThreadId);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: -20,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="chat-interface-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isFullscreen ? 0 : 'var(--spacing-4)'
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            width: '100%',
            maxWidth: isFullscreen ? '100vw' : '1400px',
            height: isFullscreen ? '100vh' : '90vh',
            borderRadius: isFullscreen ? 0 : 'var(--radius-2xl)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-2xl)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Card
            className="chat-interface-content"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: isFullscreen ? 0 : 'var(--radius-2xl)'
            }}
            variant="elevated"
          >
            {/* Enhanced Header */}
            <motion.div 
              className="chat-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-4) var(--spacing-6)',
                borderBottom: '1px solid var(--color-border-subtle)',
                background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
                backdropFilter: 'blur(10px)'
              }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)'
              }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--gradient-primary)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 'var(--text-lg)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <i className="material-symbols-outlined">smart_toy</i>
                </motion.div>
                
                <div>
                  <div className="chat-header-title">
                    <h2>AudibleMind Assistant</h2>
                    <span className={`provider-badge ${selectedProvider === 'ollama' ? 'local' : 'cloud'}`}>
                      {selectedProvider === 'ollama' ? 'Local' : 'Cloud'}
                    </span>
                  </div>
                  <div className="connection-status">
                    <div className={`connection-dot ${connectionStatus === 'connected' ? 'connected' : 'connecting'}`}></div>
                    <span>{connectionStatus === 'connected' ? 'Online' : 'Connecting...'}</span>
                    {selectedModel && (
                      <>
                        <span className="model-display">•</span>
                        <span className="model-name">{selectedModel}</span>
                      </>
                    )}
                  </div>
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
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--spacing-2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="header-button"
                >
                  <Search size={18} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProviderSettings(!showProviderSettings)}
                  title="Provider Settings (Ctrl+Shift+S)"
                  style={{
                    background: showProviderSettings ? 'var(--color-primary-50)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--spacing-2)',
                    borderRadius: 'var(--radius-md)',
                    color: showProviderSettings ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="header-button settings-button"
                >
                  <Settings size={18} />
                  {showProviderSettings && (
                    <div className="settings-indicator"></div>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--spacing-2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-secondary)',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="header-button"
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </motion.button>

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
                    transition: 'all var(--transition-fast)'
                  }}
                  className="header-button header-button-close"
                >
                  <i className="material-symbols-outlined">close</i>
                </motion.button>
              </div>
            </motion.div>

            {/* Search Bar */}
            <AnimatePresence>
              {isSearchVisible && (
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onClose={() => setIsSearchVisible(false)}
                />
              )}
            </AnimatePresence>

            {/* Provider Settings Panel */}
            <AnimatePresence>
              {showProviderSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    padding: 'var(--spacing-4)',
                    background: 'var(--color-surface-secondary)'
                  }}
                >
                  <div className="settings-panel-content">
                    <h3 className="settings-panel-title">AI Provider</h3>
                    <ProviderToggle
                      selectedProvider={selectedProvider}
                      onProviderChange={handleProviderChange}
                      disabled={isLoading}
                      showModels={true}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <div style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden'
            }}>
              {/* Enhanced Left Panel - Thread List */}
              <motion.div
                initial={false}
                animate={{
                  width: isLeftPanelCollapsed ? '60px' : '320px'
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{
                  borderRight: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <ThreadList
                  threads={filteredThreads}
                  currentThreadId={currentThreadId}
                  onThreadSelect={handleThreadSelect}
                  onNewThread={handleNewThread}
                  isCollapsed={isLeftPanelCollapsed}
                  onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                  searchQuery={searchQuery}
                />
              </motion.div>

              {/* Right Panel - Chat */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--color-surface-primary)',
                minHeight: '500px'
              }}>
                {/* Chat Messages */}
                <div style={{ 
                  flex: 1, 
                  overflow: 'hidden',
                  background: 'var(--color-surface-primary)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <ChatPanel
                    messages={messages}
                    isLoading={isLoading}
                    error={error}
                    selectedResponseIndex={selectedResponseIndex}
                    onResponseSelect={handleResponseSelect}
                    onMarkPreferred={handleMarkPreferred}
                    currentThread={currentThread}
                  />
                </div>


                {/* Message Input */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  currentThreadId={currentThreadId}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatInterface;