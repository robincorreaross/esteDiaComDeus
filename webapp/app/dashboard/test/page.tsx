'use client';

import React, { useState } from 'react';
import { FlaskConical, Play, CheckCircle2, AlertTriangle, Send, FileText, Youtube, Sparkles, Copy, Check } from 'lucide-react';

const SAMPLE_TRANSCRIPT = `O medo aparece e o coração permanece inquieto. Descansar em Deus não significa passividade, mas rendição. É reconhecer que acima de qualquer planejamento existe um Deus soberano cuidando de cada detalhe. É saber que nenhuma proteção humana pode substituir o cuidado divino. É confiar que mesmo quando nós não vemos saída, nosso Deus continua no controle. Talvez hoje Deus esteja fazendo o mesmo convite que fez a Judá. Na verdade, talvez não, com certeza. Deus está fazendo a você e a mim o mesmo convite que ele fez a Judá: volte, descanse, confie. Não porque suas estratégias são inúteis, mas porque sem ele essas estratégias são insuficientes. A paz que a gente procura não está em ter tudo sob controle, mas em entregar tudo nas mãos daquele que realmente controla todas as coisas. Que Deus abençoe o seu dia!`;

export default function SandboxTestPage() {
  const [testingYoutube, setTestingYoutube] = useState(false);
  const [youtubeResult, setYoutubeResult] = useState<any | null>(null);
  const [transcriptText, setTranscriptText] = useState<string>('');

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
      if (json.transcript) {
        setTranscriptText(json.transcript);
      }
    } catch (err: any) {
      setYoutubeResult({ success: false, error: err.message });
    } finally {
      setTestingYoutube(false);
    }
  };

  // 2. Test Summarizer
  const handleTestSummarizer = async () => {
    const textToUse = transcriptText.trim() || youtubeResult?.transcript;
    if (!textToUse || textToUse.length < 50) {
      alert('Por favor, informe ou carregue uma transcrição com pelo menos 50 caracteres para testar a IA!');
      return;
    }
    setGeneratingSummary(true);
    setGeneratedSummary('');
    try {
      const res = await fetch('/api/test/summarizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: youtubeResult?.title || '#230 Descansar em Deus | Pr. Gilson Brito',
          videoUrl: youtubeResult?.videoUrl || 'https://www.youtube.com/watch?v=w-LeYsmVQhs',
          transcript: textToUse,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedSummary(json.summary);
      } else {
        alert(`Erro na geração da IA: ${json.error}`);
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
        setWhatsappResult(`❌ Falha no envio: ${json.error || 'Verifique a Evolution API'}`);
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
            Validação passo a passo de cada módulo (YouTube, IA Devocional e Disparo WhatsApp).
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
              Busca o vídeo mais recente do canal via RSS oficial.
            </p>

            {youtubeResult && (
              <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                {youtubeResult.success ? (
                  <>
                    <div className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Vídeo Detectado no YouTube!
                    </div>
                    <div className="text-slate-300 font-medium truncate">{youtubeResult.title}</div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Status Legenda Edge: <span className="text-blue-300">{transcriptText?.length || youtubeResult.transcriptLength || 0} chars</span>
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

          <div className="space-y-2">
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

            {(!transcriptText || transcriptText.length === 0) && (
              <button
                type="button"
                onClick={() => setTranscriptText(SAMPLE_TRANSCRIPT)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Carregar Transcrição de Exemplo
              </button>
            )}
          </div>
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
              Envia a transcrição para o GPT-4o mini utilizando o prompt do Supabase.
            </p>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Transcrição a Processar: ({transcriptText.length} caracteres)
              </label>
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Cole ou carregue o texto do sermão aqui..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
              />
            </div>

            {generatedSummary && (
              <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Devocional Gerada com Sucesso!
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleTestSummarizer}
            disabled={generatingSummary || transcriptText.trim().length < 50}
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
              Dispara a mensagem devocional para o número ou grupo desejado.
            </p>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Número ou ID do Grupo:</label>
              <input
                type="text"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="5516991080895 ou ID@g.us"
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Mensagem Formatada Pronta para o WhatsApp:
            </h3>
            <span className="text-xs text-slate-400 font-mono">{generatedSummary.length} caracteres</span>
          </div>
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
            {generatedSummary}
          </div>
        </div>
      )}
    </div>
  );
}
