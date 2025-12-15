# Gradio to Next.js/React Migration Guide

This guide provides step-by-step instructions to migrate your **AI News Presenter** Gradio app to a modern Next.js/React application.

---

## 📋 Overview

| Gradio Component | Next.js/React Equivalent |
|------------------|--------------------------|
| `gr.Blocks()` | React Component with JSX |
| `gr.Audio()` | `<audio>` HTML element + React state |
| `gr.Textbox()` | `<textarea>` or styled `<div>` |
| `gr.HTML()` | JSX with inline styles or CSS modules |
| `demo.load()` | `useEffect()` hook on component mount |
| `styles.css` | CSS Modules, Tailwind, or global CSS |
| Python backend (Perplexity API, TTS) | Next.js API Routes (`/api/*`) |

---

## 🚀 Step 1: Create Next.js Project

Open your terminal and run:

```bash
# Navigate to your project parent folder
cd c:\MyWork\pocs\avatar

# Create a new Next.js app with TypeScript and Tailwind CSS
npx create-next-app@latest nextjs-avatar --typescript --tailwind --eslint --app --src-dir --use-npm

# Navigate into the project
cd nextjs-avatar
```

---

## 📁 Step 2: Project Structure

After setup, your project structure should look like:

```
nextjs-avatar/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── news/
│   │   │       └── route.ts       # API route for fetching news + TTS
│   │   ├── globals.css            # Global styles (glassmorphism)
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main UI component
│   └── components/
│       ├── AudioPlayer.tsx        # Audio player component
│       ├── NewsTranscript.tsx     # News transcript display
│       └── Footer.tsx             # Custom footer
├── public/
│   └── audio/                     # Cached audio files (optional)
├── .env.local                     # Environment variables
└── package.json
```

---

## 🔧 Step 3: Install Dependencies

```bash
cd nextjs-avatar
npm install axios dotenv
```

For TTS (if using browser-based TTS via Web Speech API, no extra packages needed).  
For server-side TTS, you may need additional packages:

```bash
# Optional: For server-side audio generation
npm install gtts
# or use edge-tts via a Python microservice
```

---

## 🎨 Step 4: Create Global Styles

Replace `src/app/globals.css` with your glassmorphism styles:

```css
/* src/app/globals.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --gradient-start: #1a237e;
  --gradient-mid: #283593;
  --gradient-end: #0d47a1;
  --glass-bg: rgba(255, 255, 255, 0.15);
  --glass-border: rgba(255, 255, 255, 0.25);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 50%, var(--gradient-end) 100%);
  background-attachment: fixed;
}

/* Glassmorphism Card */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  padding: 24px;
}

/* Audio Player Styling */
audio {
  width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

audio::-webkit-media-controls-panel {
  background: rgba(255, 255, 255, 0.1);
}

/* News Transcript */
.news-transcript {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
}

/* Loading Animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Responsive Container */
.container {
  max-width: 100%;
  padding: 16px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container {
    max-width: 480px;
    padding: 24px;
    margin-top: 40px;
  }
}
```

---

## 🏠 Step 5: Create Main Page Component

Create `src/app/page.tsx`:

```tsx
// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import AudioPlayer from '@/components/AudioPlayer';
import NewsTranscript from '@/components/NewsTranscript';
import Footer from '@/components/Footer';

export default function Home() {
  const [newsText, setNewsText] = useState<string>('humanize is fetching today\'s AI headline…');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Equivalent to Gradio's demo.load() - runs on page load
  useEffect(() => {
    const fetchNewsAndAudio = async () => {
      try {
        setIsLoading(true);
        
        // Call your API route to get news and audio
        const response = await fetch('/api/news');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          setNewsText(`Error: ${data.error}`);
        } else {
          setNewsText(data.newsText);
          setAudioUrl(data.audioUrl);
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

  return (
    <main className="container">
      <div className="glass-card" style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          color: '#ffffff', 
          fontSize: '18px', 
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔊 AI News - Presented by humanize
        </h2>
        <AudioPlayer 
          audioUrl={audioUrl} 
          isLoading={isLoading} 
          autoPlay={true}
        />
      </div>

      <div className="glass-card">
        <h2 style={{ 
          color: '#ffffff', 
          fontSize: '18px', 
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📰 News Transcript
        </h2>
        <NewsTranscript 
          text={newsText} 
          isLoading={isLoading} 
        />
      </div>

      <Footer />
    </main>
  );
}
```

---

## 🎵 Step 6: Create Audio Player Component

Create `src/components/AudioPlayer.tsx`:

```tsx
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
```

---

## 📝 Step 7: Create News Transcript Component

Create `src/components/NewsTranscript.tsx`:

```tsx
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
```

---

## 🦶 Step 8: Create Footer Component

Create `src/components/Footer.tsx`:

```tsx
// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '24px',
      marginTop: '24px',
    }}>
      <p style={{
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '18px',
        margin: 0,
      }}>
        Built with ❤️ by{' '}
        <a 
          href="https://humanizetech.ai/" 
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          humanize
        </a>
      </p>
    </footer>
  );
}
```

---

## 🔌 Step 9: Create API Route (Backend Logic)

Create `src/app/api/news/route.ts`:

```typescript
// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'news_cache.json');

interface CacheData {
  date: string;
  content: string;
  audioPath?: string;
}

// Check for cached news
function getCachedNews(): CacheData | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];
      
      if (data.date === today) {
        return data;
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

// Save news to cache
function saveToCache(content: string, audioPath?: string): void {
  try {
    const cacheData: CacheData = {
      date: new Date().toISOString().split('T')[0],
      content,
      audioPath,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

export async function GET() {
  try {
    // Check cache first
    const cached = getCachedNews();
    if (cached) {
      return NextResponse.json({
        newsText: cached.content,
        audioUrl: cached.audioPath || null,
        fromCache: true,
      });
    }

    // Fetch from Perplexity API
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      return NextResponse.json({ 
        error: 'PERPLEXITY_API_KEY not configured' 
      }, { status: 500 });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a news presenter. Return two brief, engaging sentences describing the two most important AI news headlines from today. Ensure the news are around AI and Human collaboration. Each with max 80 words. Add a new line between the two sentences. Do NOT include any citations, reference numbers like [1], footnotes, URLs, or source lists. Output plain text only.`,
          },
          {
            role: 'user',
            content: 'What are the two most important AI news today? Answer with exactly two short sentences suitable for voice narration.',
          },
        ],
      }),
    });

    const data = await response.json();
    let newsContent = data.choices?.[0]?.message?.content || 'No news available';
    
    // Clean up citations
    newsContent = newsContent.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();

    // Save to cache
    saveToCache(newsContent);

    // TODO: Add TTS generation here
    // For now, return null for audioUrl - see Step 10 for TTS options

    return NextResponse.json({
      newsText: newsContent,
      audioUrl: null, // Replace with actual audio URL after TTS
      fromCache: false,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch news' 
    }, { status: 500 });
  }
}
```

---

## 🔊 Step 10: Text-to-Speech Options

### Option A: Browser-based TTS (Web Speech API)

Add this to your `page.tsx` for client-side TTS:

```tsx
// Add this function to page.tsx
const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.voice = speechSynthesis.getVoices().find(v => v.name.includes('Female')) || null;
    speechSynthesis.speak(utterance);
  }
};

// Call it when news loads
useEffect(() => {
  if (!isLoading && newsText && !error) {
    speakText(newsText);
  }
}, [isLoading, newsText, error]);
```

### Option B: Keep Python TTS as Microservice

Create a separate Python FastAPI service:

```python
# tts_service.py
from fastapi import FastAPI
from fastapi.responses import FileResponse
import edge_tts
import asyncio
import tempfile

app = FastAPI()

@app.post("/tts")
async def text_to_speech(text: str):
    temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
    await communicate.save(temp_file.name)
    return FileResponse(temp_file.name, media_type="audio/mpeg")
```

Then call this service from your Next.js API route.

---

## 🔐 Step 11: Environment Variables

Create `.env.local` in your Next.js project root:

```env
# .env.local
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

---

## ▶️ Step 12: Run the Application

```bash
# Development mode
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 📱 Step 13: Mobile Optimization (PWA - Optional)

Add to `src/app/layout.tsx`:

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI News Presenter',
  description: 'Daily AI news presented by humanize',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI News',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a237e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## 🎯 Summary: Gradio → React Mapping

| Gradio Code | React Equivalent |
|-------------|------------------|
| `gr.Blocks()` | Functional Component |
| `gr.Audio(autoplay=True)` | `<audio ref={...} autoPlay>` with useEffect |
| `gr.Textbox(interactive=False)` | Read-only `<div>` or disabled `<textarea>` |
| `demo.load(fn=...)` | `useEffect(() => {...}, [])` |
| Python functions | Next.js API Routes (`/api/...`) |
| `styles.css` passed to `demo.launch()` | Import in `globals.css` or CSS Modules |

---

## ✅ Checklist

- [ ] Create Next.js project
- [ ] Set up global styles with glassmorphism
- [ ] Create main page component
- [ ] Create AudioPlayer component
- [ ] Create NewsTranscript component  
- [ ] Create Footer component
- [ ] Create API route for news fetching
- [ ] Configure environment variables
- [ ] Add TTS solution (browser or server-side)
- [ ] Test on desktop and mobile
- [ ] Deploy (Vercel recommended for Next.js)

---

## 🚀 Deployment

```bash
# Deploy to Vercel (recommended for Next.js)
npm install -g vercel
vercel

# Or build for production
npm run build
npm start
```

---

**Need help?** Feel free to ask for clarification on any step!
