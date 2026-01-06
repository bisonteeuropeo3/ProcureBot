import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  LayoutDashboard, 
  Plus, 
  PiggyBank, 
  FileText, 
  Settings,
  Menu,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { ProcurementRequest, RequestStatus, DashboardStats } from './types';
import StatCard from './components/StatCard';
import DashboardTable from './components/DashboardTable';
import RequestForm from './components/RequestForm';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import OptionSelectionModal from './components/OptionSelectionModal';
import DashboardCharts from './components/DashboardCharts';

type ViewPage = 'dashboard' | 'history' | 'settings';

const App: React.FC = () => {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalSavings: 0, pendingCount: 0, totalSpend: 0 });
  
  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<ProcurementRequest | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<ViewPage>('dashboard');
  const [loading, setLoading] = useState(true);

  // Settings (Hardcoded for MVP, usually fetched)
  const MONTHLY_BUDGET = 5000;

  // Fetch Data & Realtime Subscription
  useEffect(() => {
    fetchData();

    // Setup Realtime Subscription for REQUESTS
    const requestsSub = supabase
      .channel('public:requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
        console.log("Realtime Requests Update:", payload);
        fetchData(); 
        
        // Notify if status changes to action_required
        if (payload.eventType === 'UPDATE' && payload.new.status === RequestStatus.ACTION_REQUIRED) {
             showToast(`Options ready for ${payload.new.product_name}!`);
        }
        
        // Notify when n8n inserts the new request
        if (payload.eventType === 'INSERT') {
             showToast(`New request received: ${payload.new.product_name}`);
        }
      })
      .subscribe();

    // Setup Realtime Subscription for OPTIONS (To refresh immediately when scraper writes)
    const optionsSub = supabase
      .channel('public:sourcing_options')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sourcing_options' }, (payload) => {
         console.log("Realtime Options Update:", payload);
         // We fetch data again to update the table, though ideally we rely on the trigger updating the parent request
         fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestsSub);
      supabase.removeChannel(optionsSub);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data as ProcurementRequest[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Stats
  useEffect(() => {
    const pending = requests.filter(r => r.status === RequestStatus.PENDING || r.status === RequestStatus.ACTION_REQUIRED).length;
    let savings = 0;
    let spend = 0;

    requests.forEach(r => {
      if (r.found_price) {
        if (r.found_price < r.target_price) {
          savings += (r.target_price - r.found_price) * r.quantity;
        }
        if (r.status === RequestStatus.APPROVED) {
            spend += r.found_price * r.quantity;
        }
      }
    });

    setStats({
      totalSavings: savings,
      pendingCount: pending,
      totalSpend: spend
    });
  }, [requests]);

  const handleReview = (req: ProcurementRequest) => {
    setReviewRequest(req);
  };

  const handleReject = async (id: string) => {
     try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) throw error;
      showToast("Request rejected.");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: RequestStatus.REJECTED } : r));
    } catch (e) {
      console.error(e);
      showToast("Error updating request.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const budgetPercent = Math.min((stats.totalSpend / MONTHLY_BUDGET) * 100, 100);

  return (
    <div className="flex h-screen bg-cream font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-charcoal text-white transform transition-transform duration-300 ease-in-out border-r-2 border-charcoal ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative flex-shrink-0`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-800 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-forest border border-lime flex items-center justify-center">
               <Bot className="text-lime w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">ProcureBot</span>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
              onClick={() => { setActivePage('dashboard'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${activePage === 'dashboard' ? 'bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={() => { setActivePage('history'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${activePage === 'history' ? 'bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <FileText className="w-5 h-5" />
              History
            </button>
             <button 
              onClick={() => { setActivePage('settings'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${activePage === 'settings' ? 'bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>

          <div className="p-4 border-t border-gray-800 shrink-0">
            <div className="bg-white/5 p-4 rounded border border-gray-700">
                <div className="flex justify-between items-end mb-2">
                    <p className="text-xs text-gray-400">Monthly Budget</p>
                    <p className="text-xs text-lime font-mono">€{MONTHLY_BUDGET.toLocaleString()}</p>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full mb-2 overflow-hidden">
                    <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${budgetPercent > 90 ? 'bg-red-500' : 'bg-lime'}`} 
                        style={{ width: `${budgetPercent}%` }}
                    ></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                     <span className="text-white font-bold">€{stats.totalSpend.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
                     <span className={budgetPercent > 90 ? 'text-red-400' : 'text-lime'}>{budgetPercent.toFixed(1)}% Used</span>
                </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header */}
        <header className="bg-white border-b-2 border-charcoal p-4 flex justify-between items-center md:hidden shrink-0 z-30">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-forest flex items-center justify-center">
               <Bot className="text-lime w-5 h-5" />
            </div>
            <span className="font-bold text-charcoal">ProcureBot</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-charcoal">
             {sidebarOpen ? <X /> : <Menu />}
          </button>
        </header>

        <div className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">
          
          {loading && (
             <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
             </div>
          )}

          {!loading && activePage === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {/* Top Bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal">Dashboard</h1>
                  <p className="text-gray-500 mt-1">Manage tail spend requests and approvals.</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="bg-forest text-white px-6 py-3 font-bold border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5 text-lime" /> New Request
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Total Savings" 
                  value={`€${stats.totalSavings.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                  subtext="Accumulated this month"
                  icon={PiggyBank}
                  trend="up"
                />
                <StatCard 
                  title="Pending Actions" 
                  value={stats.pendingCount.toString()}
                  subtext="Requests awaiting approval"
                  icon={Bot}
                />
                <StatCard 
                  title="Approved Spend" 
                  value={`€${stats.totalSpend.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                  subtext="Total processed volume"
                  icon={FileText}
                />
              </div>

              {/* Data Table */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-6 bg-lime"></div>
                    <h3 className="text-xl font-bold text-charcoal">Live Requests</h3>
                </div>
                <DashboardTable 
                    // Show pending or action required items
                    requests={requests.filter(r => r.status === RequestStatus.PENDING || r.status === RequestStatus.ACTION_REQUIRED)} 
                    onReview={handleReview}
                    onReject={handleReject}
                />
              </div>

              {/* New Dashboard Charts */}
              <div>
                  <DashboardCharts requests={requests} />
              </div>
            </div>
          )}

          {!loading && activePage === 'history' && (
            <HistoryView requests={requests.filter(r => r.status === RequestStatus.APPROVED || r.status === RequestStatus.REJECTED)} />
          )}

          {!loading && activePage === 'settings' && (
            <SettingsView />
          )}

        </div>
      </main>

      {/* Modals & Overlays */}
      <RequestForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmitSuccess={() => {
            showToast("Request sent to AI Agent...");
             // No explicit refresh here; we wait for n8n to insert to DB, which triggers Realtime update
        }}
      />

      <OptionSelectionModal 
        isOpen={!!reviewRequest}
        request={reviewRequest}
        onClose={() => setReviewRequest(null)}
        onSuccess={() => {
           showToast("Option approved!");
           fetchData();
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-charcoal text-white px-6 py-4 border-l-4 border-lime shadow-xl animate-in slide-in-from-bottom-5 z-50 flex items-center gap-3">
          <Bot className="text-lime w-5 h-5" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
        ></div>
      )}

    </div>
  );
};

export default App;