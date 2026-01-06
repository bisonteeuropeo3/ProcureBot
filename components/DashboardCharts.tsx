import React, { useMemo } from 'react';
import { ProcurementRequest, RequestStatus } from '../types';
import { TrendingUp, PieChart, LayoutDashboard } from 'lucide-react';

interface DashboardChartsProps {
  requests: ProcurementRequest[];
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ requests }) => {

  // 1. Calculate Daily Spend (Last 7 active days)
  const dailySpendData = useMemo(() => {
    const map = new Map<string, number>();
    
    requests.forEach(req => {
      // Only count approved spend
      if (req.status === RequestStatus.APPROVED && req.found_price) {
        const date = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const cost = req.found_price * req.quantity;
        map.set(date, (map.get(date) || 0) + cost);
      }
    });

    // Convert to array and take last 7 entries
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .reverse() // Newest first usually in list, so reverse to get chronological if list is desc
      .slice(-7); 
  }, [requests]);

  const maxSpend = Math.max(...dailySpendData.map(d => d.amount), 1);

  // 2. Calculate Top Categories by Spend
  const categorySpendData = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach(req => {
       if (req.status === RequestStatus.APPROVED && req.found_price) {
           const cost = req.found_price * req.quantity;
           // Use the AI provided category, or fallback to 'Uncategorized'
           const category = req.category || 'Uncategorized';
           map.set(category, (map.get(category) || 0) + cost);
       }
    });
    
    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4); // Top 4
  }, [requests]);

  const totalCategorySpend = categorySpendData.reduce((acc, curr) => acc + curr.value, 0);

  // 3. Calculate Source Percentage (Email vs Dashboard)
  const sourceData = useMemo(() => {
    let email = 0;
    let dash = 0;
    requests.forEach(req => {
        if (req.source === 'email') email++;
        else dash++;
    });
    const total = email + dash || 1;
    return {
        emailPct: Math.round((email / total) * 100),
        dashPct: Math.round((dash / total) * 100),
        emailCount: email,
        dashCount: dash
    };
  }, [requests]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Chart 1: Daily Spend Trend */}
      <div className="bg-white border-2 border-charcoal p-6 shadow-[4px_4px_0px_#1A1E1C] flex flex-col">
        <div className="flex items-center gap-2 mb-6 border-b-2 border-gray-100 pb-2">
            <TrendingUp className="w-5 h-5 text-forest" />
            <h3 className="font-bold text-charcoal">Daily Spend Trend</h3>
        </div>
        
        <div className="flex-1 flex items-end justify-between gap-2 min-h-[150px]">
            {dailySpendData.length > 0 ? (
                dailySpendData.map((d, i) => {
                    const heightPct = (d.amount / maxSpend) * 100;
                    return (
                        <div key={i} className="flex flex-col items-center flex-1 group">
                            <div className="relative w-full flex items-end justify-center h-[120px] bg-gray-50 border-b border-gray-200">
                                <div 
                                    style={{ height: `${heightPct}%` }} 
                                    className="w-full max-w-[24px] bg-forest border-x border-t border-charcoal hover:bg-lime transition-all relative group-hover:-translate-y-1"
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        €{d.amount}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500 mt-2 font-mono rotate-0 truncate w-full text-center">{d.date}</span>
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
        <div className="flex items-center gap-2 mb-6 border-b-2 border-gray-100 pb-2">
            <PieChart className="w-5 h-5 text-forest" />
            <h3 className="font-bold text-charcoal">Spend by Category</h3>
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
         <div className="flex items-center gap-2 mb-6 border-b-2 border-gray-100 pb-2">
            <LayoutDashboard className="w-5 h-5 text-forest" />
            <h3 className="font-bold text-charcoal">Request Source</h3>
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