import React, { useState } from 'react';
import { X, Bot, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { searchGoogleShopping } from '../lib/serper';
import { RequestStatus, TeamMember } from '../types';

const CATEGORIES = [
  'IT',
  'Stationery',
  'Hardware',
  'Software',
  'Office Supplies',
  'Services',
  'Other'
];

interface RequestFormProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
  onRequestInserted?: () => void; // Callback to refresh data after DB insert
}

const RequestForm: React.FC<RequestFormProps> = ({ isOpen, userId, onClose, onSubmitSuccess, onRequestInserted }) => {
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Fetch team members for the dropdown
  React.useEffect(() => {
    if (isOpen) {
      const fetchMembers = async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        
        if (!error && data) {
          setMembers(data as TeamMember[]);
        }
      };
      
      fetchMembers();
      
      // Reset assignment when form opens
      setAssignedTo('');
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Capture form values before closing
    const capturedProductName = productName;
    const capturedQuantity = quantity;
    const numericTargetPrice = parseFloat(targetPrice);
    const capturedCategory = category || 'Other';
    const capturedAssignedTo = assignedTo || null;

    if (isNaN(numericTargetPrice) || numericTargetPrice <= 0) {
      alert('Il prezzo obiettivo non è valido. Inserisci un numero positivo.');
      return;
    }

    if (capturedQuantity < 1 || isNaN(capturedQuantity)) {
      alert('La quantità deve essere almeno 1.');
      return;
    }

    // Reset form and close immediately
    setProductName('');
    setQuantity(1);
    setTargetPrice('');
    setCategory('');
    onSubmitSuccess();
    onClose();

    // Run sourcing in background
    try {
      // 1. Insert Request into Supabase
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .insert([
          {
            product_name: capturedProductName,
            quantity: capturedQuantity,
            target_price: numericTargetPrice,
            category: capturedCategory,
            source: 'dashboard',
            status: RequestStatus.PENDING,
            user_id: userId,
            assigned_to: capturedAssignedTo
          }
        ])
        .select()
        .single();

      if (requestError) throw requestError;
      if (!requestData) throw new Error('Failed to create request');

      // Immediately refresh the live requests
      onRequestInserted?.();

      const requestId = requestData.id;

      // 2. Search Google Shopping via Serper
      const shoppingResults = await searchGoogleShopping(capturedProductName);

      // 3. Transform and Save Options
      if (shoppingResults.length > 0) {
        const optionsToInsert = shoppingResults.slice(0, 40).map((item) => ({
          request_id: requestId,
          vendor: item.source,
          product_title: item.title,
          price: parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')), // Clean price string
          url: item.link,
          image_url: item.imageUrl,
          rating: item.rating,
          rating_count: item.ratingCount,
          product_id: item.productId,
          position: item.position,
          is_selected: false
        }));

        const { error: optionsError } = await supabase
          .from('sourcing_options')
          .insert(optionsToInsert);

        if (optionsError) {
            console.error("Error inserting options:", optionsError);
            // Don't throw, just proceed, maybe we failed to save options but request is there
        } else {
            // 4. Update Request Status to ACTION_REQUIRED
            await supabase
                .from('requests')
                .update({ status: RequestStatus.ACTION_REQUIRED })
                .eq('id', requestId);
        }
      }
      
    } catch (error: any) {
      console.error('Error processing request:', error);
      // Errors are logged but not shown since modal is closed
      // The realtime subscription will handle showing the request status
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg border-2 border-charcoal shadow-[8px_8px_0px_#D4E768] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-charcoal bg-cream">
          <div className="flex items-center gap-3">
            <div className="bg-forest p-2 border border-charcoal">
              <Bot className="w-5 h-5 text-lime" />
            </div>
            <h2 className="text-xl font-display font-bold text-charcoal">New Sourcing Request</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
              Product Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Logitech MX Master 3S Mouse"
              className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent font-medium"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">Be as specific as possible for better AI matching.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
                Target Price (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="100.00"
                className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
              Category
            </label>
            <select
              required
              className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest appearance-none cursor-pointer"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Helps organize spending reports.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wide">
              Assign To (Optional)
            </label>
            <select
              className="w-full p-4 bg-white border-2 border-charcoal focus:outline-none focus:ring-2 focus:ring-forest appearance-none cursor-pointer"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">No assignment</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Link this request to a team member's budget.</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-forest text-white font-bold py-4 border-2 border-charcoal hover:bg-charcoal hover:shadow-[4px_4px_0px_#D4E768] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {statusMessage || 'Processing...'}
                </>
              ) : (
                <>
                  Launch Sourcing Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;