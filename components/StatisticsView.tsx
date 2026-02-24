import React, { useState, useEffect } from "react";
import { BarChart, PieChart, Activity, DollarSign, Users, Receipt as ReceiptIcon, User as UserIcon, Tag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ProcurementRequest, Receipt, TeamMember, RequestStatus } from "../types";

interface StatisticsViewProps {
  userId: string;
}

interface MemberStats {
  member: TeamMember;
  totalRequests: number;
  approvedSpend: number;
  budgetUsedPercent: number;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ userId }) => {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reqRes, recRes, memRes] = await Promise.all([
          supabase.from("requests").select("*").eq("user_id", userId),
          supabase.from("receipts").select("*").eq("user_id", userId).eq("status", "completed"),
          supabase.from("team_members").select("*").eq("user_id", userId)
        ]);

        if (reqRes.error) throw reqRes.error;
        if (recRes.error) throw recRes.error;
        if (memRes.error) throw memRes.error;

        setRequests(reqRes.data as ProcurementRequest[]);
        setReceipts(recRes.data as Receipt[]);
        setMembers(memRes.data as TeamMember[]);
      } catch (err: any) {
        console.error("Error fetching stats data:", err);
        setError('Impossibile caricare i dati statistici. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Calculations
  const totalApprovedSpend = requests
    .filter(r => r.status === RequestStatus.APPROVED && r.found_price)
    .reduce((acc, r) => acc + (r.found_price! * r.quantity), 0);
    
  const totalReceiptSpend = receipts
    .reduce((acc, r) => acc + (r.total_amount || 0), 0);

  const grandTotalSpend = totalApprovedSpend + totalReceiptSpend;

  // Category Breakdown (Requests only for now, could be expanded to receipt items)
  const categorySpend: Record<string, number> = {};
  requests.filter(r => r.status === RequestStatus.APPROVED && r.found_price).forEach(r => {
    const cat = r.category || 'Altro';
    categorySpend[cat] = (categorySpend[cat] || 0) + (r.found_price! * r.quantity);
  });

  // Team Member Stats
  const memberStats: MemberStats[] = members.map(member => {
    const memberRequests = requests.filter(r => r.assigned_to === member.id);
    const approvedSpend = memberRequests
      .filter(r => r.status === RequestStatus.APPROVED && r.found_price)
      .reduce((acc, r) => acc + (r.found_price! * r.quantity), 0);
    
    return {
      member,
      totalRequests: memberRequests.length,
      approvedSpend,
      budgetUsedPercent: member.budget ? Math.min((approvedSpend / member.budget) * 100, 100) : 0
    };
  }).sort((a, b) => b.approvedSpend - a.approvedSpend);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal">
          Statistiche Dettagliate
        </h1>
        <p className="text-gray-500 mt-1">
          Analisi completa delle spese aziendali, scontrini e budget del team.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 font-medium text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm">Spesa Totale</h3>
            <div className="p-2 bg-charcoal text-lime rounded"><DollarSign className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold font-display text-charcoal">
            €{grandTotalSpend.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex gap-2 text-xs font-bold text-gray-500">
             <span>Richieste: €{totalApprovedSpend.toLocaleString()}</span>
             •
             <span>Scontrini: €{totalReceiptSpend.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm">Richieste Attive</h3>
            <div className="p-2 bg-charcoal text-lime rounded"><Activity className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold font-display text-charcoal">
            {requests.length}
          </p>
          <p className="text-sm font-bold text-gray-500 mt-4">
             {requests.filter(r => r.status === RequestStatus.APPROVED).length} Approvate
          </p>
        </div>

        <div className="bg-white p-6 border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm">Membri Team</h3>
            <div className="p-2 bg-charcoal text-lime rounded"><Users className="w-5 h-5" /></div>
          </div>
          <p className="text-3xl font-bold font-display text-charcoal">
            {members.length}
          </p>
          <p className="text-sm font-bold text-gray-500 mt-4">
             Persone registrate
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Table 1: Team Spending */}
        <div className="bg-white border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] flex flex-col">
          <div className="p-6 border-b-2 border-charcoal bg-cream flex justify-between items-center">
            <h2 className="text-xl font-display font-bold text-charcoal flex items-center gap-2">
              <UserIcon className="w-5 h-5" /> Analisi Budget Team
            </h2>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
             <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-gray-200">Persona</th>
                    <th className="p-4 border-b border-gray-200 text-center">Richieste</th>
                    <th className="p-4 border-b border-gray-200 text-right">Spesa</th>
                    <th className="p-4 border-b border-gray-200 w-1/3 text-center">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {memberStats.map(({ member, totalRequests, approvedSpend, budgetUsedPercent }) => (
                     <tr key={member.id} className="hover:bg-cream transition-colors">
                        <td className="p-4 font-bold text-charcoal">{member.name}</td>
                        <td className="p-4 text-center font-mono">{totalRequests}</td>
                        <td className="p-4 text-right font-mono text-forest font-bold">
                           €{approvedSpend.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                           {member.budget ? (
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${budgetUsedPercent > 90 ? 'bg-red-500' : 'bg-lime'}`}
                                    style={{ width: `${budgetUsedPercent}%` }}
                                   />
                                </div>
                                <span className="font-bold w-10 text-right">{budgetUsedPercent.toFixed(0)}%</span>
                              </div>
                           ) : (
                             <span className="text-xs text-gray-400 italic block text-center">No Budget</span>
                           )}
                        </td>
                     </tr>
                  ))}
                  {memberStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500">Nessuna persona registrata.</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Table 2: Spend By Category */}
        <div className="bg-white border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] flex flex-col">
          <div className="p-6 border-b-2 border-charcoal bg-cream flex justify-between items-center">
            <h2 className="text-xl font-display font-bold text-charcoal flex items-center gap-2">
              <Tag className="w-5 h-5" /> Spesa per Categoria (Richieste)
            </h2>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
             <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-gray-200">Categoria</th>
                    <th className="p-4 border-b border-gray-200 text-right">Spesa Cumulativa</th>
                    <th className="p-4 border-b border-gray-200 text-right">% sul Totale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(categorySpend)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, spend]) => {
                      const pct = totalApprovedSpend > 0 ? (spend / totalApprovedSpend) * 100 : 0;
                      return (
                        <tr key={category} className="hover:bg-cream transition-colors">
                           <td className="p-4 font-bold text-charcoal flex items-center gap-2">
                              <span className="w-3 h-3 bg-forest inline-block rounded-full"></span>
                              {category}
                           </td>
                           <td className="p-4 text-right font-mono font-bold">
                              €{spend.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </td>
                           <td className="p-4 text-right">
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 font-bold text-xs border border-gray-200">
                                 {pct.toFixed(1)}%
                              </span>
                           </td>
                        </tr>
                      );
                  })}
                  {Object.keys(categorySpend).length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-gray-500">Nessun dato di spesa disponibile per categoria.</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StatisticsView;
