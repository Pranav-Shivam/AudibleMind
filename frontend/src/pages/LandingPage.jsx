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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, white 50%, var(--color-surface-secondary) 100%)'
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '0 var(--spacing-4)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'var(--gradient-primary)',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <span style={{
                  color: 'white',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-bold)'
                }}>📄</span>
              </div>
              <div>
                <h1 style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)'
                }}>AudibleMind</h1>
                <p style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)'
                }}>AI-Powered Document Intelligence</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)'
            }}>
              <span style={{
                display: isMobile ? 'none' : 'inline-flex',
                alignItems: 'center',
                padding: 'var(--spacing-1) var(--spacing-3)',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                ✨ Powered by AI
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '64rem',
        margin: '0 auto',
        padding: 'var(--spacing-8) var(--spacing-4)'
      }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-12)',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <div style={{ marginBottom: 'var(--spacing-6)' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--spacing-4)'
            }}>
              🚀 Transform Your Documents with AI
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-6)',
            lineHeight: 1.2
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
            fontSize: 'var(--text-xl)',
            color: 'var(--color-text-secondary)',
            maxWidth: '48rem',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Upload your PDF documents to extract intelligent summaries, interactive chunks, and AI-powered conversations. 
            Get instant insights with advanced analysis and seamless content exploration.
          </p>
        </div>

        {/* Upload Section */}
        <Card padding="lg" shadow="xl" style={{
          marginBottom: 'var(--spacing-12)',
          animation: 'slideUp 0.6s ease-out'
        }}>
          {!isUploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
              {/* File Upload Area */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-4)'
                }}>
                  📄 Upload Your PDF Document
                </label>
                <div
                  style={{
                    position: 'relative',
                    border: '2px dashed',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--spacing-8)',
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
                    transform: isDragOver ? 'scale(1.02)' : 'scale(1)'
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
                        fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-success-dark)',
                        marginTop: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-2)'
                      }}>
                        File Selected Successfully!
                      </h3>
                      <p style={{
                        color: 'var(--color-success)',
                        marginBottom: 'var(--spacing-4)'
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
                        fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                        marginTop: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-2)'
                      }}>
                        Click to upload or drag and drop
                      </h3>
                      <p style={{
                        color: 'var(--color-text-tertiary)'
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
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-4)'
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
                    minHeight: '120px',
                    padding: 'var(--spacing-4)',
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
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Provide specific instructions to tailor the summary to your needs.
                  </p>
                  <span style={{
                    fontSize: 'var(--text-sm)',
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
                  fontSize: 'var(--text-lg)',
                  padding: 'var(--spacing-4) var(--spacing-8)'
                }}
              >
                Upload & Analyze Document
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
              <LoadingSpinner size="xl" text="Processing your document..." />
              <div style={{ marginTop: 'var(--spacing-6)' }}>
                <h3 style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)'
                }}>
                  Analyzing Your Document
                </h3>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--spacing-6)'
                }}>
                  Our AI is extracting insights and creating your summary...
                </p>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  backgroundColor: 'var(--color-border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  height: '12px',
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
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 'var(--spacing-2)'
                }}>
                  {uploadProgress}% Complete
                </p>
                
                {/* Loading Dots */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                  justifyContent: 'center',
                  marginTop: 'var(--spacing-6)'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'pulse 1s ease-in-out infinite'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'pulse 1s ease-in-out infinite',
                    animationDelay: '0.2s'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'pulse 1s ease-in-out infinite',
                    animationDelay: '0.4s'
                  }} />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Features Section */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--spacing-12) 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-6)'
        }}>
          <h2 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-4)'
          }}>
            Why Choose AudibleMind?
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--spacing-6)',
            marginTop: 'var(--spacing-8)'
          }}>
            {[
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'AI-powered processing delivers summaries in seconds with advanced optimization',
                color: 'var(--color-warning)'
              },
              {
                icon: '🧠',
                title: 'Smart Analysis',
                description: 'Advanced AI understands context, extracts key insights, and identifies patterns',
                color: 'var(--color-primary)'
              },
              {
                icon: '⚙️',
                title: 'Customizable',
                description: 'Tailor summaries with custom prompts, instructions, and specific focus areas',
                color: 'var(--color-secondary)'
              },
              {
                icon: '🔒',
                title: 'Secure & Private',
                description: 'Enterprise-grade encryption with GDPR compliance and no permanent storage',
                color: 'var(--color-success)'
              }
            ].map((feature, index) => (
              <Card
                key={index}
                variant="glass"
                style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-6)',
                  transition: 'all var(--transition-normal)'
                }}
                hover
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `linear-gradient(135deg, ${feature.color} 0%, ${feature.color}dd 100%)`,
                  borderRadius: 'var(--radius-2xl)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-2xl)',
                  margin: '0 auto var(--spacing-4)',
                  transition: 'transform var(--transition-normal)'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--spacing-2)'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6
                }}>
                  {feature.description}
                </p>
              </Card>
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