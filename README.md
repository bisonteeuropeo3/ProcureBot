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

| Command                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `npm run dev`            | Start Vite development server                      |
| `npm run build`          | Build for production                               |
| `npm run preview`        | Preview production build                           |
| `npm run api:serve`      | Start encryption API server (port 3001)            |
| `npm run email:once`     | Run email watcher once and exit                    |
| `npm run email:watch`    | Run email watcher continuously (polls every 5 min) |
| `npm run sourcing:watch` | Run sourcing automation separately                 |

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

## 🚀 Deployment (24/7 Hosting)

To keep the Request Watcher running 24/7, you need to host it on a server. Since this app uses **Docker**, you can deploy it almost anywhere.

### Option 1: Virtual Private Server (VPS) - Recommended

This is the most cost-effective and flexible option (approx $5-6/mo).
**Providers**: [DigitalOcean](https://www.digitalocean.com/), [Hetzner](https://www.hetzner.com/), [AWS Lightsail](https://aws.amazon.com/lightsail/)

1.  **Create a VPS** (Ubuntu 22.04 or 24.04).
2.  **Install Docker**:
    ```bash
    curl -fsSL https://get.docker.com | sh
    ```
3.  **Deploy**:
    Copy your project files to the server (or `git clone`), create your `.env.local` file, and run:
    ```bash
    docker compose up -d
    ```

### Running with Docker Compose (Local or VPS)

We have included a `docker-compose.yml` file to make running everything easy:

```bash
# Start all services in the background
docker compose up -d

# View logs
docker compose logs -f


---

### Option 3: AWS (Using your $100 Credit)

Since you have AWS credits, the best way to deploy this is using **AWS Lightsail**. It is a simplified version of EC2 perfect for this kind of application.

**Cost Estimate for $100 Credit:**
-   **Instance Type**: Lightsail "Micro" or "Small" (Linux/Ubuntu)
-   **Cost**: ~$5 - $10 USD / month
-   **Runway**: Your $100 credit will last approximately **10 to 20 months** running 24/7.

**Step-by-Step AWS Lightsail Guide:**
1.  **Log in to AWS Console** and search for "Lightsail".
2.  **Create Instance**:
    -   Platform: **Linux/Unix**
    -   Blueprint: **Docker** (under "App + OS") OR **Ubuntu 24.04** (OS Only). *Recommendation: Choose Ubuntu and install Docker manually as per Option 1 for more control.*
    -   Price Plan: **$5/month** (1GB RAM) or **$10/month** (2GB RAM). 1GB is likely enough.
3.  **Deploy**:
    -   After the instance launches, click the ">_" terminal icon to SSH in.
    -   Clone your repo (you may need to set up a Git Personal Access Token or just copy files via SCP).
    -   Run `docker compose up -d`.
4.  **Static IP (Optional)**:
    -   In the Networking tab, create a Static IP and attach it to your instance so the IP doesn't change if you reboot.
```
