/**
 * Request Sourcing Watcher
 * 
 * This service listens for new requests in the database and automatically
 * triggers the Serper Google Shopping search to find sourcing options.
 * 
 * Works for requests from any source: email, dashboard, API, etc.
 * 
 * Usage:
 *   npm run sourcing:watch    # Start continuous watching
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { searchGoogleShopping, SerperShoppingResult } from './serper';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configuration. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

// Initialize Supabase client with service role key
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Track processed request IDs to avoid duplicates
const processedRequests = new Set<string>();

// Rate limiting: delay between processing requests (ms)
const PROCESSING_DELAY = 1000;

interface RequestRecord {
    id: string;
    product_name: string;
    quantity: number;
    target_price: number;
    status: string;
    source: string;
    user_id: string;
}

/**
 * Process a new request: search Google Shopping and save options
 */
async function processRequest(request: RequestRecord): Promise<void> {
    const { id, product_name, status } = request;

    // Skip if already processed or not pending
    if (processedRequests.has(id)) {
        console.log(`  ⏭️ Already processed request ${id}, skipping`);
        return;
    }

    if (status !== 'pending') {
        console.log(`  ⏭️ Request ${id} is not pending (status: ${status}), skipping`);
        return;
    }

    // Mark as being processed
    processedRequests.add(id);

    console.log(`\n🔍 Processing request: "${product_name}" (ID: ${id})`);

    try {
        // 1. Search Google Shopping via Serper
        console.log(`  📦 Searching Google Shopping for "${product_name}"...`);
        const shoppingResults = await searchGoogleShopping(product_name);

        if (shoppingResults.length === 0) {
            console.log(`  ⚠️ No shopping results found for "${product_name}"`);
            return;
        }

        console.log(`  ✅ Found ${shoppingResults.length} results`);

        // 2. Transform and save options (top 10)
        const optionsToInsert = shoppingResults.slice(0, 10).map((item: SerperShoppingResult) => ({
            request_id: id,
            vendor: item.source,
            product_title: item.title,
            price: parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')), // Clean price string
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
            console.error(`  ❌ Error inserting options:`, optionsError.message);
            return;
        }

        console.log(`  💾 Saved ${optionsToInsert.length} sourcing options`);

        // 3. Update request status to 'action_required'
        const { error: updateError } = await supabase
            .from('requests')
            .update({ status: 'action_required' })
            .eq('id', id);

        if (updateError) {
            console.error(`  ❌ Error updating request status:`, updateError.message);
        } else {
            console.log(`  ✅ Updated request status to 'action_required'`);
        }

    } catch (error: any) {
        console.error(`  ❌ Error processing request ${id}:`, error.message);
        // Remove from processed set so it can be retried
        processedRequests.delete(id);
    }
}

/**
 * Check for any pending requests that haven't been processed yet
 * (for requests created before the watcher started)
 */
async function processPendingRequests(): Promise<void> {
    console.log('\n📋 Checking for existing pending requests...');

    const { data: pendingRequests, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error('Error fetching pending requests:', error.message);
        return;
    }

    if (!pendingRequests || pendingRequests.length === 0) {
        console.log('No pending requests found.');
        return;
    }

    console.log(`Found ${pendingRequests.length} pending request(s)`);

    for (const request of pendingRequests) {
        await processRequest(request as RequestRecord);
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
    }
}

/**
 * Start watching for new requests using Supabase Realtime
 */
export async function startSourcingWatcher(): Promise<void> {
    console.log('═'.repeat(60));
    console.log('🛒 REQUEST SOURCING WATCHER - STARTING');
    console.log('═'.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('Listening for new requests...');
    console.log('═'.repeat(60));
    console.log('\nPress Ctrl+C to stop\n');

    // First, process any existing pending requests
    await processPendingRequests();

    // Set up realtime subscription to requests table
    const channel: RealtimeChannel = supabase
        .channel('requests-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'requests'
            },
            async (payload) => {
                console.log(`\n📥 New request detected!`);
                const request = payload.new as RequestRecord;

                // Small delay to ensure the record is fully committed
                await new Promise(resolve => setTimeout(resolve, 500));

                await processRequest(request);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'requests',
                filter: 'status=eq.pending'
            },
            async (payload) => {
                // Handle case where a request is updated back to pending
                const request = payload.new as RequestRecord;
                if (request.status === 'pending') {
                    console.log(`\n📥 Request updated to pending!`);
                    processedRequests.delete(request.id); // Allow reprocessing
                    await processRequest(request);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to Supabase Realtime');
                console.log('👀 Watching for new requests...\n');
            } else if (status === 'CLOSED') {
                console.log('❌ Realtime connection closed');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Realtime channel error');
            }
        });

    // Handle graceful shutdown
    const shutdown = async () => {
        console.log('\n\n🛑 Shutting down sourcing watcher...');
        await supabase.removeChannel(channel);
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep the process alive
    await new Promise(() => { }); // Never resolves, keeps process running
}

// CLI entry point
startSourcingWatcher().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
