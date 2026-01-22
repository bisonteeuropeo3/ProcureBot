// Note: In Node.js context (email watcher), dotenv should be loaded by the caller
// In browser context (Vite), env vars are available via import.meta.env

export interface SerperShoppingResult {
  title: string;
  source: string;
  price: string;
  link: string;
  delivery: string;
  imageUrl: string;
  rating?: number;
  ratingCount?: number;
  productId?: string;
  position?: number;
}

export interface SerperResponse {
  shopping: SerperShoppingResult[];
}

export async function searchGoogleShopping(query: string): Promise<SerperShoppingResult[]> {
  // Support both Node.js (process.env) and Vite (import.meta.env) environments
  let apiKey = process.env.VITE_SERPER_API_KEY || process.env.SERPER_API_KEY || (import.meta as any).env?.VITE_SERPER_API_KEY;

  // Strip quotes if present (from .env.local file)
  if (apiKey) {
    apiKey = apiKey.replace(/^["']|["']$/g, '');
  }

  console.log(`[Serper] Searching for "${query}"`);
  console.log(`[Serper] API Key present: ${!!apiKey}`);
  console.log(`[Serper] API Key (first 10 chars): ${apiKey?.substring(0, 10)}...`);

  if (!apiKey) {
    console.error("[Serper] Missing VITE_SERPER_API_KEY");
    throw new Error("Missing Serper API Key (VITE_SERPER_API_KEY). Check .env.local");
  }

  const myHeaders = new Headers();
  myHeaders.append("X-API-KEY", apiKey);
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    "q": query,
    "gl": "it",
    "hl": "it",
    "num": 40
  });

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  try {
    const response = await fetch("https://google.serper.dev/shopping", requestOptions);
    console.log(`[Serper] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Serper] API Error: ${response.status} - ${errorText}`);
      throw new Error(`Serper API failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as SerperResponse;
    console.log(`[Serper] Found ${result.shopping?.length || 0} results`);
    return result.shopping || [];
  } catch (error: any) {
    console.error("[Serper] Fetch error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}
