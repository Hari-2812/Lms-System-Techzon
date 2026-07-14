import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Loader2, AlertCircle, RefreshCw, PictureInPicture 
} from 'lucide-react';

interface CustomVideoPlayerProps {
  playbackUrl?: string;
  secureUrl?: string;
  videoUrl?: string;
  poster?: string;
  lessonId: string;
  lessonTitle: string;
  publicId?: string;
  onEnded?: () => void;
  className?: string;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  playbackUrl, secureUrl, videoUrl, poster, lessonId, lessonTitle, publicId, onEnded, className 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Auto-hide controls timer
  let controlsTimeout: NodeJS.Timeout;
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => setShowControls(false), 3000);
  };

  const finalSrc = playbackUrl || secureUrl || videoUrl;

  useEffect(() => {
    // Reset states when source changes
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setVideoError(null);
    setIsBuffering(true);
    
    console.log('[Player Debug] Initializing Lesson:', lessonTitle);
    console.log('[Player Debug] URL Selected:', finalSrc);
    if (publicId) console.log('[Player Debug] Cloudinary Public ID:', publicId);

    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [finalSrc, lessonId, lessonTitle, publicId]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const video = videoRef.current;
      if (!video) return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(volume + 0.1, 1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(volume - 0.1, 0));
          break;
        case 'f':
          e.preventDefault();
          toggleFullScreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullScreen]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsBuffering(false);
    }
  };

  const handleError = (e: any) => {
    setIsBuffering(false);
    const msg = e.target.error ? e.target.error.message || `Code ${e.target.error.code}` : 'Unknown playback error';
    setVideoError(msg);
    console.error('[Player Debug] Playback Error:', msg, 'for lesson:', lessonTitle);
  };

  // User Actions
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const toggleFullScreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!finalSrc) {
    return (
      <div className={`w-full aspect-video bg-black flex flex-col items-center justify-center text-slate-400 p-6 ${className}`}>
        <AlertCircle className="w-12 h-12 text-slate-600 mb-2" />
        <p className="text-sm">No video source available.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`group relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center ${className} ${isFullScreen ? 'h-screen' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      onDoubleClick={toggleFullScreen}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={finalSrc}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={handleError}
        preload="metadata"
        playsInline
        controlsList="nodownload"
        crossOrigin="anonymous"
      />

      {/* Buffering Overlay */}
      {isBuffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-accent animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 z-20">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3 animate-pulse" />
          <p className="text-white font-bold mb-1">Unable to play this lesson.</p>
          <p className="text-xs text-red-400 max-w-md text-center mb-4">{videoError}</p>
          <button 
            onClick={() => {
              setVideoError(null);
              setIsBuffering(true);
              videoRef.current?.load();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" /> Retry Connection
          </button>
        </div>
      )}

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying || videoError ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent full screen toggle when clicking controls
      >
        {/* Progress Bar */}
        <div 
          className="w-full h-1.5 bg-slate-600/50 rounded-full mb-4 cursor-pointer relative hover:h-2 transition-all"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-accent rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-accent transition">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:text-accent transition">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 h-1 accent-accent"
              />
            </div>

            <div className="text-xs font-medium font-poppins">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Settings Menu (Playback Speed) */}
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className="hover:text-accent transition">
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-slate-900/95 border border-slate-700 rounded-lg p-2 flex flex-col gap-1 z-50 min-w-[120px] backdrop-blur-md">
                  <span className="text-[10px] text-slate-400 font-bold px-2 py-1 uppercase tracking-wider">Speed</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                    <button 
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`text-xs text-left px-3 py-1.5 rounded hover:bg-slate-800 ${playbackSpeed === s ? 'text-accent font-bold' : 'text-slate-300'}`}
                    >
                      {s === 1 ? 'Normal' : `${s}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={togglePiP} className="hover:text-accent transition hidden sm:block" title="Picture in Picture">
              <PictureInPicture className="w-5 h-5" />
            </button>

            <button onClick={toggleFullScreen} className="hover:text-accent transition">
              {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
