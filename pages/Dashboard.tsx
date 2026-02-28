import React, { useState, useEffect } from "react";
import {
  Bot,
  LayoutDashboard,
  Plus,
  PiggyBank,
  FileText,
  Settings,
  Menu,
  X,
  AlertCircle,
  Receipt as ReceiptIcon,
  Users,
  BarChart2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  ProcurementRequest,
  RequestStatus,
  DashboardStats,
  Receipt,
} from "../types";
import StatCard from "../components/StatCard";
import DashboardTable from "../components/DashboardTable";
import RequestForm from "../components/RequestForm";
import HistoryView from "../components/HistoryView";
import SettingsView from "../components/SettingsView";
import ReceiptsView from "../components/ReceiptsView";
import OptionSelectionModal from "../components/OptionSelectionModal";
import DashboardCharts from "../components/DashboardCharts";
import ReceiptUploadModal from "../components/ReceiptUploadModal";
import ReceiptReviewModal from "../components/ReceiptReviewModal";
import PendingReceiptsList from "../components/PendingReceiptsList";
import TeamMembersView from "../components/TeamMembersView";
import StatisticsView from "../components/StatisticsView";
import {
  analyzeReceipt,
  ReceiptData,
  ReceiptItem,
} from "../lib/receipt_analyzer";

type ViewPage = "dashboard" | "history" | "settings" | "receipts" | "people" | "statistics";

import { Session } from "@supabase/supabase-js";

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<Receipt[]>([]);
  const [completedReceipts, setCompletedReceipts] = useState<Receipt[]>([]);
  
  // ... (rest of state items are unchanged, just re-declaring them not needed if I can target the function start)
  
// I cannot easily replace just the start without repeating lines. 
// I will target the component definition line and the fetchData function.

  const [stats, setStats] = useState<DashboardStats>({
    totalSavings: 0,
    pendingCount: 0,
    totalSpend: 0,
  });

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<ProcurementRequest | null>(
    null
  );

  // Receipt States
  const [isReceiptUploadOpen, setIsReceiptUploadOpen] = useState(false);
  const [isReceiptReviewOpen, setIsReceiptReviewOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<ViewPage>("dashboard");
  const [loading, setLoading] = useState(true);

  // Settings (Hardcoded for MVP, usually fetched)
  const MONTHLY_BUDGET = 5000;

  // Fetch Data & Realtime Subscription
  useEffect(() => {
    fetchData();

    // Setup Realtime Subscription for REQUESTS
    const requestsSub = supabase
      .channel("public:requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          console.log("Realtime Requests Update:", payload);
          fetchData();

          // Notify if status changes to action_required
          if (
            payload.eventType === "UPDATE" &&
            payload.new.status === RequestStatus.ACTION_REQUIRED
          ) {
            showToast(`Options ready for ${payload.new.product_name}!`);
          }

          // Notify when n8n inserts the new request
          if (payload.eventType === "INSERT") {
            showToast(`New request received: ${payload.new.product_name}`);
          }
        }
      )
      .subscribe();

    // Setup Realtime Subscription for OPTIONS (To refresh immediately when scraper writes)
    const optionsSub = supabase
      .channel("public:sourcing_options")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sourcing_options" },
        (payload) => {
          console.log("Realtime Options Update:", payload);
          fetchData();
        }
      )
      .subscribe();

    // Setup Realtime Subscription for RECEIPTS
    const receiptsSub = supabase
      .channel("public:receipts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "receipts", filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          console.log("Realtime Receipts Update:", payload);
          fetchData();

          if (
            payload.eventType === "UPDATE" &&
            payload.new.status === "analyzed"
          ) {
            showToast(
              `Receipt analyzed: ${
                payload.new.merchant_name || "Ready for review"
              }`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsSub);
      supabase.removeChannel(optionsSub);
      supabase.removeChannel(receiptsSub);
    };
  }, [session.user.id]);

  const fetchData = async () => {
    try {
      // Use Promise.allSettled so one failure doesn't block the others
      const [reqResult, pendingResult, completedResult] = await Promise.allSettled([
        supabase.from("requests").select("*").eq('user_id', session.user.id).order("created_at", { ascending: false }),
        supabase.from("receipts").select("*").eq('user_id', session.user.id).or("status.eq.processing,status.eq.analyzed").order("created_at", { ascending: false }),
        supabase.from("receipts").select("*").eq('user_id', session.user.id).eq("status", "completed").order("created_at", { ascending: false }),
      ]);

      // Process Requests
      if (reqResult.status === 'fulfilled') {
        const { data, error } = reqResult.value;
        if (error) console.error('Error fetching requests:', error);
        else setRequests(data as ProcurementRequest[]);
      } else {
        console.error('Requests query rejected:', reqResult.reason);
      }

      // Process Pending Receipts
      if (pendingResult.status === 'fulfilled') {
        const { data, error } = pendingResult.value;
        if (error) console.error('Error fetching pending receipts:', error);
        else setPendingReceipts(data as Receipt[]);
      } else {
        console.error('Pending receipts query rejected:', pendingResult.reason);
      }

      // Process Completed Receipts
      if (completedResult.status === 'fulfilled') {
        const { data, error } = completedResult.value;
        if (error) console.error('Error fetching completed receipts:', error);
        else setCompletedReceipts(data as Receipt[]);
      } else {
        console.error('Completed receipts query rejected:', completedResult.reason);
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Stats
  useEffect(() => {
    const pending = requests.filter(
      (r) =>
        r.status === RequestStatus.PENDING ||
        r.status === RequestStatus.ACTION_REQUIRED
    ).length;
    let savings = 0;
    let spend = 0;

    requests.forEach((r) => {
      if (r.found_price) {
        if (r.found_price < r.target_price) {
          savings += (r.target_price - r.found_price) * r.quantity;
        }
        if (r.status === RequestStatus.APPROVED) {
          spend += r.found_price * r.quantity;
        }
      }
    });

    completedReceipts.forEach((r) => {
      if (r.total_amount) {
        spend += r.total_amount;
      }
    });

    setStats({
      totalSavings: savings,
      pendingCount: pending,
      totalSpend: spend,
    });
  }, [requests, completedReceipts]);

  const handleReview = (req: ProcurementRequest) => {
    setReviewRequest(req);
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      // Delete all sourcing options for this request
      const { error: deleteErr } = await supabase
        .from("sourcing_options")
        .delete()
        .eq("request_id", id);
      if (deleteErr) console.warn('Failed to clean up sourcing options:', deleteErr);

      showToast("Request rejected.");
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: RequestStatus.REJECTED } : r
        )
      );
    } catch (e) {
      console.error(e);
      showToast("Error updating request.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Receipt Handlers
  const handleAnalyzeReceipt = async (file: File, description: string) => {
    // 1. Close Modal & Show Toast Immediately
    setIsReceiptUploadOpen(false);
    setIsAnalyzing(true);
    showToast("Receipt uploaded! Analyzing in background...");

    try {
      // 1b. Upload Image to Storage
      // Generate unique path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        if (
          uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("not found")
        ) {
          throw new Error(
            "Supabase Storage bucket 'receipts' not found. Please create it in your Supabase Dashboard as a public bucket."
          );
        }
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(filePath);

      // 2. Create Receipt Entry (Processing)
      const { data: receiptCallback, error: receiptError } = await supabase
        .from("receipts")
        .insert({
          description,
          status: "processing",
          image_url: publicUrl,
          user_id: session.user.id
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      fetchData(); // Force fetch to show processing state immediately

      // 3. Analyze (Async)
      analyzeReceipt(file)
        .then(async (data) => {
          // 4. Update Receipt with AI Data
          const { error: analysisUpdateErr } = await supabase
            .from("receipts")
            .update({
              merchant_name: data.merchantName,
              total_amount: data.totalAmount,
              currency: data.currency,
              receipt_date: data.date,
              status: "analyzed",
              raw_data: data,
            })
            .eq("id", receiptCallback.id);

          if (analysisUpdateErr) {
            console.error('Failed to save analysis results:', analysisUpdateErr);
            showToast('Analysis succeeded but failed to save results.');
          } else {
            showToast(
              `Analysis complete: ${data.merchantName || "Unknown Merchant"}`
            );
          }
          fetchData();
        })
        .catch(async (err) => {
          console.error("Async analysis failed:", err);
          const errorMessage = err?.message?.includes('API Key')
            ? 'Chiave OpenAI mancante. Configura VITE_OPENAI_API_KEY.'
            : 'Analisi scontrino fallita. Riprova.';
          showToast(errorMessage);
          const { error: failErr } = await supabase
            .from("receipts")
            .update({ status: "failed" })
            .eq("id", receiptCallback.id);
          if (failErr) console.error('Failed to mark receipt as failed:', failErr);
          fetchData();
        });
    } catch (error: any) {
      console.error("Receipt upload init failed:", error);
      showToast(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleReviewReceiptFromList = (receipt: Receipt) => {
    if (receipt.raw_data) {
      setReceiptData(receipt.raw_data);
      setCurrentReceiptId(receipt.id);
      setImageUrl(receipt.image_url); // Pass image URL
      setIsReceiptReviewOpen(true);
    } else {
      showToast("Error: No analysis data found.");
    }
  };

  const handleConfirmReceiptImport = async (
    editedData: ReceiptData,
    selectedItems: ReceiptItem[]
  ) => {
    if (!currentReceiptId || !receiptData) return;

    try {
      setIsSavingReceipt(true);

      // 0. Update Receipt Metadata (with potentially edited values)
      const { error: receiptUpdateError } = await supabase
        .from("receipts")
        .update({
          merchant_name: editedData.merchantName,
          total_amount: editedData.totalAmount,
          currency: editedData.currency,
          receipt_date: editedData.date,
          status: "completed", // Mark as completed
        })
        .eq("id", currentReceiptId);

      if (receiptUpdateError) throw receiptUpdateError;

      // 1. Insert Receipt Items (Only to receipt_items, NOT requests)
      const itemsToInsert = selectedItems.map((item) => ({
        receipt_id: currentReceiptId,
        description: item.description,
        price: item.price,
        quantity: item.quantity,
        category: item.category || 'Altro',
      }));

      const { error: itemsError } = await supabase
        .from("receipt_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      showToast(
        `Successfully saved receipt with ${selectedItems.length} items!`
      );
      setIsReceiptReviewOpen(false);
      setReceiptData(null);
      setCurrentReceiptId(null);
      fetchData(); // Refresh dashboard
    } catch (error) {
      console.error("Import failed:", error);
      showToast("Failed to save receipt.");
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const budgetPercent = Math.min(
    (stats.totalSpend / MONTHLY_BUDGET) * 100,
    100
  );

  return (
    <div className="flex h-screen bg-cream font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-charcoal text-white transform transition-transform duration-300 ease-in-out border-r-2 border-charcoal ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:relative flex-shrink-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-800 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-forest border border-lime flex items-center justify-center">
              <Bot className="text-lime w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              ProcureBot
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => {
                setActivePage("dashboard");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${
                activePage === "dashboard"
                  ? "bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setActivePage("history");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${
                activePage === "history"
                  ? "bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-5 h-5" />
              History
            </button>
            <button
              onClick={() => {
                setActivePage("receipts");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${
                activePage === "receipts"
                  ? "bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ReceiptIcon className="w-5 h-5" />
              Receipts
            </button>
            <button
              onClick={() => {
                setActivePage("people");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${
                activePage === "people"
                  ? "bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-5 h-5" />
              Persone
            </button>
            <button
              onClick={() => {
                setActivePage("statistics");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${
                activePage === "statistics"
                  ? "bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart2 className="w-5 h-5" />
              Statistiche
            </button>
            <button
              onClick={() => {
                setActivePage("settings");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 border font-bold transition-colors ${
                activePage === "settings"
                  ? "bg-forest text-lime border-lime shadow-[2px_2px_0px_#D4E768]"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>

          <div className="p-4 border-t border-gray-800 shrink-0">
            <div className="bg-white/5 p-4 rounded border border-gray-700">
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs text-gray-400">Monthly Budget</p>
                <p className="text-xs text-lime font-mono">
                  €{MONTHLY_BUDGET.toLocaleString()}
                </p>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full mb-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    budgetPercent > 90 ? "bg-red-500" : "bg-lime"
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-bold">
                  €
                  {stats.totalSpend.toLocaleString("it-IT", {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span
                  className={budgetPercent > 90 ? "text-red-400" : "text-lime"}
                >
                  {budgetPercent.toFixed(1)}% Used
                </span>
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
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-charcoal"
          >
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </header>

        <div className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest"></div>
            </div>
          )}

          {!loading && activePage === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Top Bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal">
                    Dashboard
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Manage tail spend requests and approvals.
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsReceiptUploadOpen(true)}
                    className="bg-white text-charcoal px-6 py-3 font-bold border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" /> Input Receipt
                  </button>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-forest text-white px-6 py-3 font-bold border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5 text-lime" /> New Request
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Total Savings"
                  value={`€${stats.totalSavings.toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                  })}`}
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
                  value={`€${stats.totalSpend.toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                  })}`}
                  subtext="Total processed volume"
                  icon={FileText}
                />
              </div>

              {/* Data Table */}
              <div>
                {(pendingReceipts.length > 0 || requests.length > 0) && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-6 bg-lime"></div>
                    <h3 className="text-xl font-bold text-charcoal">
                      Live Requests
                    </h3>
                  </div>
                )}

                {/* Pending Receipts List */}
                <PendingReceiptsList
                  receipts={pendingReceipts}
                  onReview={handleReviewReceiptFromList}
                />

                <DashboardTable
                  // Show pending or action required items
                  requests={requests.filter(
                    (r) =>
                      r.status === RequestStatus.PENDING ||
                      r.status === RequestStatus.ACTION_REQUIRED
                  )}
                  onReview={handleReview}
                  onReject={handleReject}
                />
              </div>

              {/* New Dashboard Charts */}
              <div>
                <DashboardCharts requests={requests} receipts={completedReceipts} />
              </div>
            </div>
          )}

          {!loading && activePage === "history" && (
            <HistoryView
              requests={requests.filter(
                (r) =>
                  r.status === RequestStatus.APPROVED ||
                  r.status === RequestStatus.REJECTED
              )}
            />
          )}

          {!loading && activePage === "receipts" && <ReceiptsView userId={session.user.id} />}
          
          {!loading && activePage === "people" && <TeamMembersView userId={session.user.id} />}
          
          {!loading && activePage === "statistics" && <StatisticsView userId={session.user.id} />}

          {!loading && activePage === "settings" && <SettingsView />}
        </div>
      </main>

      {/* Modals & Overlays */}
      <RequestForm
        isOpen={isFormOpen}
        userId={session.user.id}
        onClose={() => setIsFormOpen(false)}
        onSubmitSuccess={() => {
          showToast("Request sent to AI Agent...");
          // No explicit refresh here; we wait for n8n to insert to DB, which triggers Realtime update
        }}
        onRequestInserted={fetchData}
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

      <ReceiptUploadModal
        isOpen={isReceiptUploadOpen}
        onClose={() => setIsReceiptUploadOpen(false)}
        onAnalyze={handleAnalyzeReceipt}
        isAnalyzing={isAnalyzing}
      />

      <ReceiptReviewModal
        isOpen={isReceiptReviewOpen}
        onClose={() => setIsReceiptReviewOpen(false)}
        data={receiptData}
        imageUrl={imageUrl}
        onConfirm={handleConfirmReceiptImport}
        isSaving={isSavingReceipt}
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

export default Dashboard;
