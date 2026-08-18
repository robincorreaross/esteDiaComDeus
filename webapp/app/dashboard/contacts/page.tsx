'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, CheckCircle, XCircle, UserCheck, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ContactsManagerPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state
  const [targetId, setTargetId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'individual' | 'group'>('individual');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setContacts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim() || !name.trim()) return;

    setAdding(true);
    try {
      await supabase.from('contacts').insert({
        target_id: targetId.trim(),
        name: name.trim(),
        type: type,
        is_active: true,
      });

      setTargetId('');
      setName('');
      fetchContacts();
    } catch (err: any) {
      alert(`Erro ao adicionar contato: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('contacts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      fetchContacts();
    } catch (err: any) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    if (confirm(`Deseja remover "${contactName}" da lista de disparos?`)) {
      try {
        await supabase.from('contacts').delete().eq('id', id);
        fetchContacts();
      } catch (err: any) {
        alert(`Erro ao deletar: ${err.message}`);
      }
    }
  };

  const activeCount = contacts.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131b2e] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            <Users className="w-4 h-4" />
            <span>Destinatários WhatsApp</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Contatos e Grupos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie os números e grupos do WhatsApp que receberão as devocionais diárias.
          </p>
        </div>

        <div className="px-4 py-2 bg-blue-600/15 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-semibold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-400" />
          <span>{activeCount} de {contacts.length} destinatários ativos</span>
        </div>
      </div>

      {/* Add Contact Form */}
      <form onSubmit={handleAddContact} className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-400" />
          Adicionar Novo Destinatário
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Número ou ID do Grupo WhatsApp
            </label>
            <input
              type="text"
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Ex: 5516991080895 ou 120363...@g.us"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nome do Destinatário / Grupo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pr. Gilson Brito ou Grupo Devocional"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Tipo de Destino
            </label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="individual">Número Individual (Contato)</option>
              <option value="group">Grupo do WhatsApp (@g.us)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {adding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Cadastrar Destinatário</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Contacts List Table */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">Lista de Contatos Cadastrados</h3>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando contatos...
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            Nenhum contato cadastrado. Adicione seu primeiro destinatário no formulário acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">ID / Telefone</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(contact.id, contact.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          contact.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {contact.is_active ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" /> Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Inativo
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {contact.name}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-blue-300">
                      {contact.target_id}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {contact.type === 'group' ? (
                        <span className="inline-flex items-center gap-1 text-indigo-400">
                          <MessageSquare className="w-3.5 h-3.5" /> Grupo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          Individual
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(contact.id, contact.name)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Excluir contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
