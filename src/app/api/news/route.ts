// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Use /tmp for Vercel (serverless has read-only filesystem except /tmp)
const CACHE_FILE = process.env.VERCEL ? '/tmp/news_cache.json' : path.join(process.cwd(), 'news_cache.json');

interface CacheData {
    date: string;
    content: string;
    audioPath?: string;
}

// Check for cached news
function getCachedNews(): CacheData | null {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const fileContent = fs.readFileSync(CACHE_FILE, 'utf-8');
            // Guard against empty file
            if (!fileContent || fileContent.trim() === '') {
                return null;
            }
            const data = JSON.parse(fileContent);
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
                        content: 'You are a news presenter. Return ONE brief, engaging news describing ONE most recent important AI news headline of today. Ensure the news is around AI and Human collaboration. Max 80 words. At the end mention the source of this news. Output plain text only.',
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