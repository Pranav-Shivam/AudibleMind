import { CloseOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import '../styles/Chat.css';
import { Button, Input, ToastNotification } from './shared';


const ExportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);



const Chat = ({ initialParagraph, isVisible, onClose, bundleInfo, documentId = null }) => {
  const [formData, setFormData] = useState({
    paragraph: initialParagraph || 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions based on that data. Common applications include recommendation systems, image recognition, and natural language processing.',
    llm_provider: 'local',
    local_model: 'llama3:8b-instruct-q4_K_M',
    api_key: '',
    openai_model: 'gpt-4o',
    max_turns_per_learner: 2,
    interaction_mode: 'both', // 'both', 'lucas', 'marcus', 'direct'
    lucas_description: '',
    marcus_description: '',
    lucas_questions: '',
    marcus_questions: '',
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
    'Lucas': '🧒',
    'Marcus': '👨‍🎓',
  };

  const localModels = [
    { value: 'llama3:8b-instruct-q4_K_M', label: '🚀 LLaMA3 8B Instruct (Q4)', description: 'Best balance of speed and quality' },
    { value: 'llama3-128k:latest', label: '📚 LLaMA3 128k', description: 'Optimized for long documents' },
    { value: 'deepseek-r1:7b', label: '🔍 DeepSeek 7B', description: 'General purpose model' },
    { value: 'llama3.2:3b', label: '⚡ LLaMA3.2 3B', description: 'Lightweight, faster processing' },
    { value: 'llama3.2:1b', label: '🪶 LLaMA3.2 1B', description: 'Very lightweight, fastest option' }
  ];

  const openaiModels = [
    { value: 'gpt-4o', label: '🌟 GPT-4o', description: 'Fastest + Vision + High Quality' },
    { value: 'gpt-4-turbo', label: '🚀 GPT-4 Turbo', description: 'Bigger context (128k tokens)' },
    { value: 'gpt-3.5-turbo', label: '⚡ GPT-3.5 Turbo', description: 'Very Fast, Budget-friendly' }
  ];

  const interactionModes = [
    { 
      value: 'both',
      label: 'With Marcus & Lucas',
      description: 'Full educational conversation with both personas',
      icon: '👥'
    },
    {
      value: 'lucas',
      label: 'With Lucas',
      description: 'Beginner-friendly conversation with Lucas',
      icon: '🧒'
    },
    {
      value: 'marcus',
      label: 'With Marcus',
      description: 'Advanced technical conversation with Marcus',
      icon: '👨‍🎓'
    },
    {
      value: 'direct',
      label: 'Direct (No Persona)',
      description: 'Direct explanation from Pranav\'s perspective',
      icon: '🧑‍🏫'
    }
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
    const include_lucas = formData.interaction_mode === 'both' || formData.interaction_mode === 'lucas';
    const include_marcus = formData.interaction_mode === 'both' || formData.interaction_mode === 'marcus';

    const payload = {
      paragraph: formData.paragraph,
      llm_provider: formData.llm_provider,
      max_turns_per_learner: parseInt(formData.max_turns_per_learner),
      include_lucas: include_lucas,
      include_marcus: include_marcus
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
    if (formData.lucas_description.trim()) {
      payload.lucas_description = formData.lucas_description.trim();
    }
    if (formData.marcus_description.trim()) {
      payload.marcus_description = formData.marcus_description.trim();
    }

    // Add user questions if provided
    const lucasQuestions = parseQuestions(formData.lucas_questions);
    const marcusQuestions = parseQuestions(formData.marcus_questions);

    if (lucasQuestions) {
      payload.lucas_questions = lucasQuestions;
    }
    if (marcusQuestions) {
      payload.marcus_questions = marcusQuestions;
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
      const response = await fetch(`${API_URL}/api/v1/generate-conversation`, {
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
          <div className="chat-modal-backdrop" onClick={onClose} />
          <div className="chat-modal-content">
            <div className="chat-modal-header">
              <h2>
                Enhance Content with AI
              </h2>
              <Button
                onClick={onClose}
                type="text"
                icon={<CloseOutlined />}
                aria-label="Close modal"
                className="close-button"
              >
                <CloseOutlined />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} autoComplete="off" className="chat-form">
              {/* Technical Paragraph Section */}
              <div className="form-section">
                <h3 className="section-title">
                  📄 Technical Paragraph
                </h3>
                <div className="form-group">
                  <label htmlFor="paragraph" className="form-label">
                    Content to Discuss
                  </label>
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
                <h3 className="section-title">
                  👥 Interaction Mode
                </h3>
                <div className="interaction-modes">
                  {interactionModes.map(mode => (
                    <label key={mode.value} className="interaction-mode-option">
                      <input
                        type="radio"
                        name="interaction_mode"
                        value={mode.value}
                        checked={formData.interaction_mode === mode.value}
                        onChange={handleInputChange}
                      />
                      <div className="mode-content">
                        <span className="mode-icon">{mode.icon}</span>
                        <div className="mode-title">{mode.label}</div>
                        <div className="mode-description">{mode.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI Model Configuration */}
              <div className="form-section">
                <h3 className="section-title">
                  🤖 AI Model Configuration
                </h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="llm_provider" className="form-label">
                      LLM Provider
                    </label>
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

                  {formData.llm_provider === 'local' ? (
                    <div className="form-group">
                      <label htmlFor="local_model" className="form-label">
                        Local Model
                      </label>
                      <select
                        id="local_model"
                        name="local_model"
                        value={formData.local_model}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        {localModels.map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label} - {model.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label htmlFor="api_key" className="form-label">
                          OpenAI API Key
                        </label>
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
                        <label htmlFor="openai_model" className="form-label">
                          OpenAI Model
                        </label>
                        <select
                          id="openai_model"
                          name="openai_model"
                          value={formData.openai_model}
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          {openaiModels.map(model => (
                            <option key={model.value} value={model.value}>
                              {model.label} - {model.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="max_turns" className="form-label">
                      Max Turns per Learner
                    </label>
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
                    <label htmlFor="num_questions" className="form-label">
                      Questions per Learner (Optional)
                    </label>
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

              {/* Learner Configuration - Only show if not in direct mode */}
              {formData.interaction_mode !== 'direct' && (
                <div className="form-section">
                  <h3 className="section-title">
                    👥 Learner Configuration
                  </h3>
                  <div className="learner-options">
                    {/* Lucas Configuration */}
                    {(formData.interaction_mode === 'both' || formData.interaction_mode === 'lucas') && (
                      <div className="learner-option">
                        <div className="learner-header">
                          <span className="learner-avatar">🧒</span>
                          <h4>Lucas (Beginner)</h4>
                        </div>
                        <div className="learner-details">
                          <div className="form-group">
                            <label htmlFor="lucas_description" className="form-label">
                              Custom Description (Optional)
                            </label>
                            <textarea
                              id="lucas_description"
                              name="lucas_description"
                              value={formData.lucas_description}
                              onChange={handleInputChange}
                              placeholder="Custom description for Lucas..."
                              className="form-textarea"
                              rows={3}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="lucas_questions" className="form-label">
                              Lucas's Questions (One per line, optional)
                            </label>
                            <textarea
                              id="lucas_questions"
                              name="lucas_questions"
                              value={formData.lucas_questions}
                              onChange={handleInputChange}
                              placeholder="What is machine learning?&#10;How does it work?&#10;Why is it useful?"
                              className="form-textarea"
                              rows={4}
                            />
                            <small className="form-help">
                              Leave empty for auto-generated questions based on Lucas's persona
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Marcus Configuration */}
                    {(formData.interaction_mode === 'both' || formData.interaction_mode === 'marcus') && (
                      <div className="learner-option">
                        <div className="learner-header">
                          <span className="learner-avatar">👨‍🎓</span>
                          <h4>Marcus (Advanced)</h4>
                        </div>
                        <div className="learner-details">
                          <div className="form-group">
                            <label htmlFor="marcus_description" className="form-label">
                              Custom Description (Optional)
                            </label>
                            <textarea
                              id="marcus_description"
                              name="marcus_description"
                              value={formData.marcus_description}
                              onChange={handleInputChange}
                              placeholder="Custom description for Marcus..."
                              className="form-textarea"
                              rows={3}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="marcus_questions" className="form-label">
                              Marcus's Questions (One per line, optional)
                            </label>
                            <textarea
                              id="marcus_questions"
                              name="marcus_questions"
                              value={formData.marcus_questions}
                              onChange={handleInputChange}
                              placeholder="What are the theoretical foundations of ML algorithms?&#10;How do gradient descent optimizations work?&#10;What are the limitations of current approaches?"
                              className="form-textarea"
                              rows={4}
                            />
                            <small className="form-help">
                              Leave empty for auto-generated questions based on Marcus's persona
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
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="submit-button"
                >
                  {isLoading ? (
                    <>
                      Generating Conversation...
                    </>
                  ) : (
                    <>
                      Generate Conversation
                    </>
                  )}
                </Button>
              </div>

              {/* Feedback Messages */}
              {feedback.show && (
                <div className={`feedback ${feedback.type}`}>
                  <div className="feedback-content">
                    {feedback.message.split('\n').map((line, index) => (
                      <p key={index} className="feedback-line">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Conversation Display Modal */}
      {showConversationModal && conversation && (
        <div className="conversation-modal-overlay">
          <div className="conversation-modal-backdrop" onClick={() => setShowConversationModal(false)} />
          <div className="conversation-modal-content">
            <div className="conversation-modal-header">
              <div className="conversation-header-info">
                <h2>Generated Conversation</h2>
                <div className="conversation-stats">
                  <span className="stat-item">
                    <strong>{conversation.total_turns}</strong> turns
                  </span>
                  <span className="stat-item">
                    <strong>{conversation.learners_included?.join(', ') || 'Direct'}</strong>
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
                      message: '📋 Markdown exported successfully! Click the text area below to copy.'
                    });
                  }}
                  variant="secondary"
                  icon={<ExportIcon />}
                >
                  Export
                </Button>
                <Button
                  onClick={() => setShowConversationModal(false)}
                  type="text"
                  icon={<CloseOutlined />}
                  aria-label="Close modal"
                  className="close-button"
                >
                  <CloseOutlined />
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

            {/* Markdown Export Section */}
            {markdownOutput && (
              <div className="markdown-section">
                <div className="markdown-header">
                  <h4>📋 Markdown Export</h4>
                  <small>Click below to copy the content</small>
                </div>
                <textarea
                  className="markdown-output"
                  value={markdownOutput}
                  readOnly
                  onClick={(e) => {
                    e.target.select();
                    navigator.clipboard.writeText(markdownOutput);
                    setFeedback({
                      show: true,
                      type: 'result',
                      message: '✅ Markdown copied to clipboard!'
                    });
                  }}
                  rows={8}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastNotification
        show={feedback.show}
        type={feedback.type === 'result' ? 'success' : 'error'}
        message={feedback.message}
        position="top-right"
      />
    </>
  );
};

export default Chat;
