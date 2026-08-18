import { fetchLatestVideoData } from "./youtube.ts";
import { generateSummary } from "./summarizer.ts";
import { sendWhatsAppMessage, checkInstanceStatus } from "./whatsapp.ts";

Deno.serve(async (req) => {
  // Habilita CORS (se necessário para chamadas de fora, embora o cron seja backend)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  const method = req.method;
  console.log(`[Edge Function] Recebeu requisição ${method} em ${new Date().toISOString()}`);

  try {
    // 1. Verificar conexão do WhatsApp
    console.log('[Edge Function] Verificando conexão do WhatsApp...');
    const isConnected = await checkInstanceStatus();
    if (!isConnected) {
      throw new Error(
        'WhatsApp não está conectado! Conecte o número na Evolution API antes de continuar.'
      );
    }
    console.log('[Edge Function] WhatsApp conectado!');

    // 2. Buscar vídeo mais recente do YouTube
    console.log('[Edge Function] Buscando vídeo mais recente do canal...');
    const videoData = await fetchLatestVideoData();
    console.log(`[Edge Function] Vídeo: "${videoData.title}"`);

    // 3. Gerar resumo com IA
    console.log('[Edge Function] Gerando resumo com a API da OpenAI...');
    const message = await generateSummary(videoData);
    console.log('[Edge Function] Resumo gerado com sucesso!');

    // 4. Enviar mensagem no WhatsApp
    console.log('[Edge Function] Enviando mensagem no WhatsApp...');
    const results = await sendWhatsAppMessage(message);
    console.log('[Edge Function] Mensagem enviada com sucesso!');

    const responseData = {
      success: true,
      message: 'Automação executada com sucesso!',
      videoTitle: videoData.title,
      whatsappResults: results
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err: any) {
    console.error('[Edge Function] Falha na automação:', err.message);
    console.error(err);

    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});
