import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, DollarSign, Store, ChevronRight, ShoppingBag, X } from 'lucide-react';

interface Receipt {
  id: string;
  created_at: string;
  merchant_name: string;
  total_amount: number;
  currency: string;
  receipt_date: string;
  status: string;
  image_url: string;
  description: string;
}

interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface ReceiptsViewProps {
  userId: string;
}

const ReceiptsView: React.FC<ReceiptsViewProps> = ({ userId }) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, [userId]); // Add userId dependency

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId) // Filter by user_id
        .eq('status', 'completed') // Only show completed/accepted receipts
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClick = async (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receipt.id);

      if (error) throw error;
      setReceiptItems(data || []);
    } catch (error) {
      console.error('Error fetching receipt items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const closeDetail = () => {
    setSelectedReceipt(null);
    setReceiptItems([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal">Receipts</h1>
            <p className="text-gray-500 mt-1">Archive of analyzed and accepted receipts.</p>
         </div>
         {/* Could add a filter or export button here */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {receipts.map((receipt) => (
          <div 
            key={receipt.id}
            onClick={() => handleReceiptClick(receipt)}
            className="group bg-white border-2 border-charcoal p-4 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all relative overflow-hidden"
          >
             <div className="flex items-start gap-4">
                {/* Image Placeholder or Actual Image */}
                <div className="w-16 h-16 bg-gray-100 border-2 border-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
                    {/* Since we don't have real storage yet, we use a condtiional icon */}
                    {receipt.image_url && receipt.image_url.startsWith('data:') ? (
                         <img src={receipt.image_url} alt="Receipt" className="w-full h-full object-cover" />
                    ) : (
                         <FileText className="text-gray-400 w-8 h-8" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-charcoal truncate group-hover:text-forest transition-colors">
                        {receipt.merchant_name || 'Unknown Merchant'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{receipt.receipt_date}</span>
                    </div>
                </div>
             </div>

             <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                 <div className="flex items-center gap-1 font-mono font-bold text-lg text-forest">
                    {receipt.currency} {(receipt.total_amount || 0).toFixed(2)}
                 </div>
                 <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center group-hover:bg-forest group-hover:text-lime transition-colors">
                    <ChevronRight className="w-5 h-5" />
                 </div>
             </div>
          </div>
        ))}

        {receipts.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No receipts archived yet.</p>
            </div>
        )}
      </div>

      {/* Detail Slide-over / Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeDetail}></div>
            <div className="relative w-full max-w-md bg-cream h-full border-l-2 border-charcoal shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                
                {/* Header */}
                <div className="p-6 bg-charcoal text-white flex justify-between items-start shrink-0">
                    <div>
                        <h2 className="font-display font-bold text-2xl">{selectedReceipt.merchant_name}</h2>
                        <div className="flex items-center gap-4 mt-2 text-gray-300 text-sm">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedReceipt.receipt_date}</span>
                            <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {selectedReceipt.address || 'No address'}</span>
                        </div>
                    </div>
                    <button onClick={closeDetail} className="hover:text-lime transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Receipt Image */}
                    {selectedReceipt.image_url && (
                        <div className="mb-6 bg-gray-100 border-2 border-charcoal p-2 shadow-[4px_4px_0px_#1A1E1C]">
                            <img 
                                src={selectedReceipt.image_url} 
                                alt="Original Receipt" 
                                className="w-full h-auto object-contain max-h-[300px]"
                            />
                            <a href={selectedReceipt.image_url} target="_blank" rel="noopener noreferrer" className="block text-center text-xs font-bold text-forest mt-2 hover:underline">
                                View Full Image
                            </a>
                        </div>
                    )}

                    <div className="bg-white border-2 border-charcoal p-4 mb-6 shadow-[4px_4px_0px_#1A1E1C]">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Amount</span>
                        <div className="text-3xl font-mono font-bold text-forest mt-1">
                            {selectedReceipt.currency} {selectedReceipt.total_amount?.toFixed(2)}
                        </div>
                        {selectedReceipt.description && (
                            <p className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-2 italic">"{selectedReceipt.description}"</p>
                        )}
                    </div>

                    <h3 className="font-bold text-charcoal flex items-center gap-2 mb-4">
                        <ShoppingBag className="w-5 h-5 text-lime fill-forest" />
                        Purchased Items
                    </h3>

                    {loadingItems ? (
                        <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-forest"></div></div>
                    ) : (
                        <div className="space-y-3">
                            {receiptItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center bg-forest text-lime text-xs font-bold rounded-full">
                                            {item.quantity}
                                        </span>
                                        <span className="font-medium text-charcoal">{item.description}</span>
                                    </div>
                                    <span className="font-mono font-bold text-gray-600">
                                        {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsView;
