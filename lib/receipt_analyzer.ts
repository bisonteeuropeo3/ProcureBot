/**
 * Receipt Analyzer - Client-Side Module
 * 
 * This module delegates receipt analysis to the backend API server,
 * which has access to the OpenAI API key server-side.
 * No API keys are used or exposed in this frontend module.
 */

export interface ReceiptItem {
  description: string;
  quantity: number;
  price: number;
  totalPrice: number;
  category: string;
}

export interface ReceiptData {
  merchantName: string;
  address: string | null;
  taxId: string | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  totalAmount: number;
  currency: string;
  category: string | null;
  items: ReceiptItem[];
}

/**
 * Processes the image: scales it down if needed and converts to grayscale.
 */
async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Scale Logic: Max dimension 2048px to reduce tokens while keeping readability
      const MAX_DIM = 2048;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = (height / width) * MAX_DIM;
          width = MAX_DIM;
        } else {
          width = (width / height) * MAX_DIM;
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw grayscale
      ctx.filter = 'grayscale(100%)';
      ctx.drawImage(img, 0, 0, width, height);

      // Return base64
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    reader.readAsDataURL(file);
  });
}

// Timeout in ms for the API call (60 seconds)
const ANALYZE_TIMEOUT_MS = 60_000;

/**
 * Analyze a receipt image by sending it to the backend API.
 * The backend handles the OpenAI API call server-side, keeping API keys secure.
 * Includes a timeout to prevent indefinite hanging.
 */
export async function analyzeReceipt(file: File): Promise<ReceiptData> {
  // On Vercel: VITE_API_URL is empty/unset → use relative URL (same domain)
  // In local dev: VITE_API_URL = http://localhost:3001
  const API_URL = import.meta.env.VITE_API_URL || '';

  try {
    // 1. Process Image (client-side preprocessing)
    console.log('[ReceiptAnalyzer] Processing image...');
    const base64Image = await processImage(file);
    console.log(`[ReceiptAnalyzer] Image processed (${Math.round(base64Image.length / 1024)}KB base64)`);

    // 2. Call backend API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, ANALYZE_TIMEOUT_MS);

    console.log(`[ReceiptAnalyzer] Calling ${API_URL}/api/analyze-receipt ...`);

    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/analyze-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error(`Timeout: l'analisi ha impiegato più di ${ANALYZE_TIMEOUT_MS / 1000} secondi. Riprova.`);
      }
      // Network error (server down, CORS, etc.)
      console.error('[ReceiptAnalyzer] Network error:', fetchError);
      throw new Error(`Errore di rete: impossibile raggiungere il server API. ${fetchError.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(`[ReceiptAnalyzer] Response status: ${response.status}`);

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorBody = await response.json();
        errorDetail = errorBody.error || JSON.stringify(errorBody);
      } catch {
        errorDetail = await response.text().catch(() => 'Nessun dettaglio');
      }
      console.error(`[ReceiptAnalyzer] Server error ${response.status}:`, errorDetail);
      throw new Error(`Errore server (${response.status}): ${errorDetail}`);
    }

    const result = await response.json();
    console.log('[ReceiptAnalyzer] Response received:', result.success ? 'SUCCESS' : 'FAILED');

    if (!result.success) {
      throw new Error(result.error || 'Analisi scontrino fallita');
    }

    return result.data as ReceiptData;

  } catch (error: any) {
    console.error("[ReceiptAnalyzer] Error:", error.message);
    throw error;
  }
}
