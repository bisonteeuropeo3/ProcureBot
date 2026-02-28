// Vercel Serverless Function: Proxy for Email Integration API
// Uses Node.js runtime (not Edge) to allow direct IP access to AWS

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Forward the request to the AWS API server
    const AWS_API_URL = process.env.AWS_API_URL || 'http://3.72.19.26:3001';
    
    const response = await fetch(`${AWS_API_URL}/api/email-integration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.text();
    
    // Parse and forward the response
    try {
      const jsonResult = JSON.parse(result);
      return res.status(response.status).json(jsonResult);
    } catch {
      return res.status(response.status).send(result);
    }
  } catch (error: any) {
    console.error('Proxy error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
