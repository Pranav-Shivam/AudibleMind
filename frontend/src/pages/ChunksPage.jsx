import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentApi } from '../services/api';
import { Button, Card, LoadingSpinner, ToastNotification } from '../components/shared';
import Chat from '../components/Chat';

// Modern tooltip component with improved positioning and animations
const ChunkTooltip = ({ content, isVisible, position }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="chunk-tooltip"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        backgroundColor: 'var(--color-surface-elevated)',
        color: 'var(--color-text-primary)',
        padding: 'var(--spacing-4)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '500px',
        maxHeight: '400px',
        overflow: 'auto',
        zIndex: 9999,
        fontSize: 'var(--text-sm)',
        lineHeight: 1.6,
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-border-subtle)',
        transform: 'translate(-50%, -100%)',
        marginTop: '-var(--spacing-3)',
        minWidth: '200px',
        minHeight: '50px',
        backdropFilter: 'blur(8px)',
        animation: 'tooltip-fade-in 0.2s ease-out'
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-icon">📄</span>
        <span className="tooltip-title">Full Content Preview</span>
      </div>
      <div className="tooltip-content">
        {content || 'No content available'}
      </div>
    </div>
  );
};

// Enhanced chat wrapper with better styling
const ChatWithChunkContent = ({ chunkContent, onClose }) => {
  return (
    <div className="chat-wrapper">
      <Chat initialParagraph={chunkContent} />
    </div>
  );
};

const ChunksPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [showChat, setShowChat] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    content: '', 
    position: { x: 0, y: 0 } 
  });
  const [tooltipTimeout, setTooltipTimeout] = useState(null);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  const refreshChunks = async () => {
    try {
      setLoading(true);
      // Clear cache for this specific document
      documentApi.clearCache();
      const response = await documentApi.getDocumentChunks(documentId);
      setChunks(response.chunks);
      showToast('success', 'Document chunks refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing chunks:', error);
      showToast('error', 'Failed to refresh document chunks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchChunks = async () => {
      if (!documentId) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        const response = await documentApi.getDocumentChunks(documentId);
        setChunks(response.chunks);
      } catch (error) {
        console.error('Error fetching chunks:', error);
        showToast('error', 'Failed to load document chunks. Please try again.');
        setTimeout(() => navigate('/'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchChunks();
  }, [documentId, navigate]);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  // Hide tooltip on window resize or scroll
  useEffect(() => {
    const handleWindowEvent = () => {
      if (tooltip.visible) {
        setTooltip({ visible: false, content: '', position: { x: 0, y: 0 } });
      }
    };

    window.addEventListener('resize', handleWindowEvent);
    window.addEventListener('scroll', handleWindowEvent);

    return () => {
      window.removeEventListener('resize', handleWindowEvent);
      window.removeEventListener('scroll', handleWindowEvent);
    };
  }, [tooltip.visible]);

  const handleChunkClick = (chunkIndex) => {
    const chunk = chunks[chunkIndex];
    setSelectedChunk(chunk);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedChunk(null);
  };

  const handleChunkMouseEnter = (e, chunkContent) => {
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      content: chunkContent,
      position: { 
        x: rect.left + rect.width / 2, 
        y: rect.top 
      }
    });
  };

  const handleChunkMouseLeave = () => {
    // Clear timeout if mouse leaves before tooltip shows
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltip({ visible: false, content: '', position: { x: 0, y: 0 } });
  };

  const truncateText = (text, maxLength = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getChunkPreview = (content) => {
    // Remove page prefixes and clean up text for preview
    const cleanContent = content.replace(/^Page \d+:\s*/gm, '').trim();
    return truncateText(cleanContent, 250);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Card className="loading-card">
            <LoadingSpinner size="large" />
            <h2 className="loading-title">Loading Document Chunks</h2>
            <p className="loading-subtitle">
              Processing your document into readable sections...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (!chunks || chunks.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-container">
          <Card className="empty-card">
            <div className="empty-icon">📄</div>
            <h2 className="empty-title">No Chunks Found</h2>
            <p className="empty-subtitle">
              The document chunks could not be loaded.
            </p>
            <Button 
              variant="primary" 
              onClick={() => navigate('/')}
              className="empty-action"
            >
              Back to Upload
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <div className="logo-icon">📄</div>
                <span className="logo-text">Document Chunks</span>
              </div>
              <div className="header-info">
                <span className="chunk-count">{chunks.length} chunks available</span>
              </div>
            </div>
            <div className="header-actions">
              <Button 
                variant="secondary" 
                onClick={refreshChunks}
                className="refresh-button"
                disabled={loading}
              >
                🔄 Refresh
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/')}
                className="header-action"
              >
                Upload New Document
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Instructions */}
          <Card className="instructions-card">
            <div className="instructions-content">
              <h1 className="instructions-title">Document Chunks</h1>
              <p className="instructions-description">
                Your document has been divided into <strong>{chunks.length} readable sections</strong>. 
                Click on any chunk below to open an AI-powered conversation about that specific section.
              </p>
              <div className="instructions-highlight">
                <span className="highlight-icon">💬</span>
                <span className="highlight-text">
                  Click any chunk to start an educational conversation with AI personas!
                </span>
              </div>
            </div>
          </Card>

          {/* Chunks Grid */}
          <div className="chunks-grid">
            {chunks.map((chunk, index) => (
              <Card 
                key={chunk.id || index}
                className="chunk-card"
                onClick={() => handleChunkClick(index)}
                onMouseEnter={(e) => handleChunkMouseEnter(e, chunk.content)}
                onMouseLeave={handleChunkMouseLeave}
                interactive
              >
                {/* Chunk Header */}
                <div className="chunk-header">
                  <h3 className="chunk-title">Chunk {index + 1}</h3>
                  <div className="chunk-meta">
                    <span className="chunk-tokens">{chunk.token_count} tokens</span>
                    <span className="chunk-action">💬 Start Chat</span>
                  </div>
                </div>

                {/* Chunk Content */}
                <div className="chunk-content">
                  <h4 className="chunk-preview-title">Content Preview</h4>
                  <p className="chunk-preview-text">
                    {getChunkPreview(chunk.content)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <ToastNotification 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast({ show: false, type: '', message: '' })}
        />
      )}

      {/* Chat Modal Overlay */}
      {showChat && selectedChunk && (
        <div className="modal-overlay" onClick={handleCloseChat}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title">
                <span className="modal-icon">💬</span>
                <div className="modal-text">
                  <h2 className="modal-heading">AI Conversation</h2>
                  <p className="modal-subtitle">
                    Discussing chunk content with AI personas
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleCloseChat}
                className="modal-close"
                aria-label="Close chat"
              >
                ✕
              </Button>
            </div>

            {/* Chat Component */}
            <div className="modal-body">
              <ChatWithChunkContent 
                chunkContent={selectedChunk.content} 
                onClose={handleCloseChat}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      <ChunkTooltip 
        content={tooltip.content}
        isVisible={tooltip.visible}
        position={tooltip.position}
      />
    </div>
  );
};

export default ChunksPage; 