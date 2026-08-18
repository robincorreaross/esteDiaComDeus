# Guia Correto de Deploy na Cloudflare Pages ☁️

Este erro ocorre quando o projeto é configurado como **Worker** ou com o comando de deploy incorreto (`npx wrangler deploy`). Na Cloudflare Pages, o deploy é **100% automático** a partir do diretório de saída do build!

---

## 🛠️ Como Configurar no Painel da Cloudflare Pages

### 1. Criar o Projeto no Painel
1. Acesse o painel da Cloudflare: **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. No menu lateral, clique em **Workers & Pages** -> **Create application** -> **Pages** (Aba Pages, NÃO Workers).
3. Selecione **Connect to Git** e escolha o repositório `esteDiaComDeus`.

---

### 2. Configurações de Build (Build Settings)

Preencha os campos exatamente assim:

| Campo | Valor Correto |
| :--- | :--- |
| **Framework preset** | `None` ou `Next.js (Static Export / App Router)` |
| **Root directory** *(Diretório Raiz)* | `webapp` *(ou deixe em branco se usar a raiz)* |
| **Build command** *(Comando de Build)* | `npx @cloudflare/next-on-pages` |
| **Build output directory** *(Diretório de Saída)* | `.vercel/output/static` |
| **Deploy command** | **DEIXE EM BRANCO (VAZIO)** |

> ⚠️ **IMPORTANTE:** Não coloque `npx wrangler deploy` no campo de comando de deploy. A Cloudflare Pages já faz a publicação automática da pasta `.vercel/output/static`.

---

### 3. Variáveis de Ambiente (Environment Variables)

No painel da Cloudflare (em **Settings** -> **Environment variables**), adicione as seguintes chaves:

```env
NEXT_PUBLIC_SUPABASE_URL=https://grpkjytyniohtqgbabkw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGtqeXR5bmlvaHRxZ2JhYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODgwODMsImV4cCI6MjA5NTY2NDA4M30.r_DY6pwgsacCu46mm0UVCsmAoLanYYwra4XfgWzh7nU
OPENAI_API_KEY=sua_chave_openai_aqui
EVOLUTION_API_URL=https://rmi-evolutionapi.rmidigital.com.br
EVOLUTION_API_KEY=2ecfda1ef057a3c9c09d33d214462b07
EVOLUTION_INSTANCE=Ross
ADMIN_WHATSAPP_NUMBER=5516991080895
```

---

## 💻 Opção 2: Deploy Direto via Terminal (Wrangler)

Se preferir publicar direto do terminal da sua máquina sem usar o Git:

```powershell
cd c:\home_project_ross\esteDiaComDeus\webapp
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static --project-name=este-dia-com-deus
```
