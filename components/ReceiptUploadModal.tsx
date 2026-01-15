import React, { useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (file: File, description: string) => void;
  isAnalyzing: boolean;
}

const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({ isOpen, onClose, onAnalyze, isAnalyzing }) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setFile(file);
    } else {
      alert("Please upload an image file.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onAnalyze(file, description);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-cream border-2 border-charcoal w-full max-w-md shadow-[8px_8px_0px_#1A1E1C] animate-in zoom-in-95 duration-200">
        <div className="bg-charcoal text-white p-4 flex justify-between items-center">
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <FileText className="text-lime w-5 h-5" />
            Input Receipt
          </h2>
          <button onClick={onClose} className="hover:text-lime transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
             <label className="font-bold text-charcoal">Description / Note</label>
             <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Team Lunch, Office Supplies"
                className="w-full bg-white border-2 border-charcoal p-3 font-medium focus:outline-none focus:shadow-[4px_4px_0px_#D4E768] transition-all"
                required
             />
          </div>

          <div 
            className={`border-2 border-dashed p-8 text-center transition-all ${dragActive ? 'border-lime bg-forest/5' : 'border-gray-300 hover:border-charcoal'} ${file ? 'bg-white border-solid border-charcoal' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              className="hidden" 
              id="file-upload"
              accept="image/*"
              onChange={handleChange}
            />
            
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-gray-100 object-cover rounded overflow-hidden border border-gray-200">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <p className="font-bold text-charcoal">{file.name}</p>
                <button 
                    type="button" 
                    onClick={() => setFile(null)}
                    className="text-sm text-red-500 hover:underline"
                >
                    Remove
                </button>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-gray-400" />
                <span className="font-bold text-charcoal">Click to upload</span>
                <span className="text-sm text-gray-500">or drag and drop receipt image</span>
              </label>
            )}
          </div>

          <button 
            type="submit" 
            disabled={!file || isAnalyzing}
            className="w-full bg-forest text-white py-4 font-bold border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-lime" />
                Analyzing Receipt...
              </>
            ) : (
              <>
                 Analyze Receipt
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReceiptUploadModal;
