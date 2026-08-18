'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Save, RotateCcw, Check, Sparkles, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DEFAULT_PROMPT_TEMPLATE = `Voce e um assistente especializado em conteudo cristao evangelico.
Analise o seguinte video devocional e gere uma mensagem baseado no devocional do vídeo, formatada para envio no WhatsApp.

TITULO DO VIDEO: {title}
LINK DO VIDEO: {videoUrl}

TRANSCRICAO DO VIDEO:
{transcript}

Crie uma mensagem com a seguinte estrutura exata (use formatacao WhatsApp com * para negrito):

1. Um "Bom dia" caloroso com uma saudacao acolhedora e espiritualmente encorajadora.
2. Sempre o titulo do episodio em destaque.
3. Cite exatamente a passagem bíblica chave completa mencionada no video.
4. Um resumo do ensinamento (4 a 6 paragrafos claros, relevantes e inspiradores).
5. Uma reflexao/aplicacao pratica para o dia.
6. O link do video completo.
7. Uma despedida com benção.

REGRAS IMPORTANTES:
- Use linguagem acolhedora, carinhosa e espiritualmente edificante
- Use emojis relevantes para tornar a mensagem mais expressiva (ex: biblia, oracao, coracao)
- Use *negrito* para destacar pontos importantes (formato WhatsApp)
- Mantenha o tom do Pr. Gilson Brito: ensinamento pratico e relevante para a vida crista
- A mensagem deve ter entre 300 e 500 palavras
- Escreva tudo em Portugues do Brasil
- NAO inclua markdown como ## ou ** - apenas * para negrito style WhatsApp

Gere apenas a mensagem, sem comentarios adicionais.`;

export default function PromptEditorPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('prompt_template')
          .eq('id', 'default')
          .single();

        if (data?.prompt_template) {
          setPrompt(data.prompt_template);
        }
      } catch (err) {
        console.error('Erro ao carregar prompt:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await supabase
        .from('settings')
        .upsert({
          id: 'default',
          prompt_template: prompt,
          updated_at: new Date().toISOString(),
        });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Erro ao salvar prompt: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (confirm('Deseja restaurar o prompt para a versão padrão do sistema?')) {
      setPrompt(DEFAULT_PROMPT_TEMPLATE);
    }
  };

  const insertVariable = (variable: string) => {
    setPrompt((prev) => prev + ` ${variable} `);
  };

  // Sample preview template output
  const samplePreview = prompt
    .replace(/{title}/g, '#230 Descanso que protege | Este Dia Com Deus - Pr. Gilson Brito')
    .replace(/{videoUrl}/g, 'https://www.youtube.com/watch?v=wO3bYkMFp9g')
    .replace(/{transcript}/g, '[Transcrição com 3.395 caracteres da pregação do Pr. Gilson Brito sobre Isaías 30:15]');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131b2e] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            <FileText className="w-4 h-4" />
            <span>Configuração da IA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Editor do Prompt da IA</h1>
          <p className="text-sm text-slate-400 mt-1">
            Defina como o GPT-4o mini deve interpretar os vídeos e formatar a mensagem do WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefault}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restaurar Padrão</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
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
                <span>Salvar Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs & Variables helper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Editor de Texto
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Pré-visualização do Prompt
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Inserir Variável:
          </span>
          <button
            onClick={() => insertVariable('{title}')}
            className="px-2 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-400 border border-slate-700 rounded-md font-mono transition-all"
          >
            &#123;title&#125;
          </button>
          <button
            onClick={() => insertVariable('{videoUrl}')}
            className="px-2 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-400 border border-slate-700 rounded-md font-mono transition-all"
          >
            &#123;videoUrl&#125;
          </button>
          <button
            onClick={() => insertVariable('{transcript}')}
            className="px-2 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-400 border border-slate-700 rounded-md font-mono transition-all"
          >
            &#123;transcript&#125;
          </button>
        </div>
      </div>

      {/* Editor View */}
      {activeTab === 'editor' ? (
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando prompt...
            </div>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={22}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
              placeholder="Digite as instruções para a IA..."
            />
          )}
        </div>
      ) : (
        /* Preview View */
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Exemplo do Prompt Processado que será enviado para a OpenAI</span>
          </div>
          <pre className="whitespace-pre-wrap bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            {samplePreview}
          </pre>
        </div>
      )}
    </div>
  );
}
