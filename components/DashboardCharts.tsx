import React, { useMemo, useState } from 'react';
import { ProcurementRequest, RequestStatus, Receipt } from '../types';
import { TrendingUp, PieChart, LayoutDashboard } from 'lucide-react';

interface DashboardChartsProps {
  requests: ProcurementRequest[];
  receipts: Receipt[];
}

type TimeSpan = '7d' | '30d' | '1y';

const DashboardCharts: React.FC<DashboardChartsProps> = ({ requests, receipts }) => {
  const [spendTimeSpan, setSpendTimeSpan] = useState<TimeSpan>('7d');
  const [categoryTimeSpan, setCategoryTimeSpan] = useState<TimeSpan>('30d');
  const [sourceTimeSpan, setSourceTimeSpan] = useState<TimeSpan>('30d');

  // Helper to parse date from various formats
  const parseDate = (dateSource: string | Date): Date | null => {
    let dateObj = new Date(dateSource);
    
    if (isNaN(dateObj.getTime()) && typeof dateSource === 'string') {
      const parts = dateSource.split('/');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    
    return isNaN(dateObj.getTime()) ? null : dateObj;
  };

  // Helper to get start date based on time span
  const getStartDate = (span: TimeSpan): Date => {
    const now = new Date();
    if (span === '7d') {
      now.setDate(now.getDate() - 7);
    } else if (span === '30d') {
      now.setDate(now.getDate() - 30);
    } else {
      now.setFullYear(now.getFullYear() - 1);
    }
    return now;
  };

  // 1. Calculate Spend based on selected time span
  const spendData = useMemo(() => {
    const now = new Date();
    const startDate = getStartDate(spendTimeSpan);
    const groupBy = spendTimeSpan === '1y' ? 'month' : 'day';

    const map = new Map<string, number>();
    
    // Initialize all periods with 0
    if (groupBy === 'day') {
      const days = spendTimeSpan === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        map.set(key, 0);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        map.set(key, 0);
      }
    }

    // Process Requests
    requests.forEach(req => {
      if (req.status === RequestStatus.APPROVED && req.found_price) {
        const dateObj = parseDate(req.created_at);
        if (dateObj && dateObj >= startDate) {
          const key = groupBy === 'day'
            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          const cost = req.found_price * req.quantity;
          map.set(key, (map.get(key) || 0) + cost);
        }
      }
    });

    // Process Receipts
    receipts.forEach(receipt => {
      if (receipt.status === 'completed' && receipt.total_amount) {
        const dateSource = receipt.receipt_date || receipt.created_at;
        const dateObj = parseDate(dateSource);
        if (dateObj && dateObj >= startDate) {
          const key = groupBy === 'day'
            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          map.set(key, (map.get(key) || 0) + receipt.total_amount);
        }
      }
    });

    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
  }, [requests, receipts, spendTimeSpan]);

  const maxSpend = Math.max(...spendData.map(d => d.amount), 1);

  // 2. Calculate Top Categories by Spend (filtered by time)
  const categorySpendData = useMemo(() => {
    const startDate = getStartDate(categoryTimeSpan);
    const map = new Map<string, number>();
    
    requests.forEach(req => {
       if (req.status === RequestStatus.APPROVED && req.found_price) {
           const dateObj = parseDate(req.created_at);
           if (dateObj && dateObj >= startDate) {
             const cost = req.found_price * req.quantity;
             const category = req.category || 'Uncategorized';
             map.set(category, (map.get(category) || 0) + cost);
           }
       }
    });
    
    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);
  }, [requests, categoryTimeSpan]);

  const totalCategorySpend = categorySpendData.reduce((acc, curr) => acc + curr.value, 0);

  // 3. Calculate Source Percentage (Email vs Dashboard) - filtered by time
  const sourceData = useMemo(() => {
    const startDate = getStartDate(sourceTimeSpan);
    let email = 0;
    let dash = 0;
    
    requests.forEach(req => {
        const dateObj = parseDate(req.created_at);
        if (dateObj && dateObj >= startDate) {
          if (req.source === 'email') email++;
          else dash++;
        }
    });
    
    const total = email + dash || 1;
    return {
        emailPct: Math.round((email / total) * 100),
        dashPct: Math.round((dash / total) * 100),
        emailCount: email,
        dashCount: dash
    };
  }, [requests, sourceTimeSpan]);

  const timeSpanLabels: Record<TimeSpan, string> = {
    '7d': '7D',
    '30d': '30D',
    '1y': '1Y'
  };

  const TimeSpanSelector = ({ value, onChange }: { value: TimeSpan; onChange: (v: TimeSpan) => void }) => (
    <div className="flex gap-1">
      {(['7d', '30d', '1y'] as TimeSpan[]).map((span) => (
        <button
          key={span}
          onClick={() => onChange(span)}
          className={`px-2 py-1 text-[10px] font-bold border border-charcoal transition-all ${
            value === span 
              ? 'bg-charcoal text-lime' 
              : 'bg-white text-charcoal hover:bg-gray-100'
          }`}
        >
          {timeSpanLabels[span]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Chart 1: Spend Trend */}
      <div className="bg-white border-2 border-charcoal p-6 shadow-[4px_4px_0px_#1A1E1C] flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4 border-b-2 border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-forest" />
              <h3 className="font-bold text-charcoal">Spend Trend</h3>
            </div>
            <TimeSpanSelector value={spendTimeSpan} onChange={setSpendTimeSpan} />
        </div>
        
        <div className="flex-1 flex items-end justify-between gap-1 min-h-[150px] overflow-x-auto">
            {spendData.length > 0 ? (
                spendData.map((d, i) => {
                    const heightPct = (d.amount / maxSpend) * 100;
                    const barWidth = spendTimeSpan === '1y' ? 'flex-1 min-w-[20px]' : 'flex-1 min-w-[16px]';
                    return (
                        <div key={i} className={`flex flex-col items-center group ${barWidth}`}>
                            <div className="relative w-full flex items-end justify-center h-[120px] bg-gray-50 border-b border-gray-200">
                                <div 
                                    style={{ height: `${Math.max(heightPct, 2)}%` }} 
                                    className={`w-full max-w-[20px] border-x border-t border-charcoal hover:bg-lime transition-all relative group-hover:-translate-y-1 ${d.amount > 0 ? 'bg-forest' : 'bg-gray-200'}`}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        €{d.amount.toFixed(0)}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-[8px] text-gray-500 mt-1 font-mono truncate w-full text-center ${spendTimeSpan === '30d' ? 'hidden group-hover:block' : ''}`}>
                              {spendTimeSpan === '30d' && spendData.length > 14 
                                ? (i % 5 === 0 ? d.date : '') 
                                : d.date}
                            </span>
                        </div>
                    );
                })
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic">No spend data yet</div>
            )}
        </div>
      </div>

      {/* Chart 2: Category Breakdown */}
      <div className="bg-white border-2 border-charcoal p-6 shadow-[4px_4px_0px_#1A1E1C] flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4 border-b-2 border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-forest" />
              <h3 className="font-bold text-charcoal">Spend by Category</h3>
            </div>
            <TimeSpanSelector value={categoryTimeSpan} onChange={setCategoryTimeSpan} />
        </div>

        <div className="flex-1 space-y-4">
             {categorySpendData.length > 0 ? (
                 categorySpendData.map((p, i) => {
                     const pct = totalCategorySpend > 0 ? ((p.value / totalCategorySpend) * 100) : 0;
                     return (
                         <div key={i}>
                             <div className="flex justify-between text-xs mb-1">
                                 <span className="font-bold text-charcoal truncate pr-2 uppercase tracking-tight">{p.name}</span>
                                 <span className="font-mono text-gray-500">€{p.value.toLocaleString()}</span>
                             </div>
                             <div className="w-full h-3 bg-gray-100 border border-charcoal rounded-full overflow-hidden">
                                 <div 
                                    style={{ width: `${pct}%` }} 
                                    className={`h-full border-r border-charcoal ${i === 0 ? 'bg-lime' : i === 1 ? 'bg-forest text-white' : 'bg-gray-400'}`}
                                 ></div>
                             </div>
                         </div>
                     )
                 })
             ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic">No category data yet</div>
             )}
        </div>
      </div>

      {/* Chart 3: Source Breakdown */}
      <div className="bg-white border-2 border-charcoal p-6 shadow-[4px_4px_0px_#1A1E1C] flex flex-col">
         <div className="flex items-center justify-between gap-2 mb-4 border-b-2 border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-forest" />
              <h3 className="font-bold text-charcoal">Request Source</h3>
            </div>
            <TimeSpanSelector value={sourceTimeSpan} onChange={setSourceTimeSpan} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
             {/* CSS Donut Chart */}
             <div 
                className="w-32 h-32 rounded-full border-2 border-charcoal relative flex items-center justify-center mb-6"
                style={{
                    background: `conic-gradient(#D4E768 ${sourceData.dashPct}%, #2D4A3E 0)`
                }}
             >
                 <div className="w-16 h-16 bg-white rounded-full border-2 border-charcoal flex items-center justify-center z-10">
                    <span className="text-xs font-bold text-gray-500">Source</span>
                 </div>
             </div>

             <div className="w-full grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-forest border border-charcoal"></div>
                     <div className="flex flex-col">
                         <span className="text-[10px] uppercase font-bold text-gray-500">Email</span>
                         <span className="font-bold text-lg leading-none">{sourceData.emailPct}%</span>
                     </div>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-lime border border-charcoal"></div>
                     <div className="flex flex-col">
                         <span className="text-[10px] uppercase font-bold text-gray-500">Platform</span>
                         <span className="font-bold text-lg leading-none">{sourceData.dashPct}%</span>
                     </div>
                 </div>
             </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardCharts;