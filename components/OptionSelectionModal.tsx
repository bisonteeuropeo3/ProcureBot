import React, { useEffect, useState } from 'react';
import { X, ExternalLink, ShoppingCart, Loader2, Star, ImageOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProcurementRequest, SourcingOption } from '../types';

interface OptionSelectionModalProps {
  request: ProcurementRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OptionSelectionModal: React.FC<OptionSelectionModalProps> = ({ request, isOpen, onClose, onSuccess }) => {
  const [options, setOptions] = useState<SourcingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && request) {
      fetchOptions(request.id);
    }
  }, [isOpen, request]);

  const fetchOptions = async (requestId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sourcing_options')
      .select('*')
      .eq('request_id', requestId)
      .order('price', { ascending: true }); // Cheapest first

    if (!error && data) {
      setOptions(data as SourcingOption[]);
    }
    setLoading(false);
  };

  const handleSelectOption = async (option: SourcingOption) => {
    if (!request) return;
    setProcessingId(option.id);

    try {
      // 1. Mark option as selected
      await supabase
        .from('sourcing_options')
        .update({ is_selected: true })
        .eq('id', option.id);

      // 2. Update Request with final details and approve
      await supabase
        .from('requests')
        .update({
          status: 'approved',
          found_price: option.price,
          link: option.url
        })
        .eq('id', request.id);

      // 3. Delete all sourcing options for this request
      await supabase
        .from('sourcing_options')
        .delete()
        .eq('request_id', request.id);

      onSuccess();
      onClose();
    } catch (e) {
      console.error("Error selecting option", e);
      alert("Failed to process selection.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWithoutSuggestions = async () => {
    if (!request) return;
    setProcessingId('manual');

    try {
      // Approve at target price without any sourcing option
      await supabase
        .from('requests')
        .update({
          status: 'approved',
          found_price: request.target_price,
          link: null
        })
        .eq('id', request.id);

      // Delete all sourcing options for this request
      await supabase
        .from('sourcing_options')
        .delete()
        .eq('request_id', request.id);

      onSuccess();
      onClose();
    } catch (e) {
      console.error("Error approving without suggestions", e);
      alert("Failed to approve request.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-sm">
      <div className="bg-cream w-full max-w-5xl border-2 border-charcoal shadow-[8px_8px_0px_#D4E768] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-charcoal bg-white shrink-0">
          <div>
            <h2 className="text-xl font-display font-bold text-charcoal">Review Sourcing Options</h2>
            <p className="text-sm text-gray-500">Select the best option for: <span className="font-bold">{request.product_name}</span></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          <div className="flex items-center gap-4 mb-8 p-4 bg-white border border-charcoal">
            <div className="text-sm">
                <span className="block text-gray-500 text-xs uppercase tracking-wide">Target Price</span>
                <span className="font-mono font-bold text-lg">€{request.target_price.toFixed(2)}</span>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="text-sm">
                 <span className="block text-gray-500 text-xs uppercase tracking-wide">Quantity</span>
                 <span className="font-bold text-lg">{request.quantity}</span>
            </div>
            <div className="ml-auto">
              <button
                onClick={handleApproveWithoutSuggestions}
                disabled={!!processingId}
                className="bg-white text-charcoal px-4 py-2 font-bold text-sm border-2 border-charcoal hover:bg-lime hover:shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 transition-all disabled:opacity-70"
              >
                Approve Without Suggestions
              </button>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-forest" />
             </div>
          ) : options.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300">
                <AlertTriangle className="w-10 h-10 mx-auto text-yellow-600 mb-2" />
                <p className="font-bold text-charcoal">No options found yet.</p>
                <p className="text-sm text-gray-500">The agent might still be scraping or no results matched.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {options.map((opt, idx) => {
                const isCheapest = idx === 0; // Since we ordered by price asc
                const isSavings = opt.price < request.target_price;
                const savingsPct = ((request.target_price - opt.price) / request.target_price) * 100;

                return (
                  <div key={opt.id} className={`relative flex flex-col bg-white border-2 border-charcoal transition-all hover:shadow-[8px_8px_0px_#2D4A3E] group ${isCheapest ? 'ring-4 ring-lime/50' : ''}`}>
                    {isCheapest && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lime text-charcoal text-[11px] font-black px-4 py-1 border-2 border-charcoal uppercase tracking-wider z-10 shadow-sm">
                            Best Price
                        </div>
                    )}

                    {/* Image Area */}
                    <div className="h-48 p-4 border-b-2 border-charcoal bg-white flex items-center justify-center relative overflow-hidden">
                        {opt.image_url ? (
                             <img 
                                src={opt.image_url} 
                                alt={opt.product_title} 
                                className="h-full w-full object-contain transition-transform group-hover:scale-105 duration-300"
                             />
                        ) : (
                            <div className="flex flex-col items-center text-gray-300">
                                <ImageOff className="w-10 h-10 mb-2" />
                                <span className="text-xs">No Image</span>
                            </div>
                        )}
                        {/* Source Badge */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur border border-charcoal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {opt.vendor}
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                        {/* Rating Row */}
                        <div className="flex items-center justify-between mb-2">
                             {opt.rating ? (
                                <div className="flex items-center gap-1 bg-cream px-2 py-0.5 rounded-full border border-gray-200">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs font-bold">{opt.rating}</span>
                                    {opt.rating_count && (
                                        <span className="text-[10px] text-gray-500">
                                            ({opt.rating_count > 1000 ? (opt.rating_count/1000).toFixed(1) + 'k' : opt.rating_count})
                                        </span>
                                    )}
                                </div>
                             ) : (
                                 <div className="h-5"></div> // Spacer
                             )}
                             
                             {isSavings ? (
                                <span className="text-xs font-black text-forest bg-lime/30 px-2 py-0.5 rounded">- {savingsPct.toFixed(0)}%</span>
                            ) : (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Over Target</span>
                            )}
                        </div>

                        <h3 className="text-sm font-bold text-charcoal leading-tight mb-4 line-clamp-2" title={opt.product_title || ''}>
                            {opt.product_title || request.product_name}
                        </h3>
                        
                        <div className="mt-auto">
                            <div className="flex justify-between items-baseline mb-4 border-t border-dashed border-gray-200 pt-3">
                                <span className="text-xs text-gray-500 font-medium uppercase">Unit Price</span>
                                <span className="text-3xl font-mono font-bold text-charcoal">€{opt.price.toFixed(2)}</span>
                            </div>

                            <a href={opt.url} target="_blank" rel="noreferrer" className="text-xs flex items-center justify-center gap-1 text-gray-500 hover:text-forest mb-4 underline decoration-gray-300 hover:decoration-forest">
                                Verify on {opt.vendor} <ExternalLink className="w-3 h-3" />
                            </a>

                            <button 
                                onClick={() => handleSelectOption(opt)}
                                disabled={!!processingId}
                                className="w-full bg-forest text-white py-3.5 font-bold text-sm border-2 border-charcoal hover:bg-charcoal hover:shadow-[4px_4px_0px_#D4E768] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                            >
                                {processingId === opt.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ShoppingCart className="w-4 h-4" /> Approve Order
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptionSelectionModal;