import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi } from '../services/api';
import { 
  Button, 
  Card, 
  Input, 
  LoadingSpinner, 
  ToastNotification 
} from '../components/shared';

const LandingPage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '', title: '' });
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Check initial size
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const showToast = useCallback((type, message, title = '') => {
    setToast({ show: true, type, message, title });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files[0]);
  }, []);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    handleFileSelection(file);
  }, []);

  const handleFileSelection = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      showToast('error', 'Please select a valid PDF file.', 'Invalid File Type');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('error', 'File size must be less than 50MB.', 'File Too Large');
      return;
    }

    setSelectedFile(file);
    showToast('success', `${file.name} selected successfully!`, 'File Ready');
  }, [showToast]);

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast('error', 'Please select a PDF file to upload', 'No File Selected');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      setUploadProgress(30);
      
      const documentId = await documentApi.uploadDocument(selectedFile, userPrompt);
      
      setUploadProgress(100);
      showToast('success', 'Document uploaded successfully! Redirecting...', 'Upload Complete');
      
      setTimeout(() => {
        navigate(`/chunks/${documentId}`);
      }, 1500);

    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', error.message || 'Failed to upload document. Please try again.', 'Upload Failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUserPrompt('');
    setUploadProgress(0);
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload icon
  const UploadIcon = () => (
    <svg style={{ width: '48px', height: '48px', color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  // File check icon
  const FileCheckIcon = () => (
    <svg style={{ width: '48px', height: '48px', color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

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
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? 'var(--spacing-2)' : 'var(--spacing-3)',
          animation: 'fadeIn 0.6s ease-out',
          padding: isMobile ? 'var(--spacing-1) 0' : 'var(--spacing-2) 0'
        }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(1.1rem, 4vw, 1.75rem)' : 'clamp(1.25rem, 3.5vw, 2rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: isMobile ? 'var(--spacing-1)' : 'var(--spacing-2)',
            lineHeight: 1.1
          }}>
            Turn Your PDFs into 
            <span style={{
              background: 'var(--gradient-text)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {' '}Smart Summaries
            </span>
          </h1>
          <p style={{
            fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            maxWidth: '36rem',
            margin: '0 auto',
            lineHeight: 1.3
          }}>
            Upload your PDF documents to extract intelligent summaries, interactive chunks, and AI-powered conversations.
          </p>
        </div>

        {/* Upload Section */}
        <Card padding="sm" shadow="lg" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.6s ease-out',
          marginBottom: isMobile ? 'var(--spacing-1)' : 'var(--spacing-2)'
        }}>
          {!isUploading ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isMobile ? 'var(--spacing-2)' : 'var(--spacing-3)',
              flex: 1
            }}>
              {/* File Upload Area */}
              <div style={{ flex: 1 }}>
                                  <label style={{
                    display: 'block',
                    fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--spacing-2)'
                  }}>
                    📄 Upload Your PDF Document
                  </label>
                <div
                  style={{
                    position: 'relative',
                    border: '2px dashed',
                    borderRadius: 'var(--radius-lg)',
                    padding: isMobile ? 'var(--spacing-4)' : 'var(--spacing-6)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition-normal)',
                    borderColor: isDragOver 
                      ? 'var(--color-primary)' 
                      : selectedFile 
                        ? 'var(--color-success)' 
                        : 'var(--color-border-subtle)',
                    backgroundColor: isDragOver 
                      ? 'var(--color-primary-subtle)' 
                      : selectedFile 
                        ? 'var(--color-success-light)' 
                        : 'var(--color-surface-secondary)',
                    transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
                    minHeight: isMobile ? '100px' : '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                  />
                  
                  {selectedFile ? (
                    <div style={{ textAlign: 'center' }}>
                      <FileCheckIcon />
                      <h3 style={{
                        fontSize: isMobile ? 'var(--text-base)' : 'var(--text-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-success-dark)',
                        marginTop: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-2)'
                      }}>
                        File Selected Successfully!
                      </h3>
                      <p style={{
                        color: 'var(--color-success)',
                        fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
                        marginBottom: 'var(--spacing-3)'
                      }}>
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        style={{
                          color: 'var(--color-success)',
                          textDecoration: 'underline',
                          fontSize: 'var(--text-xs)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Choose different file
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <UploadIcon />
                      <h3 style={{
                        fontSize: isMobile ? 'var(--text-base)' : 'var(--text-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                        marginTop: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-2)'
                      }}>
                        Click to upload or drag and drop
                      </h3>
                      <p style={{
                        color: 'var(--color-text-tertiary)',
                        fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)'
                      }}>
                        PDF files only • Max 50MB • Secure processing
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)'
                }}>
                  💬 Custom Instructions (Optional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., 'Summarize this for legal compliance', 'Focus on technical details', 'Extract key business insights'..."
                  maxLength={500}
                  style={{
                    width: '100%',
                    minHeight: isMobile ? '60px' : '80px',
                    padding: 'var(--spacing-2)',
                    border: '2px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: 'var(--text-base)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all var(--transition-normal)'
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'var(--spacing-2)'
                }}>
                  <p style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Provide specific instructions to tailor the summary to your needs.
                  </p>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    {userPrompt.length}/500
                  </span>
                </div>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!selectedFile}
                style={{
                  fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
                  padding: isMobile ? 'var(--spacing-2) var(--spacing-4)' : 'var(--spacing-3) var(--spacing-6)'
                }}
              >
                Upload & Analyze Document
              </Button>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: isMobile ? 'var(--spacing-6)' : 'var(--spacing-8)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1
            }}>
              <LoadingSpinner size="lg" text="Processing your document..." />
              <div style={{ marginTop: 'var(--spacing-4)' }}>
                <h3 style={{
                  fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)'
                }}>
                  Analyzing Your Document
                </h3>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--spacing-4)',
                  fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)'
                }}>
                  Our AI is extracting insights and creating your summary...
                </p>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  backgroundColor: 'var(--color-border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  height: '8px',
                  overflow: 'hidden',
                  marginBottom: 'var(--spacing-2)'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--gradient-primary)',
                    transition: 'width 0.5s ease-out',
                    width: `${uploadProgress}%`
                  }} />
                </div>
                <p style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 'var(--spacing-2)'
                }}>
                  {uploadProgress}% Complete
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Features Section */}
        <div style={{
          padding: isMobile ? 'var(--spacing-2) 0' : 'var(--spacing-3) 0',
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isMobile ? 'var(--spacing-3)' : 'var(--spacing-6)',
            flexWrap: 'wrap'
          }}>
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'AI-powered summaries in seconds'
              },
              {
                icon: '🧠',
                title: 'Smart Analysis',
                description: 'Advanced context understanding'
              },
              {
                icon: '⚙️',
                title: 'Customizable',
                description: 'Tailor to your specific needs'
              },
              {
                icon: '🔒',
                title: 'Secure & Private',
                description: 'Enterprise-grade encryption'
              }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  transition: 'all var(--transition-normal)',
                  cursor: 'pointer',
                  minWidth: isMobile ? '140px' : '160px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-primary)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{
                  fontSize: isMobile ? 'var(--text-lg)' : 'var(--text-xl)',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                  transition: 'transform var(--transition-normal)'
                }}>
                  {feature.icon}
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    marginBottom: '1px'
                  }}>
                    {feature.title}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.2
                  }}>
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastNotification
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        position="top-right"
      />
    </div>
  );
};

export default LandingPage; 