# ProcureBot Dashboard

AI-powered procurement automation for SMEs. Monitors emails for purchase requests, searches for best prices, and analyzes receipts.

## Prerequisites

- **Node.js** v18+ 
- **Supabase** account with database configured
- **OpenAI API key** (GPT-4o for email analysis)
- **Serper API key** (Google Shopping search)

## Environment Variables

Create `.env.local` in the project root:

```ini
# Supabase
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_KEY="your-supabase-anon-key"
VITE_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# AI & Search
VITE_OPENAI_API_KEY="sk-..."
VITE_SERPER_API_KEY="your-serper-key"
VITE_GEMINI_API_KEY="your-gemini-key"

# Password Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY="your-64-char-hex-key"
VITE_API_URL="http://localhost:3001"
```

## Database Setup

Run the SQL in `lib/setup_database.ts` in your Supabase SQL Editor to create:
- `requests` table
- `sourcing_options` table  
- `email_integrations` table
- `receipts` & `receipt_items` tables

## Installation

```bash
npm install
```

## Running the Application

You need **3 terminals** running simultaneously:

```bash
# Terminal 1: Frontend (Vite dev server)
npm run dev

# Terminal 2: Encryption API (for secure password storage)
npm run api:serve

# Terminal 3: Email Watcher (monitors connected email accounts)
npm run email:watch
```

The app will be available at `http://localhost:3000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run api:serve` | Start encryption API server (port 3001) |
| `npm run email:once` | Run email watcher once and exit |
| `npm run email:watch` | Run email watcher continuously (polls every 5 min) |
| `npm run sourcing:watch` | Run sourcing automation separately |

## Project Structure

```
├── components/          # React UI components
├── pages/              # Main page components (Dashboard, Login, Landing)
├── lib/                # Backend utilities
│   ├── crypto.ts       # AES-256 password encryption
│   ├── email_request_watcher.ts  # Email monitoring service
│   ├── serper.ts       # Google Shopping API
│   ├── receipt_analyzer.ts       # Receipt OCR with AI
│   └── supabase.ts     # Supabase client
├── services/           # API services
│   └── encrypt-credential.ts     # Encryption API server
├── types.ts            # TypeScript interfaces
└── .env.local          # Environment variables (not committed)
```

## Docker

Build and run the email watcher as a container:

```bash
docker build -t procurebot-watcher .
docker run --env-file .env.local procurebot-watcher
```

## Security Notes

- The `ENCRYPTION_KEY` encrypts IMAP passwords with AES-256-GCM
- Never commit `.env.local` to version control
- Use Supabase RLS policies to protect user data
