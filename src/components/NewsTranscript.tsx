// src/components/NewsTranscript.tsx
'use client';

interface NewsTranscriptProps {
    text: string;
    isLoading: boolean;
}

export default function NewsTranscript({ text, isLoading }: NewsTranscriptProps) {
    return (
        <div
            className={`news-transcript ${isLoading ? 'loading' : ''}`}
            style={{
                minHeight: '120px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
            }}
        >
            {text}
        </div>
    );
}
