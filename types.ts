
export enum RequestStatus {
  PENDING = 'pending',
  ACTION_REQUIRED = 'action_required', // New status when n8n finds options
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ProcessingStep {
  IDLE = 'idle',
  PARSING = 'parsing',
  SCOUTING = 'scouting',
  CALCULATING = 'calculating',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface ProcurementItem {
  productName: string;
  originalPriceEstimate: number;
  foundPrice: number;
  quantity: number;
  savings: number;
  savingsPercentage: number;
  supplier: string;
  reasoning: string;
}

export interface ProcurementReport {
  items: ProcurementItem[];
  totalSavings: number;
}

export interface SourcingOption {
  id: string;
  request_id: string;
  vendor: string; // e.g., 'Amazon', 'eBay'
  product_title: string;
  price: number;
  url: string;
  is_selected: boolean;
  
  // Serper / Google Shopping Data
  image_url?: string;
  rating?: number;
  rating_count?: number; // Matches DB column 'rating_count'
  product_id?: string;   // Matches DB column 'product_id'
  position?: number;     // Matches DB column 'position'
}

export interface ProcurementRequest {
  id: string;
  created_at: string;
  product_name: string;
  quantity: number;
  target_price: number;
  found_price: number | null; 
  source: 'email' | 'dashboard';
  status: RequestStatus;
  link: string | null;
  category?: string; // e.g. 'IT', 'Stationery', 'Software'
  assigned_to?: string | null; // UUID of assigned Team Member
}

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  identifier?: string;
  budget?: number;
  created_at: string;
}

export interface DashboardStats {
  totalSavings: number;
  pendingCount: number;
  totalSpend: number;
}

export interface Receipt {
  id: string;
  created_at: string;
  description: string;
  status: 'processing' | 'analyzed' | 'completed' | 'failed';
  merchant_name?: string;
  total_amount?: number;
  currency?: string;
  receipt_date?: string;
  image_url?: string;
  raw_data?: any;
}
