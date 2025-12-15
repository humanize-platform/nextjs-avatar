This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Caching Strategy (Edge Config)

This project uses **Vercel Edge Config** to implement a persistent, global cache for the daily news. This ensures that the expensive Perplexity API is called only once per day, and all subsequent users receive the same cached content instantly.

### Architecture
The caching implementation is hybrid, using the Edge Config SDK for low-latency reads and the Vercel REST API for writes.

1.  **READ (Fast Path)**: 
    - The app checks Edge Config for a key formatted as `daily_news_YYYY-MM-DD`.
    - **Hit**: If found, the JSON content is returned immediately (Source: `edge-config`).
    - This happens on the Edge, ensuring high performance.

2.  **WRITE (Cache Miss)**:
    - If the key is missing (e.g., first request of the day), the app fetches fresh news from the **Perplexity API**.
    - It then performs an asynchronous **PATCH** request to the Vercel API to upsert this new content into your Edge Config store.
    - Subsequent requests will now hit the cache.

3.  **FALLBACK**:
    - If `EDGE_CONFIG`, `EDGE_CONFIG_ID`, or `VERCEL_API_TOKEN` are missing (e.g., local development without secrets), the system gracefully falls back to fetching from Perplexity every time.

### Configuration
To enable caching, ensure the following Environment Variables are set in Vercel and `.env.local`:
- `EDGE_CONFIG`: Connection string (Read access).
- `EDGE_CONFIG_ID`: Store ID (Target for updates).
- `VERCEL_API_TOKEN`: Personal Access Token with "Full Account" scope (Write access).

## Deploy on Vercel


The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
