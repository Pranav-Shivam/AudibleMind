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
  Badge,
  Tooltip,
  Progress,
  Slider,
  App
} from 'antd';
import shiruvoxImage from '../assets/shiruvox.png';
// import shiruvox from '../assets/shiruvox.json';
import { useParams } from 'react-router-dom';
import { documentApi, audioApi } from '../services/api';
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
import '../styles/ContentViewer.css';

const { Title, Paragraph, Text } = Typography;

const ShiruVoxChunk = ({ chunk }) => {
  const { message } = App.useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [volume, setVolume] = useState(75);
  const [progress, setProgress] = useState(34);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [audioGenerated, setAudioGenerated] = useState(false);

  const chunkIndex = chunk.chunk_index;
  const isFirstItem = chunkIndex === 0;
  const estimatedReadTime = Math.ceil((chunk.number_of_words || 0) / 150);

  useEffect(() => {
    if (isPlaying) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [isPlaying]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        audioElement.load(); // Reset the audio element
      }
    };
  }, [audioUrl, audioElement]);

  const generateAudio = async () => {
    try {
      setAudioLoading(true);
      setAudioError(null);
      setAudioGenerated(false);
      
      // Clean up existing audio
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        audioElement.load();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      console.log('Starting audio generation for text:', chunk.content.substring(0, 100) + '...');
      
      // Call text-to-speech API
      const audioBlob = await audioApi.textToSpeech(
        chunk.content, 
        `${chunk.heading || 'shiruvox-content'}.wav`
      );
      
      // Validate the blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio data received');
      }
      
      console.log('Audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type,
        lastModified: audioBlob.lastModified
      });
      
      // Test if blob is readable
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('Audio blob array buffer size:', arrayBuffer.byteLength);
      
      // Create audio URL
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      console.log('Audio URL created:', url);
      
      // Create audio element but don't play yet
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = isMuted ? 0 : volume / 100;
      
      // Set up event listeners before setting src
      audio.onloadedmetadata = () => {
        console.log('Audio metadata loaded successfully:', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState
        });
        setAudioElement(audio);
        setAudioGenerated(true);
        message.success('Audio generated successfully! Click play to start.');
      };
      
      audio.onended = () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
        setProgress(0);
      };
      
      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        console.error('Audio error details:', {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src,
          currentSrc: audio.currentSrc
        });
        
        let errorMessage = 'Audio playback failed';
        if (audio.error) {
          switch (audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Audio playback was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio decoding error';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported';
              break;
            default:
              errorMessage = `Audio error: ${audio.error.message}`;
          }
        }
        
        setAudioError(errorMessage);
        setIsPlaying(false);
        setAudioElement(null);
        setAudioGenerated(false);
        message.error(errorMessage);
      };
      
      audio.onloadstart = () => {
        console.log('Audio loading started');
      };
      
      audio.oncanplay = () => {
        console.log('Audio can play');
      };
      
      audio.onload = () => {
        console.log('Audio loaded');
      };
      
      // Set the source after setting up event listeners
      audio.src = url;
      
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setAudioError(error.message || 'Failed to generate audio');
      setAudioGenerated(false);
      message.error(`Text-to-speech failed: ${error.message || 'Unknown error'}`);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleRetry = async () => {
    setAudioError(null);
    await generateAudio();
  };

  const handlePlayPause = async () => {
    if (!audioElement) {
      message.warning('Please generate audio first');
      return;
    }

    if (isPlaying) {
      // Pause audio
      audioElement.pause();
      setIsPlaying(false);
      message.info({
        content: 'Paused',
        icon: <PauseCircleOutlined />,
        className: 'custom-message'
      });
    } else {
      // Play audio
      try {
        // Check if audio is ready to play
        if (audioElement.readyState < 2) {
          message.warning('Audio is still loading, please wait...');
          return;
        }
        
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          message.success({
            content: 'Playing audio',
            icon: <PlayCircleOutlined />,
            className: 'custom-message'
          });
        }
      } catch (error) {
        console.error('Play error:', error);
        setAudioError(`Failed to play audio: ${error.message}`);
        message.error('Failed to play audio. Please try again.');
      }
    }
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      setVolume(0);
      // Mute audio
      if (audioElement) {
        audioElement.volume = 0;
      }
    } else {
      setVolume(75);
      // Unmute audio
      if (audioElement) {
        audioElement.volume = 0.75;
      }
    }
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
    
    // Update audio volume if audio is playing
    if (audioElement) {
      audioElement.volume = value / 100;
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
          {/* Audio Status Indicator */}
          <div className="audio-status">
            {audioLoading && (
              <div className="status-item loading">
                <Text type="secondary">🔄 Generating audio...</Text>
              </div>
            )}
            {audioError && (
              <div className="status-item error">
                <Text type="danger">❌ {audioError}</Text>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={handleRetry}
                  style={{ padding: 0, marginLeft: 8 }}
                >
                  Retry
                </Button>
              </div>
            )}
            {audioGenerated && !isPlaying && !audioLoading && (
              <div className="status-item ready">
                <Text type="success">✅ Audio ready to play</Text>
              </div>
            )}
            {isPlaying && (
              <div className="status-item playing">
                <Text type="success">🎵 Playing audio</Text>
              </div>
            )}
            {!audioGenerated && !audioLoading && !audioError && (
              <div className="status-item info">
                <Text type="secondary">💡 Click "Generate Audio" to create audio for this content</Text>
              </div>
            )}
          </div>

          {/* Generate Audio Button */}
          <div className="generate-audio-section">
            <Button
              type="primary"
              icon={<AudioOutlined />}
              onClick={generateAudio}
              loading={audioLoading}
              disabled={audioLoading}
              className="generate-audio-button"
            >
              {audioLoading ? 'Generating...' : 
               audioGenerated ? 'Re-generate Audio' : 'Generate Audio'}
            </Button>
          </div>

          <div className="main-controls">
            <Tooltip title="Previous" placement="top">
              <Button
                type="text"
                icon={<FastBackwardOutlined />}
                className="control-button secondary"
                disabled={!audioGenerated}
              />
            </Tooltip>
            
            <Tooltip title={
              !audioGenerated ? 'Generate audio first' :
              isPlaying ? 'Pause' : 'Play'
            } placement="top">
              <Button
                type="primary"
                shape="circle"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                disabled={!audioGenerated}
                className={`play-button ${isPlaying ? 'playing' : ''} ${audioGenerated ? 'ready' : ''}`}
              />
            </Tooltip>
            
            <Tooltip title="Next" placement="top">
              <Button
                type="text"
                icon={<FastForwardOutlined />}
                className="control-button secondary"
                disabled={!audioGenerated}
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
                  disabled={!audioGenerated}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                />
              </Tooltip>
              
              {showVolumeSlider && audioGenerated && (
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
          {audioError && (
            <div className="audio-error">
              <Text type="danger">Audio Error: {audioError}</Text>
            </div>
          )}
          <div className="content-text">
            <Paragraph className="main-content">
              {chunk.content}
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
                  count={liked ? 1 : 0} 
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
                  count={disliked ? 1 : 0} 
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
