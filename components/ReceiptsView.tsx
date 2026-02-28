import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, Store, ChevronRight, ShoppingBag, X, Download, Search } from 'lucide-react';

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
  category?: string;
}

interface ReceiptWithItems extends Receipt {
  items?: ReceiptItem[];
}

interface ReceiptsViewProps {
  userId: string;
}

const ReceiptsView: React.FC<ReceiptsViewProps> = ({ userId }) => {
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, [userId]);

  const fetchReceipts = async () => {
    try {
      // Fetch receipts with their items for search
      const { data, error } = await supabase
        .from('receipts')
        .select('*, receipt_items(*)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      
      // Map items to receipts
      const receiptsWithItems = (data || []).map((r: any) => ({
        ...r,
        items: r.receipt_items || []
      }));
      
      setReceipts(receiptsWithItems);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      setError('Impossibile caricare gli scontrini. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  // Filter receipts by search term and date range
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      // Date filter
      if (dateFrom && receipt.receipt_date < dateFrom) return false;
      if (dateTo && receipt.receipt_date > dateTo) return false;
      
      // Search filter - check merchant name AND item descriptions
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesMerchant = receipt.merchant_name?.toLowerCase().includes(searchLower);
        const matchesItems = receipt.items?.some(item => 
          item.description?.toLowerCase().includes(searchLower)
        );
        if (!matchesMerchant && !matchesItems) return false;
      }
      
      return true;
    });
  }, [receipts, searchTerm, dateFrom, dateTo]);

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
    } catch (error: any) {
      console.error('Error fetching receipt items:', error);
      setError('Impossibile caricare i dettagli dello scontrino.');
    } finally {
      setLoadingItems(false);
    }
  };

  const closeDetail = () => {
    setSelectedReceipt(null);
    setReceiptItems([]);
  };

  const openExportModal = () => {
    // Default to current filter dates
    setExportDateFrom(dateFrom);
    setExportDateTo(dateTo);
    setShowExportModal(true);
  };

  const exportToCSV = async () => {
    try {
      // Filter receipts by export date range
      const receiptsToExport = receipts.filter(r => {
        if (exportDateFrom && r.receipt_date < exportDateFrom) return false;
        if (exportDateTo && r.receipt_date > exportDateTo) return false;
        return true;
      });
      
      const receiptIds = receiptsToExport.map(r => r.id);
      
      if (receiptIds.length === 0) {
        alert('No receipts to export in this date range.');
        return;
      }

      const { data: allItems, error } = await supabase
        .from('receipt_items')
        .select('*, receipts!inner(merchant_name, receipt_date, currency)')
        .in('receipt_id', receiptIds);

      if (error) throw error;

      // Build CSV content
      const headers = ['Merchant', 'Date', 'Item Description', 'Category', 'Quantity', 'Unit Price', 'Total', 'Currency'];
      const rows = (allItems || []).map((item: any) => [
        item.receipts?.merchant_name || '',
        item.receipts?.receipt_date || '',
        item.description || '',
        item.category || 'Altro',
        item.quantity || 1,
        (item.price || 0).toFixed(2),
        ((item.price || 0) * (item.quantity || 1)).toFixed(2),
        item.receipts?.currency || 'EUR'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateRangeStr = exportDateFrom || exportDateTo 
        ? `_${exportDateFrom || 'start'}_to_${exportDateTo || 'end'}`
        : '';
      link.download = `receipts_export${dateRangeStr}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal">Receipts</h1>
            <p className="text-gray-500 mt-1">Archive of analyzed and accepted receipts.</p>
         </div>
         <button
           onClick={openExportModal}
           disabled={receipts.length === 0}
           className="flex items-center gap-2 px-4 py-2 bg-forest text-lime font-bold border-2 border-charcoal hover:bg-charcoal hover:text-lime transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
         >
           <Download className="w-4 h-4" />
           Export CSV
         </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 font-medium text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 border-2 border-charcoal shadow-[4px_4px_0px_#D4E768]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by merchant or item..." 
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input 
            type="date" 
            className="px-3 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            className="px-3 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReceipts.map((receipt) => (
          <div 
            key={receipt.id}
            onClick={() => handleReceiptClick(receipt)}
            className="group bg-white border-2 border-charcoal p-4 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all relative overflow-hidden"
          >
             <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-100 border-2 border-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
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

        {filteredReceipts.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {receipts.length === 0 ? 'No receipts archived yet.' : 'No receipts match your search.'}
                </p>
            </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowExportModal(false)}></div>
          <div className="relative bg-white border-2 border-charcoal p-6 shadow-[8px_8px_0px_#1A1E1C] max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-xl text-charcoal mb-4">Export Receipts to CSV</h3>
            <p className="text-sm text-gray-600 mb-4">Select a date range to export. Leave empty to export all.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-1">From Date</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-charcoal mb-1">To Date</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border-2 border-charcoal bg-white hover:bg-gray-100 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportToCSV}
                className="flex-1 px-4 py-2 bg-forest text-lime font-bold border-2 border-charcoal hover:bg-charcoal transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

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
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="w-6 h-6 flex items-center justify-center bg-forest text-lime text-xs font-bold rounded-full shrink-0">
                                            {item.quantity}
                                        </span>
                                        <div className="min-w-0">
                                            <span className="font-medium text-charcoal block truncate">{item.description}</span>
                                            {item.category && (
                                                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-gray-600 shrink-0 ml-2">
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
