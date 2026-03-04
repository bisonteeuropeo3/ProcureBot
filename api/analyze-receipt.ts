// Vercel Serverless Function: Receipt Analysis via OpenAI
// Calls OpenAI server-side so the API key is never exposed to the client.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export const config = {
    maxDuration: 60, // Allow up to 60s for OpenAI vision processing
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY environment variable');
        return res.status(500).json({ success: false, error: 'Server misconfiguration: missing API key' });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, error: 'Missing image data' });
        }

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: image,
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
            return res.status(500).json({ success: false, error: 'No content received from OpenAI' });
        }

        const rawData = JSON.parse(content);

        // Map to ReceiptData interface
        const receiptData = {
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

        console.log(`✅ Receipt analyzed: ${receiptData.merchantName}`);
        return res.status(200).json({ success: true, data: receiptData });

    } catch (error: any) {
        console.error('Receipt analysis error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
