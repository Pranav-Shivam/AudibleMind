import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { documentApi } from "../services/api";
import { ProTable } from "@ant-design/pro-components";
import { 
  Button, 
  Tag, 
  Space, 
  Tooltip, 
  Avatar, 
  Typography, 
  Card,
  Badge,
  Divider,
  App
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  SettingOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  HeartFilled,
  HeartOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  StarFilled
} from "@ant-design/icons";
import ShiruVoxChunk from "./ContentViewer";
import "../styles/ChunkViewer.css";
import Chat from "./Chat";

const { Text, Title } = Typography;

const ChunksViewer = () => {
  const { message } = App.useApp();
  const { documentId } = useParams();
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [selectedChunkForChat, setSelectedChunkForChat] = useState(null);
  const [pageSize, setPageSize] = useState(5);

  // Global audio manager
  const [globalAudioElements, setGlobalAudioElements] = useState(new Set());

  // Function to stop all registered audio elements
  const stopAllGlobalAudio = () => {
    console.log('Stopping all global audio elements:', globalAudioElements.size);
    globalAudioElements.forEach(audio => {
      if (audio && !audio.paused) {
        console.log('Stopping global audio element');
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      }
    });
    setGlobalAudioElements(new Set());
  };

  useEffect(() => {
    const fetchChunks = async () => {
      if (!documentId) return;
      
      try {
        setLoading(true);
        const response = await documentApi.getDocumentChunks(documentId);
        setChunks(response.chunks || []);
      } catch (error) {
        console.error('Error fetching chunks:', error);
        message.error('Failed to load document chunks');
      } finally {
        setLoading(false);
      }
    };

    fetchChunks();
  }, [documentId]);

  // Cleanup audio when modal is closed
  useEffect(() => {
    if (!isModalVisible) {
      console.log('Modal closed - cleaning up audio via useEffect...');
      
      // Stop all audio when modal is closed
      const audioElements = document.querySelectorAll('audio');
      console.log('useEffect found audio elements:', audioElements.length);
      
      audioElements.forEach((audio, index) => {
        console.log(`useEffect stopping audio element ${index}:`, {
          paused: audio.paused,
          currentTime: audio.currentTime,
          src: audio.src.substring(0, 50) + '...',
          readyState: audio.readyState
        });
        
        // Force stop the audio
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
        
        // Remove all event listeners
        audio.onplay = null;
        audio.onpause = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onloadstart = null;
        audio.oncanplay = null;
        audio.onload = null;
        audio.ontimeupdate = null;
        audio.onloadedmetadata = null;
      });
      
      // Also try to stop any media sessions
      if (navigator.mediaSession) {
        navigator.mediaSession.setActionHandler('stop', () => {});
      }
    }
  }, [isModalVisible]);

  const handleViewChunk = (record) => {
    setSelectedChunk(record);
    setIsModalVisible(true);
  };

  const handleEnhanceWithAI = (record) => {
    setSelectedChunkForChat(record);
    setIsChatModalVisible(true);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await documentApi.getDocumentChunks(documentId);
      setChunks(response.chunks || []);
      message.success('Chunks refreshed successfully');
    } catch (error) {
      console.error('Error refreshing chunks:', error);
      message.error('Failed to refresh chunks');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    console.log('Closing modal - stopping all audio...');
    
    // Method 1: Stop all audio elements in the entire document
    const allAudioElements = document.querySelectorAll('audio');
    console.log('Found audio elements:', allAudioElements.length);
    
    allAudioElements.forEach((audio, index) => {
      console.log(`Stopping audio element ${index}:`, {
        paused: audio.paused,
        currentTime: audio.currentTime,
        src: audio.src.substring(0, 50) + '...',
        readyState: audio.readyState
      });
      
      // Force stop the audio
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
      
      // Remove all event listeners
      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadstart = null;
      audio.oncanplay = null;
      audio.onload = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
    });
    
    // Method 2: Stop any audio contexts
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContexts = document.querySelectorAll('audio').forEach(audio => {
        if (audio.srcObject) {
          audio.srcObject = null;
        }
      });
    }
    
    // Method 3: Force stop any media sessions
    if (navigator.mediaSession) {
      navigator.mediaSession.setActionHandler('stop', () => {});
    }
    
    // Method 4: Use the Web Audio API to stop all audio
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'running') {
        audioContext.suspend();
      }
    } catch (e) {
      console.log('Web Audio API not available');
    }
    
    // Method 5: Dispatch a custom event to stop audio
    window.dispatchEvent(new CustomEvent('stopAllAudio'));
    
    // Method 6: Stop all global audio elements
    stopAllGlobalAudio();
    
    // Method 7: Try to stop any remaining audio with a delay
    setTimeout(() => {
      const remainingAudio = document.querySelectorAll('audio');
      console.log('Checking for remaining audio after delay:', remainingAudio.length);
      remainingAudio.forEach(audio => {
        if (!audio.paused) {
          console.log('Force stopping remaining audio');
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.load();
        }
      });
    }, 100);
    
    setIsModalVisible(false);
    setSelectedChunk(null);
  };

  const columns = [
    {
      title: "Content",
      dataIndex: "heading",
      width: 300,
      render: (text, record) => (
        <div className="content-cell">
          <div className="content-header">
            <Avatar 
              size={40} 
              icon={<BookOutlined />} 
              className="content-avatar"
            />
            <div className="content-info">
              <div className="content-title">
                {text || "Untitled Content"}
              </div>
              <Text type="secondary" className="content-preview">
                {record.content ? record.content.substring(0, 60) + "..." : "No preview available"}
              </Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_user_liked",
      width: 120,
      align: "center",
      render: (liked) => (
        <div className="status-cell">
          <span className="status-text">
            {liked ? <HeartFilled className="heart-icon liked" /> : <HeartOutlined className="heart-icon" />}
            {liked ? "Liked" : "Not Liked"}
          </span>
        </div>
      ),
    },
    {
      title: "Timeline",
      dataIndex: "created_at",
      width: 160,
      align: "center",
      render: (createdAt, record) => {
        const createdDate = createdAt ? new Date(createdAt) : new Date();
        const updatedDate = record.updated_at ? new Date(record.updated_at) : new Date();
        
        return (
          <div className="timeline-cell">
            <div className="timeline-item">
              <ClockCircleOutlined className="timeline-icon created" />
              <Text className="timeline-text">
                Created: {createdDate.toLocaleDateString()}
              </Text>
            </div>
            <div className="timeline-item">
              <ClockCircleOutlined className="timeline-icon updated" />
              <Text className="timeline-text">
                Updated: {updatedDate.toLocaleDateString()}
              </Text>
            </div>
          </div>
        );
      },
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
    },
    {
      title: "Metrics",
      dataIndex: "number_of_words",
      width: 120,
      align: "center",
      sorter: (a, b) => (a.number_of_words || 0) - (b.number_of_words || 0),
      render: (words) => (
        <div className="metrics-cell">
          <div className="metric-item">
            <FileTextOutlined className="metric-icon" />
            <Text strong className="metric-value">{words || 0}</Text>
            <Text type="secondary" className="metric-label">words</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      align: "center",
      render: (_, record) => (
        <Space size="small" className="actions-cell">
          <Tooltip title="Copy Content" placement="top">
            <Button
              type="text"
              size="small"
              className="action-button copy-btn"
              onClick={() => {
                navigator.clipboard?.writeText(record.content || "");
                message.success('Content copied to clipboard');
              }}
              icon={<CopyOutlined />}
            />
          </Tooltip>

          <Tooltip title="Play Content" placement="top">
            <Button
              type="text"
              size="small"
              className="action-button play-btn"
              onClick={() => handleViewChunk(record)}
              icon={<PlayCircleOutlined />}
            />
          </Tooltip>



          <Tooltip title="Enhance with AI" placement="top">
            <Button
              type="text"
              size="small"
              className="action-button enhance-btn"
              onClick={() => handleEnhanceWithAI(record)}
              icon={<ThunderboltOutlined />}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Activity",
      key: "remarks",
      width: 130,
      align: "center",
      render: (_, record) => {
        const actions = [
          { name: "Played", color: "blue", icon: <PlayCircleOutlined /> },
          { name: "Enhanced", color: "purple", icon: <ThunderboltOutlined /> }
        ];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        return (
          <div className="activity-scroll-container">
            <Tag 
              color={randomAction.color} 
              icon={randomAction.icon}
              className="activity-tag"
            >
              {randomAction.name}
            </Tag>
          </div>
        );
      },
    },
  ];

  return (
    <div className="chunk-viewer-container">
      <div className="enhanced-header">
        <div className="header-content">
          <div className="header-title">
            <div className="header-icon">
              <StarFilled />
            </div>
            <div className="header-text">
              <Title level={1}>ShiruVox Content Studio</Title>
              <Text type="secondary">Manage and enhance your content with AI-powered tools</Text>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <Text className="stat-value">{chunks.length}</Text>
              <Text className="stat-label">Total Items</Text>
            </div>
            <Divider type="vertical" style={{ height: '40px' }} />
            <div className="stat-item">
              <Text className="stat-value">{chunks.filter(item => item.is_user_liked).length}</Text>
              <Text className="stat-label">Liked</Text>
            </div>
            <Divider type="vertical" style={{ height: '40px' }} />
            <div className="stat-item">
              <Text className="stat-value">
                {chunks.length > 0 ? Math.round(chunks.reduce((sum, item) => sum + (item.number_of_words || 0), 0) / chunks.length) : 0}
              </Text>
              <Text className="stat-label">Avg Words</Text>
            </div>
          </div>
        </div>
      </div>

      <Card className="enhanced-table">
        <ProTable
          rowKey="id"
          columns={columns}
          dataSource={chunks}
          loading={loading}
          search={false}
          scroll={{ 
            x: 1200,
            y: 'calc(100vh - 400px)'
          }}
          pagination={{
            pageSize: pageSize,
            showQuickJumper: true,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            position: ['bottomCenter'],
            onChange: (page, pageSize) => {
              setPageSize(pageSize);
            },
          }}
          toolBarRender={() => [
            <Button
              key="new"
              icon={<PlusOutlined />}
              type="primary"
              className="toolbar-button primary"
              onClick={() => {
                // Add new chunk functionality placeholder
              }}
            >
              Create New
            </Button>,
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              className="toolbar-button"
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>,
            <Button 
              key="filter" 
              icon={<FilterOutlined />} 
              className="toolbar-button"
            >
              Filters
            </Button>,
            <Button 
              key="settings" 
              icon={<SettingOutlined />} 
              className="toolbar-button"
            >
              Settings
            </Button>,
          ]}
          headerTitle={null}
          cardBordered={false}
          options={{
            reload: false,
            density: true,
            fullScreen: true,
          }}
          rowClassName={(record, index) => 
            index % 2 === 0 ? 'table-row-even' : 'table-row-odd'
          }
        />
      </Card>

      {/* Enhanced Modal */}
      {isModalVisible && selectedChunk && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Button
              className="modal-close"
              onClick={handleCloseModal}
            >
              ✕
            </Button>
            <ShiruVoxChunk 
              key={selectedChunk.chunk_index} 
              chunk={selectedChunk} 
              onAudioCreated={(audioElement) => {
                setGlobalAudioElements(prev => new Set([...prev, audioElement]));
              }}
            />
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatModalVisible && selectedChunkForChat && (
        <Chat
          isVisible={isChatModalVisible}
          onClose={() => setIsChatModalVisible(false)}
          initialParagraph={selectedChunkForChat.content}
          documentId={documentId}
          bundleInfo={selectedChunkForChat.bundle_id ? {
            bundle_id: selectedChunkForChat.bundle_id,
            bundle_index: selectedChunkForChat.bundle_index,
            bundle_text: selectedChunkForChat.bundle_text
          } : null}
        />
      )}
    </div>
  );
};

export default ChunksViewer;
