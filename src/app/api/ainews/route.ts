
import { NextRequest, NextResponse } from 'next/server';
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
async function writeToEdgeConfig(key: string, value: NewsData, region: string) {
    const edgeConfigId = process.env.EDGE_CONFIG_ID; // e.g. ecfg_...
    const teamToken = process.env.VERCEL_API_TOKEN;

    if (!edgeConfigId || !teamToken) {
        console.warn('⚠️ EDGE CONFIG: Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN. Cannot cache update.');
        return;
    }

    try {
        // A. FETCH ALL CURRENT ITEMS to find what to clean up
        const itemsResponse = await fetch(
            `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${teamToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!itemsResponse.ok) {
            console.error('❌ EDGE CONFIG: Failed to fetch items for cleanup check.', await itemsResponse.text());
            return;
        }

        const currentItems = await itemsResponse.json(); // returns { "key1": val, "key2": val... }

        // B. IDENTIFY STALE KEYS
        // We want to delete any key starting with "daily_news_[region]_" that is NOT the current new key
        const prefix = `daily_news_${region}_`;
        const keysToDelete = Object.keys(currentItems || {}).filter(k =>
            k.startsWith(prefix) && k !== key
        );

        if (keysToDelete.length > 0) {
            console.log(`🧹 EDGE CONFIG: Found ${keysToDelete.length} stale keys to delete for region ${region}:`, keysToDelete);
        }

        // C. PREPARE BATCH UPDATE (Deletes + Upsert)
        const itemsToUpdate = [
            ...keysToDelete.map(k => ({ operation: 'delete', key: k })),
            {
                operation: 'upsert',
                key: key,
                value: value,
            },
        ];

        // D. EXECUTE BATCH UPDATE
        const updateEdgeConfig = await fetch(
            `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${teamToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: itemsToUpdate,
                }),
            }
        );

        if (!updateEdgeConfig.ok) {
            const error = await updateEdgeConfig.json();
            console.error('❌ EDGE CONFIG WRITE ERROR:', error);
        } else {
            console.log(`✅ EDGE CONFIG: Successfully cleaned ${keysToDelete.length} stale keys and updated cache for ${key}`);
        }
    } catch (error) {
        console.error('❌ EDGE CONFIG NETWORK ERROR:', error);
    }
}

// 3. Fetch from Perplexity
async function fetchNewsFromPerplexity(region: string): Promise<NewsData> {
    console.log(`🌐 NEWS: Fetching fresh content from Perplexity API for region: ${region}...`);
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
                    content: `You are a news presenter. Return a brief, engaging news describing one of the most recent important AI news specifically related to or impacting the region "${region}". If there is no specific regional news, provide global AI news relevant to that region. Ensure the news is around AI and Human collaboration. Max 100 words. Output plain text only.`,
                },
                {
                    role: 'user',
                    content: `What is the most important AI news for ${region} today?`,
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

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        // Default to 'Global' if no region is provided, or sanitise input
        const regionParam = searchParams.get('region');
        const region = regionParam ? regionParam.trim().replace(/[^a-zA-Z0-9-_]/g, '') : 'Global';

        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `daily_news_${region}_${today}`;

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
                message: cachedData.newsText
            });
        }

        // B. CACHE MISS
        console.log(`🆕 SOURCE: Cache Miss for ${cacheKey}. Fetching...`);
        const freshData = await fetchNewsFromPerplexity(region);

        // C. WRITE BACK
        // Note: We don't await this to keep the response fast (fire and forget for cache update)
        // However, Vercel functions might terminate, so usually it's safer to await or use waitUntil if available. 
        // For simplicity and consistency with previous route, we will await it.
        await writeToEdgeConfig(cacheKey, freshData, region);

        return NextResponse.json({
            message: freshData.newsText
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to fetch news'
        }, { status: 500 });
    }
}
