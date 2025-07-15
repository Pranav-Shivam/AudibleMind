import React, { useState } from 'react';
import './Chat.css';

const Chat = () => {
  const [formData, setFormData] = useState({
    paragraph: 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions based on that data. Common applications include recommendation systems, image recognition, and natural language processing.',
    llm_provider: 'local',
    local_model: 'llama3:8b-instruct-q4_K_M',
    api_key: '',
    openai_model: 'gpt-4o',
    max_turns_per_learner: 2,
    include_shivam: true,
    include_prem: true,
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

    const payload = {
      paragraph: formData.paragraph,
      llm_provider: formData.llm_provider,
      max_turns_per_learner: parseInt(formData.max_turns_per_learner),
      include_shivam: formData.include_shivam,
      include_prem: formData.include_prem
    };

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
        setFeedback({
          show: true,
          type: 'result',
          message: `Success!\nTotal turns: ${data.total_turns}\nMessage: ${data.message}\nLearners: ${(data.learners_included || []).join(', ')}\n${data.timestamp}`
        });
        setConversation(data);
        setShowExport(true);
      } else {
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
    <div className="chat-container">
      <div className="card">
        <form onSubmit={handleSubmit} autoComplete="off">

          <div className="card-section">
            <div className="form-group">
              <label htmlFor="paragraph">Technical Paragraph</label>
              <textarea
                id="paragraph"
                name="paragraph"
                value={formData.paragraph}
                onChange={handleInputChange}
                placeholder="Enter your technical paragraph here..."
                required
              />
            </div>
            <div className="llm-questions">
              <div className="row">
                <div className="form-group">
                  <label htmlFor="llm_provider">LLM Provider</label>
                  <select
                    id="llm_provider"
                    name="llm_provider"
                    value={formData.llm_provider}
                    onChange={handleInputChange}
                  >
                    <option value="local">Local (Ollama)</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>

                {formData.llm_provider === 'local' && (
                  <div className="form-group">
                    <label htmlFor="local_model">Local Model (Ollama)</label>
                    <select
                      id="local_model"
                      name="local_model"
                      value={formData.local_model}
                      onChange={handleInputChange}
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
                      <label htmlFor="api_key">OpenAI API Key</label>
                      <input
                        type="password"
                        id="api_key"
                        name="api_key"
                        value={formData.api_key}
                        onChange={handleInputChange}
                        placeholder="sk-..."
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="openai_model">OpenAI Model</label>
                      <select
                        id="openai_model"
                        name="openai_model"
                        value={formData.openai_model}
                        onChange={handleInputChange}
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

              <div className="row">
                <div className="form-group">
                  <label htmlFor="max_turns">Max Turns per Learner (Default)</label>
                  <input
                    type="number"
                    id="max_turns"
                    name="max_turns_per_learner"
                    value={formData.max_turns_per_learner}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="num_questions">Number of Questions per Learner (Override)</label>
                  <input
                    type="number"
                    id="num_questions"
                    name="num_questions_per_learner"
                    value={formData.num_questions_per_learner}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    placeholder="Optional override"
                  />
                </div>
              </div>
            </div>
            <div className="learner-selection">
              <h3>Select Learners & Questions</h3>
              <div className="learner-options">
                <div className="learner-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="include_shivam"
                      checked={formData.include_shivam}
                      onChange={handleInputChange}
                    />
                    <span className="learner-name">🧒 Shivam (Beginner)</span>
                  </label>
                  {formData.include_shivam && (
                    <>
                      <textarea
                        name="shivam_description"
                        value={formData.shivam_description}
                        onChange={handleInputChange}
                        placeholder="Custom description for Shivam (optional)..."
                        className="persona-description"
                      />
                      <div className="questions-section">
                        <label className="questions-label">Shivam's Questions (one per line, optional):</label>
                        <textarea
                          name="shivam_questions"
                          value={formData.shivam_questions}
                          onChange={handleInputChange}
                          placeholder="What is machine learning?&#10;How does it work?&#10;Why is it useful?"
                          className="questions-input"
                        />
                        <small className="questions-help">
                          Leave empty for Pranav to generate questions automatically based on Shivam's persona
                        </small>
                      </div>
                    </>
                  )}
                </div>

                <div className="learner-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="include_prem"
                      checked={formData.include_prem}
                      onChange={handleInputChange}
                    />
                    <span className="learner-name">👨‍🎓 Prem (Advanced)</span>
                  </label>
                  {formData.include_prem && (
                    <>
                      <textarea
                        name="prem_description"
                        value={formData.prem_description}
                        onChange={handleInputChange}
                        placeholder="Custom description for Prem (optional)..."
                        className="persona-description"
                      />
                      <div className="questions-section">
                        <label className="questions-label">Prem's Questions (one per line, optional):</label>
                        <textarea
                          name="prem_questions"
                          value={formData.prem_questions}
                          onChange={handleInputChange}
                          placeholder="What are the theoretical foundations of ML algorithms?&#10;How do gradient descent optimizations work?&#10;What are the limitations of current approaches?"
                          className="questions-input"
                        />
                        <small className="questions-help">
                          Leave empty for Pranav to generate questions automatically based on Prem's persona
                        </small>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isLoading || (!formData.include_shivam && !formData.include_prem)}>
            {isLoading && <span className="spinner"></span>}
            Generate Conversation
          </button>
        </form>

        {feedback.show && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {conversation && (
          <div className="conversation">
            <h3>Generated Conversation:</h3>
            {conversation.conversation.map((turn, index) => (
              <div key={index} className="turn">
                <div className="avatar">
                  {avatarMap[turn.speaker] || '💬'}
                </div>
                <div className="turn-content">
                  <div className="speaker">{turn.speaker}</div>
                  {turn.complexity_level && (
                    <div className="timestamp">Level: {turn.complexity_level}</div>
                  )}
                  <div className="text">{turn.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showExport && (
          <button
            className="export-btn"
            onClick={exportMarkdown}
          >
            Export as Markdown
          </button>
        )}

        {markdownOutput && (
          <textarea
            className="markdown-output"
            value={markdownOutput}
            readOnly
            onClick={(e) => e.target.select()}
          />
        )}
      </div>
    </div>
  );
};

export default Chat;
