import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Paperclip, Mic, X, FileText, Image, Code, StopCircle } from 'lucide-react';

const MessageInput = ({ onSendMessage, disabled, currentThreadId }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
      setShowAttachmentMenu(false);
    }
  }, [message, attachments, disabled, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
  }, []);

  // Focus textarea when component mounts or thread changes
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled, currentThreadId]);

  // File handling
  const handleFileSelect = useCallback((files) => {
    const newAttachments = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    setShowAttachmentMenu(false);
  }, []);

  const removeAttachment = useCallback((attachmentId) => {
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== attachmentId);
      // Clean up object URLs
      const removed = prev.find(att => att.id === attachmentId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  }, []);

  // Drag and drop handling
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  // Voice recording (placeholder)
  const toggleRecording = useCallback(() => {
    setIsRecording(!isRecording);
    // TODO: Implement actual voice recording
  }, [isRecording]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image size={16} />;
    if (type.includes('text/') || type.includes('document')) return <FileText size={16} />;
    if (type.includes('code') || type.includes('script')) return <Code size={16} />;
    return <FileText size={16} />;
  };

  return (
    <motion.div
      className="chat-input-section"
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-primary)',
        padding: 'var(--spacing-4) var(--spacing-6)',
        position: 'relative'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(99, 102, 241, 0.1)',
              border: '2px dashed var(--color-primary)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              backdropFilter: 'blur(4px)'
            }}
          >
            <div style={{
              textAlign: 'center',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)'
            }}>
              <Paperclip size={32} style={{ marginBottom: 'var(--spacing-2)' }} />
              <div>Drop files here to attach</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginBottom: 'var(--spacing-4)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--spacing-2)'
            }}
          >
            {attachments.map((attachment) => (
              <motion.div
                key={attachment.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  background: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  fontSize: 'var(--text-sm)'
                }}
              >
                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.name}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {getFileIcon(attachment.type)}
                  </div>
                )}
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0
                }}>
                  <span style={{
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {attachment.name}
                  </span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    {formatFileSize(attachment.size)}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeAttachment(attachment.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                    padding: 'var(--spacing-1)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)'
      }}>
        {/* Left Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--spacing-2)'
        }}>
          {/* Attachment Button */}
          <motion.div style={{ position: 'relative' }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              style={{
                background: showAttachmentMenu ? 'var(--color-primary-light)' : 'var(--color-surface-secondary)',
                border: `1px solid ${showAttachmentMenu ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                cursor: 'pointer',
                padding: 'var(--spacing-2)',
                borderRadius: 'var(--radius-lg)',
                color: showAttachmentMenu ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Paperclip size={18} />
            </motion.button>

            {/* Attachment Menu */}
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 'var(--spacing-2)',
                    background: 'var(--color-surface-primary)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--spacing-2)',
                    minWidth: '150px',
                    zIndex: 20
                  }}
                >
                  <motion.button
                    whileHover={{ backgroundColor: 'var(--color-surface-secondary)' }}
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left'
                    }}
                  >
                    <FileText size={16} />
                    Documents
                  </motion.button>

                  <motion.button
                    whileHover={{ backgroundColor: 'var(--color-surface-secondary)' }}
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = (e) => handleFileSelect(e.target.files);
                      input.click();
                      setShowAttachmentMenu(false);
                    }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 'var(--spacing-2) var(--spacing-3)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left'
                    }}
                  >
                    <Image size={16} />
                    Images
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Voice Recording Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleRecording}
            style={{
              background: isRecording ? 'var(--color-error)' : 'var(--color-surface-secondary)',
              border: `1px solid ${isRecording ? 'var(--color-error)' : 'var(--color-border-subtle)'}`,
              cursor: 'pointer',
              padding: 'var(--spacing-2)',
              borderRadius: 'var(--radius-lg)',
              color: isRecording ? 'white' : 'var(--color-text-secondary)',
              transition: 'all var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: '-2px',
                  border: '2px solid var(--color-error)',
                  borderRadius: 'var(--radius-lg)',
                  opacity: 0.5
                }}
              />
            )}
          </motion.button>
        </div>

        {/* Message Input */}
        <div style={{
          flex: 1,
          position: 'relative'
        }}>
          <TextareaAutosize
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "AI is thinking..." : "Type your message..."}
            disabled={disabled}
            minRows={1}
            maxRows={6}
            style={{
              width: '100%',
              padding: 'var(--spacing-3) var(--spacing-4)',
              border: '2px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-xl)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'inherit',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-primary)',
              resize: 'none',
              outline: 'none',
              transition: 'all var(--transition-fast)',
              lineHeight: 1.5
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

          {/* Character count for long messages */}
          {message.length > 500 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute',
                bottom: 'var(--spacing-2)',
                right: 'var(--spacing-3)',
                fontSize: 'var(--text-xs)',
                color: message.length > 1000 ? 'var(--color-error)' : 'var(--color-text-tertiary)',
                background: 'var(--color-surface-primary)',
                padding: '2px var(--spacing-1)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {message.length}/1000
            </motion.div>
          )}
        </div>

        {/* Send Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: disabled || (!message.trim() && attachments.length === 0) ? 1 : 1.05 }}
          whileTap={{ scale: disabled || (!message.trim() && attachments.length === 0) ? 1 : 0.95 }}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          style={{
            background: disabled || (!message.trim() && attachments.length === 0)
              ? 'var(--color-surface-secondary)'
              : 'var(--gradient-primary)',
            border: 'none',
            cursor: disabled || (!message.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-full)',
            color: disabled || (!message.trim() && attachments.length === 0)
              ? 'var(--color-text-tertiary)'
              : 'white',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            boxShadow: disabled || (!message.trim() && attachments.length === 0)
              ? 'none'
              : 'var(--shadow-sm)'
          }}
        >
          {disabled ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Send size={20} />
            </motion.div>
          ) : (
            <Send size={20} />
          )}
        </motion.button>
      </form>

      {/* Helper Text */}
      {/* <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          marginTop: 'var(--spacing-2)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--spacing-2)'
        }}
      >
        <span>Press Enter to send, Shift+Enter for new line</span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)',
          fontSize: 'var(--text-xs)'
        }}>
          {message.length > 0 && (
            <span style={{
              color: message.length > 1000 ? 'var(--color-error)' : 'var(--color-text-secondary)'
            }}>
              {message.length} characters
            </span>
          )}
          {attachments.length > 0 && (
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
            </span>
          )}
        </div>
      </motion.div> */}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
        accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,.xlsx,.xls"
      />
    </motion.div>
  );
};

export default MessageInput;