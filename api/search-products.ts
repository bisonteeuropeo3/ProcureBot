// Vercel Serverless Function: Product Search via Serper Google Shopping
// Calls Serper API server-side so the API key is never exposed to the client.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    maxDuration: 15,
};

interface SerperShoppingResult {
    title: string;
    source: string;
    price: string;
    link: string;
    delivery: string;
    imageUrl: string;
    rating?: number;
    ratingCount?: number;
    productId?: string;
    position?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    if (!SERPER_API_KEY) {
        console.error('Missing SERPER_API_KEY environment variable');
        return res.status(500).json({ success: false, error: 'Server misconfiguration: missing Serper API key' });
    }

    try {
        const { query } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ success: false, error: 'Missing or invalid query parameter' });
        }

        console.log(`[Serper] Searching for "${query}"...`);

        const response = await fetch('https://google.serper.dev/shopping', {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                gl: 'it',
                hl: 'it',
                num: 40,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Serper] API Error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({
                success: false,
                error: `Serper API failed: ${response.status} ${response.statusText}`,
            });
        }

        const result = await response.json();
        const shopping: SerperShoppingResult[] = result.shopping || [];

        console.log(`[Serper] Found ${shopping.length} results for "${query}"`);

        return res.status(200).json({ success: true, results: shopping });
    } catch (error: any) {
        console.error('[Serper] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
