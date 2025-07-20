// components/ContentViewer.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Avatar,
  Divider,
  Image,
  message,
  Badge,
  Tooltip,
  Progress,
  Slider
} from 'antd';
import shiruvoxImage from '../assets/shiruvox.png';
import shiruvox from '../assets/shiruvox.json';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  LikeOutlined,
  DislikeOutlined,
  ShareAltOutlined,
  BookOutlined,
  MoreOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  SoundOutlined,
  LikeFilled,
  DislikeFilled,
  BookFilled,
  HeartOutlined,
  HeartFilled
} from '@ant-design/icons';
import '../components/styles/ContentViewer.css';

const { Title, Paragraph, Text } = Typography;

const ShiruVoxChunk = ({ chunk }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [volume, setVolume] = useState(75);
  const [progress, setProgress] = useState(34);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const chunkIndex = shiruvox.indexOf(chunk);
  const isFirstItem = chunkIndex === 0;
  const estimatedReadTime = Math.ceil((chunk.number_of_words || 0) / 150);

  useEffect(() => {
    if (isPlaying) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    message.info({
      content: isPlaying ? 'Paused' : 'Playing',
      icon: isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
      className: 'custom-message'
    });
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) setVolume(0);
    else setVolume(75);
    message.info({
      content: isMuted ? 'Unmuted' : 'Muted',
      icon: isMuted ? <SoundOutlined /> : <AudioMutedOutlined />,
    });
  };

  const handleLike = () => {
    if (disliked) setDisliked(false);
    setLiked(!liked);
    message.success({
      content: liked ? 'Like removed' : 'Liked!',
      icon: <HeartFilled style={{ color: '#ff6b9d' }} />,
    });
  };

  const handleDislike = () => {
    if (liked) setLiked(false);
    setDisliked(!disliked);
    message.info(disliked ? 'Dislike removed' : 'Disliked');
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    message.success({
      content: bookmarked ? 'Bookmark removed' : 'Bookmarked!',
      icon: <BookFilled style={{ color: '#faad14' }} />,
    });
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    message.success('Link copied to clipboard!');
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    if (value === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  return (
    <div className="shiruvox-container">
      <Card className="shiruvox-card">

        {/* Enhanced Header */}
        <div className="header-section">
          <div className="header-content">
            <div className="avatar-container">
              <Avatar 
                src={shiruvoxImage} 
                size={56} 
                className={`brand-avatar ${pulseAnimation ? 'pulse' : ''}`}
              />
              <div className="brand-indicator"></div>
            </div>
            
            <div className="content-info">
              <Title level={3} className="content-title">
                {chunk.heading || 'ShiruVox Content'}
              </Title>
              <div className="content-meta">
                <Text className="author-text">by ShiruVox</Text>
                <span className="meta-separator">•</span>
                <Text className="word-count">{chunk.number_of_words || 0} words</Text>
                <span className="meta-separator">•</span>
                <Text className="read-time">{estimatedReadTime} min read</Text>
              </div>
            </div>
            
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              className="more-button"
            />
          </div>
        </div>

        {/* Enhanced Media Visualization */}
        <div className="media-section">
          <div className={`media-placeholder ${isPlaying ? 'playing' : ''}`}>
            <div className="media-content">
              <div className="media-title">
                {chunk.heading || 'ShiruVox Content'}
              </div>
              {isPlaying && (
                <div className="audio-visualizer">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              )}
            </div>
            <div className="media-overlay"></div>
          </div>
          
          {/* Enhanced Progress Section */}
          <div className="progress-section">
            <Progress
              percent={progress}
              showInfo={false}
              strokeColor={{
                '0%': '#667eea',
                '100%': '#764ba2',
              }}
              trailColor="rgba(255, 255, 255, 0.1)"
              className="custom-progress"
            />
            <div className="time-info">
              <Text className="current-time">4:20</Text>
              <Text className="total-time">~{estimatedReadTime} min</Text>
            </div>
          </div>
        </div>

        {/* Enhanced Media Controls */}
        <div className="controls-section">
          <div className="main-controls">
            <Tooltip title="Previous" placement="top">
              <Button
                type="text"
                icon={<FastBackwardOutlined />}
                className="control-button secondary"
              />
            </Tooltip>
            
            <Tooltip title={isPlaying ? 'Pause' : 'Play'} placement="top">
              <Button
                type="primary"
                shape="circle"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                className={`play-button ${isPlaying ? 'playing' : ''}`}
              />
            </Tooltip>
            
            <Tooltip title="Next" placement="top">
              <Button
                type="text"
                icon={<FastForwardOutlined />}
                className="control-button secondary"
              />
            </Tooltip>
          </div>

          <div className="audio-controls">
            <div className="volume-container">
              <Tooltip title={isMuted ? 'Unmute' : 'Mute'} placement="top">
                <Button
                  type="text"
                  icon={isMuted ? <AudioMutedOutlined /> : <SoundOutlined />}
                  onClick={handleMute}
                  className="control-button"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                />
              </Tooltip>
              
              {showVolumeSlider && (
                <div 
                  className="volume-slider-container"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <Slider
                    vertical
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                    tooltip={{ formatter: (value) => `${value}%` }}
                  />
                </div>
              )}
            </div>
            
            <Tooltip title="Record" placement="top">
              <Button
                type="text"
                icon={<AudioOutlined />}
                className="control-button record-button"
              />
            </Tooltip>
          </div>
        </div>

        <Divider className="section-divider" />

        {/* Enhanced Content Section */}
        <div className="content-section">
          <div className="content-text">
            <Paragraph className="main-content">
              {chunk.text}
            </Paragraph>
          </div>
        </div>

        <Divider className="section-divider" />

        {/* Enhanced Interaction Section */}
        <div className="interaction-section">
          <div className="engagement-buttons">
            <Tooltip title={liked ? 'Unlike' : 'Like'} placement="top">
              <Button
                type="text"
                icon={liked ? <HeartFilled /> : <HeartOutlined />}
                onClick={handleLike}
                className={`interaction-button like-button ${liked ? 'active' : ''}`}
              >
                <Badge 
                  count={(chunk.likes || 0) + (liked ? 1 : 0)} 
                  showZero={false}
                  className="interaction-badge"
                >
                  <span className="button-text">Like</span>
                </Badge>
              </Button>
            </Tooltip>

            <Tooltip title={disliked ? 'Remove dislike' : 'Dislike'} placement="top">
              <Button
                type="text"
                icon={disliked ? <DislikeFilled /> : <DislikeOutlined />}
                onClick={handleDislike}
                className={`interaction-button dislike-button ${disliked ? 'active' : ''}`}
              >
                <Badge 
                  count={(chunk.dislikes || 0) + (disliked ? 1 : 0)} 
                  showZero={false}
                  className="interaction-badge"
                >
                  <span className="button-text">Dislike</span>
                </Badge>
              </Button>
            </Tooltip>
          </div>

          <div className="action-buttons">
            <Tooltip title={bookmarked ? 'Remove bookmark' : 'Bookmark'} placement="top">
              <Button
                type="text"
                icon={bookmarked ? <BookFilled /> : <BookOutlined />}
                onClick={handleBookmark}
                className={`interaction-button bookmark-button ${bookmarked ? 'active' : ''}`}
              >
                Save
              </Button>
            </Tooltip>

            <Tooltip title="Share" placement="top">
              <Button
                type="text"
                icon={<ShareAltOutlined />}
                onClick={handleShare}
                className="interaction-button share-button"
              >
                Share
              </Button>
            </Tooltip>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ShiruVoxChunk;
