// src/app/api/news/route.ts
import { NextResponse } from 'next/server';

interface CacheData {
    date: string;
    content: string;
    audioPath?: string;
}

// ===== IN-MEMORY CACHE =====
// This global variable persists across warm function invocations on Vercel.
// When container is recycled (cold start), cache resets - but this is much 
// more reliable than /tmp files which are lost between different containers.
// 
// Using 'globalThis' ensures the cache survives module reloads in dev mode
// and persists across serverless function invocations in production.

// Declare global type for TypeScript
declare global {
    // eslint-disable-next-line no-var
    var newsCache: CacheData | undefined;
}

// Check for cached news (in-memory)
function getCachedNews(): CacheData | null {
    try {
        const cached = globalThis.newsCache;
        if (cached) {
            const today = new Date().toISOString().split('T')[0];
            if (cached.date === today) {
                return cached;
            }
            // Cache is stale (different day), clear it
            console.log('📅 NEWS: Cache is from', cached.date, '- clearing stale cache');
            globalThis.newsCache = undefined;
        }
    } catch (error) {
        console.error('Cache read error:', error);
    }
    return null;
}

// Save news to cache (in-memory)
function saveToCache(content: string, audioPath?: string): void {
    try {
        globalThis.newsCache = {
            date: new Date().toISOString().split('T')[0],
            content,
            audioPath,
        };
        console.log('💾 NEWS: Saved to in-memory cache for date:', globalThis.newsCache.date);
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

export async function GET() {
    try {
        // Check cache first
        const cached = getCachedNews();
        if (cached) {
            console.log('📦 NEWS: Served from cache (date:', cached.date + ')');
            return NextResponse.json({
                newsText: cached.content,
                audioUrl: cached.audioPath || null,
                fromCache: true,
            });
        }

        // Fetch from Perplexity API
        console.log('🌐 NEWS: Fetching fresh content from Perplexity API...');
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
                        content: 'You are a news presenter. Return ONE brief, engaging news describing ONE most recent important AI news headline of today. Ensure the news is around AI and Human collaboration. Max 80 words. Output plain text only.',
                    },
                    {
                        role: 'user',
                        content: 'What is the most important AI news of today?',
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