import React, { useState, useCallback } from 'react';
import { Modal, Form, Input, Button, Typography, Space } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

const PromptModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false, 
  title = "Enhance with Custom Prompt",
  placeholder = "Enter your custom prompt for AI analysis...",
  submitText = "Enhance Document",
  loadingText = "Processing..."
}) => {
  const [form] = Form.useForm();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values.prompt.trim());
    } catch (error) {
      // Form validation failed, errors will be shown automatically
    }
  }, [form, onSubmit]);

  const handleClose = useCallback(() => {
    form.resetFields();
    setPrompt('');
    onClose();
  }, [form, onClose]);

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
  }, []);

  return (
    <Modal
      title={title}
      open={isOpen}
      onCancel={handleClose}
      maskClosable={!isLoading}
      closable={!isLoading}
      width={600}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isLoading}
      >
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          Provide a custom prompt to guide the AI analysis of your document. Be specific about what insights or information you're looking for.
        </Text>

        <Form.Item
          name="prompt"
          rules={[
            { required: true, message: 'Please enter a prompt' },
            { min: 5, message: 'Prompt must be at least 5 characters long' },
            { max: 1000, message: 'Prompt cannot exceed 1000 characters' }
          ]}
        >
          <TextArea
            placeholder={placeholder}
            rows={6}
            value={prompt}
            onChange={handlePromptChange}
            maxLength={1000}
            showCount={{
              formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`
            }}
            style={{ resize: 'none' }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="primary"
              htmlType="submit"
              loading={isLoading}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? loadingText : submitText}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PromptModal;