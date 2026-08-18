import axios from "npm:axios";

interface SendResult {
  target: string;
  success: boolean;
  error?: string;
}

/**
 * Envia mensagem de texto para um destino via Evolution API.
 * Compatível com v1 e v2.
 */
async function sendToTarget(
  message: string,
  targetId: string,
  baseUrl: string,
  apiKey: string,
  instance: string
): Promise<SendResult> {
  const url = `${baseUrl}/message/sendText/${instance}`;

  // Tenta formato v2 primeiro, fallback para v1
  const payloads = [
    { number: targetId, text: message },
    { number: targetId, options: { delay: 1200, presence: 'composing' }, textMessage: { text: message } },
  ];

  let lastError;

  for (let i = 0; i < payloads.length; i++) {
    const version = i === 0 ? 'v2' : 'v1';
    try {
      const response = await axios.post(url, payloads[i], {
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        timeout: 30000,
      });
      console.log(`[WhatsApp]   [OK] ${targetId} — formato ${version}, status ${response.status}`);
      return { target: targetId, success: true };
    } catch (err: any) {
      const status = err.response?.status;
      const body = JSON.stringify(err.response?.data || {});
      console.log(`[WhatsApp]   [FALHA] ${targetId} — formato ${version}, status ${status}: ${body}`);
      lastError = err;
      if (status !== 400 && status !== 422 && status !== 404) throw err;
    }
  }

  return { target: targetId, success: false, error: lastError?.message };
}

/**
 * Verifica se a instância está conectada.
 */
export async function checkInstanceStatus(): Promise<boolean> {
  const baseUrl = Deno.env.get('EVOLUTION_API_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  const instance = Deno.env.get('EVOLUTION_INSTANCE');

  if (!baseUrl || !apiKey || !instance) {
    throw new Error('Configurações da Evolution API ausentes no Deno.env');
  }

  const url = `${baseUrl}/instance/connectionState/${instance}`;
  try {
    const response = await axios.get(url, {
      headers: { apikey: apiKey },
      timeout: 10000,
    });

    const state = response.data?.instance?.state || response.data?.state;
    console.log(`[WhatsApp] Status da instância WhatsApp: ${state}`);
    return state === 'open';
  } catch (err: any) {
    console.log(`[WhatsApp] Erro ao verificar conexão do WhatsApp: ${err.message}`);
    return false;
  }
}

/**
 * Envia a mensagem para TODOS os destinos configurados.
 */
export async function sendWhatsAppMessage(message: string): Promise<SendResult[]> {
  const baseUrl = Deno.env.get('EVOLUTION_API_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  const instance = Deno.env.get('EVOLUTION_INSTANCE');
  const targetsRaw = Deno.env.get('WHATSAPP_TARGETS');

  if (!baseUrl || !apiKey || !instance || !targetsRaw) {
    throw new Error(
      'Configurações da Evolution API incompletas. Verifique: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, WHATSAPP_TARGETS'
    );
  }

  // Parseia a lista de destinos
  const targets = targetsRaw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  console.log(`[WhatsApp] Enviando para ${targets.length} destino(s): ${targets.join(', ')}`);

  const results: SendResult[] = [];
  for (const target of targets) {
    console.log(`[WhatsApp] → Enviando para: ${target}`);
    const result = await sendToTarget(message, target, baseUrl, apiKey, instance);
    results.push(result);

    // Pausa de 10s entre envios
    if (targets.length > 1 && targets.indexOf(target) < targets.length - 1) {
      console.log('[WhatsApp] Aguardando 10s antes do próximo envio...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  const ok = results.filter((r) => r.success).length;
  const fail = results.filter((r) => !r.success).length;
  console.log(`[WhatsApp] Resultado do envio: ${ok} sucesso(s), ${fail} falha(s)`);

  if (fail > 0) {
    const failed = results.filter((r) => !r.success).map((r) => r.target);
    console.log(`[WhatsApp] Destinos com falha: ${failed.join(', ')}`);
  }

  return results;
}
