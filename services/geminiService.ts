import { ProcurementReport } from '../types';

export const processProcurementRequest = async (text: string): Promise<ProcurementReport> => {
  console.log("Processing request via Gemini Service Mock:", text);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock response based on the "mouse" example or generic
  return {
    items: [
      {
        productName: "Logitech MX Master 3S",
        originalPriceEstimate: 120.00,
        foundPrice: 95.00,
        quantity: 3,
        savings: 75.00,
        savingsPercentage: 21,
        supplier: "Amazon Business",
        reasoning: "Trovata offerta business su Amazon Prime con sconto quantità."
      },
      {
        productName: "Carta A4 80gr Risma",
        originalPriceEstimate: 5.50,
        foundPrice: 3.80,
        quantity: 10,
        savings: 17.00,
        savingsPercentage: 31,
        supplier: "Mondoffice",
        reasoning: "Prezzo bulk su Mondoffice. Spedizione gratuita inclusa."
      }
    ],
    totalSavings: 92.00
  };
};
