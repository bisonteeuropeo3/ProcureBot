/**
 * Encryption API Server
 * 
 * Simple HTTP server that handles encrypted credential storage.
 * This keeps the encryption key server-side only.
 * 
 * Usage:
 *   npm run api:serve
 */

import * as http from 'http';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { encrypt } from '../lib/crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const PORT = process.env.API_PORT || 3001;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configuration.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface EmailIntegrationRequest {
    user_id: string;
    email: string;
    password: string;
    host: string;
    port: number;
    provider: 'gmail' | 'outlook' | 'other';
}

/**
 * Handle POST /api/email-integration
 * Encrypts the password and stores in database
 */
async function handleCreateIntegration(body: EmailIntegrationRequest): Promise<{ success: boolean; error?: string; id?: string }> {
    try {
        // Validate required fields
        if (!body.user_id || !body.email || !body.password || !body.host || !body.port || !body.provider) {
            return { success: false, error: 'Missing required fields' };
        }

        // Encrypt the password
        const encryptedPassword = encrypt(body.password);

        // Insert into database
        const { data, error } = await supabase
            .from('email_integrations')
            .insert({
                user_id: body.user_id,
                provider: body.provider,
                imap_host: body.host,
                imap_port: body.port,
                imap_user: body.email,
                imap_pass_encrypted: encryptedPassword,
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error('Database error:', error.message);
            return { success: false, error: error.message };
        }

        console.log(`✅ Created encrypted integration for ${body.email}`);
        return { success: true, id: data.id };

    } catch (err: any) {
        console.error('Encryption error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Parse JSON body from request
 */
function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        sendJson(res, 200, {});
        return;
    }

    // Route: POST /api/email-integration
    if (req.method === 'POST' && req.url === '/api/email-integration') {
        try {
            const body = await parseBody(req);
            const result = await handleCreateIntegration(body);
            sendJson(res, result.success ? 200 : 400, result);
        } catch (err: any) {
            sendJson(res, 400, { success: false, error: err.message });
        }
        return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
        return;
    }

    // 404 for unknown routes
    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log('═'.repeat(50));
    console.log('🔐 ENCRYPTION API SERVER');
    console.log('═'.repeat(50));
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  POST /api/email-integration - Create encrypted integration`);
    console.log(`  GET  /health               - Health check`);
    console.log('═'.repeat(50));
});
