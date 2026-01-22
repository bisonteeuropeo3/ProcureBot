/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_KEY: string
    readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string
    readonly VITE_OPENAI_API_KEY: string
    readonly VITE_SERPER_API_KEY: string
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_API_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
