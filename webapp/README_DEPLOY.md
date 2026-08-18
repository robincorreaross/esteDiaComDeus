# Guia de Deploy na Cloudflare Pages ☁️

O WebApp **Este Dia Com Deus** está pronto para ser hospedado na **Cloudflare Pages**.

---

## 📋 Pré-requisitos
- Conta na [Cloudflare](https://dash.cloudflare.com)
- Chave API do Supabase e Evolution API

---

## 🚀 Método 1: Deploy Automático via Git (Recomendado)

1. Faça push deste repositório para o **GitHub** ou **GitLab**.
2. Acesse o painel da Cloudflare: **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Selecione o repositório `esteDiaComDeus`.
4. Configure os parâmetros do Build:
   - **Framework preset:** `Next.js (Static Export / App Router)`
   - **Build command:** `cd webapp && npm install --legacy-peer-deps && npm run build`
   - **Build output directory:** `webapp/.next` ou `webapp/.vercel/output/static`
5. Adicione as **Variáveis de Ambiente (Environment Variables)** no painel da Cloudflare:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=SUA_URL_SUPABASE
   NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_SUPABASE
   OPENAI_API_KEY=SUA_CHAVE_OPENAI
   EVOLUTION_API_URL=SUA_URL_EVOLUTION
   EVOLUTION_API_KEY=SUA_CHAVE_EVOLUTION
   EVOLUTION_INSTANCE=SUA_INSTANCIA
   ADMIN_WHATSAPP_NUMBER=5516991080895
   ```
6. Clique em **Save and Deploy**.

---

## 💻 Método 2: Deploy Direto via Wrangler CLI

Na pasta `webapp`, execute:

```powershell
cd c:\home_project_ross\esteDiaComDeus\webapp
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static --project-name=este-dia-com-deus
```

---

## 🔐 Credenciais de Acesso ao WebApp

- **URL do Painel:** Disponível na Cloudflare (ex: `https://este-dia-com-deus.pages.dev`)
- **E-mail:** `robincorrea@gmail.com`
- **Senha:** `Ross#163517`
