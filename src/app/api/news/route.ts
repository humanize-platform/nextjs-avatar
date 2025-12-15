// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@vercel/edge-config';

// 1. Initialize Edge Config Client (Read-Only)
// We check for existence to prevent build-time errors if the env var is missing.
const config = process.env.EDGE_CONFIG
    ? createClient(process.env.EDGE_CONFIG)
    : null;

interface NewsData {
    newsText: string;
    audioUrl: string | null;
    generatedAt: number;
}

// 2. Helper to Write to Edge Config (requires Vercel API)
async function writeToEdgeConfig(key: string, value: NewsData) {
    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const teamToken = process.env.VERCEL_API_TOKEN;

    if (!edgeConfigId || !teamToken) {
        console.warn('⚠️ EDGE CONFIG: Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN. Cannot cache update.');
        return;
    }

    try {
        const updateEdgeConfig = await fetch(
            `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${teamToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: [
                        {
                            operation: 'upsert',
                            key: key,
                            value: value,
                        },
                    ],
                }),
            }
        );

        if (!updateEdgeConfig.ok) {
            const error = await updateEdgeConfig.json();
            console.error('❌ EDGE CONFIG WRITE ERROR:', error);
        } else {
            console.log(`✅ EDGE CONFIG: Updated cache for key: ${key}`);
        }
    } catch (error) {
        console.error('❌ EDGE CONFIG NETWORK ERROR:', error);
    }
}

// 3. Fetch from Perplexity (Same logic)
async function fetchNewsFromPerplexity(): Promise<NewsData> {
    console.log('🌐 NEWS: Fetching fresh content from Perplexity API...');
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (!perplexityApiKey) {
        throw new Error('PERPLEXITY_API_KEY not configured');
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

    if (!response.ok) {
        throw new Error(`Perplexity API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let newsContent = data.choices?.[0]?.message?.content || 'No news available';
    newsContent = newsContent.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();

    return {
        newsText: newsContent,
        audioUrl: null,
        generatedAt: Date.now(),
    };
}

export async function GET() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `daily_news_${today}`;

        // A. READ CHECK
        let cachedData: NewsData | undefined;
        try {
            // Only try to read if we have a valid config
            if (config) {
                cachedData = await config.get<NewsData>(cacheKey);
            } else {
                console.warn('⚠️ Edge Config Client not initialized (Missing EDGE_CONFIG env var)');
            }
        } catch (e) {
            console.warn('⚠️ Edge Config Read Failed:', e);
        }

        if (cachedData) {
            console.log(`📦 SOURCE: Edge Config Cache (Key: ${cacheKey})`);
            return NextResponse.json({
                ...cachedData,
                fromCache: true,
                source: 'edge-config'
            });
        }

        // B. CACHE MISS
        console.log(`🆕 SOURCE: Cache Miss for ${cacheKey}. Fetching...`);
        const freshData = await fetchNewsFromPerplexity();

        // C. WRITE BACK
        await writeToEdgeConfig(cacheKey, freshData);

        return NextResponse.json({
            ...freshData,
            fromCache: false,
            source: 'perplexity'
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to fetch news'
        }, { status: 500 });
    }
}

