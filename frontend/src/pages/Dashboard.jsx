import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  ToastNotification,
  LoadingSpinner,
  PromptModal
} from '../components/shared';
import ChatInterface from '../components/bot/ChatInterface';
import { documentApi, ApiError } from '../services/api';
import { API_URL } from '../services/apiUrl';

const Dashboard = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ show: false, type: '', message: '', title: '' });
  const [isMobile, setIsMobile] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enhancingDocuments, setEnhancingDocuments] = useState(new Set());
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    documentId: null,
    documentTitle: ''
  });
  const [chatInterface, setChatInterface] = useState({
    isOpen: false
  });

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentApi.getAllDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      showToast('error', error.message || 'Failed to load documents', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = useCallback((type, message, title = '') => {
    setToast({ show: true, type, message, title });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  const handleUploadDocument = () => {
    navigate('/landing');
  };

  const handleChatWithAI = () => {
    setChatInterface({ isOpen: true });
  };

  const handleCloseChat = () => {
    setChatInterface({ isOpen: false });
  };

  const handleViewDocument = useCallback((document) => {
    const filename = `${document.title}${document.file_extension}`;
    const url = `${API_URL}/aud_pdf/${document.id}/${filename}`;
    window.open(url, '_blank');
  }, []);

  const handleEnhanceWithAI = useCallback((document) => {
    navigate(`/chunks/${document.id}`);
  }, []);

  const handleEnhanceWithPrompt = useCallback((document) => {
    setPromptModal({
      isOpen: true,
      documentId: document.id,
      documentTitle: document.title
    });
  }, []);

  const handlePromptSubmit = useCallback(async (prompt) => {
    if (!promptModal.documentId) return;

    setEnhancingDocuments(prev => new Set([...prev, promptModal.documentId]));

    try {
      const result = await documentApi.enhanceDocumentWithPrompt(promptModal.documentId, prompt);
      showToast('success',
        `Enhanced ${result.enhanced_chunks || 0} chunks with your custom prompt!`,
        'Document Enhanced'
      );

      setPromptModal({ isOpen: false, documentId: null, documentTitle: '' });

      // Optionally reload documents to get updated data
      // loadDocuments();
    } catch (error) {
      console.error('Failed to enhance document with prompt:', error);
      showToast('error',
        error.message || 'Failed to enhance document with custom prompt',
        'Enhancement Failed'
      );
    } finally {
      setEnhancingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(promptModal.documentId);
        return newSet;
      });
    }
  }, [promptModal.documentId]);

  const handleClosePromptModal = useCallback(() => {
    setPromptModal({ isOpen: false, documentId: null, documentTitle: '' });
  }, []);

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)', // Account for NavBar height
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, white 50%, var(--color-surface-secondary) 100%)'
    }}>
      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '64rem',
        margin: '0 auto',
        padding: isMobile ? 'var(--spacing-3)' : 'var(--spacing-4)',
        width: '100%'
      }}>
        {/* Welcome Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? 'var(--spacing-4)' : 'var(--spacing-6)',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(1.5rem, 4vw, 2rem)' : 'clamp(1.75rem, 3.5vw, 2.25rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: isMobile ? 'var(--spacing-2)' : 'var(--spacing-3)',
            lineHeight: 1.1
          }}>
            Enhance your documents
            <span style={{
              background: 'var(--gradient-text)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {' '}with AI-powered analysis
            </span>
          </h1>
        </div>

        {/* Quick Actions Bar */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 'var(--spacing-3)',
          marginBottom: 'var(--spacing-6)',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'end'
        }}>
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-3)',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Button
              variant="primary"
              size="md"
              className="flex items-center [&_span]:flex [&_span]:gap-4"
              onClick={handleUploadDocument}
            >
              <i className="material-symbols-outlined">upload</i>
              Upload New Document
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex items-center [&_span]:flex [&_span]:gap-4"
              onClick={handleChatWithAI}
              id="chat-with-ai-button"
            >
              <i className="material-symbols-outlined">chat</i>
              Chat with AI
            </Button>
          </div>
        </div>

        {/* Documents Table */}
        <Card padding="lg" shadow="lg" style={{
          animation: 'slideUp 0.6s ease-out'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-8)',
              textAlign: 'center'
            }}>
              <LoadingSpinner size="lg" />
              <p style={{
                marginTop: 'var(--spacing-4)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)'
              }}>
                Loading your documents...
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-8)',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: 'var(--spacing-4)'
              }}>
                📄
              </div>
              <h3 style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)'
              }}>
                No documents yet
              </h3>
              <p style={{
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--spacing-4)',
                lineHeight: 1.5
              }}>
                Upload your first document to get started with AI-powered analysis and insights.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleUploadDocument}
              >
                📄 Upload Your First Document
              </Button>
            </div>
          ) : (
            <>
              <h2 style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-4)'
              }}>
                Your Documents ({documents.length})
              </h2>

              {/* Table for larger screens */}
              {!isMobile ? (
                <div style={{
                  overflowX: 'auto'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: '2px solid var(--color-border-subtle)'
                      }}>
                        <th style={{
                          textAlign: 'left',
                          padding: 'var(--spacing-3)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Document Heading
                        </th>
                        <th style={{
                          textAlign: 'left',
                          padding: 'var(--spacing-3)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Document Name
                        </th>
                        <th style={{
                          textAlign: 'center',
                          padding: 'var(--spacing-3)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Extension
                        </th>
                        <th style={{
                          textAlign: 'center',
                          padding: 'var(--spacing-3)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc, index) => (
                        <tr key={doc.id} style={{
                          borderBottom: '1px solid var(--color-border-subtle)',
                          transition: 'background-color var(--transition-normal)'
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{
                            padding: 'var(--spacing-3)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-primary)',
                            fontWeight: 'var(--font-weight-medium)'
                          }}>
                            {doc.heading || doc.title}
                          </td>
                          <td style={{
                            padding: 'var(--spacing-3)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {doc.name}
                          </td>
                          <td style={{
                            padding: 'var(--spacing-3)',
                            textAlign: 'center'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: 'var(--spacing-1) var(--spacing-2)',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-weight-medium)',
                              textTransform: 'uppercase'
                            }}>
                              {doc.extension || 'PDF'}
                            </span>
                          </td>
                          <td style={{
                            padding: 'var(--spacing-3)',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              display: 'flex',
                              gap: 'var(--spacing-2)',
                              justifyContent: 'center'
                            }}>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleViewDocument(doc)}
                                title="View PDF"
                              >
                                View
                              </Button>
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => handleEnhanceWithAI(doc)}
                                loading={enhancingDocuments.has(doc.id)}
                                disabled={enhancingDocuments.has(doc.id)}
                                title="Enhance with AI"
                              >
                                AI
                              </Button>
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() => handleEnhanceWithPrompt(doc)}
                                disabled={enhancingDocuments.has(doc.id)}
                                title="Enhance with Custom Prompt"
                              >
                                 Prompt
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Card layout for mobile */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3)'
                }}>
                  {documents.map((doc, index) => (
                    <div key={doc.id} style={{
                      padding: 'var(--spacing-4)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface-secondary)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 'var(--spacing-3)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: 'var(--spacing-1)',
                            wordBreak: 'break-word'
                          }}>
                            {doc.heading || doc.title}
                          </h4>
                          <p style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)',
                            margin: 0,
                            wordBreak: 'break-word'
                          }}>
                            {doc.name}
                          </p>
                        </div>
                        <span style={{
                          display: 'inline-block',
                          padding: 'var(--spacing-1) var(--spacing-2)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          textTransform: 'uppercase',
                          marginLeft: 'var(--spacing-2)'
                        }}>
                          {doc.extension || 'PDF'}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: 'var(--spacing-2)',
                        flexWrap: 'wrap'
                      }}>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleViewDocument(doc)}
                          style={{ flex: 1, minWidth: '80px' }}
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleEnhanceWithAI(doc)}
                          loading={enhancingDocuments.has(doc.id)}
                          disabled={enhancingDocuments.has(doc.id)}
                          style={{ flex: 1, minWidth: '80px' }}
                        >
                          AI
                        </Button>
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => handleEnhanceWithPrompt(doc)}
                          disabled={enhancingDocuments.has(doc.id)}
                          style={{ flex: 1, minWidth: '80px' }}
                        >
                          Prompt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </main>

      {/* Toast Notifications */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        position="top-right"
      />

      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModal.isOpen}
        onClose={handleClosePromptModal}
        onSubmit={handlePromptSubmit}
        isLoading={enhancingDocuments.has(promptModal.documentId)}
        title={`Enhance "${promptModal.documentTitle}" with Custom Prompt`}
        placeholder="Enter your custom prompt to guide AI analysis..."
        submitText="Enhance with Prompt"
        loadingText="Enhancing document..."
      />

      {/* Chat Interface */}
      <ChatInterface
        isVisible={chatInterface.isOpen}
        onClose={handleCloseChat}
        showToast={showToast}
      />
    </div>
  );
};

export default Dashboard;