import React, { useState } from 'react';
import { X, Bot, Loader2 } from 'lucide-react';
import { N8N_WEBHOOK_URL } from '../lib/supabase';

interface RequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ isOpen, onClose, onSubmitSuccess }) => {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TRIGGER N8N ONLY
      // We do NOT insert into Supabase here. n8n handles the logic and DB insertion.
      
      const payload = {
        product_name: productName,
        quantity: quantity,
        target_price: parseFloat(targetPrice),
        source: 'dashboard',
        // We let Supabase/n8n handle the timestamp for consistency
      };
      
      // Fire and forget to n8n Webhook
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Close immediately. The UI will update via Supabase Realtime when n8n finishes the job.
      onSubmitSuccess();
      onClose();
      
      // Reset form
      setProductName('');
      setQuantity(1);
      setTargetPrice('');
    } catch (error) {
      console.error('Error triggering bot:', error);
      alert('Failed to launch agent. Check console.');
    } finally {
      setIsSubmitting(false);
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
                  Sending...
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