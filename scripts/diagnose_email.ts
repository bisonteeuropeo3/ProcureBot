import { createClient } from '@supabase/supabase-js';
import imap from 'imap-simple';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase Env Vars (URL or Key)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log("🔍 Starting Diagnosis...");

    // 1. Check DB Table
    const { data: integrations, error } = await supabase.from('email_integrations').select('*');

    if (error) {
        console.error("❌ Database Error: Could not fetch 'email_integrations'. Did you run the SQL migration?");
        console.error(error);
        return;
    }

    if (!integrations || integrations.length === 0) {
        console.log("⚠️ No active email integrations found in database.");
        console.log("   -> Go to Settings > Email Integration and add an account.");
        return;
    }

    console.log(`✅ Found ${integrations.length} integration(s). Testing connectivity...`);

    // 2. Test Connection for each
    for (const integ of integrations) {
        console.log(`\nTesting user: ${integ.imap_user} (${integ.provider})...`);

        const config = {
            imap: {
                user: integ.imap_user,
                password: integ.imap_pass_encrypted,
                host: integ.imap_host,
                port: integ.imap_port,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 5000
            }
        };

        try {
            const connection = await imap.connect(config);
            console.log("   ✅ IMAP Connected successfully!");

            await connection.openBox('INBOX');
            console.log("   ✅ Inbox opened.");

            // const usage = await connection.getBoxUsage();
            // console.log(`   ℹ️  Box Status: ${JSON.stringify(usage)}`);

            const searchCriteria = ['ALL'];
            const fetchOptions = { bodies: ['HEADER'], markSeen: false };
            // Get all, then slice last 3
            const messages = await connection.search(searchCriteria, fetchOptions);

            console.log(`   ✅ Search successful. Total emails in Inbox: ${messages.length}`);

            if (messages.length > 0) {
                const recent = messages.slice(-3);
                console.log("   ✉️  Last 3 emails:");
                recent.forEach((m: any) => {
                    console.log(`       - [${m.parts[0].body.date}] ${m.parts[0].body.subject}`);
                });
            } else {
                console.log("      (Send a new email to test parsing)");
            }

            connection.end();
        } catch (err: any) {
            console.error(`   ❌ Connection Failed: ${err.message}`);
            if (err.message.includes('Too many login failures')) {
                console.error("      -> Account locked or too many attempts.");
            } else if (err.message.includes('Invalid credentials')) {
                console.error("      -> Check email and App Password.");
            }
        }
    }
}

diagnose();
