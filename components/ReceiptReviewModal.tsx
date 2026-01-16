import React, { useState, useEffect } from 'react';
import { X, Check, ShoppingBag, Calendar, AlertCircle, Loader2, Save } from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../lib/receipt_analyzer';

interface ReceiptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  imageUrl?: string | null;
  onConfirm: (data: ReceiptData, selectedItems: ReceiptItem[]) => void;
  isSaving: boolean;
}

const ReceiptReviewModal: React.FC<ReceiptReviewModalProps> = ({ isOpen, onClose, data, imageUrl, onConfirm, isSaving }) => {
  const [editedData, setEditedData] = useState<ReceiptData | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (data) {
      setEditedData(JSON.parse(JSON.stringify(data))); // Deep copy for editing
      if (data.items) {
        setSelectedIndices(data.items.map((_, i) => i));
      }
    }
  }, [data]);

  if (!isOpen || !editedData) return null;

  const toggleItem = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleHeaderChange = (field: keyof ReceiptData, value: string | number) => {
    setEditedData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setEditedData(prev => {
        if (!prev) return null;
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Auto-update total price if quantity or price changes
        if (field === 'quantity' || field === 'price') {
             const qty = field === 'quantity' ? Number(value) : newItems[index].quantity;
             const price = field === 'price' ? Number(value) : newItems[index].price;
             newItems[index].totalPrice = qty * price;
        }

        return { ...prev, items: newItems };
    });
  };

  const handleConfirm = () => {
    if (!editedData) return;
    const selectedItems = editedData.items.filter((_, i) => selectedIndices.includes(i));
    onConfirm(editedData, selectedItems);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-cream border-2 border-charcoal w-full max-w-6xl max-h-[95vh] flex flex-col shadow-[8px_8px_0px_#1A1E1C] animate-in zoom-in-95 duration-200">
        <div className="bg-charcoal text-white p-4 flex justify-between items-center shrink-0">
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <ShoppingBag className="text-lime w-5 h-5" />
            Review & Edit Receipt Data
          </h2>
          <button onClick={onClose} className="hover:text-lime transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
             
             {/* Left Column: Image Preview */}
             {imageUrl && (
                 <div className="lg:w-1/2 p-6 bg-gray-100 border-b lg:border-b-0 lg:border-r border-charcoal overflow-y-auto flex items-center justify-center">
                     <img 
                        src={imageUrl} 
                        alt="Receipt Preview" 
                        className="max-w-full h-auto shadow-md border border-gray-300" 
                     />
                 </div>
             )}

             {/* Right Column: Data Editor */}
             <div className={`p-6 overflow-y-auto flex-1 ${imageUrl ? 'lg:w-1/2' : 'w-full'}`}>
                {/* Header Data Editable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 border-2 border-charcoal">
                        <span className="text-xs text-gray-500 uppercase font-bold">Merchant</span>
                        <input 
                            type="text" 
                            value={editedData.merchantName} 
                            onChange={(e) => handleHeaderChange('merchantName', e.target.value)}
                            className="w-full font-bold text-lg border-b-2 border-gray-200 focus:border-forest outline-none bg-transparent"
                        />
                    </div>
                    <div className="bg-white p-4 border-2 border-charcoal">
                        <span className="text-xs text-gray-500 uppercase font-bold">Total ({editedData.currency})</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={editedData.totalAmount} 
                            onChange={(e) => handleHeaderChange('totalAmount', parseFloat(e.target.value))}
                            className="w-full font-bold text-lg text-forest border-b-2 border-gray-200 focus:border-forest outline-none bg-transparent"
                        />
                    </div>
                     <div className="bg-white p-4 border-2 border-charcoal md:col-span-2">
                        <span className="text-xs text-gray-500 uppercase font-bold">Date</span>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input 
                                type="date" 
                                value={editedData.date || ''} 
                                onChange={(e) => handleHeaderChange('date', e.target.value)}
                                className="w-full font-bold text-lg border-b-2 border-gray-200 focus:border-forest outline-none bg-transparent"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4 flex items-start gap-2 text-sm text-blue-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>Verify the extracted items. Uncheck unnecessary items. You can edit the description and price directly.</p>
                </div>

                {/* Items List Editable */}
                <div className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr_60px_80px] gap-3 px-2 pb-2 border-b border-gray-300 font-bold text-charcoal text-sm">
                        <span>Sel</span>
                        <span>Description</span>
                        <span>Qty</span>
                        <span>Price</span>
                    </div>
                    {editedData.items.map((item, index) => {
                    const isSelected = selectedIndices.includes(index);
                    return (
                        <div 
                            key={index} 
                            className={`grid grid-cols-[auto_1fr_60px_80px] gap-3 items-center p-2 border-2 transition-all ${isSelected ? 'bg-white border-forest shadow-[2px_2px_0px_#D4E768]' : 'bg-gray-50 border-transparent opacity-60'}`}
                        >
                            <div 
                                onClick={() => toggleItem(index)}
                                className={`w-5 h-5 border-2 flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-forest border-forest' : 'bg-white border-gray-400'}`}
                            >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            
                            <input 
                                type="text" 
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                className="font-medium text-sm bg-transparent border-b border-transparent focus:border-forest outline-none w-full"
                            />

                            <input 
                                type="number" 
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                className="font-mono text-sm bg-transparent border-b border-transparent focus:border-forest outline-none w-full"
                            />

                            <input 
                                type="number" 
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                                className="font-mono font-bold text-sm bg-transparent border-b border-transparent focus:border-forest outline-none w-full"
                            />
                        </div>
                    );
                    })}
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white shrink-0 flex justify-end gap-3">
             <button 
                onClick={onClose}
                className="px-6 py-3 font-bold text-charcoal hover:bg-gray-100 transition-colors"
                disabled={isSaving}
             >
                Cancel
             </button>
             <button 
                onClick={handleConfirm}
                disabled={isSaving || selectedIndices.length === 0}
                className="bg-forest text-white px-8 py-3 font-bold border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Import
             </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptReviewModal;
