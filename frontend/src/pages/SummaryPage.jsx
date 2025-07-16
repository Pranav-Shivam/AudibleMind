import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentApi } from '../services/api';
import { Button, Card, LoadingSpinner, ToastNotification, Input } from '../components/shared';

const SummaryPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedParagraphs, setExpandedParagraphs] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        // Mock data for demo
        const mockDocument = {
          id: documentId,
          title: 'Sample Research Document',
          file_extension: '.pdf',
          created_at: new Date().toISOString(),
          summary: `This document presents a comprehensive analysis of machine learning applications in modern data processing. The research covers various algorithmic approaches including supervised and unsupervised learning methods, with particular emphasis on their practical implementation in real-world scenarios.

Key findings include the effectiveness of ensemble methods in improving prediction accuracy, the importance of feature engineering in model performance, and the critical role of data preprocessing in achieving optimal results. The study also examines current challenges in the field such as model interpretability, computational efficiency, and ethical considerations in AI deployment.

The document concludes with recommendations for future research directions and best practices for implementing machine learning solutions in enterprise environments. Special attention is given to scalability concerns and the integration of ML systems with existing infrastructure.`,
          paragraphs: [
            {
              id: 'para_1',
              text: 'Machine learning has emerged as one of the most transformative technologies of the 21st century, fundamentally changing how we approach data analysis and automated decision-making. From recommendation systems that power e-commerce platforms to autonomous vehicles navigating complex urban environments, ML algorithms are becoming increasingly integrated into our daily lives.',
              page_number: 1
            },
            {
              id: 'para_2', 
              text: 'The foundation of machine learning lies in its ability to identify patterns within large datasets without explicit programming for each specific task. This paradigm shift from traditional rule-based programming to data-driven learning has opened up possibilities that were previously unimaginable, particularly in fields requiring complex pattern recognition.',
              page_number: 1
            },
            {
              id: 'para_3',
              text: 'Supervised learning represents one of the most widely adopted approaches in machine learning, where algorithms learn from labeled training data to make predictions on new, unseen data. This methodology has proven particularly effective in classification tasks such as email spam detection, medical diagnosis, and fraud prevention.',
              page_number: 2
            },
            {
              id: 'para_4',
              text: 'In contrast, unsupervised learning operates on unlabeled data, seeking to discover hidden patterns and structures without predefined outcomes. Clustering algorithms, dimensionality reduction techniques, and anomaly detection systems exemplify this approach, offering insights into data characteristics that might otherwise remain hidden.',
              page_number: 2
            },
            {
              id: 'para_5',
              text: 'Feature engineering emerges as a critical component in the machine learning pipeline, often determining the success or failure of a model. The process of selecting, transforming, and creating relevant features from raw data requires domain expertise and significantly impacts model performance and interpretability.',
              page_number: 3
            },
            {
              id: 'para_6',
              text: 'Ensemble methods have gained prominence for their ability to combine multiple models to achieve superior performance compared to individual algorithms. Techniques such as random forests, gradient boosting, and voting classifiers demonstrate how collective intelligence can overcome the limitations of single models.',
              page_number: 3
            }
          ]
        };

        // Try to fetch real data, fallback to mock data
        try {
          const realDocument = await documentApi.getDocument(documentId);
          setDocument(realDocument);
        } catch (error) {
          console.warn('Using mock data due to API error:', error.message);
          setDocument(mockDocument);
        }

      } catch (error) {
        console.error('Error fetching document:', error);
        showToast('error', 'Failed to load document. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, navigate]);

  const toggleParagraph = (paragraphId) => {
    const newExpanded = new Set(expandedParagraphs);
    if (newExpanded.has(paragraphId)) {
      newExpanded.delete(paragraphId);
    } else {
      newExpanded.add(paragraphId);
    }
    setExpandedParagraphs(newExpanded);
  };

  const filteredParagraphs = document?.paragraphs?.filter(para =>
    para.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Card className="loading-card">
            <LoadingSpinner size="large" />
            <h2 className="loading-title">Loading Document Summary</h2>
            <p className="loading-subtitle">
              Processing your document content...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="page-container">
        <div className="empty-container">
          <Card className="empty-card">
            <div className="empty-icon">📄</div>
            <h2 className="empty-title">Document Not Found</h2>
            <p className="empty-subtitle">
              The requested document could not be loaded.
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
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="back-button"
              >
                ← Back
              </Button>
              <div className="document-info">
                <h1 className="document-title">{document.title}</h1>
                <p className="document-date">
                  Created on {formatDate(document.created_at)}
                </p>
              </div>
            </div>
            <div className="header-stats">
              <span className="stat-item">
                {document.paragraphs?.length} paragraphs
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Summary Section */}
          <Card className="summary-section">
            <div className="summary-header">
              <div className="summary-icon">📄</div>
              <h2 className="summary-title">Document Summary</h2>
            </div>
            
            <div className="summary-content">
              {document.summary.split('\n\n').map((paragraph, index) => (
                <p key={index} className="summary-paragraph">
                  {paragraph}
                </p>
              ))}
            </div>
          </Card>

          {/* Two Column Layout */}
          <div className="summary-layout">
            {/* Paragraphs Section */}
            <Card className="paragraphs-section">
              <div className="paragraphs-header">
                <div className="paragraphs-title-row">
                  <h3 className="paragraphs-title">Document Paragraphs</h3>
                  <span className="paragraphs-count">
                    {filteredParagraphs.length} of {document.paragraphs?.length || 0} paragraphs
                  </span>
                </div>
                
                <div className="search-container">
                  <div className="search-icon">🔍</div>
                  <Input
                    type="text"
                    placeholder="Search paragraphs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="paragraphs-list">
                {filteredParagraphs.map((paragraph, index) => (
                  <div 
                    key={paragraph.id} 
                    className="paragraph-item"
                  >
                    <div className="paragraph-header">
                      <div className="paragraph-meta">
                        <span className="page-badge">
                          Page {paragraph.page_number}
                        </span>
                        <span className="paragraph-number">
                          Paragraph {index + 1}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        onClick={() => toggleParagraph(paragraph.id)}
                        className="expand-button"
                        aria-label={expandedParagraphs.has(paragraph.id) ? 'Collapse paragraph' : 'Expand paragraph'}
                      >
                        {expandedParagraphs.has(paragraph.id) ? '⌃' : '⌄'}
                      </Button>
                    </div>
                    
                    <div 
                      className={`paragraph-text ${expandedParagraphs.has(paragraph.id) ? 'expanded' : 'collapsed'}`}
                      onClick={() => toggleParagraph(paragraph.id)}
                    >
                      {paragraph.text}
                    </div>
                    
                    {paragraph.text.length > 200 && (
                      <Button
                        variant="ghost"
                        onClick={() => toggleParagraph(paragraph.id)}
                        className="toggle-button"
                      >
                        {expandedParagraphs.has(paragraph.id) ? 'Show less' : 'Read more'}
                      </Button>
                    )}
                  </div>
                ))}
                
                {filteredParagraphs.length === 0 && (
                  <div className="empty-paragraphs">
                    <div className="empty-icon">📄</div>
                    <h3 className="empty-title">No paragraphs found</h3>
                    <p className="empty-description">
                      {searchTerm ? 'Try adjusting your search terms.' : 'No paragraphs available for this document.'}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Sidebar */}
            <Card className="sidebar-section">
              <h3 className="sidebar-title">Document Info</h3>
              
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">File Type</span>
                  <span className="info-value">
                    {document.file_extension.toUpperCase()}
                  </span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Paragraphs</span>
                  <span className="info-value">
                    {document.paragraphs?.length || 0}
                  </span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Summary Length</span>
                  <span className="info-value">
                    {document.summary?.length || 0} chars
                  </span>
                </div>
              </div>

              <div className="sidebar-actions">
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                  className="print-button"
                >
                  🖨️ Print Summary
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => navigate('/')}
                  className="new-document-button"
                >
                  📄 New Document
                </Button>
              </div>
            </Card>
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
    </div>
  );
};

export default SummaryPage; 