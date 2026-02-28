import React, { useState, useMemo } from 'react';
import { Download, Search, Check, X, Eye, Calendar } from 'lucide-react';
import { ProcurementRequest, RequestStatus } from '../types';
import RequestDetailsModal from './RequestDetailsModal';

interface HistoryViewProps {
  requests: ProcurementRequest[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ requests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // State for details modal
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Filter by Status
      const matchesStatus = filter === 'ALL' 
        ? req.status !== RequestStatus.PENDING 
        : req.status.toUpperCase() === filter;
      
      const matchesSearch = req.product_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter
      const reqDate = new Date(req.created_at).toISOString().split('T')[0];
      if (dateFrom && reqDate < dateFrom) return false;
      if (dateTo && reqDate > dateTo) return false;
      
      return matchesStatus && matchesSearch;
    });
  }, [requests, filter, searchTerm, dateFrom, dateTo]);

  const openExportModal = () => {
    setExportDateFrom(dateFrom);
    setExportDateTo(dateTo);
    setShowExportModal(true);
  };

  const exportCSV = () => {
    // Filter by export date range
    const requestsToExport = requests.filter(req => {
      const reqDate = new Date(req.created_at).toISOString().split('T')[0];
      if (exportDateFrom && reqDate < exportDateFrom) return false;
      if (exportDateTo && reqDate > exportDateTo) return false;
      // Also respect status filter
      const matchesStatus = filter === 'ALL' 
        ? req.status !== RequestStatus.PENDING 
        : req.status.toUpperCase() === filter;
      return matchesStatus;
    });

    if (requestsToExport.length === 0) {
      alert('No records to export in this date range.');
      return;
    }

    const headers = ['Date', 'Product', 'Quantity', 'Target Price', 'Found Price', 'Status'];
    const rows = requestsToExport.map(r => [
      new Date(r.created_at).toLocaleDateString(),
      r.product_name,
      r.quantity,
      r.target_price,
      r.found_price || 0,
      r.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateRangeStr = exportDateFrom || exportDateTo 
      ? `_${exportDateFrom || 'start'}_to_${exportDateTo || 'end'}`
      : '';
    link.download = `procurement_history${dateRangeStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-charcoal">Request History</h2>
          <p className="text-sm text-gray-500">Archive of processed procurement requests.</p>
        </div>
        <button 
          onClick={openExportModal}
          className="flex items-center gap-2 px-4 py-2 border-2 border-charcoal bg-white hover:bg-cream transition-colors font-bold text-sm shadow-[4px_4px_0px_#1A1E1C] active:shadow-none active:translate-y-1"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 bg-white p-4 border-2 border-charcoal shadow-[4px_4px_0px_#D4E768]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by product..." 
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'APPROVED', 'REJECTED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 font-bold text-xs border-2 border-charcoal transition-all ${
                  filter === f 
                    ? 'bg-charcoal text-lime' 
                    : 'bg-white text-charcoal hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        {/* Date Filter Row */}
        <div className="flex gap-2 items-center">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Date:</span>
          <input 
            type="date" 
            className="px-3 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            className="px-3 py-2 border-2 border-gray-200 focus:border-forest focus:outline-none text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {(dateFrom || dateTo) && (
            <button 
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-500 hover:text-charcoal underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-300">
            No records found matching your filters.
          </div>
        ) : (
          filteredRequests.map(req => (
            <div 
                key={req.id} 
                onClick={() => setSelectedRequest(req)}
                className="bg-white border-2 border-charcoal p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-[4px_4px_0px_#2D4A3E] transition-all cursor-pointer group hover:-translate-y-1"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-500">{new Date(req.created_at).toLocaleDateString()}</span>
                  {req.status === 'approved' ? (
                     <span className="flex items-center gap-1 text-[10px] font-bold text-forest bg-green-100 px-2 py-0.5 rounded-full border border-forest">
                       <Check className="w-3 h-3" /> APPROVED
                     </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full border border-red-800">
                       <X className="w-3 h-3" /> REJECTED
                     </span>
                  )}
                </div>
                <h4 className="font-bold text-lg text-charcoal group-hover:text-forest transition-colors">{req.product_name}</h4>
                <p className="text-sm text-gray-600">Qty: {req.quantity} • Target: €{req.target_price}</p>
              </div>
              
              <div className="text-right flex items-center gap-6">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Final Price</p>
                    <p className="text-2xl font-mono font-bold text-charcoal">€{req.found_price?.toFixed(2) || '---'}</p>
                </div>
                <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-lime group-hover:text-charcoal transition-colors">
                    <Eye className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowExportModal(false)}></div>
          <div className="relative bg-white border-2 border-charcoal p-6 shadow-[8px_8px_0px_#1A1E1C] max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-bold text-xl text-charcoal mb-4">Export History to CSV</h3>
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
                onClick={exportCSV}
                className="flex-1 px-4 py-2 bg-forest text-lime font-bold border-2 border-charcoal hover:bg-charcoal transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <RequestDetailsModal 
        isOpen={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

    </div>
  );
};

export default HistoryView;