
import { NextResponse } from 'next/server';
import { createClient } from '@vercel/edge-config';
import dbConnect from '@/lib/mongodb';
import Subscriber from '@/lib/models/Subscriber';

// Initialize the Edge Config Client
const config = process.env.EDGE_CONFIG
    ? createClient(process.env.EDGE_CONFIG)
    : null;

interface NewsData {
    newsText: string;
    audioUrl: string | null;
    generatedAt: number;
}

export async function GET() {
    try {
        console.log('🔄 CRON: Starting scheduled job...');

        // 1. Retrieve AI News from Edge Config
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `daily_news_${today}`;
        let newsData: NewsData | undefined;

        if (config) {
            newsData = await config.get<NewsData>(cacheKey);
            if (newsData) {
                console.log(`📰 NEWS (${today}):`, newsData.newsText);
            } else {
                console.log(`⚠️ NEWS: No news found for ${today} in Edge Config.`);
            }
        } else {
            console.warn('⚠️ CRON: Edge Config not initialized (Missing EDGE_CONFIG).');
        }

        // 2. Retrieve Email and Name from MongoDB
        await dbConnect();

        // Just getting the latest subscriber for demonstration
        const subscribers = await Subscriber.find({}).sort({ createdAt: -1 });

        if (subscribers.length > 0) {
            console.log(`👥 FOUND ${subscribers.length} SUBSCRIBERS:`);
            subscribers.forEach((sub: any, index: number) => {
                console.log(`   ${index + 1}. ${sub.name} | ${sub.email} | ${sub.phone || 'No Phone'}`);
            });
        } else {
            console.log('⚠️ CRON: No subscribers found in MongoDB.');
        }

        return NextResponse.json({ success: true, message: 'Cron job executed successfully' });

    } catch (error: any) {
        console.error('❌ CRON ERROR:', error);
        return NextResponse.json({ error: error.message || 'Cron job failed' }, { status: 500 });
    }
}
