# Este Dia Com Deus - Bot WhatsApp 🕊️

Automação em **Node.js** que roda todos os dias às **6h da manhã**, busca o vídeo mais recente do canal [@EsteDiacomDeus](https://www.youtube.com/@EsteDiacomDeus) no YouTube, gera um resumo devocional com Google Gemini AI e envia automaticamente para um grupo de **WhatsApp** via Evolution API.

## Fluxo

```
[Cron Job 6h] → [YouTube API] → [Transcrição do vídeo] → [Gemini AI] → [Evolution API / WhatsApp]
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org) v18 ou superior
- Instância da **Evolution API** configurada e conectada ao WhatsApp
- Conta no **Google Cloud** com YouTube Data API v3 ativada
- Chave da **Google Gemini API** (gratuita)

---

## Configuração

### 1. Clone e instale as dependências

```powershell
cd c:\project_ross\esteDiaComDeus
npm install
```

### 2. Configure as variáveis de ambiente

```powershell
copy .env.example .env
```

Edite o arquivo `.env` e preencha todas as variáveis:

| Variável | Como obter |
|---|---|
| `YOUTUBE_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create API Key (ativar YouTube Data API v3) |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (gratuito) |
| `EVOLUTION_API_URL` | URL da sua instância Evolution API (ex: `https://meuevo.exemplo.com`) |
| `EVOLUTION_API_KEY` | Chave global configurada no `env` da Evolution API |
| `EVOLUTION_INSTANCE` | Nome da instância criada na Evolution API |
| `WHATSAPP_GROUP_ID` | ID do grupo (ver instruções abaixo) |

### 3. Obter o ID do grupo WhatsApp

Com a instância conectada, faça uma chamada GET para descobrir os grupos:

```
GET {EVOLUTION_API_URL}/group/fetchAllGroups/{INSTANCE}?getParticipants=false
Headers: { apikey: SUA_API_KEY }
```

Encontre o grupo desejado na resposta e copie o valor do campo `id` (formato: `120363...@g.us`).

---

## Executar

### Teste imediato (executa agora sem esperar o cron)
```powershell
npm run now
```

### Iniciar o agendador (roda todo dia às 6h)
```powershell
npm start
```

### Testar módulos individuais
```powershell
# Testar apenas a busca do YouTube
node src/youtube.js

# Testar apenas o resumo do Gemini
node src/summarizer.js

# Testar apenas o envio do WhatsApp
node src/whatsapp.js
```

---

## Logs

Os logs ficam em `logs/app.log`. Para acompanhar em tempo real no Windows:

```powershell
Get-Content logs\app.log -Wait
```

---

## Rodar como serviço no Windows (PM2)

Para garantir que o bot continue rodando mesmo após reiniciar o PC:

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o bot
pm2 start src/index.js --name "este-dia-com-deus"

# Configurar para iniciar automaticamente no boot
pm2 startup
pm2 save
```

---

## Estrutura do Projeto

```
esteDiaComDeus/
├── src/
│   ├── index.js        # Ponto de entrada
│   ├── scheduler.js    # Orquestrador + cron job
│   ├── youtube.js      # Busca vídeo + transcrição
│   ├── summarizer.js   # Geração de resumo com Gemini
│   ├── whatsapp.js     # Envio via Evolution API
│   └── logger.js       # Sistema de logs
├── logs/               # Arquivos de log (gerado automaticamente)
├── .env                # Suas configurações (não commitar!)
├── .env.example        # Template de configuração
└── package.json
```
