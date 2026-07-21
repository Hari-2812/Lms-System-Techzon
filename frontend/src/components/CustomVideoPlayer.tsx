import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Loader2, AlertCircle, RefreshCw, PictureInPicture,
  SkipBack, SkipForward, Subtitles, CheckCircle, ArrowRight
} from 'lucide-react';

interface CustomVideoPlayerProps {
  playbackUrl?: string;
  secureUrl?: string;
  videoUrl?: string;
  poster?: string;
  lessonId: string;
  courseId?: string;
  lessonTitle: string;
  publicId?: string;
  onEnded?: () => void;
  className?: string;
  
  // New props for LMS progression
  onLessonComplete?: () => void;
  onAutoPlayNext?: () => void;
  hasNextLesson?: boolean;
  isAlreadyCompleted?: boolean;
  subtitlesUrl?: string; // e.g., a .vtt file url
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
  playbackUrl, secureUrl, videoUrl, poster, lessonId, courseId, lessonTitle, publicId, 
  onEnded, className, onLessonComplete, onAutoPlayNext, hasNextLesson, 
  isAlreadyCompleted, subtitlesUrl 
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
  
  // Captions
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  
  // Resume watching state
  const [lastFetchedTime, setLastFetchedTime] = useState(0);
  const [hasResumed, setHasResumed] = useState(false);

  // Auto-play state
  const [showAutoPlayOverlay, setShowAutoPlayOverlay] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Watched tracking
  const [watchedSeconds, setWatchedSeconds] = useState<Set<number>>(new Set());
  const lastTimeUpdateRef = useRef(0);

  // Auto-hide controls timer
  let controlsTimeout: NodeJS.Timeout;
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => setShowControls(false), 3000);
  };

  const finalSrc = playbackUrl || secureUrl || videoUrl;

  useEffect(() => {
    // Reset states when source (lesson) changes
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setVideoError(null);
    setIsBuffering(true);
    setShowAutoPlayOverlay(false);
    setWatchedSeconds(new Set());
    setCaptionsEnabled(false);
    setHasResumed(false);
    setLastFetchedTime(0);
    lastTimeUpdateRef.current = 0;
    
    if (videoRef.current) {
      videoRef.current.load();
    }

    const fetchProgress = async () => {
      try {
        const res = await api.get(`/progress/${lessonId}`);
        if (res.data.success && res.data.data) {
          const fetchedTime = res.data.data.currentTime || 0;
          if (fetchedTime > 5) {
            setLastFetchedTime(fetchedTime);
          }
        }
      } catch (err) {
        console.error("Failed to fetch progress", err);
      }
    };
    fetchProgress();
  }, [finalSrc, lessonId]);

  // Handle countdown for autoplay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAutoPlayOverlay && hasNextLesson) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        if (onAutoPlayNext) onAutoPlayNext();
      }
    }
    return () => clearTimeout(timer);
  }, [showAutoPlayOverlay, countdown, hasNextLesson, onAutoPlayNext]);

  // Periodic save of progress to backend
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const ct = videoRef.current.currentTime;
        const dur = videoRef.current.duration || 0;
        if (ct > 0 && dur - ct > 10 && courseId) {
          api.post('/progress/update', {
            courseId,
            lessonId,
            videoId: publicId,
            currentTime: ct,
            duration: dur,
            watchedPercentage: dur > 0 ? (ct / dur) * 100 : 0
          }).catch(console.error);
        }
      }
    }, 5000); // save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [lessonId, courseId, publicId]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (showAutoPlayOverlay) return; // disable shortcuts when overlays are active

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
          skipTime(5);
          break;
        case 'arrowleft':
          e.preventDefault();
          skipTime(-5);
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
        case 'c':
          e.preventDefault();
          toggleCaptions();
          break;
        case '>':
        case '.':
          e.preventDefault();
          changeSpeed(Math.min(playbackSpeed + 0.25, 2));
          break;
        case '<':
        case ',':
          e.preventDefault();
          changeSpeed(Math.max(playbackSpeed - 0.25, 0.5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullScreen, playbackSpeed, showAutoPlayOverlay]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(ct);
    
    if (duration > 0) {
      setProgress((ct / duration) * 100);
    }

    // Track watched seconds robustly
    if (isPlaying) {
      const prevTime = lastTimeUpdateRef.current;
      setWatchedSeconds(prev => {
        const newSet = new Set(prev);
        if (ct > prevTime && ct - prevTime <= 3) {
          for (let i = Math.floor(prevTime); i <= Math.floor(ct); i++) {
            newSet.add(i);
          }
        } else {
          newSet.add(Math.floor(ct));
        }
        return newSet;
      });
      lastTimeUpdateRef.current = ct;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsBuffering(false);
      updateTrackMode(captionsEnabled);
      
      if (lastFetchedTime > 0 && !hasResumed && !isAlreadyCompleted) {
        videoRef.current.currentTime = lastFetchedTime;
        setHasResumed(true);
      }
    }
  };

  const updateTrackMode = (enabled: boolean) => {
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = enabled ? 'showing' : 'hidden';
    }
  };

  const handleError = (e: any) => {
    setIsBuffering(false);
    const msg = e.target.error ? e.target.error.message || `Code ${e.target.error.code}` : 'Unknown playback error';
    setVideoError(msg);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();

    console.log("[PLAYER] VIDEO ENDED");

    // Determine completion
    let watchedRatio = 0;
    if (duration > 0) {
      watchedRatio = watchedSeconds.size / duration;
    }
    
    console.log(`[PLAYER] Watched Ratio: ${watchedRatio} (watched: ${watchedSeconds.size}, duration: ${duration})`);
    console.log(`[PLAYER] Is Already Completed: ${isAlreadyCompleted}`);

    // If watched at least 95% or already completed previously
    if (watchedRatio >= 0.95 || isAlreadyCompleted) {
      if (!isAlreadyCompleted && onLessonComplete) {
        console.log("[PLAYER] Calling onLessonComplete()");
        onLessonComplete();
      }
      
      // Trigger Autoplay overlay if there's a next lesson
      if (hasNextLesson) {
        console.log("[PLAYER] Next Lesson Unlocked - starting countdown");
        setCountdown(5);
        setShowAutoPlayOverlay(true);
      }
    } else {
      console.log("[PLAYER] Not marking completed because watchedRatio < 95% and not already completed.");
    }
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
    videoRef.current.currentTime = pos * duration;
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
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

  const toggleCaptions = () => {
    const newState = !captionsEnabled;
    setCaptionsEnabled(newState);
    updateTrackMode(newState);
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
        onEnded={handleVideoEnded}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={handleError}
        preload="metadata"
        playsInline
        controlsList="nodownload"
        crossOrigin="anonymous"
      >
        {subtitlesUrl && (
          <track 
            kind="subtitles" 
            src={subtitlesUrl} 
            srcLang="en" 
            label="English" 
            default={captionsEnabled} 
          />
        )}
      </video>

      {/* Auto-play Next Overlay */}
      {showAutoPlayOverlay && (
        <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Lesson Completed!</h3>
          <p className="text-slate-300 mb-8">Next Lesson starts in {countdown}...</p>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                setShowAutoPlayOverlay(false);
                if (onAutoPlayNext) onAutoPlayNext();
              }}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold transition flex items-center gap-2 shadow-lg shadow-accent/20"
            >
              <Play className="w-5 h-5" /> Play Now
            </button>
            <button 
              onClick={() => setShowAutoPlayOverlay(false)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Buffering Overlay */}
      {isBuffering && !videoError && !showAutoPlayOverlay && (
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

      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 pt-16 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-300 z-20 ${
          showControls || !isPlaying || videoError || showAutoPlayOverlay ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Progress Bar */}
        <div 
          className="w-full h-1.5 bg-slate-600/50 rounded-full mb-4 cursor-pointer relative hover:h-2.5 transition-all group/progress flex items-center"
          onClick={handleProgressClick}
        >
          {/* Buffer Bar (Simplified) */}
          <div 
            className="absolute top-0 left-0 h-full bg-slate-400/50 rounded-full"
            style={{ width: `${videoRef.current?.buffered.length ? (videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / duration) * 100 : 0}%` }}
          />
          {/* Play Progress */}
          <div 
            className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber Knob */}
          <div 
            className="absolute h-3.5 w-3.5 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity transform -translate-x-1/2"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={togglePlay} className="hover:text-accent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full">
              {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
            </button>
            
            <button onClick={() => skipTime(-5)} className="hover:text-accent transition focus:outline-none" title="Rewind 5s">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={() => skipTime(5)} className="hover:text-accent transition focus:outline-none" title="Forward 5s">
              <SkipForward className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 group/volume relative">
              <button onClick={toggleMute} className="hover:text-accent transition focus:outline-none">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-0 overflow-hidden group-hover/volume:w-24 focus:w-24 transition-all duration-300 h-1.5 rounded-lg appearance-none bg-slate-600 outline-none accent-accent cursor-pointer"
                title="Volume"
              />
            </div>

            <div className="text-xs font-medium font-poppins hidden sm:block tracking-wide">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-5 relative">
            
            {/* Captions */}
            <button 
              onClick={toggleCaptions} 
              className={`hover:text-accent transition focus:outline-none flex flex-col items-center ${captionsEnabled ? 'text-accent' : 'text-slate-300'}`} 
              title="Captions (C)"
            >
              <Subtitles className="w-5 h-5" />
              {captionsEnabled && <span className="w-1 h-1 bg-accent rounded-full mt-0.5"></span>}
            </button>

            {/* Settings Menu (Playback Speed) */}
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className="hover:text-accent transition focus:outline-none">
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-3 bg-slate-900/95 border border-slate-700/50 rounded-xl p-2 flex flex-col gap-1 z-50 w-32 shadow-2xl backdrop-blur-xl">
                  <span className="text-[10px] text-slate-400 font-bold px-2 py-1 uppercase tracking-wider mb-1">Speed</span>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button 
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`text-xs text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-between ${playbackSpeed === s ? 'text-accent font-bold bg-accent/10' : 'text-slate-300'}`}
                    >
                      {s === 1 ? 'Normal' : `${s}x`}
                      {playbackSpeed === s && <CheckCircle className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={togglePiP} className="hover:text-accent transition focus:outline-none hidden sm:block" title="Picture in Picture">
              <PictureInPicture className="w-5 h-5" />
            </button>

            <button onClick={toggleFullScreen} className="hover:text-accent transition focus:outline-none" title="Full Screen (F)">
              {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustomVideoPlayer);
