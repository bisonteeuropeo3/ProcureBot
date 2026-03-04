// Vercel Serverless Function: Email Integration
// Encrypts the password and stores in database directly (no external proxy needed)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// AES-256-GCM configuration (matches lib/crypto.ts)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encrypt(plaintext: string): string {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) throw new Error('ENCRYPTION_KEY not set');

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) throw new Error('Invalid ENCRYPTION_KEY length');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration: missing Supabase config' });
  }

  try {
    const { user_id, email, password, host, port, provider } = req.body;

    if (!user_id || !email || !password || !host || !port || !provider) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Encrypt the password server-side
    const encryptedPassword = encrypt(password);

    // Store in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('email_integrations')
      .insert({
        user_id,
        provider,
        imap_host: host,
        imap_port: port,
        imap_user: email,
        imap_pass_encrypted: encryptedPassword,
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error:', error.message);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log(`✅ Created encrypted integration for ${email}`);
    return res.status(200).json({ success: true, id: data.id });

  } catch (error: any) {
    console.error('Integration error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
