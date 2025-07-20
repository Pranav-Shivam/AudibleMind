import React, { useState } from "react";
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
  Divider
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  SettingOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  EditOutlined,
  ThunderboltOutlined,
  HeartFilled,
  HeartOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  StarFilled
} from "@ant-design/icons";
import ShiruVoxChunk from "./ContentViewer";
import shiruvox from "../assets/shiruvox.json";
import "../components/styles/ChunkViewer.css";

const { Text, Title } = Typography;

const ChunkViewer = () => {
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pageSize, setPageSize] = useState(5);

  const handleViewChunk = (record) => {
    setSelectedChunk(record);
    setIsModalVisible(true);
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
                {record.text ? record.text.substring(0, 60) + "..." : "No preview available"}
              </Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "isUserLiked",
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
      dataIndex: "created_time",
      width: 160,
      align: "center",
      render: (_, record) => {
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
        const updatedDate = new Date();
        updatedDate.setDate(updatedDate.getDate() - Math.floor(Math.random() * 7));
        
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
      sorter: (a, b) => new Date(a.created_time) - new Date(b.created_time),
    },
    {
      title: "Metrics",
      dataIndex: "number_of_words",
      width: 120,
      align: "center",
      sorter: (a, b) => a.number_of_words - b.number_of_words,
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
                navigator.clipboard?.writeText(record.text || "");
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

          <Tooltip title="Edit Content" placement="top">
            <Button
              type="text"
              size="small"
              className="action-button edit-btn"
              onClick={() => {
                console.log("Edit chunk:", record.heading);
              }}
              icon={<EditOutlined />}
            />
          </Tooltip>

          <Tooltip title="Enhance with AI" placement="top">
            <Button
              type="text"
              size="small"
              className="action-button enhance-btn"
              onClick={() => {
                console.log("Enhance chunk:", record.heading);
              }}
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
          { name: "Edited", color: "green", icon: <EditOutlined /> },
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
              <Text className="stat-value">{shiruvox.length}</Text>
              <Text className="stat-label">Total Items</Text>
            </div>
            <Divider type="vertical" style={{ height: '40px' }} />
            <div className="stat-item">
              <Text className="stat-value">{shiruvox.filter(item => item.isUserLiked).length}</Text>
              <Text className="stat-label">Liked</Text>
            </div>
            <Divider type="vertical" style={{ height: '40px' }} />
            <div className="stat-item">
              <Text className="stat-value">{Math.round(shiruvox.reduce((sum, item) => sum + (item.number_of_words || 0), 0) / shiruvox.length)}</Text>
              <Text className="stat-label">Avg Words</Text>
            </div>
          </div>
        </div>
      </div>

      <Card className="enhanced-table">
      <ProTable
        rowKey="heading"
        columns={columns}
        dataSource={shiruvox}
        search={false}
          scroll={{ 
            x: 1200,  // Enable horizontal scrolling when table width exceeds 1200px
            y: 'calc(100vh - 500px)'  // Reduce height to leave more space for pagination
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
            onClick={() => window.location.reload()}
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
              onClick={() => setIsModalVisible(false)}
            >
              ✕
            </Button>
            <ShiruVoxChunk chunk={selectedChunk} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChunkViewer;
