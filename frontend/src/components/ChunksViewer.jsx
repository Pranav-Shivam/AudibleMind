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
  StarFilled,
  EyeOutlined,
  MessageOutlined,
  BarChartOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
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
  const [pageSize, setPageSize] = useState(10);
  const [isMobile, setIsMobile] = useState(false);
  const [tableHeight, setTableHeight] = useState('calc(100vh - 200px)');

  // Global audio manager
  const [globalAudioElements, setGlobalAudioElements] = useState(new Set());

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      
      // Calculate dynamic table height based on screen size
      const headerHeight = 56; // Header height
      const padding = mobile ? 16 : 24; // Main padding
      const toolbarHeight = mobile ? 60 : 80; // Toolbar height
      const paginationHeight = mobile ? 60 : 70; // Increased pagination height to ensure visibility
      const cardPadding = mobile ? 24 : 32; // Card padding
      
      const totalOffset = headerHeight + (padding * 2) + toolbarHeight + paginationHeight + (cardPadding * 2);
      setTableHeight(`calc(100vh - ${totalOffset}px)`);
    };

    // Check initial size
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

  // Recalculate table height when page size changes
  useEffect(() => {
    const mobile = isMobile;
    const headerHeight = 56;
    const padding = mobile ? 16 : 24;
    const toolbarHeight = mobile ? 60 : 80;
    const paginationHeight = mobile ? 60 : 70;
    const cardPadding = mobile ? 24 : 32;
    
    const totalOffset = headerHeight + (padding * 2) + toolbarHeight + paginationHeight + (cardPadding * 2);
    
    // Add a small delay to ensure pagination is properly rendered
    const timer = setTimeout(() => {
      setTableHeight(`calc(100vh - ${totalOffset}px)`);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [pageSize, isMobile]);

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
      width: isMobile ? 200 : 300,
      render: (text, record) => (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-2)',
          padding: 'var(--spacing-1) 0'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BookOutlined style={{ color: 'white', fontSize: '14px' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-1)',
              lineHeight: 1.3
            }}>
              {text || "Untitled Content"}
            </div>
            <Text type="secondary" style={{
              fontSize: 'var(--text-xs)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {record.content ? record.content.substring(0, 80) + "..." : "No preview available"}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_user_liked",
      width: isMobile ? 80 : 120,
      align: "center",
      render: (liked) => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-1)',
          padding: 'var(--spacing-1) var(--spacing-2)',
          borderRadius: 'var(--radius-full)',
          backgroundColor: liked ? 'var(--color-success-light)' : 'var(--color-surface-secondary)',
          color: liked ? 'var(--color-success)' : 'var(--color-text-secondary)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-weight-medium)'
        }}>
          {liked ? <HeartFilled style={{ color: 'var(--color-success)' }} /> : <HeartOutlined />}
          {liked ? "Liked" : "Not Liked"}
        </div>
      ),
    },
    {
      title: "Timeline",
      dataIndex: "created_at",
      width: isMobile ? 100 : 160,
      align: "center",
      render: (createdAt, record) => {
        const createdDate = createdAt ? new Date(createdAt) : new Date();
        const updatedDate = record.updated_at ? new Date(record.updated_at) : new Date();
        
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-1)',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)'
            }}>
              <CalendarOutlined style={{ color: 'var(--color-primary)' }} />
              <span>{createdDate.toLocaleDateString()}</span>
            </div>
            {!isMobile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)'
              }}>
                <ClockCircleOutlined style={{ color: 'var(--color-text-tertiary)' }} />
                <span>Updated: {updatedDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        );
      },
      sorter: (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
    },
    {
      title: "Metrics",
      dataIndex: "number_of_words",
      width: isMobile ? 80 : 120,
      align: "center",
      sorter: (a, b) => (a.number_of_words || 0) - (b.number_of_words || 0),
      render: (words) => (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          padding: 'var(--spacing-1) var(--spacing-2)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <BarChartOutlined style={{ 
            color: 'var(--color-primary)', 
            fontSize: '14px' 
          }} />
          <div style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)'
          }}>
            {words || 0}
          </div>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            words
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 120 : 220,
      align: "center",
      render: (_, record) => (
        <Space size={isMobile ? "small" : "small"} style={{ justifyContent: 'center' }}>
          <Tooltip title="Copy Content" placement="top">
            <Button
              type="text"
              size={isMobile ? "small" : "small"}
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-normal)',
                width: isMobile ? '24px' : 'auto',
                height: isMobile ? '24px' : 'auto',
                padding: isMobile ? '0' : 'var(--spacing-1) var(--spacing-2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                navigator.clipboard?.writeText(record.content || "");
                message.success('Content copied to clipboard');
              }}
              icon={<CopyOutlined />}
            />
          </Tooltip>

          <Tooltip title="View & Play Content" placement="top">
            <Button
              type="text"
              size={isMobile ? "small" : "small"}
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-normal)',
                width: isMobile ? '24px' : 'auto',
                height: isMobile ? '24px' : 'auto',
                padding: isMobile ? '0' : 'var(--spacing-1) var(--spacing-2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => handleViewChunk(record)}
              icon={<EyeOutlined />}
            />
          </Tooltip>

          <Tooltip title="Enhance with AI" placement="top">
            <Button
              type="text"
              size={isMobile ? "small" : "small"}
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-normal)',
                width: isMobile ? '24px' : 'auto',
                height: isMobile ? '24px' : 'auto',
                padding: isMobile ? '0' : 'var(--spacing-1) var(--spacing-2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => handleEnhanceWithAI(record)}
              icon={<MessageOutlined />}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Activity",
      key: "remarks",
      width: isMobile ? 80 : 130,
      align: "center",
      render: (_, record) => {
        const actions = [
          { name: "Viewed", color: "blue", icon: <EyeOutlined /> },
          { name: "Enhanced", color: "purple", icon: <MessageOutlined /> },
          { name: "Copied", color: "green", icon: <CopyOutlined /> }
        ];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        return (
          <Tag 
            color={randomAction.color} 
            icon={randomAction.icon}
            style={{
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-medium)',
              border: 'none',
              padding: 'var(--spacing-1) var(--spacing-2)'
            }}
          >
            {randomAction.name}
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, var(--color-primary-subtle) 0%, var(--color-surface-primary) 50%, var(--color-surface-secondary) 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{
        flexShrink: 0,
        backgroundColor: 'var(--color-surface-primary)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--color-border-subtle)',
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
            height: '56px',
            flexWrap: 'wrap',
            gap: 'var(--spacing-2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)',
              flexShrink: 0
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'var(--gradient-primary)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  color: 'white',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-bold)'
                }}>📄</span>
              </div>
              <div>
                <h1 style={{
                  fontSize: isMobile ? 'var(--text-base)' : 'var(--text-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-primary)',
                  margin: 0
                }}>ShiruVox Content Studio</h1>
                <p style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                  display: isMobile ? 'none' : 'block'
                }}>Manage and enhance your content with AI-powered tools</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 'var(--spacing-2)' : 'var(--spacing-4)',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 'var(--spacing-2)' : 'var(--spacing-3)',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  padding: 'var(--spacing-1) var(--spacing-3)',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)'
                }}>
                  <BarChartOutlined style={{ color: 'var(--color-primary)' }} />
                  <span style={{
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)'
                  }}>{chunks.length}</span>
                  <span style={{
                    color: 'var(--color-text-secondary)',
                    display: isMobile ? 'none' : 'inline'
                  }}>Items</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  padding: 'var(--spacing-1) var(--spacing-3)',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-success-light)',
                  border: '1px solid var(--color-success)',
                  fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)'
                }}>
                  <HeartFilled style={{ color: 'var(--color-success)' }} />
                  <span style={{
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-success)'
                  }}>{chunks.filter(item => item.is_user_liked).length}</span>
                  <span style={{
                    color: 'var(--color-success)',
                    display: isMobile ? 'none' : 'inline'
                  }}>Liked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '90%',
        margin: '0 auto',
        padding: isMobile ? 'var(--spacing-2)' : 'var(--spacing-3)',
        width: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}>

        {/* Table Card */}
        <Card style={{
          flex: 1,
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-primary)',
          animation: 'slideUp 0.6s ease-out',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <ProTable
            rowKey="id"
            columns={columns}
            dataSource={chunks}
            loading={loading}
            search={false}
            scroll={{ 
              x: isMobile ? 800 : 1200,
              y: tableHeight
            }}
            pagination={{
              pageSize: pageSize,
              showQuickJumper: !isMobile,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              position: ['bottomCenter'],
              onChange: (page, pageSize) => {
                setPageSize(pageSize);
              },
              style: {
                marginTop: 'var(--spacing-2)',
                padding: 'var(--spacing-2) 0',
                flexShrink: 0,
                position: 'sticky',
                bottom: 0,
                backgroundColor: 'var(--color-surface-primary)',
                borderTop: '1px solid var(--color-border-subtle)',
                zIndex: 1
              },
              size: isMobile ? 'small' : 'default'
            }}
            toolBarRender={() => [
              <Button
                key="new"
                icon={<PlusOutlined />}
                type="primary"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--gradient-primary)',
                  border: 'none',
                  fontWeight: 'var(--font-weight-semibold)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--transition-normal)',
                  fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
                  padding: isMobile ? 'var(--spacing-1) var(--spacing-2)' : 'var(--spacing-2) var(--spacing-4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
                onClick={() => {
                  // Add new chunk functionality placeholder
                }}
              >
                {isMobile ? 'New' : 'Create New'}
              </Button>,
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
                  padding: isMobile ? 'var(--spacing-1) var(--spacing-2)' : 'var(--spacing-2) var(--spacing-4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={handleRefresh}
                loading={loading}
              >
                {isMobile ? 'Refresh' : 'Refresh'}
              </Button>,
              <Button 
                key="filter" 
                icon={<FilterOutlined />} 
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
                  padding: isMobile ? 'var(--spacing-1) var(--spacing-2)' : 'var(--spacing-2) var(--spacing-4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isMobile ? 'Filter' : 'Filters'}
              </Button>,
              <Button 
                key="settings" 
                icon={<SettingOutlined />} 
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-normal)',
                  fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
                  padding: isMobile ? 'var(--spacing-1) var(--spacing-2)' : 'var(--spacing-2) var(--spacing-4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isMobile ? 'Settings' : 'Settings'}
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
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden'
            }}
          />
        </Card>
      </main>

      {/* Enhanced Modal */}
      {isModalVisible && selectedChunk && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--spacing-4)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'var(--color-surface-primary)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-2xl)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <Button
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: 'var(--spacing-3)',
                right: 'var(--spacing-3)',
                zIndex: 10,
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-surface-primary)',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-normal)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error-light)';
                e.currentTarget.style.color = 'var(--color-error)';
                e.currentTarget.style.borderColor = 'var(--color-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-primary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
              }}
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
