import React, { useState, useEffect } from "react";
import { User, Plus, Edit2, Trash2, Mail, Phone, DollarSign } from "lucide-react";
import { supabase } from "../lib/supabase";
import { TeamMember } from "../types";
import TeamMemberFormModal from "./TeamMemberFormModal";

interface TeamMembersViewProps {
  userId: string;
}

const TeamMembersView: React.FC<TeamMembersViewProps> = ({ userId }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (fetchErr) throw fetchErr;
      setMembers(data as TeamMember[]);
    } catch (err: any) {
      console.error("Error fetching team members:", err);
      setError('Impossibile caricare i membri del team. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa persona?")) return;

    try {
      const { error: deleteErr } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);

      if (deleteErr) throw deleteErr;
      fetchMembers();
    } catch (err: any) {
      console.error("Error deleting team member:", err);
      setError(`Eliminazione fallita: ${err.message || 'Errore sconosciuto'}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal">
            Team e Persone
          </h1>
          <p className="text-gray-500 mt-1">
            Gestisci le persone dell'azienda e assegna loro budget e richieste.
          </p>
        </div>
        <button
          onClick={() => {
            setMemberToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-forest text-white px-6 py-3 font-bold border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#D4E768] hover:border-lime transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5 text-lime" /> Aggiungi Persona
        </button>
      </div>

      <div className="bg-white border-2 border-charcoal shadow-[4px_4px_0px_#1A1E1C] overflow-hidden">
        {error && (
          <div className="m-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 font-medium text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-bold ml-4">✕</button>
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-medium">
            Caricamento in corso...
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-charcoal">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-2xl font-bold font-display mb-2">
              Nessuna persona trovata
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Inizia ad aggiungere i membri del tuo team per poter assegnare loro
              richieste e tracciare le spese.
            </p>
            <button
              onClick={() => {
                setMemberToEdit(null);
                setIsModalOpen(true);
              }}
              className="text-forest font-bold hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-5 h-5" /> Aggiungi la tua prima persona
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-charcoal text-white text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold border-b-2 border-charcoal">Nome</th>
                  <th className="p-4 font-bold border-b-2 border-charcoal">Contatti</th>
                  <th className="p-4 font-bold border-b-2 border-charcoal">ID</th>
                  <th className="p-4 font-bold border-b-2 border-charcoal text-right">Budget</th>
                  <th className="p-4 font-bold border-b-2 border-charcoal text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-bold text-charcoal">{member.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {member.email}
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {member.phone}
                          </span>
                        )}
                        {!member.email && !member.phone && (
                          <span className="text-gray-400 italic">Nessun contatto</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block bg-gray-100 px-2 py-1 text-xs font-mono border border-gray-300 rounded text-gray-600">
                        {member.identifier || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {member.budget ? (
                         <div className="font-bold text-lime bg-charcoal inline-flex items-center px-2 py-1 rounded">
                           <DollarSign className="w-3 h-3 mr-1" />
                           {member.budget.toLocaleString("it-IT", {
                             minimumFractionDigits: 2,
                           })}
                         </div>
                      ) : (
                        <span className="text-gray-400 italic">Non impostato</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setMemberToEdit(member);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-500 hover:text-forest hover:bg-forest/10 rounded transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TeamMemberFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchMembers}
        userId={userId}
        memberToEdit={memberToEdit}
      />
    </div>
  );
};

export default TeamMembersView;
