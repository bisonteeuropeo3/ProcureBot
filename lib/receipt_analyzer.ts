import OpenAI from 'openai';

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

      // Scale Logic: Max dimension 1024px to reduce tokens while keeping readability
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
      // toDataURL returns "data:image/png;base64,..."
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for better compression/token usage
    };

    reader.readAsDataURL(file);
  });
}

// Removed top-level initialization to prevent app crash on load if key is missing

export async function analyzeReceipt(file: File): Promise<ReceiptData> {
  const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error("Missing VITE_OPENAI_API_KEY");
    throw new Error("OpenAI API Key is missing. Please add VITE_OPENAI_API_KEY to your .env.local file.");
  }

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true 
  });

  try {
    // 1. Process Image
    const base64ImageWithHeader = await processImage(file);

    // 2. Call OpenAI
    const prompt = `Sei un sistema OCR estremamente preciso specializzato nell'analisi di scontrini fiscali italiani. 
Il tuo compito è estrarre i dati dall'immagine fornita e restituirli ESCLUSIVAMENTE in formato JSON.

Regole:
1. Analizza l'immagine e cerca: Nome Negozio, Data, Ora, Totale, Lista articoli, prosegui andando riga per riga dall'alto in basso sii estremamente preciso.
2. Converti la data in formato ISO (YYYY-MM-DD).
3. Se un campo non è leggibile o presente, imposta il valore a null.
4. Categorizza lo scontrino basandoti sugli articoli o sul nome del negozio.
5. PER OGNI ARTICOLO, assegna una categoria tra le seguenti:
   - "Alimentari" (cibo, bevande, prodotti supermercato)
   - "Ufficio" (cancelleria, materiale ufficio)
   - "Tecnologia" (elettronica, accessori tech)
   - "Casa" (prodotti per la casa, pulizia)
   - "Abbigliamento" (vestiti, scarpe, accessori moda)
   - "Trasporti" (carburante, biglietti, pedaggi)
   - "Servizi" (abbonamenti, manutenzione)
   - "Altro" (tutto ciò che non rientra nelle altre categorie)
6. Restituisci SOLO l'oggetto JSON, senza markdown o testo aggiuntivo.
7. Se ci sono articoli identici segnati più volte in caso di mancanza della colonna quantità, considera solo la quantità totale.

Schema JSON richiesto:
{
  "nome_esercente": "string",
  "indirizzo": "string",
  "partita_iva": "string",
  "data": "YYYY-MM-DD",
  "ora": "HH:MM",
  "totale": number,
  "valuta": "EUR",
  "categoria": "string",
  "elementi": [
    { "descrizione": "string", "quantita": number, "prezzo_unitario": number, "prezzo_totale": number, "categoria": "string" }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o for best vision capabilities
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64ImageWithHeader,
                detail: "high"
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const rawData = JSON.parse(content);

    // 3. Map to ReceiptData interface
    const receiptData: ReceiptData = {
      merchantName: rawData.nome_esercente || "Sconosciuto",
      address: rawData.indirizzo || null,
      taxId: rawData.partita_iva || null,
      date: rawData.data || null,
      time: rawData.ora || null,
      totalAmount: typeof rawData.totale === 'number' ? rawData.totale : 0,
      currency: rawData.valuta || "EUR",
      category: rawData.categoria || "Uncategorized",
      items: Array.isArray(rawData.elementi) 
        ? rawData.elementi.map((item: any) => ({
            description: item.descrizione || "Item",
            quantity: typeof item.quantita === 'number' ? item.quantita : 1,
            price: typeof item.prezzo_unitario === 'number' ? item.prezzo_unitario : 0,
            totalPrice: typeof item.prezzo_totale === 'number' ? item.prezzo_totale : 0,
            category: item.categoria || "Altro"
          }))
        : []
    };

    return receiptData;

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
}
