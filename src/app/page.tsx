// src/app/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import NewsTranscript from '@/components/NewsTranscript';

export default function Home() {
  const [newsText, setNewsText] = useState<string>('humanize is fetching today\'s AI headline…');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voicesLoaded, setVoicesLoaded] = useState<boolean>(false);

  // Load voices when they become available (handles async loading)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };

    // Try to load immediately
    loadVoices();

    // Also listen for voiceschanged event (needed for Chrome)
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Fetch news on page load
  useEffect(() => {
    const fetchNewsAndAudio = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/news');
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setNewsText(`Error: ${data.error}`);
        } else {
          setNewsText(data.newsText);
        }
      } catch (err) {
        setError('Failed to fetch news');
        setNewsText('Failed to fetch news. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewsAndAudio();
  }, []);

  // Get the best available voice
  const getBestVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) return null;

    const voices = speechSynthesis.getVoices();

    // Priority: Female English voices
    const femaleVoice = voices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.includes('Zira') ||  // Windows
      v.name.includes('Samantha') ||  // macOS
      v.name.includes('Karen') ||  // macOS
      v.name.includes('Victoria')  // macOS
    );

    if (femaleVoice) return femaleVoice;

    // Fallback: Any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) return englishVoice;

    // Final fallback: first available voice
    return voices[0] || null;
  }, []);

  // Client-side TTS function
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.voice = getBestVoice();

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [getBestVoice]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Handle play button click
  const handlePlayClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (newsText && !error) {
      speakText(newsText);
    }
  };

  return (
    <main className="container">
      <div className="glass-card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}>
            📰 News Transcript
          </h2>

          {/* Play/Stop TTS Button */}
          <button
            onClick={handlePlayClick}
            disabled={isLoading || !!error}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              background: isSpeaking
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading || !!error ? 'not-allowed' : 'pointer',
              opacity: isLoading || !!error ? 0.5 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !error) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isLoading ? (
              <>⏳ Loading...</>
            ) : isSpeaking ? (
              <>⏹️ Stop</>
            ) : (
              <>🔊 Listen</>
            )}
          </button>
        </div>

        <NewsTranscript
          text={newsText}
          isLoading={isLoading}
        />

        {/* Voice status indicator */}
        {!voicesLoaded && !isLoading && (
          <p style={{
            color: '#fbbf24',
            fontSize: '12px',
            marginTop: '12px',
            opacity: 0.8
          }}>
            ⚠️ Loading voices... Click Listen when ready.
          </p>
        )}
      </div>
    </main>
  );
}
