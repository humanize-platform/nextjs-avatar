// app/api/daily-news/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@vercel/edge-config";

interface NewsData {
    newsText: string;
    audioUrl: string | null;
    generatedAt: number;
}

// Meta key stored in Edge Config to remember the active rotation anchor per region
interface NewsMeta {
    activeKey: string;   // e.g. daily_news_EUROPE_2025-12-17
    activeDate: string;  // e.g. 2025-12-17
    updatedAt: number;
}

const config = process.env.EDGE_CONFIG ? createClient(process.env.EDGE_CONFIG) : null;

function sanitizeRegion(input: string | null): string {
    const cleaned = (input ?? "").trim().replace(/[^a-zA-Z0-9-_]/g, "");
    return cleaned.length > 0 ? cleaned : "Global";
}

function utcTodayYYYYMMDD(): string {
    return new Date().toISOString().split("T")[0];
}

function parseUtcDate(dateYYYYMMDD: string): Date {
    return new Date(`${dateYYYYMMDD}T00:00:00Z`);
}

function formatUtcDate(d: Date): string {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function addUtcDays(dateYYYYMMDD: string, days: number): string {
    const d = parseUtcDate(dateYYYYMMDD);
    d.setUTCDate(d.getUTCDate() + days);
    return formatUtcDate(d);
}

function diffUtcDays(fromYYYYMMDD: string, toYYYYMMDD: string): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const from = parseUtcDate(fromYYYYMMDD).getTime();
    const to = parseUtcDate(toYYYYMMDD).getTime();
    return Math.floor((to - from) / msPerDay);
}

function computeRotatedDate(anchorDate: string, today: string, periodDays: number): string {
    const d = diffUtcDays(anchorDate, today);
    if (d <= 0) return anchorDate;
    const periods = Math.floor(d / periodDays);        // 7..13 -> 1, 14..20 -> 2, etc.
    return addUtcDays(anchorDate, periods * periodDays);
}

function metaKey(region: string): string {
    // Does NOT start with `daily_news_${region}_` so our cleanup won’t delete it.
    return `daily_news_meta_${region}`;
}

function vercelTeamQuery(): string {
    const teamId = process.env.VERCEL_TEAM_ID?.trim();
    const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim();
    if (teamId) return `?teamId=${encodeURIComponent(teamId)}`;
    if (teamSlug) return `?slug=${encodeURIComponent(teamSlug)}`;
    return "";
}

// Fetch from Perplexity
async function fetchNewsFromPerplexity(region: string): Promise<NewsData> {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityApiKey) throw new Error("PERPLEXITY_API_KEY not configured");

    const resp = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${perplexityApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "sonar",
            messages: [
                {
                    role: "system",
                    content: `You are a news presenter. Return a brief, engaging news describing one of the most recent important AI news specifically related to or impacting the region "${region}". If there is no specific regional news, provide global AI news relevant to that region. Ensure the news is around AI and Human collaboration. Max 100 words. Output plain text only.`,
                },
                { role: "user", content: `What is the most important AI news for ${region} today?` },
            ],
        }),
    });

    if (!resp.ok) {
        throw new Error(`Perplexity API failed: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    let newsText: string = data?.choices?.[0]?.message?.content ?? "No news available";
    newsText = newsText.replace(/\[\d+\]/g, "").replace(/\s{2,}/g, " ").trim();

    return { newsText, audioUrl: null, generatedAt: Date.now() };
}

// Write (and cleanup stale date-keys) via Vercel REST API
async function writeToEdgeConfig(
    region: string,
    activeKey: string,
    activeDate: string,
    value: NewsData
) {
    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const apiToken = process.env.VERCEL_API_TOKEN;

    if (!edgeConfigId || !apiToken) {
        console.warn("⚠️ EDGE CONFIG: Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN. Skipping cache update.");
        return;
    }

    const teamQuery = vercelTeamQuery();
    const baseUrl = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamQuery}`;

    try {
        // List items so we can delete stale date-keys for this region
        const itemsResp = await fetch(baseUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
        });

        if (!itemsResp.ok) {
            console.error("❌ EDGE CONFIG: Failed to fetch items.", await itemsResp.text());
            return;
        }

        const items: Array<{ key: string; value: unknown }> = await itemsResp.json();
        const prefix = `daily_news_${region}_`;
        const dateKeyRegex = new RegExp(`^daily_news_${region}_\\d{4}-\\d{2}-\\d{2}$`);

        const keysToDelete = items
            .map((it) => it.key)
            .filter((k) => k !== activeKey && k.startsWith(prefix) && dateKeyRegex.test(k));

        const meta: NewsMeta = {
            activeKey,
            activeDate,
            updatedAt: Date.now(),
        };

        const patchBody = {
            items: [
                ...keysToDelete.map((k) => ({ operation: "delete" as const, key: k })),
                { operation: "upsert" as const, key: activeKey, value },
                { operation: "upsert" as const, key: metaKey(region), value: meta },
            ],
        };

        const patchResp = await fetch(baseUrl, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(patchBody),
        });

        if (!patchResp.ok) {
            console.error("❌ EDGE CONFIG WRITE ERROR:", await patchResp.text());
            return;
        }

        console.log(
            `✅ EDGE CONFIG: Upserted ${activeKey}, updated meta, deleted ${keysToDelete.length} stale keys (region=${region}).`
        );
    } catch (err) {
        console.error("❌ EDGE CONFIG NETWORK ERROR:", err);
    }
}

export async function GET(request: NextRequest) {
    try {
        const region = sanitizeRegion(request.nextUrl.searchParams.get("region"));
        const today = utcTodayYYYYMMDD();

        if (!config) {
            console.warn("⚠️ Edge Config client not initialized (EDGE_CONFIG env var missing).");
            // No cache possible; always fetch
            const fresh = await fetchNewsFromPerplexity(region);
            return NextResponse.json({ message: fresh.newsText }, { headers: { "Cache-Control": "no-store" } });
        }

        // 1) Read meta to find the current anchor key/date
        let meta: NewsMeta | undefined;
        try {
            meta = await config.get<NewsMeta>(metaKey(region));
        } catch (e) {
            console.warn("⚠️ Edge Config meta read failed:", e);
        }

        // 2) Determine which date-key should be active *today* based on 7-day rotation
        const periodDays = 7;

        let anchorDate = meta?.activeDate;
        let candidateDate: string;

        if (anchorDate) {
            candidateDate = computeRotatedDate(anchorDate, today, periodDays);
        } else {
            // First-time for this region (no meta): start from today
            candidateDate = today;
        }

        const candidateKey = `daily_news_${region}_${candidateDate}`;

        // 3) Try to serve candidateKey from cache
        try {
            const cached = await config.get<NewsData>(candidateKey);
            if (cached?.newsText) {
                console.log(`📦 SOURCE: Edge Config Cache (key=${candidateKey})`);
                return NextResponse.json({ message: cached.newsText }, { headers: { "Cache-Control": "no-store" } });
            }
        } catch (e) {
            console.warn("⚠️ Edge Config cache read failed:", e);
        }

        // 4) Cache miss for the candidateKey:
        //    - If today is within the current 7-day window, this usually means data was never written; fetch+write.
        //    - If today crossed a boundary, this will create the new rotated key (e.g., 12-24, 12-31, etc.)
        console.log(`🆕 SOURCE: Cache miss (key=${candidateKey}). Fetching from Perplexity...`);
        const fresh = await fetchNewsFromPerplexity(region);

        await writeToEdgeConfig(region, candidateKey, candidateDate, fresh);

        return NextResponse.json({ message: fresh.newsText }, { headers: { "Cache-Control": "no-store" } });
    } catch (err: any) {
        console.error("API Error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Failed to fetch news" },
            { status: 500, headers: { "Cache-Control": "no-store" } }
        );
    }
}
