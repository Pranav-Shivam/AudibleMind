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
import {
  PlayCircleFilled,
  PauseCircleFilled,
  SoundFilled,
  AudioMutedOutlined,
  HeartOutlined,
  HeartFilled,
  DislikeOutlined,
  DislikeFilled,
  ShareAltOutlined,
  BookOutlined,
  BookFilled,
  StepBackwardOutlined,
  StepForwardOutlined,
  AudioOutlined,
  MoreOutlined,
  RobotOutlined
} from '@ant-design/icons';
import shiruvoxImage from '../assets/shiruvox.png';
// import shiruvox from '../assets/shiruvox.json';
import { useParams } from 'react-router-dom';
import { documentApi, audioApi } from '../services/api';
import '../styles/ContentViewer.css';

const { Title, Paragraph, Text } = Typography;

const AudibleMindChunk = ({ chunk, onAudioCreated }) => {
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
  const [originalAudioUrl, setOriginalAudioUrl] = useState(null); // Store the original URL

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

  // Reset audio state when chunk changes
  useEffect(() => {
    console.log('Chunk changed to:', chunk.chunk_index);
    // Clean up existing audio when chunk changes
    if (audioElement) {
      console.log('Cleaning up existing audio element');
      audioElement.pause();
      audioElement.src = '';
      audioElement.load();
      setAudioElement(null);
    }
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioGenerated(false);
    setAudioError(null);
    setIsPlaying(false);
    setProgress(0);
  }, [chunk.chunk_index]); // Reset when chunk index changes

  // Listen for global stop audio event
  useEffect(() => {
    const handleStopAllAudio = () => {
      console.log('ContentViewer received stopAllAudio event');
      if (audioElement) {
        console.log('Stopping audio element from event');
        console.log('Audio element before cleanup:', {
          src: audioElement.src.substring(0, 100) + '...',
          currentSrc: audioElement.currentSrc.substring(0, 100) + '...',
          paused: audioElement.paused,
          readyState: audioElement.readyState
        });
        
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = '';
        audioElement.load();
        
        // Clear integrity interval
        if (audioElement._integrityInterval) {
          clearInterval(audioElement._integrityInterval);
          audioElement._integrityInterval = null;
        }
        
        setAudioElement(null);
      }
      setAudioUrl(null);
      setOriginalAudioUrl(null);
      setAudioGenerated(false);
      setAudioError(null);
      setIsPlaying(false);
      setProgress(0);
    };

    window.addEventListener('stopAllAudio', handleStopAllAudio);
    
    return () => {
      window.removeEventListener('stopAllAudio', handleStopAllAudio);
    };
  }, [audioElement]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        audioElement.load(); // Reset the audio element
      }
    };
  }, []); // Only run on unmount

  const generateAudio = async () => {
    try {
      setAudioLoading(true);
      setAudioError(null);
      setAudioGenerated(false);
      
      // Clean up existing audio completely
      if (audioElement) {
        console.log('Cleaning up existing audio element before generating new one');
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = '';
        audioElement.load();
        
        // Remove all event listeners
        audioElement.onplay = null;
        audioElement.onpause = null;
        audioElement.onended = null;
        audioElement.onerror = null;
        audioElement.onloadstart = null;
        audioElement.oncanplay = null;
        audioElement.onload = null;
        audioElement.ontimeupdate = null;
        audioElement.onloadedmetadata = null;
        
        // Clear integrity interval
        if (audioElement._integrityInterval) {
          clearInterval(audioElement._integrityInterval);
          audioElement._integrityInterval = null;
        }
        
        setAudioElement(null);
      }
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
      
      console.log('Starting audio generation for text:', chunk.content.substring(0, 100) + '...');
      
      // Call text-to-speech API
      const audioBlob = await audioApi.textToSpeech(
        chunk.content, 
        `${chunk.heading || 'audiblemind-content'}.wav`
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
      
      // Validate blob data
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Audio blob is empty');
      }
      
      // Create a new blob from the array buffer to ensure it's valid
      const validatedBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
      
      // Try using data URL instead of blob URL
      const reader = new FileReader();
      const urlPromise = new Promise((resolve, reject) => {
        reader.onload = () => {
          const dataUrl = reader.result;
          console.log('Data URL created, length:', dataUrl.length);
          resolve(dataUrl);
        };
        reader.onerror = () => reject(new Error('Failed to create data URL'));
      });
      
      reader.readAsDataURL(validatedBlob);
      const url = await urlPromise;
      setAudioUrl(url);
      setOriginalAudioUrl(url); // Store the original URL for validation
      
      console.log('Audio URL created:', url.substring(0, 100) + '...');
      console.log('Blob details:', {
        size: validatedBlob.size,
        type: validatedBlob.type,
        lastModified: validatedBlob.lastModified
      });
      
      // Create audio element but don't play yet
      const audio = new Audio();
      audio.preload = 'auto'; // Change to auto to ensure full loading
      audio.volume = isMuted ? 0 : volume / 100;
      audio.crossOrigin = 'anonymous'; // Add cross-origin attribute
      
      // Verify the URL is valid before proceeding
      if (!url || !url.startsWith('data:audio/')) {
        throw new Error('Invalid audio URL generated');
      }
      
      // Set up event listeners before setting src
      
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
        
        // Check if the source is corrupted
        if (audio.src && audio.src.includes('localhost:5173/chunks/')) {
          errorMessage = 'Audio source corrupted. Please regenerate audio.';
          console.error('Corrupted audio source detected:', audio.src);
        }
        
        setAudioError(errorMessage);
        setIsPlaying(false);
        setAudioElement(null);
        setAudioGenerated(false);
        message.error(errorMessage);
        
        // Clean up the audio URL on error
        if (audioUrl) {
          // For data URLs, we don't need to revoke anything
          setAudioUrl(null);
        }
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
      console.log('Setting audio src to:', url.substring(0, 100) + '...');
      audio.src = url;
      console.log('Audio src after setting:', audio.src.substring(0, 100) + '...');
      audio.load(); // Explicitly load the audio
      
      // Add a timeout to prevent stuck loading
      const loadTimeout = setTimeout(() => {
        if (audio.readyState < 2) {
          console.error('Audio loading timeout');
          audio.onerror(new Error('Audio loading timeout'));
        }
      }, 10000); // 10 second timeout
      
      // Clear timeout when audio loads successfully
      audio.onloadedmetadata = () => {
        clearTimeout(loadTimeout);
        console.log('Audio metadata loaded successfully:', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          src: audio.src.substring(0, 100) + '...',
          currentSrc: audio.currentSrc.substring(0, 100) + '...'
        });
        setAudioElement(audio);
        setAudioGenerated(true);
        
        // Register with global audio manager
        if (onAudioCreated) {
          onAudioCreated(audio);
        }
        
        // Add protection against src corruption
        const originalSrc = audio.src;
        const checkSrcIntegrity = () => {
          if (audio.src !== originalSrc && audio.src.includes('localhost:5173/chunks/')) {
            console.warn('Audio src corruption detected, restoring...');
            audio.src = originalSrc;
            audio.load();
          }
        };
        
        // Check src integrity periodically
        const integrityInterval = setInterval(checkSrcIntegrity, 1000);
        
        // Store the interval for cleanup
        audio._integrityInterval = integrityInterval;
        
        message.success('Audio generated successfully! Click play to start.');
      };
      
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
        icon: <PauseCircleFilled />,
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
        
        // Check if the audio source is valid using original URL
        if (!originalAudioUrl || !audioElement.src || 
            audioElement.src.includes('localhost:5173/chunks/') ||
            !audioElement.src.startsWith('data:audio/')) {
          console.error('Invalid audio source detected:', audioElement.src);
          console.error('Original URL:', originalAudioUrl);
          console.error('Audio element state:', {
            src: audioElement.src,
            currentSrc: audioElement.currentSrc,
            readyState: audioElement.readyState,
            networkState: audioElement.networkState,
            paused: audioElement.paused
          });
          message.error('Audio source is invalid. Please regenerate audio.');
          setAudioError('Invalid audio source');
          setAudioGenerated(false);
          setAudioElement(null);
          setOriginalAudioUrl(null);
          return;
        }
        
        // If the source has been corrupted, try to restore it
        if (audioElement.src !== originalAudioUrl) {
          console.log('Audio source corrupted, attempting to restore...');
          audioElement.src = originalAudioUrl;
          audioElement.load();
          // Wait a bit for the audio to reload
          setTimeout(() => {
            if (audioElement.readyState >= 2) {
              console.log('Audio source restored successfully');
            } else {
              console.error('Failed to restore audio source');
              setAudioError('Failed to restore audio source');
              setAudioGenerated(false);
              setAudioElement(null);
            }
          }, 1000);
          return;
        }
        
        // Double-check the source before playing
        console.log('About to play audio with source:', audioElement.src.substring(0, 100) + '...');
        
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          message.success({
            content: 'Playing audio',
            icon: <PlayCircleFilled />,
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
      icon: isMuted ? <AudioMutedOutlined /> : <SoundFilled />,
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
            <div className="audiblemind-container">
              <Card className="audiblemind-card">

        {/* Enhanced Header */}
        <div className="header-section">
          <div className="header-content">
            <div className="avatar-container">
              <Avatar 
                src={shiruvoxImage} 
                size={56} 
                className={`brand-avatar ${pulseAnimation ? 'pulse' : ''}`}
                icon={<RobotOutlined />} // Fallback icon
              />
              <div className="brand-indicator"></div>
            </div>
            
            <div className="content-info">
              <Title level={3} className="content-title">
                {chunk.heading || 'AudibleMind Content'}
              </Title>
              <div className="content-meta">
                <Text className="author-text">
                  <RobotOutlined /> AudibleMind AI
                </Text>
                <span className="meta-separator">•</span>
                <Text className="word-count">{chunk.number_of_words || 0} words</Text>
                <span className="meta-separator">•</span>
                <Text className="read-time">{estimatedReadTime} min read</Text>
              </div>
            </div>
            
            <Tooltip title="More options">
              <Button 
                type="text" 
                icon={<MoreOutlined />} 
                className="more-button"
              />
            </Tooltip>
          </div>
        </div>

        {/* Enhanced Media Visualization */}
        <div className="media-section">
          <div className={`media-placeholder ${isPlaying ? 'playing' : ''}`}>
            <div className="media-content">
              <div className="media-title">
                {chunk.heading || 'AudibleMind Content'}
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
                <Text type="secondary">
                  <SoundFilled spin /> Generating audio...
                </Text>
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
                <Text type="success">
                  <AudioOutlined /> Audio ready
                </Text>
              </div>
            )}
            {isPlaying && (
              <div className="status-item playing">
                <Text type="success">
                  <SoundFilled spin /> Playing audio
                </Text>
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
                        
            <Tooltip title={
              !audioGenerated ? 'Generate audio first' :
              isPlaying ? 'Pause' : 'Play'
            } placement="top">
              <Button
                type="primary"
                shape="circle"
                icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
                onClick={handlePlayPause}
                disabled={!audioGenerated}
                className={`play-button ${isPlaying ? 'playing' : ''} ${audioGenerated ? 'ready' : ''}`}
              />
            </Tooltip>
            
          </div>

          <div className="audio-controls">
            <div className="volume-container">
              <Tooltip title={isMuted ? 'Unmute' : 'Mute'} placement="top">
                <Button
                  type="text"
                  icon={isMuted ? <AudioMutedOutlined /> : <SoundFilled />}
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

export default AudibleMindChunk;
