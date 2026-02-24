import React, { useState, useEffect } from "react";
import { X, Save, User, Mail, Phone, Hash, DollarSign } from "lucide-react";
import { TeamMember } from "../types";
import { supabase } from "../lib/supabase";

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  memberToEdit?: TeamMember | null;
  userId: string;
}

const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  memberToEdit,
  userId,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setEmail(memberToEdit.email || "");
      setPhone(memberToEdit.phone || "");
      setIdentifier(memberToEdit.identifier || "");
      setBudget(memberToEdit.budget || "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setIdentifier("");
      setBudget("");
    }
    setError(null);
  }, [memberToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        user_id: userId,
        name,
        email: email || null,
        phone: phone || null,
        identifier: identifier || null,
        budget: budget === "" ? 0 : Number(budget),
      };

      if (memberToEdit) {
        const { error: updateError } = await supabase
          .from("team_members")
          .update(data)
          .eq("id", memberToEdit.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("team_members")
          .insert(data);

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving team member:", err);
      setError(err.message || "Failed to save team member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-charcoal/80 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
      <div className="bg-cream w-full max-w-lg border-4 border-charcoal shadow-[8px_8px_0px_#1A1E1C] flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b-4 border-charcoal bg-lime">
          <h2 className="text-2xl font-display font-bold text-charcoal flex items-center gap-2">
            <User className="w-6 h-6" />
            {memberToEdit ? "Modifica Persona" : "Aggiungi Persona"}
          </h2>
          <button
            onClick={onClose}
            className="text-charcoal hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 relative font-medium">
              {error}
            </div>
          )}

          <form id="teamMemberForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2">
                Nome e Cognome *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
                className="w-full p-3 border-2 border-gray-300 focus:border-forest focus:ring-0 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario@azienda.it"
                  className="w-full p-3 border-2 border-gray-300 focus:border-forest focus:ring-0 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Telefono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                  className="w-full p-3 border-2 border-gray-300 focus:border-forest focus:ring-0 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  <Hash className="inline w-4 h-4 mr-1" />
                  ID Identificativo
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Es: ID-123, Matricola"
                  className="w-full p-3 border-2 border-gray-300 focus:border-forest focus:ring-0 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  Budget (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  placeholder="1000"
                  className="w-full p-3 border-2 border-gray-300 focus:border-forest focus:ring-0 bg-white"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 mt-auto shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold text-gray-600 hover:text-charcoal bg-white border-2 border-gray-300 shadow-[2px_2px_0px_#D1D5DB] hover:shadow-[4px_4px_0px_#9CA3AF] transition-all"
            disabled={isSubmitting}
          >
            Annulla
          </button>
          <button
            type="submit"
            form="teamMemberForm"
            disabled={isSubmitting}
            className="px-6 py-3 font-bold bg-forest text-white border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 text-lime" />
            {isSubmitting ? "Salvataggio..." : "Salva Persona"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberFormModal;
