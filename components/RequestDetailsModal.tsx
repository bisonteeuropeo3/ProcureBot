import React, { useEffect, useState } from 'react';
import { X, ExternalLink, CheckCircle2, AlertTriangle, Loader2, ImageOff, Star, Calendar, CreditCard, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProcurementRequest, SourcingOption, RequestStatus } from '../types';

interface RequestDetailsModalProps {
  request: ProcurementRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ request, isOpen, onClose }) => {
  const [selectedOption, setSelectedOption] = useState<SourcingOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && request && request.status === RequestStatus.APPROVED) {
      fetchSelectedOption(request.id);
    } else {
        setSelectedOption(null);
    }
  }, [isOpen, request]);

  const fetchSelectedOption = async (requestId: string) => {
    setLoading(true);
    // Fetch the specific option that was marked as selected
    const { data, error } = await supabase
      .from('sourcing_options')
      .select('*')
      .eq('request_id', requestId)
      .eq('is_selected', true)
      .single();

    if (!error && data) {
      setSelectedOption(data as SourcingOption);
    }
    setLoading(false);
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/90 backdrop-blur-sm">
      <div className="bg-cream w-full max-w-2xl border-2 border-charcoal shadow-[8px_8px_0px_#2D4A3E] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-charcoal bg-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-display font-bold text-charcoal">Request Details</h2>
                {request.status === RequestStatus.APPROVED ? (
                    <span className="bg-forest text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Approved</span>
                ) : (
                    <span className="bg-red-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Rejected</span>
                )}
            </div>
            <p className="text-sm text-gray-500 font-mono text-xs">ID: {request.id.split('-')[0]}...</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
            
            {/* 1. Request Info */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Product Request</label>
                    <p className="font-bold text-lg text-charcoal">{request.product_name}</p>
                </div>
                <div className="text-right">
                    <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                    <div className="flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <p className="font-mono">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* 2. Order Details (If Approved) */}
            {request.status === RequestStatus.APPROVED && (
                <>
                    {loading ? (
                         <div className="flex justify-center py-8">
                             <Loader2 className="w-8 h-8 animate-spin text-forest" />
                         </div>
                    ) : selectedOption ? (
                        <div className="bg-white border-2 border-charcoal">
                            {/* Product Image Banner */}
                            <div className="w-full h-48 bg-white border-b-2 border-charcoal p-4 flex items-center justify-center relative">
                                {selectedOption.image_url ? (
                                    <img 
                                        src={selectedOption.image_url} 
                                        alt={selectedOption.product_title} 
                                        className="h-full object-contain"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-300">
                                        <ImageOff className="w-8 h-8 mb-1" />
                                        <span className="text-xs">No Image Available</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-lime border border-charcoal px-2 py-1 text-xs font-bold uppercase">
                                    Purchased
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Item Ordered</label>
                                    <h3 className="font-bold text-charcoal text-lg leading-tight">
                                        {selectedOption.product_title || request.product_name}
                                    </h3>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                     <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Vendor</label>
                                        <p className="font-bold">{selectedOption.vendor}</p>
                                     </div>
                                     <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Rating</label>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                            <span className="font-bold">{selectedOption.rating || 'N/A'}</span>
                                            <span className="text-xs text-gray-400">({selectedOption.rating_count || 0})</span>
                                        </div>
                                     </div>
                                </div>

                                <div className="border-t border-dashed border-gray-300 my-4"></div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Total Cost ({request.quantity} units)</p>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-forest" />
                                            <span className="text-2xl font-mono font-bold text-charcoal">€{(request.found_price! * request.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <a 
                                        href={selectedOption.url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-sm font-bold text-forest underline decoration-forest hover:text-charcoal flex items-center gap-1"
                                    >
                                        View Invoice/Link <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800 flex items-center gap-3">
                             <AlertTriangle className="w-5 h-5" />
                             <div>
                                 <p className="font-bold text-sm">Missing Order Data</p>
                                 <p className="text-xs">This request is approved, but the specific option details are missing from the database.</p>
                             </div>
                         </div>
                    )}
                </>
            )}

            {/* 3. Rejection Details */}
            {request.status === RequestStatus.REJECTED && (
                <div className="bg-red-50 border-2 border-red-100 p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                        <Ban className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-bold text-red-900 mb-1">Request Rejected</h3>
                    <p className="text-sm text-red-700">This request was declined by a manager.</p>
                    
                    <div className="mt-6 w-full text-left bg-white p-4 border border-red-100">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Target Price</span>
                            <span className="font-mono font-bold">€{request.target_price}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase">Qty</span>
                            <span className="font-mono font-bold">{request.quantity}</span>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;