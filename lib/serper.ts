// Server-side only module - requires dotenv to be loaded by the caller
// This module must NEVER be imported from frontend code

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
  // Server-side only: use process.env
  let apiKey = process.env.SERPER_API_KEY;

  // Strip quotes if present (from .env.local file)
  if (apiKey) {
    apiKey = apiKey.replace(/^["']|["']$/g, '');
  }

  console.log(`[Serper] Searching for "${query}"`);
  console.log(`[Serper] API Key present: ${!!apiKey}`);

  if (!apiKey) {
    console.error("[Serper] Missing SERPER_API_KEY");
    throw new Error("Missing Serper API Key (SERPER_API_KEY). Check .env.local");
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
