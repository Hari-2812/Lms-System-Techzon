import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface CustomVideoPlayerProps {
  playbackUrl: string;
  poster?: string;
  lessonId: string;
  courseId?: string;
  lessonTitle: string;
  onEnded?: () => void;
  className?: string;
  onLessonComplete?: () => void;
  onAutoPlayNext?: () => void;
  hasNextLesson?: boolean;
  isAlreadyCompleted?: boolean;
  subtitlesUrl?: string;
  videoStatus?: number;
  lastPlaybackPosition?: number;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  playbackUrl,
  lessonId,
  courseId,
  onEnded,
  className,
  onLessonComplete,
  onAutoPlayNext,
  hasNextLesson,
  isAlreadyCompleted,
  videoStatus,
  lastPlaybackPosition
}) => {
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showAutoPlayOverlay, setShowAutoPlayOverlay] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  const progressTrackedRef = useRef(false);
  const durationRef = useRef(0);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    // Reset tracker when lesson changes
    progressTrackedRef.current = false;
    durationRef.current = 0;
    lastSyncTimeRef.current = 0;
    setShowAutoPlayOverlay(false);
    setVideoError(null);
  }, [lessonId]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://iframe.mediadelivery.net') return;
      
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        
        if (data.event === 'ready' || data.event === 'loadedmetadata') {
          if (data.duration) durationRef.current = data.duration;
        }
        
        if (data.event === 'timeupdate') {
          if (data.duration) durationRef.current = data.duration;
          const ct = data.currentTime;
          const dur = durationRef.current;
          
          if (ct && dur && dur > 0) {
            const watchedPercentage = (ct / dur) * 100;
            
            // Sync progress every 5 seconds
            const now = Date.now();
            if (now - lastSyncTimeRef.current > 5000) {
              lastSyncTimeRef.current = now;
              api.post('/progress/update', { 
                courseId, 
                lessonId, 
                currentTime: ct, 
                duration: dur, 
                watchedPercentage 
              }).catch(console.error);
            }
            
            // Auto complete if watched over 95%
            if (watchedPercentage >= 95 && !isAlreadyCompleted && !progressTrackedRef.current) {
              progressTrackedRef.current = true;
              if (onLessonComplete) onLessonComplete();
            }
          }
        }
        
        if (data.event === 'ended') {
          if (onEnded) onEnded();
          if (!isAlreadyCompleted && !progressTrackedRef.current) {
            progressTrackedRef.current = true;
            if (onLessonComplete) onLessonComplete();
          }
          if (hasNextLesson) {
            setCountdown(5);
            setShowAutoPlayOverlay(true);
          }
        }
      } catch (err) {
        // Ignore JSON parse errors for unrelated messages
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [courseId, lessonId, isAlreadyCompleted, onLessonComplete, onEnded, hasNextLesson]);

  // Autoplay countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAutoPlayOverlay) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        if (onAutoPlayNext) onAutoPlayNext();
      }
    }
    return () => clearTimeout(timer);
  }, [showAutoPlayOverlay, countdown, onAutoPlayNext]);

  if (videoStatus !== undefined && videoStatus !== null && videoStatus < 3) {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center bg-slate-900 text-slate-400">
        <AlertCircle className="w-12 h-12 mb-2 opacity-50 text-yellow-500" />
        <p className="text-sm font-semibold">Video is still processing. Please try again later.</p>
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center bg-slate-900 text-slate-400">
        <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm font-semibold">Video is not yet available.</p>
      </div>
    );
  }

  let finalUrl = playbackUrl;
  try {
    const urlObj = new URL(playbackUrl);
    urlObj.searchParams.set('autoplay', 'false');
    if (lastPlaybackPosition && lastPlaybackPosition > 0 && !isAlreadyCompleted) {
      urlObj.searchParams.set('t', Math.floor(lastPlaybackPosition).toString());
    }
    finalUrl = urlObj.toString();
  } catch (e) {
    // If playbackUrl is not a valid URL format, just use it directly
  }

  return (
    <div 
      className={`relative ${className || ''}`}
      style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', background: '#000' }}
    >
      {videoError ? (
        <div className="flex h-full w-full flex-col items-center justify-center text-center text-red-500 p-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">Unable to play this lesson.</p>
          <p className="text-xs mt-1 text-red-400/70">{videoError}</p>
        </div>
      ) : (
        <iframe
          src={finalUrl}
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          className="border-none"
          loading="lazy"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          onError={() => setVideoError('Failed to load video iframe from Bunny Stream')}
        />
      )}

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
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg transition"
            >
              Play Next Now
            </button>
            <button 
              onClick={() => setShowAutoPlayOverlay(false)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomVideoPlayer;
