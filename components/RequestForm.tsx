import React, { useState } from 'react';
import { X, Bot, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { searchGoogleShopping } from '../lib/serper';
import { RequestStatus } from '../types';

interface RequestFormProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ isOpen, userId, onClose, onSubmitSuccess }) => {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Capture form values before closing
    const capturedProductName = productName;
    const capturedQuantity = quantity;
    const numericTargetPrice = parseFloat(targetPrice);

    // Reset form and close immediately
    setProductName('');
    setQuantity(1);
    setTargetPrice('');
    onSubmitSuccess();
    onClose();

    // Run sourcing in background
    try {
      // 1. Insert Request into Supabase
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .insert([
          {
            product_name: capturedProductName,
            quantity: capturedQuantity,
            target_price: numericTargetPrice,
            source: 'dashboard',
            status: RequestStatus.PENDING,
            user_id: userId
          }
        ])
        .select()
        .single();

      if (requestError) throw requestError;
      if (!requestData) throw new Error('Failed to create request');

      const requestId = requestData.id;

      // 2. Search Google Shopping via Serper
      const shoppingResults = await searchGoogleShopping(capturedProductName);

      // 3. Transform and Save Options
      if (shoppingResults.length > 0) {
        const optionsToInsert = shoppingResults.slice(0, 10).map((item) => ({
          request_id: requestId,
          vendor: item.source,
          product_title: item.title,
          price: parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')), // Clean price string
          url: item.link,
          image_url: item.imageUrl,
          rating: item.rating,
          rating_count: item.ratingCount,
          product_id: item.productId,
          position: item.position,
          is_selected: false
        }));

        const { error: optionsError } = await supabase
          .from('sourcing_options')
          .insert(optionsToInsert);

        if (optionsError) {
            console.error("Error inserting options:", optionsError);
            // Don't throw, just proceed, maybe we failed to save options but request is there
        } else {
            // 4. Update Request Status to ACTION_REQUIRED
            await supabase
                .from('requests')
                .update({ status: RequestStatus.ACTION_REQUIRED })
                .eq('id', requestId);
        }
      }
      
    } catch (error: any) {
      console.error('Error processing request:', error);
      // Errors are logged but not shown since modal is closed
      // The realtime subscription will handle showing the request status
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg border-2 border-charcoal shadow-[8px_8px_0px_#D4E768] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-charcoal bg-cream">
          <div className="flex items-center gap-3">
            <div className="bg-forest p-2 border border-charcoal">
              <Bot className="w-5 h-5 text-lime" />
            </div>
            <h2 className="text-xl font-display font-bold text-charcoal">New Sourcing Request</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
              Product Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Logitech MX Master 3S Mouse"
              className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent font-medium"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">Be as specific as possible for better AI matching.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
                Target Price (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="100.00"
                className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-forest text-white font-bold py-4 border-2 border-charcoal hover:bg-charcoal hover:shadow-[4px_4px_0px_#D4E768] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {statusMessage || 'Processing...'}
                </>
              ) : (
                <>
                  Launch Sourcing Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;