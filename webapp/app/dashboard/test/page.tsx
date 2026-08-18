'use me';
'use client';

import React, { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, AlertTriangle, Send, FileText, Youtube } from 'lucide-react';

export default function SandboxTestPage() {
  const [testingYoutube, setTestingYoutube] = useState(false);
  const [youtubeResult, setYoutubeResult] = useState<any | null>(null);

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');

  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testNumber, setTestNumber] = useState('5516991080895');
  const [whatsappResult, setWhatsappResult] = useState<string>('');

  // 1. Test YouTube
  const handleTestYoutube = async () => {
    setTestingYoutube(true);
    setYoutubeResult(null);
    try {
      const res = await fetch('/api/test/youtube');
      const json = await res.json();
      setYoutubeResult(json);
    } catch (err: any) {
      setYoutubeResult({ success: false, error: err.message });
    } finally {
      setTestingYoutube(false);
    }
  };

  // 2. Test Summarizer
  const handleTestSummarizer = async () => {
    if (!youtubeResult || !youtubeResult.transcript) {
      alert('Por favor, primeiro execute o teste do YouTube para obter a transcrição real!');
      return;
    }
    setGeneratingSummary(true);
    setGeneratedSummary('');
    try {
      const res = await fetch('/api/test/summarizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: youtubeResult.title,
          videoUrl: youtubeResult.videoUrl,
          transcript: youtubeResult.transcript,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedSummary(json.summary);
      } else {
        alert(`Erro na geração: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // 3. Test WhatsApp dispatch
  const handleTestWhatsapp = async () => {
    setTestingWhatsapp(true);
    setWhatsappResult('');
    try {
      const res = await fetch('/api/test/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: testNumber.trim(),
          message: generatedSummary || '*Teste Este Dia Com Deus*\n\nConexão com Evolution API funcionando perfeitamente! 🕊️',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setWhatsappResult(`✅ Mensagem de teste enviada com sucesso para ${testNumber}!`);
      } else {
        setWhatsappResult(`❌ Falha no envio: ${json.error}`);
      }
    } catch (err: any) {
      setWhatsappResult(`❌ Erro: ${err.message}`);
    } finally {
      setTestingWhatsapp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131b2e] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <FlaskConical className="w-4 h-4" />
            <span>Ambiente de Validação</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Área de Testes e Diagnóstico</h1>
          <p className="text-sm text-slate-400 mt-1">
            Testes passo a passo dos módulos isolados (YouTube, IA e WhatsApp) sem afetar o agendamento oficial.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Test YouTube */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
              <Youtube className="w-4 h-4" />
              <span>Etapa 1: YouTube & Legendas</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Busca do Vídeo & Transcrição</h3>
            <p className="text-xs text-slate-400">
              Busca o vídeo mais recente do canal e extrai o áudio transcrito do Pr. Gilson Brito.
            </p>

            {youtubeResult && (
              <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                {youtubeResult.success ? (
                  <>
                    <div className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Vídeo e Transcrição Capturados!
                    </div>
                    <div className="text-slate-300 font-medium truncate">{youtubeResult.title}</div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Tamanho: <span className="text-blue-300">{youtubeResult.transcript?.length || 0} caracteres</span>
                    </div>
                  </>
                ) : (
                  <div className="text-red-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Erro: {youtubeResult.error}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleTestYoutube}
            disabled={testingYoutube}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {testingYoutube ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Testar YouTube
              </>
            )}
          </button>
        </div>

        {/* Step 2: Test AI Summarizer */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
              <FileText className="w-4 h-4" />
              <span>Etapa 2: Inteligência Artificial</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Geração da Devocional</h3>
            <p className="text-xs text-slate-400">
              Envia a transcrição capturada na Etapa 1 para o GPT-4o mini utilizando o prompt ativo.
            </p>

            {generatedSummary && (
              <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-xs">
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resumo Gerado com Sucesso!
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  Tamanho: <span className="text-indigo-300">{generatedSummary.length} caracteres</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleTestSummarizer}
            disabled={generatingSummary || !youtubeResult?.transcript}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {generatingSummary ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Gerar com IA
              </>
            )}
          </button>
        </div>

        {/* Step 3: Test WhatsApp */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
              <Send className="w-4 h-4" />
              <span>Etapa 3: Disparo WhatsApp</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Envio Evolution API</h3>
            <p className="text-xs text-slate-400">
              Dispara a mensagem de teste diretamente para o número desejado via WhatsApp.
            </p>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Número de Destino:</label>
              <input
                type="text"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="5516991080895"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {whatsappResult && (
              <div className="mt-3 p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium">
                {whatsappResult}
              </div>
            )}
          </div>

          <button
            onClick={handleTestWhatsapp}
            disabled={testingWhatsapp}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {testingWhatsapp ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Enviar no WhatsApp
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Message Preview Area */}
      {generatedSummary && (
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Pré-visualização da Mensagem Gerada para WhatsApp:
          </h3>
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
            {generatedSummary}
          </div>
        </div>
      )}
    </div>
  );
}
