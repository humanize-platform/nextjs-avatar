// src/components/AudioPlayer.tsx
'use client';

import { useRef, useEffect } from 'react';

interface AudioPlayerProps {
    audioUrl: string | null;
    isLoading: boolean;
    autoPlay?: boolean;
}

export default function AudioPlayer({ audioUrl, isLoading, autoPlay = false }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // Attempt autoplay when audio URL is available
        if (audioUrl && audioRef.current && autoPlay) {
            audioRef.current.play().catch((err) => {
                console.log('Autoplay blocked by browser:', err);
                // User will need to tap play manually on mobile
            });
        }
    }, [audioUrl, autoPlay]);

    if (isLoading) {
        return (
            <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.7)'
            }}>
                <div className="loading">Loading audio...</div>
            </div>
        );
    }

    if (!audioUrl) {
        return (
            <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)'
            }}>
                No audio available
            </div>
        );
    }

    return (
        <audio
            ref={audioRef}
            controls
            src={audioUrl}
            style={{ width: '100%' }}
        >
            Your browser does not support the audio element.
        </audio>
    );
}