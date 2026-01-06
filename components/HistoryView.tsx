import React, { useState, useMemo } from 'react';
import { Download, Search, Check, X, Eye } from 'lucide-react';
import { ProcurementRequest, RequestStatus } from '../types';
import RequestDetailsModal from './RequestDetailsModal';

interface HistoryViewProps {
  requests: ProcurementRequest[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ requests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  
  // State for details modal
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Filter by Status (History only shows processed items usually, but we'll show all non-pending or just all based on filter)
      const matchesStatus = filter === 'ALL' 
        ? req.status !== RequestStatus.PENDING 
        : req.status.toUpperCase() === filter;
      
      const matchesSearch = req.product_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [requests, filter, searchTerm]);

  const exportCSV = () => {
    const headers = ['Date', 'Product', 'Quantity', 'Target', 'Found', 'Status'];
    const rows = filteredRequests.map(r => [
      new Date(r.created_at).toLocaleDateString(),
      r.product_name,
      r.quantity,
      r.target_price,
      r.found_price || 0,
      r.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "procurement_history.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-charcoal">Request History</h2>
          <p className="text-sm text-gray-500">Archive of processed procurement requests.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border-2 border-charcoal bg-white hover:bg-cream transition-colors font-bold text-sm shadow-[4px_4px_0px_#1A1E1C] active:shadow-none active:translate-y-1"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 border-2 border-charcoal shadow-[4px_4px_0px_#D4E768]">
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