import React from 'react';
import { FileText, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Receipt } from '../types';

interface PendingReceiptsListProps {
  receipts: Receipt[];
  onReview: (receipt: Receipt) => void;
}

const PendingReceiptsList: React.FC<PendingReceiptsListProps> = ({ receipts, onReview }) => {
  if (receipts.length === 0) return null;

  return (
    <div className="mb-8 border-2 border-charcoal bg-white shadow-[4px_4px_0px_#1A1E1C]">
        <div className="bg-charcoal text-white p-3 font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-lime" />
            <h3>Pending Receipts</h3>
        </div>
        <div className="divide-y-2 divide-gray-100">
            {receipts.map((receipt) => (
                <div key={receipt.id} className="p-4 flex items-center justify-between hover:bg-cream/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center border border-gray-200">
                             {receipt.status === 'processing' ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                             ) : (
                                <FileText className="w-5 h-5 text-forest" />
                             )}
                        </div>
                        <div>
                             <p className="font-bold text-charcoal">{receipt.description || 'Uploaded Receipt'}</p>
                             <div className="flex items-center gap-2 text-xs text-gray-500">
                                 <span>{new Date(receipt.created_at).toLocaleDateString()}</span>
                                 {receipt.merchant_name && (
                                     <>
                                        <span>•</span>
                                        <span className="font-medium text-forest uppercase">{receipt.merchant_name}</span>
                                     </>
                                 )}
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                         {receipt.total_amount && (
                             <span className="font-mono font-bold text-charcoal">
                                 {receipt.currency} {receipt.total_amount.toFixed(2)}
                             </span>
                         )}
                         
                         {receipt.status === 'analyzed' ? (
                             <button 
                                onClick={() => onReview(receipt)}
                                className="px-4 py-2 bg-lime border border-charcoal text-charcoal font-bold text-xs hover:bg-forest hover:text-white transition-colors shadow-[2px_2px_0px_#1A1E1C]"
                             >
                                Review & Confirm
                             </button>
                         ) : (
                             <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 border border-yellow-800 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Processing...
                             </span>
                         )}
                    </div>
                </div>
            ))}
        </div>
        
    </div>
  );
};

export default PendingReceiptsList;
