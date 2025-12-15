// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Interface for what we want to return
interface NewsData {
    newsText: string;
    audioUrl: string | null;
    generatedAt: number; // Timestamp to detect cache age
}

// 1. Define the actual fetch function (uncached)
async function fetchNewsFromPerplexity(): Promise<NewsData> {
    console.log('🌐 NEWS: Cache miss/stale - Fetching fresh content from Perplexity API...');
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

    // Clean up citations (e.g. [1], [2])
    newsContent = newsContent.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();

    return {
        newsText: newsContent,
        audioUrl: null,
        generatedAt: Date.now(), // Capture time of generation
    };
}

// 2. Wrap it in unstable_cache
// We include the "date" in the key parts so it automatically invalidates every day.
const getDailyNews = unstable_cache(
    async () => fetchNewsFromPerplexity(),
    ['daily-news-cache-v2'], // base key part - bumped to v2 to force schema update
    {
        // This makes the cache entry specific to the current date.
        // When the date changes, the key differs, so we get a fresh fetch.
        tags: [`news-${new Date().toISOString().split('T')[0]}`],
        revalidate: 86400, // 24 hours
    }
);

export async function GET() {
    try {
        // We get the cached data or (if missing/stale) the fresh fetch automatically
        const data = await getDailyNews();

        // Calculate age to determine source (approximate)
        const ageInSeconds = (Date.now() - data.generatedAt) / 1000;
        const isFresh = ageInSeconds < 10; // Consider < 10s as "freshly fetched"

        if (isFresh) {
            console.log('🆕 SOURCE: Perplexity API (Fresh Fetch)');
        } else {
            console.log(`📦 SOURCE: Next.js Data Cache (Age: ${Math.floor(ageInSeconds)}s)`);
        }

        return NextResponse.json({
            ...data,
            fromCache: !isFresh,
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to fetch news'
        }, { status: 500 });
    }
}
