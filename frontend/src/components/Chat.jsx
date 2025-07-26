import React, { useState, useEffect } from 'react';
import { Button, Card, LoadingSpinner, ToastNotification, Input } from './shared';

const Chat = ({ initialParagraph, isVisible, onClose, bundleInfo, documentId = null }) => {
  const [formData, setFormData] = useState({
    paragraph: initialParagraph || 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions based on that data. Common applications include recommendation systems, image recognition, and natural language processing.',
    llm_provider: 'local',
    local_model: 'llama3:8b-instruct-q4_K_M',
    api_key: '',
    openai_model: 'gpt-4o',
    max_turns_per_learner: 2,
    interaction_mode: 'both', // 'both', 'shivam', 'prem', 'direct'
    shivam_description: '',
    prem_description: '',
    shivam_questions: '',
    prem_questions: '',
    num_questions_per_learner: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });
  const [conversation, setConversation] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [markdownOutput, setMarkdownOutput] = useState('');
  const [showConversationModal, setShowConversationModal] = useState(false);

  // Update form data when initialParagraph changes
  useEffect(() => {
    if (initialParagraph) {
      setFormData(prev => ({
        ...prev,
        paragraph: initialParagraph
      }));
    }
  }, [initialParagraph]);

  // Show conversation modal when conversation is set
  useEffect(() => {
    if (conversation && conversation.conversation && conversation.conversation.length > 0) {
      setShowConversationModal(true);
      // Show success message
      setFeedback({
        show: true,
        type: 'result',
        message: `✅ Conversation generated successfully!\n\n📊 ${conversation.total_turns} turns created\n👥 ${conversation.learners_included?.join(', ') || 'Direct mode'}\n⏰ ${new Date(conversation.timestamp).toLocaleTimeString()}`
      });
    }
  }, [conversation]);

  const avatarMap = {
    'Pranav': '🧑‍🏫',
    'Shivam': '🧒',
    'Prem': '👨‍🎓',
  };

  const localModels = [
    { value: 'llama3:8b-instruct-q4_K_M', label: 'LLaMA3 8B Instruct (Q4) – Best balance' },
    { value: 'llama3-128k:latest', label: 'LLaMA3 128k – Long documents' },
    { value: 'deepseek-r1:7b', label: 'DeepSeek 7B – General purpose' },
    { value: 'llama3.2:3b', label: 'LLaMA3.2 3B – Lightweight' },
    { value: 'llama3.2:1b', label: 'LLaMA3.2 1B – Very lightweight' }
  ];

  const openaiModels = [
    { value: 'gpt-4o', label: 'GPT-4o – Fastest + Vision + High Quality' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo – Bigger context (128k)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo – Very Fast, Budget' }
  ];

  const interactionModes = [
    { value: 'both', label: 'With Prem & Shivam', description: 'Full educational conversation with both personas' },
    { value: 'shivam', label: 'With Shivam', description: 'Beginner-friendly conversation with Shivam' },
    { value: 'prem', label: 'With Prem', description: 'Advanced technical conversation with Prem' },
    { value: 'direct', label: 'Direct (No Persona)', description: 'Direct explanation from Pranav\'s perspective' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const parseQuestions = (questionsText) => {
    if (!questionsText.trim()) return null;
    return questionsText
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback({ show: true, type: 'result', message: 'Generating conversation...' });
    setConversation(null);
    setShowExport(false);

    // Determine which personas to include based on interaction mode
    const include_shivam = formData.interaction_mode === 'both' || formData.interaction_mode === 'shivam';
    const include_prem = formData.interaction_mode === 'both' || formData.interaction_mode === 'prem';

    const payload = {
      paragraph: formData.paragraph,
      llm_provider: formData.llm_provider,
      max_turns_per_learner: parseInt(formData.max_turns_per_learner),
      include_shivam: include_shivam,
      include_prem: include_prem
    };

    // Add bundle information only when a bundle_id is provided
    if (bundleInfo && bundleInfo.bundle_id) {
      const { bundle_id, bundle_index, bundle_text } = bundleInfo;
      payload.bundle_id = bundle_id;
      if (bundle_index !== undefined && bundle_index !== null) {
        payload.bundle_index = bundle_index;
      }
      if (bundle_text) {
        payload.bundle_text = bundle_text;
      }
    }

    // Add custom descriptions if provided
    if (formData.shivam_description.trim()) {
      payload.shivam_description = formData.shivam_description.trim();
    }
    if (formData.prem_description.trim()) {
      payload.prem_description = formData.prem_description.trim();
    }

    // Add user questions if provided
    const shivamQuestions = parseQuestions(formData.shivam_questions);
    const premQuestions = parseQuestions(formData.prem_questions);

    if (shivamQuestions) {
      payload.shivam_questions = shivamQuestions;
    }
    if (premQuestions) {
      payload.prem_questions = premQuestions;
    }

    // Add number of questions per learner if specified
    if (formData.num_questions_per_learner.trim()) {
      payload.num_questions_per_learner = parseInt(formData.num_questions_per_learner);
    }

    // Attach document ID if available
    if (documentId) {
      payload.document_id = documentId;
    }

    if (formData.llm_provider === 'local') {
      payload.local_model = formData.local_model;
    } else if (formData.llm_provider === 'openai') {
      payload.api_key = formData.api_key;
      payload.model = formData.openai_model;
    }

    try {
      const response = await fetch('http://localhost:8001/api/v1/generate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await response.json();
      } catch (err) {
        setFeedback({ show: true, type: 'error', message: 'Invalid JSON response from server.' });
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        console.log('Chat API Response:', data);
        console.log('Response structure:', {
          hasConversation: !!data.conversation,
          conversationLength: data.conversation?.length,
          conversationType: typeof data.conversation,
          isArray: Array.isArray(data.conversation),
          fullData: data
        });
        setFeedback({
          show: true,
          type: 'result',
          message: `Success!\nTotal turns: ${data.total_turns}\nMessage: ${data.message}\nLearners: ${(data.learners_included || []).join(', ')}\n${data.timestamp}`
        });
        setConversation(data);
        setShowExport(true);
        console.log('Conversation state set:', data);
      } else {
        console.error('Chat API Error:', data);
        setFeedback({
          show: true,
          type: 'error',
          message: `Error ${response.status}:\n${data.message || data.detail || JSON.stringify(data)}`
        });
      }
    } catch (error) {
      setFeedback({
        show: true,
        type: 'error',
        message: `Network Error:\n${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportMarkdown = () => {
    if (!conversation) return;

    let md = `## Generated Conversation\n\n`;
    md += `**Total Turns:** ${conversation.total_turns}  \n`;
    md += `**Message:** ${conversation.message}  \n`;
    md += `**Learners:** ${(conversation.learners_included || []).join(', ')}  \n`;
    md += `**Timestamp:** ${conversation.timestamp}\n\n---\n\n`;

    conversation.conversation.forEach((turn, idx) => {
      md += `### ${idx + 1}. ${avatarMap[turn.speaker] || '💬'} **${turn.speaker}**\n`;
      md += `> ${turn.text.replace(/\n/g, '\n> ')}\n\n---\n\n`;
    });

    setMarkdownOutput(md);
  };

  return (
    <>
      {isVisible && (
        <div className="chat-modal-overlay">
          <div className="chat-modal-backdrop" onClick={onClose}></div>
          <div className="chat-modal-content">
            <div className="chat-modal-header">
              <h2>Enhance Content with AI</h2>
              {isVisible && (
                <Button
                  className="chat-modal-close"
                  onClick={onClose}
                  type="text"
                >
                  ✕
                </Button>
              )}
            </div>
            <Card className="chat-card">
              <form onSubmit={handleSubmit} autoComplete="off" className="chat-form">
                {/* Technical Paragraph Section */}
                <div className="form-section">
                  <h3 className="section-title">Technical Paragraph</h3>
                  <div className="form-group">
                    <label htmlFor="paragraph" className="form-label">Content to Discuss</label>
                    <textarea
                      id="paragraph"
                      name="paragraph"
                      value={formData.paragraph}
                      onChange={handleInputChange}
                      placeholder="Enter your technical paragraph here..."
                      required
                      className="form-textarea"
                      rows={6}
                    />
                  </div>
                </div>

                {/* Interaction Mode Section */}
                <div className="form-section">
                  <h3 className="section-title">Interaction Mode</h3>
                  <div className="interaction-modes">
                    {interactionModes.map(mode => (
                      <label key={mode.value} className="interaction-mode-option">
                        <input
                          type="radio"
                          name="interaction_mode"
                          value={mode.value}
                          checked={formData.interaction_mode === mode.value}
                          onChange={handleInputChange}
                          className="mode-radio"
                        />
                        <div className="mode-content">
                          <div className="mode-title">{mode.label}</div>
                          <div className="mode-description">{mode.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* LLM Configuration Section */}
                <div className="form-section">
                  <h3 className="section-title">AI Model Configuration</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="llm_provider" className="form-label">LLM Provider</label>
                      <select
                        id="llm_provider"
                        name="llm_provider"
                        value={formData.llm_provider}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="local">Local (Ollama)</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>

                    {formData.llm_provider === 'local' && (
                      <div className="form-group">
                        <label htmlFor="local_model" className="form-label">Local Model</label>
                        <select
                          id="local_model"
                          name="local_model"
                          value={formData.local_model}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          {localModels.map(model => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.llm_provider === 'openai' && (
                      <>
                        <div className="form-group">
                          <label htmlFor="api_key" className="form-label">OpenAI API Key</label>
                          <Input
                            type="password"
                            id="api_key"
                            name="api_key"
                            value={formData.api_key}
                            onChange={handleInputChange}
                            placeholder="sk-..."
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="openai_model" className="form-label">OpenAI Model</label>
                          <select
                            id="openai_model"
                            name="openai_model"
                            value={formData.openai_model}
                            onChange={handleInputChange}
                            className="form-select"
                          >
                            {openaiModels.map(model => (
                              <option key={model.value} value={model.value}>
                                {model.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="max_turns" className="form-label">Max Turns per Learner</label>
                      <Input
                        type="number"
                        id="max_turns"
                        name="max_turns_per_learner"
                        value={formData.max_turns_per_learner}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="num_questions" className="form-label">Questions per Learner (Optional)</label>
                      <Input
                        type="number"
                        id="num_questions"
                        name="num_questions_per_learner"
                        value={formData.num_questions_per_learner}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        placeholder="Override default"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Learner Configuration Section - Only show if not in direct mode */}
                {formData.interaction_mode !== 'direct' && (
                  <div className="form-section">
                    <h3 className="section-title">Learner Configuration</h3>
                    <div className="learner-options">
                      {/* Shivam Option - Only show if Shivam is included */}
                      {(formData.interaction_mode === 'both' || formData.interaction_mode === 'shivam') && (
                        <div className="learner-option">
                          <label className="learner-checkbox">
                            <span className="learner-name">🧒 Shivam (Beginner)</span>
                          </label>
                          <div className="learner-details">
                            <div className="form-group">
                              <label htmlFor="shivam_description" className="form-label">Custom Description (Optional)</label>
                              <textarea
                                id="shivam_description"
                                name="shivam_description"
                                value={formData.shivam_description}
                                onChange={handleInputChange}
                                placeholder="Custom description for Shivam..."
                                className="form-textarea"
                                rows={3}
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="shivam_questions" className="form-label">Shivam's Questions (One per line, optional)</label>
                              <textarea
                                id="shivam_questions"
                                name="shivam_questions"
                                value={formData.shivam_questions}
                                onChange={handleInputChange}
                                placeholder="What is machine learning?&#10;How does it work?&#10;Why is it useful?"
                                className="form-textarea"
                                rows={4}
                              />
                              <small className="form-help">
                                Leave empty for Pranav to generate questions automatically based on Shivam's persona
                              </small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Prem Option - Only show if Prem is included */}
                      {(formData.interaction_mode === 'both' || formData.interaction_mode === 'prem') && (
                        <div className="learner-option">
                          <label className="learner-checkbox">
                            <span className="learner-name">👨‍🎓 Prem (Advanced)</span>
                          </label>
                          <div className="learner-details">
                            <div className="form-group">
                              <label htmlFor="prem_description" className="form-label">Custom Description (Optional)</label>
                              <textarea
                                id="prem_description"
                                name="prem_description"
                                value={formData.prem_description}
                                onChange={handleInputChange}
                                placeholder="Custom description for Prem..."
                                className="form-textarea"
                                rows={3}
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="prem_questions" className="form-label">Prem's Questions (One per line, optional)</label>
                              <textarea
                                id="prem_questions"
                                name="prem_questions"
                                value={formData.prem_questions}
                                onChange={handleInputChange}
                                placeholder="What are the theoretical foundations of ML algorithms?&#10;How do gradient descent optimizations work?&#10;What are the limitations of current approaches?"
                                className="form-textarea"
                                rows={4}
                              />
                              <small className="form-help">
                                Leave empty for Pranav to generate questions automatically based on Prem's persona
                              </small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="form-actions">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="submit-button"
                  >
                    {isLoading && <LoadingSpinner size="small" />}
                    Generate Conversation
                  </Button>
                </div>
              </form>

              {/* Feedback */}
              {feedback.show && (
                <div className={`feedback ${feedback.type}`}>
                  <div className="feedback-content">
                    {feedback.message.split('\n').map((line, index) => (
                      <p key={index} className="feedback-line">{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Button for Debugging */}
              <div style={{margin: '16px 0', textAlign: 'center'}}>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Conversation Display Modal */}
      {showConversationModal && conversation && (
        <div className="conversation-modal-overlay">
          <div className="conversation-modal-backdrop" onClick={() => setShowConversationModal(false)}></div>
          <div className="conversation-modal-content">
            <div className="conversation-modal-header">
              <div className="conversation-header-info">
                <h2>Generated Conversation</h2>
                <div className="conversation-stats">
                  <span className="stat-item">
                    <strong>{conversation.total_turns}</strong> turns
                  </span>
                  <span className="stat-item">
                    <strong>{conversation.learners_included?.join(', ') || 'Direct'}</strong> learners
                  </span>
                  <span className="stat-item">
                    {new Date(conversation.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="conversation-modal-actions">
                <Button
                  onClick={() => {
                    exportMarkdown();
                    setFeedback({
                      show: true,
                      type: 'result',
                      message: '📋 Markdown exported successfully! Click on the text area below to select all content.'
                    });
                  }}
                  className="export-btn"
                >
                  Export
                </Button>
                <Button
                  className="conversation-modal-close"
                  onClick={() => setShowConversationModal(false)}
                  type="text"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="conversation-modal-body">
              <div className="conversation-turns">
                {conversation.conversation.map((turn, index) => (
                  <div key={index} className={`conversation-turn ${turn.speaker.toLowerCase()}`}>
                    <div className="turn-header">
                      <div className="turn-avatar">
                        {avatarMap[turn.speaker] || '💬'}
                      </div>
                      <div className="turn-info">
                        <div className="turn-speaker">{turn.speaker}</div>
                        {turn.complexity_level && (
                          <div className="turn-level">{turn.complexity_level}</div>
                        )}
                      </div>
                      <div className="turn-number">#{index + 1}</div>
                    </div>
                    <div className="turn-content">
                      {turn.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Markdown Output */}
            {markdownOutput && (
              <div className="markdown-section">
                <h4>Markdown Export</h4>
                <textarea
                  className="markdown-output"
                  value={markdownOutput}
                  readOnly
                  onClick={(e) => e.target.select()}
                  rows={8}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;
