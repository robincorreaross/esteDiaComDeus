'use me';
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Shield,
  Users,
  FileText,
  Activity,
  Sparkles,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successfulExecutions: 0,
    activeContacts: 0,
    lastRunDate: 'Nenhuma',
    lastRunStatus: 'SUCCESS',
    cronSchedule: '0 6 * * *',
    strictMode: true,
  });

  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch execution logs
      const { data: logData } = await supabase
        .from('execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (logData) {
        setLogs(logData);
      }

      // 2. Fetch total stats count
      const { count: totalCount } = await supabase
        .from('execution_logs')
        .select('*', { count: 'exact', head: true });

      const { count: successCount } = await supabase
        .from('execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'SUCCESS');

      // 3. Fetch active contacts count
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 4. Fetch settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('cron_schedule, transcript_strict_mode')
        .eq('id', 'default')
        .single();

      const last = logData && logData.length > 0 ? logData[0] : null;

      setStats({
        totalExecutions: totalCount || (logData ? logData.length : 0),
        successfulExecutions: successCount || (logData ? logData.filter(l => l.status === 'SUCCESS').length : 0),
        activeContacts: contactCount || 1,
        lastRunDate: last ? new Date(last.created_at).toLocaleString('pt-BR') : 'Sem registros',
        lastRunStatus: last ? last.status : 'SUCCESS',
        cronSchedule: settingsData?.cron_schedule || '0 6 * * *',
        strictMode: settingsData?.transcript_strict_mode ?? true,
      });

    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunNow = async () => {
    setTriggering(true);
    setTriggerMessage('Iniciando automação imediata...');
    try {
      const res = await fetch('/api/automation/run', { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        setTriggerMessage('✅ Automação concluída com sucesso! Mensagem enviada.');
      } else {
        setTriggerMessage(`⚠️ Automação finalizada: ${json.error || 'Verifique o log de execução'}`);
      }
      fetchDashboardData();
    } catch (err: any) {
      setTriggerMessage(`❌ Erro no disparo: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const successRate = stats.totalExecutions > 0
    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
    : 100;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 p-6 rounded-2xl border border-blue-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Sistema Autônomo Devocional</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel de Controle Principal</h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitoramento de disparos do YouTube, IA Gemini/GPT e alertas Evolution API.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchDashboardData}
            className="p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl text-slate-300 border border-slate-700 transition-all"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleRunNow}
            disabled={triggering}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {triggering ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>Disparar Agora</span>
          </button>
        </div>
      </div>

      {triggerMessage && (
        <div className="p-4 bg-slate-900/90 border border-blue-500/30 rounded-xl text-sm text-slate-200 flex items-center justify-between">
          <span>{triggerMessage}</span>
          <button onClick={() => setTriggerMessage('')} className="text-xs text-slate-400 hover:text-white">Fechar</button>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Status da Trava */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trava Anti-Alucinação</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span>{stats.strictMode ? 'Ativada' : 'Desativada'}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bloqueia se a transcrição do vídeo falhar.
          </p>
        </div>

        {/* Card 2: Destinatários Ativos */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destinatários Ativos</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.activeContacts} <span className="text-xs font-normal text-slate-400">contato(s) / grupo(s)</span>
          </div>
          <Link href="/dashboard/contacts" className="text-xs text-blue-400 hover:underline mt-1 inline-flex items-center gap-1">
            Gerenciar contatos <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 3: Taxa de Sucesso */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa de Sucesso</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {successRate}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.successfulExecutions} de {stats.totalExecutions} disparos concluídos
          </p>
        </div>

        {/* Card 4: Horário Agendado */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Horário Diário</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            06:00 BRT
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cron: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-300">{stats.cronSchedule}</code>
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/prompt" className="bg-[#131b2e] hover:bg-[#1a243d] border border-slate-800 p-5 rounded-2xl transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">Editar Prompt da IA</h3>
          </div>
          <p className="text-xs text-slate-400">
            Ajuste a estrutura da mensagem, emojis e tom do Pr. Gilson Brito.
          </p>
        </Link>

        <Link href="/dashboard/schedule" className="bg-[#131b2e] hover:bg-[#1a243d] border border-slate-800 p-5 rounded-2xl transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-600/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">Configurar Horário & Alertas</h3>
          </div>
          <p className="text-xs text-slate-400">
            Altere a hora do envio diário e telefone de alerta no WhatsApp.
          </p>
        </Link>

        <Link href="/dashboard/test" className="bg-[#131b2e] hover:bg-[#1a243d] border border-slate-800 p-5 rounded-2xl transition-all group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white">Área de Testes</h3>
          </div>
          <p className="text-xs text-slate-400">
            Simule o processo de transcrição e geração de resumo sem disparar.
          </p>
        </Link>
      </div>

      {/* Recent Executions Table */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Últimas Execuções</h3>
            <p className="text-xs text-slate-400 mt-0.5">Histórico recente de automações e testes disparados</p>
          </div>
          <Link href="/dashboard/logs" className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1">
            Ver histórico completo <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Carregando execuções...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
            Nenhuma execução registrada ainda. Clique em "Disparar Agora" para testar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/70 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Vídeo</th>
                  <th className="py-3 px-4">Transcrição</th>
                  <th className="py-3 px-4">Disparos</th>
                  <th className="py-3 px-4">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> {log.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {log.video_title || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {log.transcript_length > 0 ? (
                        <span className="text-emerald-400 font-mono">{log.transcript_length} chars</span>
                      ) : (
                        <span className="text-red-400 font-mono">0 chars (Bloqueado)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {log.recipients_sent || 0} enviado(s)
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
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
