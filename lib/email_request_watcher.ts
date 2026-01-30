/**
 * Email Request Watcher
 * 
 * This module monitors incoming emails for procurement requests.
 * It uses IMAP to fetch emails and OpenAI to analyze them.
 * Only processes emails newer than the last sync timestamp.
 * 
 * Usage:
 *   npm run email:once           # Single run, check once and exit
 *   npm run email:watch          # Continuous mode, polls every 5 minutes
 *   npm run email:watch -- --interval=10   # Custom interval (10 minutes)
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { searchGoogleShopping } from './serper';
import { decrypt, isEncrypted } from './crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY!;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configuration. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error('Missing VITE_OPENAI_API_KEY in .env.local');
    process.exit(1);
}

// Initialize clients
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Polling interval in milliseconds (default: 30 seconds)
const DEFAULT_POLL_INTERVAL = 30 * 1000;

// Types
interface EmailIntegration {
    id: string;
    user_id: string;
    provider: string;
    imap_host: string;
    imap_port: number;
    imap_user: string;
    imap_pass_encrypted: string; // Already decrypted as per user
    status: string;
    last_synced_at: string | null;
}

interface ParsedRequest {
    product_name: string;
    quantity: number;
    target_price: number;
    category: string;
    is_procurement_request: boolean;
    reasoning: string;
}

interface EmailData {
    subject: string;
    from: string;
    date: Date;
    body: string;
}

/**
 * Get today's date at midnight as ISO string (for first-time sync)
 */
function getTodayMidnight(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
}

/**
 * Fetch email integration for a specific user
 */
async function getEmailIntegration(userId: string): Promise<EmailIntegration | null> {
    const { data, error } = await supabase
        .from('email_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

    if (error) {
        console.error('Error fetching email integration:', error.message);
        return null;
    }

    return data as EmailIntegration;
}

/**
 * Update last_synced_at timestamp in database
 */
async function updateLastSyncedAt(integrationId: string, timestamp: Date): Promise<void> {
    const { error } = await supabase
        .from('email_integrations')
        .update({ last_synced_at: timestamp.toISOString() })
        .eq('id', integrationId);

    if (error) {
        console.error('Error updating last_synced_at:', error.message);
    }
}

/**
 * Mark integration as error status
 */
async function markIntegrationError(integrationId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
        .from('email_integrations')
        .update({
            status: 'error',
            last_error: errorMessage
        })
        .eq('id', integrationId);

    if (error) {
        console.error('Error marking integration as error:', error.message);
    }
}

/**
 * Connect to IMAP and fetch emails since a given date
 */
async function fetchEmailsSince(integration: EmailIntegration, sinceDate: Date): Promise<EmailData[]> {
    // Decrypt password if it's encrypted, otherwise use as-is (for migration)
    let password: string;
    try {
        if (isEncrypted(integration.imap_pass_encrypted)) {
            password = decrypt(integration.imap_pass_encrypted);
        } else {
            // Fallback for plaintext passwords (pre-encryption migration)
            console.warn('⚠️ Password appears to be in plaintext. Consider re-saving the integration.');
            password = integration.imap_pass_encrypted;
        }
    } catch (err: any) {
        console.error('Failed to decrypt password:', err.message);
        throw new Error('Password decryption failed');
    }

    const client = new ImapFlow({
        host: integration.imap_host,
        port: integration.imap_port,
        secure: true,
        auth: {
            user: integration.imap_user,
            pass: password
        },
        logger: false
    });

    const emails: EmailData[] = [];

    try {
        await client.connect();
        console.log(`Connected to ${integration.imap_host} as ${integration.imap_user}`);

        // Open INBOX
        const mailbox = await client.mailboxOpen('INBOX');
        console.log(`Mailbox opened: ${mailbox.exists} total messages`);

        // Search for emails since the given date
        const searchCriteria = {
            since: sinceDate
        };

        // Fetch messages
        for await (const message of client.fetch(searchCriteria, {
            envelope: true,
            source: true,
            uid: true
        })) {
            try {
                const parsed: ParsedMail = await simpleParser(message.source);

                // Only process emails that are actually newer than sinceDate
                const emailDate = parsed.date || new Date();
                if (emailDate > sinceDate) {
                    const subject = parsed.subject || '(No Subject)';
                    
                    // Filter: Only process emails containing "Acquisto" (case-insensitive)
                    if (subject.toLowerCase().includes('acquisto')) {
                        emails.push({
                            subject: subject,
                            from: parsed.from?.text || 'Unknown',
                            date: emailDate,
                            body: parsed.text || parsed.html || ''
                        });
                    }
                }
            } catch (parseError) {
                console.error('Error parsing email:', parseError);
            }
        }

        await client.logout();
        console.log(`Fetched ${emails.length} new emails since ${sinceDate.toISOString()}`);

    } catch (error: any) {
        console.error('IMAP connection error:', error.message);
        await markIntegrationError(integration.id, error.message);
        throw new Error(`Failed to connect to email: ${error.message}`);
    }

    return emails;
}

/**
 * Analyze email with OpenAI to determine if it's a procurement request
 */
async function analyzeEmailWithAI(email: EmailData): Promise<ParsedRequest | null> {
    const prompt = `You are an AI assistant that analyzes emails to identify procurement/purchase requests.

Analyze the following email and determine if it contains a procurement request (someone asking to buy/order/purchase something).

Email Subject: ${email.subject}
Email From: ${email.from}
Email Body (first 2000 chars): ${email.body.substring(0, 2000)}

If this IS a procurement request, extract the following information:
- product_name: The name of the product/item being requested
- quantity: The quantity needed (default to 1 if not specified)
- target_price: The budget/estimated price (default to 0 if not specified)
- category: Categorize as one of: IT, Stationery, Software, Hardware, Office Supplies, Services, Other
- is_procurement_request: true
- reasoning: Brief explanation of why this is a procurement request

If this is NOT a procurement request (spam, newsletter, personal email, etc.):
- is_procurement_request: false
- reasoning: Brief explanation of why this is not a procurement request

Respond ONLY with a valid JSON object, no additional text or markdown.

JSON Schema:
{
  "product_name": "string",
  "quantity": number,
  "target_price": number,
  "category": "string",
  "is_procurement_request": boolean,
  "reasoning": "string"
}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        const content = response.choices[0].message.content;
        if (!content) {
            console.error('No content received from OpenAI');
            return null;
        }

        const parsed: ParsedRequest = JSON.parse(content);
        return parsed;

    } catch (error: any) {
        console.error('OpenAI analysis error:', error.message);
        return null;
    }
}

/**
 * Insert a new procurement request into Supabase and trigger Serper search
 */
async function insertRequest(
    userId: string,
    request: ParsedRequest,
    emailSubject: string
): Promise<void> {
    // 1. Insert the request
    const { data: requestData, error } = await supabase
        .from('requests')
        .insert({
            user_id: userId,
            product_name: request.product_name,
            quantity: request.quantity,
            target_price: request.target_price,
            category: request.category,
            source: 'email',
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.error('Error inserting request:', error.message);
        return;
    }

    console.log(`✅ Created request for: ${request.product_name} (from email: "${emailSubject}")`);

    // 2. Trigger Serper Google Shopping search
    try {
        console.log(`  🔍 Searching Google Shopping for "${request.product_name}"...`);
        const shoppingResults = await searchGoogleShopping(request.product_name);

        if (shoppingResults.length === 0) {
            console.log(`  ⚠️ No shopping results found`);
            return;
        }

        console.log(`  📦 Found ${shoppingResults.length} results`);

        // 3. Transform and save options (top 10)
        const optionsToInsert = shoppingResults.slice(0, 10).map((item) => ({
            request_id: requestData.id,
            vendor: item.source,
            product_title: item.title,
            price: parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')),
            url: item.link,
            image_url: item.imageUrl,
            rating: item.rating,
            rating_count: item.ratingCount,
            product_id: item.productId,
            position: item.position,
            is_selected: false
        }));

        const { error: optionsError } = await supabase
            .from('sourcing_options')
            .insert(optionsToInsert);

        if (optionsError) {
            console.error('  ❌ Error inserting options:', optionsError.message);
            return;
        }

        console.log(`  💾 Saved ${optionsToInsert.length} sourcing options`);

        // 4. Update request status to 'action_required'
        await supabase
            .from('requests')
            .update({ status: 'action_required' })
            .eq('id', requestData.id);

        console.log(`  ✅ Updated request status to 'action_required'`);

    } catch (serperError: any) {
        console.error('  ❌ Serper search error:', serperError.message);
        // Request was inserted, just couldn't find options - that's ok
    }
}

/**
 * Main function to process emails for a specific user
 */
export async function processEmailsForUser(userId: string): Promise<void> {
    console.log(`\n🔍 Processing emails for user: ${userId}`);

    // Get email integration
    const integration = await getEmailIntegration(userId);
    if (!integration) {
        console.error(`No active email integration found for user ${userId}`);
        throw new Error('No active email integration found');
    }

    // Determine the "since" date - use last_synced_at or today's midnight
    let sinceDate: Date;
    if (integration.last_synced_at) {
        sinceDate = new Date(integration.last_synced_at);
        console.log(`Last synced at: ${sinceDate.toISOString()}`);
    } else {
        sinceDate = new Date(getTodayMidnight());
        console.log(`First run - using today's date: ${sinceDate.toISOString()}`);
    }

    // Fetch new emails
    const emails = await fetchEmailsSince(integration, sinceDate);

    if (emails.length === 0) {
        console.log('No new emails to process.');
        await updateLastSyncedAt(integration.id, new Date());
        return;
    }

    // Track the latest email date for updating last_synced_at
    let latestEmailDate = sinceDate;

    // Process each email
    for (const email of emails) {
        console.log(`\n📧 Analyzing: "${email.subject}" from ${email.from}`);

        const analysis = await analyzeEmailWithAI(email);

        if (analysis) {
            if (analysis.is_procurement_request) {
                console.log(`  ➡️ Procurement request detected: ${analysis.product_name}`);
                console.log(`     Category: ${analysis.category}, Qty: ${analysis.quantity}, Target: €${analysis.target_price}`);
                await insertRequest(integration.user_id, analysis, email.subject);
            } else {
                console.log(`  ⏭️ Not a procurement request: ${analysis.reasoning}`);
            }
        }

        // Update latest email date
        if (email.date > latestEmailDate) {
            latestEmailDate = email.date;
        }
    }

    // Update last_synced_at to the latest email date
    await updateLastSyncedAt(integration.id, latestEmailDate);
    console.log(`\n✅ Sync complete. Updated last_synced_at to: ${latestEmailDate.toISOString()}`);
}

/**
 * Process emails for ALL active integrations in the database
 */
export async function processAllEmailIntegrations(): Promise<void> {
    console.log('🚀 Starting email watcher for all active integrations...\n');

    const { data: integrations, error } = await supabase
        .from('email_integrations')
        .select('user_id')
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching integrations:', error.message);
        return;
    }

    if (!integrations || integrations.length === 0) {
        console.log('No active email integrations found.');
        return;
    }

    console.log(`Found ${integrations.length} active integration(s)\n`);

    for (const integration of integrations) {
        try {
            await processEmailsForUser(integration.user_id);
        } catch (err: any) {
            console.error(`Error processing user ${integration.user_id}:`, err.message);
            // Continue with next integration
        }
    }

    console.log('\n🏁 Email watcher run complete.');
}

/**
 * Start continuous email watching with polling
 * @param intervalMs - Polling interval in milliseconds (default: 5 minutes)
 * @param userId - Optional specific user ID to watch
 */
export async function startWatching(intervalMs: number = DEFAULT_POLL_INTERVAL, userId?: string): Promise<void> {
    console.log('═'.repeat(60));
    console.log('📬 EMAIL REQUEST WATCHER - STARTING');
    console.log('═'.repeat(60));
    console.log(`Poll interval: ${intervalMs / 1000 / 60} minutes`);
    console.log(`Mode: ${userId ? `Single user (${userId})` : 'All active integrations'}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('═'.repeat(60));
    console.log('\nPress Ctrl+C to stop\n');

    // Run immediately on start
    try {
        if (userId) {
            await processEmailsForUser(userId);
        } else {
            await processAllEmailIntegrations();
        }
    } catch (err: any) {
        console.error('Error on initial run:', err.message);
    }

    // Set up polling interval
    const intervalId = setInterval(async () => {
        console.log(`\n⏰ [${new Date().toISOString()}] Polling for new emails...`);
        try {
            if (userId) {
                await processEmailsForUser(userId);
            } else {
                await processAllEmailIntegrations();
            }
        } catch (err: any) {
            console.error('Error during poll:', err.message);
        }
    }, intervalMs);

    // Handle graceful shutdown
    const shutdown = () => {
        console.log('\n\n🛑 Shutting down email watcher...');
        clearInterval(intervalId);
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep the process alive
    await new Promise(() => { }); // Never resolves, keeps process running
}

// CLI entry point - always runs when script is executed
const args = process.argv.slice(2);

// Parse arguments
const watchMode = args.includes('--watch') || args.includes('-w');
const intervalArg = args.find(a => a.startsWith('--interval='));
const intervalMs = intervalArg
    ? parseInt(intervalArg.split('=')[1]) * 60 * 1000
    : DEFAULT_POLL_INTERVAL;

// Find user ID (argument that's not a flag)
const userId = args.find(a => !a.startsWith('-') && !a.startsWith('--'));

if (watchMode) {
    // Continuous watching mode
    startWatching(intervalMs, userId);
} else {
    // Single run mode
    const runOnce = userId
        ? () => processEmailsForUser(userId)
        : () => processAllEmailIntegrations();

    runOnce()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error:', err.message);
            process.exit(1);
        });
}
