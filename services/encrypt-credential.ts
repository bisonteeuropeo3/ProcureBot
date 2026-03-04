/**
 * Backend API Server
 * 
 * HTTP server that handles:
 * 1. Encrypted credential storage (email integration)
 * 2. Receipt analysis via OpenAI (proxy to keep API key server-side)
 * 
 * All sensitive API keys are accessed via process.env (server-side only).
 * 
 * Usage:
 *   npm run api:serve
 */

import * as http from 'http';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { encrypt } from '../lib/crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const PORT = process.env.API_PORT || 3001;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configuration.');
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
 * Handle POST /api/analyze-receipt
 * Receives a base64 image from the frontend, calls OpenAI server-side,
 * and returns the parsed receipt data.
 */
async function handleAnalyzeReceipt(body: { image: string }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        if (!body.image) {
            return { success: false, error: 'Missing image data' };
        }

        const prompt = `Sei un sistema OCR estremamente preciso specializzato nell'analisi di scontrini fiscali italiani. 
Il tuo compito è estrarre i dati dall'immagine fornita e restituirli ESCLUSIVAMENTE in formato JSON.

Regole:
1. Analizza l'immagine e cerca: Nome Negozio, Data, Ora, Totale, Lista articoli, prosegui andando riga per riga dall'alto in basso sii estremamente preciso.
2. Converti la data in formato ISO (YYYY-MM-DD).
3. Se un campo non è leggibile o presente, imposta il valore a null.
4. Categorizza lo scontrino basandoti sugli articoli o sul nome del negozio.
5. PER OGNI ARTICOLO, assegna una categoria tra le seguenti:
   - "Alimentari" (cibo, bevande, prodotti supermercato)
   - "Ufficio" (cancelleria, materiale ufficio)
   - "Tecnologia" (elettronica, accessori tech)
   - "Casa" (prodotti per la casa, pulizia)
   - "Abbigliamento" (vestiti, scarpe, accessori moda)
   - "Trasporti" (carburante, biglietti, pedaggi)
   - "Servizi" (abbonamenti, manutenzione)
   - "Altro" (tutto ciò che non rientra nelle altre categorie)
6. Restituisci SOLO l'oggetto JSON, senza markdown o testo aggiuntivo.
7. Se ci sono articoli identici segnati più volte in caso di mancanza della colonna quantità, considera solo la quantità totale.

Schema JSON richiesto:
{
  "nome_esercente": "string",
  "indirizzo": "string",
  "partita_iva": "string",
  "data": "YYYY-MM-DD",
  "ora": "HH:MM",
  "totale": number,
  "valuta": "EUR",
  "categoria": "string",
  "elementi": [
    { "descrizione": "string", "quantita": number, "prezzo_unitario": number, "prezzo_totale": number, "categoria": "string" }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: body.image,
                                detail: "high"
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) {
            return { success: false, error: 'No content received from OpenAI' };
        }

        const rawData = JSON.parse(content);

        // Map to ReceiptData interface
        const receiptData = {
            merchantName: rawData.nome_esercente || "Sconosciuto",
            address: rawData.indirizzo || null,
            taxId: rawData.partita_iva || null,
            date: rawData.data || null,
            time: rawData.ora || null,
            totalAmount: typeof rawData.totale === 'number' ? rawData.totale : 0,
            currency: rawData.valuta || "EUR",
            category: rawData.categoria || "Uncategorized",
            items: Array.isArray(rawData.elementi)
                ? rawData.elementi.map((item: any) => ({
                    description: item.descrizione || "Item",
                    quantity: typeof item.quantita === 'number' ? item.quantita : 1,
                    price: typeof item.prezzo_unitario === 'number' ? item.prezzo_unitario : 0,
                    totalPrice: typeof item.prezzo_totale === 'number' ? item.prezzo_totale : 0,
                    category: item.categoria || "Altro"
                }))
                : []
        };

        console.log(`✅ Receipt analyzed: ${receiptData.merchantName}`);
        return { success: true, data: receiptData };

    } catch (error: any) {
        console.error('Receipt analysis error:', error.message);
        return { success: false, error: error.message };
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

// Increase max body size for image uploads (default is too small)
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

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

    // Route: POST /api/analyze-receipt
    if (req.method === 'POST' && req.url === '/api/analyze-receipt') {
        try {
            const body = await parseBody(req);
            const result = await handleAnalyzeReceipt(body);
            sendJson(res, result.success ? 200 : 500, result);
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
    console.log('🔐 BACKEND API SERVER');
    console.log('═'.repeat(50));
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  POST /api/email-integration  - Create encrypted integration`);
    console.log(`  POST /api/analyze-receipt     - Analyze receipt with OpenAI`);
    console.log(`  GET  /health                  - Health check`);
    console.log('═'.repeat(50));
});
