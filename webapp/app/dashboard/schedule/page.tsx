'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Shield, PhoneCall, Save, Check, Globe, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ScheduleSettingsPage() {
  const [cronSchedule, setCronSchedule] = useState('0 6 * * *');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [adminPhone, setAdminPhone] = useState('5516991080895');
  const [strictMode, setStrictMode] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('cron_schedule, timezone, admin_phone, transcript_strict_mode')
          .eq('id', 'default')
          .single();

        if (data) {
          setCronSchedule(data.cron_schedule || '0 6 * * *');
          setTimezone(data.timezone || 'America/Sao_Paulo');
          setAdminPhone(data.admin_phone || '5516991080895');
          setStrictMode(data.transcript_strict_mode ?? true);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await supabase.from('settings').upsert({
        id: 'default',
        cron_schedule: cronSchedule.trim(),
        timezone: timezone.trim(),
        admin_phone: adminPhone.trim(),
        transcript_strict_mode: strictMode,
        updated_at: new Date().toISOString(),
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Erro ao salvar configurações: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131b2e] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Clock className="w-4 h-4" />
            <span>Configurações do Robô</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Horário & Alertas de Emergência</h1>
          <p className="text-sm text-slate-400 mt-1">
            Ajuste o agendamento dos disparos diários e o número de WhatsApp para receber notificações de erros.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Agendamento */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Agendamento do Disparo Diário
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Expressão Cron (Formato 5 campos)
              </label>
              <input
                type="text"
                required
                value={cronSchedule}
                onChange={(e) => setCronSchedule(e.target.value)}
                placeholder="0 6 * * *"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Padrão: <code className="text-slate-300">0 6 * * *</code> (Roda diariamente às 06:00 AM)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Fuso Horário (Timezone)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Sao_Paulo"
                  className="w-full pl-10 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Alertas de Emergência */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-indigo-400" />
            Alerta de Erros no WhatsApp do Administrador
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Telefone para Receber Alertas de Erro
            </label>
            <input
              type="text"
              required
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="5516991080895"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-emerald-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Sempre que ocorrer uma falha na transcrição ou erro no envio, um alerta será enviado imediatamente para este WhatsApp.
            </p>
          </div>
        </div>

        {/* Section 3: Trava Anti-Alucinação */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Trava Anti-Alucinação da IA
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Se ativada, caso o sistema não consiga obter a transcrição real do Pr. Gilson Brito (&lt;100 caracteres), a IA será impedida de gerar a mensagem e o processo será cancelado para evitar informações falsas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStrictMode(!strictMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                strictMode ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  strictMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {strictMode ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Proteção Ativa: A IA não irá alucinar versículos nem sermões se a legenda falhar.</span>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Atenção: Sem a trava, a IA poderá usar a descrição curta do canal caso a transcrição falhe.</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
