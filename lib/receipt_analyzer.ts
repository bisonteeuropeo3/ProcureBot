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

/**
 * Analyze a receipt image by sending it to the backend API.
 * The backend handles the OpenAI API call server-side, keeping API keys secure.
 */
export async function analyzeReceipt(file: File): Promise<ReceiptData> {
  // On Vercel: VITE_API_URL is empty/unset → use relative URL (same domain)
  // In local dev: VITE_API_URL = http://localhost:3001
  const API_URL = import.meta.env.VITE_API_URL || '';

  try {
    // 1. Process Image (client-side preprocessing)
    const base64Image = await processImage(file);

    // 2. Call backend API (which securely uses OpenAI server-side)
    const response = await fetch(`${API_URL}/api/analyze-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analisi fallita (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Analisi scontrino fallita');
    }

    return result.data as ReceiptData;

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
}
