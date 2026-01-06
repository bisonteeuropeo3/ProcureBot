import React from 'react';
import { ExternalLink, Check, X, Mail, Laptop2, Clock, AlertCircle, Loader2, ListFilter, Tag } from 'lucide-react';
import { ProcurementRequest, RequestStatus } from '../types';

interface DashboardTableProps {
  requests: ProcurementRequest[];
  onReview: (request: ProcurementRequest) => void;
  onReject: (id: string) => void;
}

const DashboardTable: React.FC<DashboardTableProps> = ({ requests, onReview, onReject }) => {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-forest text-white text-xs font-bold border border-charcoal">
            <Check className="w-3 h-3" /> APPROVED
          </span>
        );
      case RequestStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-bold border border-red-800">
            <X className="w-3 h-3" /> REJECTED
          </span>
        );
      case RequestStatus.ACTION_REQUIRED:
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold border border-blue-800 animate-pulse">
              <ListFilter className="w-3 h-3" /> OPTIONS READY
            </span>
          );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-800">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-charcoal text-cream uppercase text-xs tracking-wider">
            <th className="p-4 font-bold border-b-2 border-charcoal">Date</th>
            <th className="p-4 font-bold border-b-2 border-charcoal">Source</th>
            <th className="p-4 font-bold border-b-2 border-charcoal">Product</th>
            <th className="p-4 font-bold border-b-2 border-charcoal text-right">Target</th>
            <th className="p-4 font-bold border-b-2 border-charcoal text-right">Found</th>
            <th className="p-4 font-bold border-b-2 border-charcoal">Status</th>
            <th className="p-4 font-bold border-b-2 border-charcoal">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-gray-100">
          {requests.map((req) => {
            const isSavings = req.found_price && req.found_price < req.target_price;
            const savingsAmount = req.found_price ? (req.target_price - req.found_price) * req.quantity : 0;
            
            return (
              <tr key={req.id} className="hover:bg-cream/50 transition-colors">
                <td className="p-4 text-sm font-mono text-gray-600">
                  {formatDate(req.created_at)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {req.source === 'email' ? (
                      <Mail className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Laptop2 className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs font-bold text-gray-600 uppercase">{req.source}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-charcoal">{req.product_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Qty: {req.quantity}</span>
                        {req.category && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wide">
                                <Tag className="w-2 h-2" /> {req.category}
                            </span>
                        )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  €{req.target_price.toFixed(2)}
                </td>
                <td className="p-4 text-right">
                  {req.found_price ? (
                    <div className="flex flex-col items-end">
                      <span className={`font-mono font-bold ${isSavings ? 'text-forest' : 'text-charcoal'}`}>
                        €{req.found_price.toFixed(2)}
                      </span>
                      {isSavings && (
                        <span className="text-[10px] bg-lime px-1 border border-charcoal text-charcoal font-bold mt-1">
                          -€{savingsAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ) : (
                     req.status === RequestStatus.ACTION_REQUIRED ? (
                        <span className="text-xs font-bold text-blue-600">See Options</span>
                     ) : (
                        <span className="text-xs text-gray-400 italic flex items-center justify-end gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Scraping...
                        </span>
                     )
                  )}
                </td>
                <td className="p-4">
                  {getStatusBadge(req.status)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {req.link && (
                      <a
                        href={req.link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 border border-charcoal hover:bg-charcoal hover:text-white transition-colors"
                        title="View Product"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    
                    {/* If Action Required, show Review Button */}
                    {(req.status === RequestStatus.ACTION_REQUIRED || (req.status === RequestStatus.PENDING && !req.found_price)) && (
                       <>
                        {req.status === RequestStatus.ACTION_REQUIRED && (
                             <button
                             onClick={() => onReview(req)}
                             className="px-3 py-1.5 border border-forest bg-lime text-charcoal font-bold text-xs hover:bg-forest hover:text-white transition-colors flex items-center gap-1 shadow-[2px_2px_0px_#1A1E1C]"
                           >
                             <ListFilter className="w-3 h-3" /> Review
                           </button>
                        )}
                         <button
                           onClick={() => onReject(req.id)}
                           className="px-3 py-1.5 border border-red-800 bg-red-50 text-red-800 font-bold text-xs hover:bg-red-800 hover:text-white transition-colors flex items-center gap-1 shadow-[2px_2px_0px_#1A1E1C]"
                           title="Reject"
                         >
                           <X className="w-3 h-3" /> Reject
                         </button>
                       </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} className="p-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 mb-2 text-gray-300" />
                  <p>No requests found. Start a new sourcing task!</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardTable;