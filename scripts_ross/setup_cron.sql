-- =========================================================================
-- CONFIGURAÇÃO DO AGENDAMENTO CRON (pg_cron + pg_net) NO SUPABASE
-- Projeto: Agendamentos (ID: grpkjytyniohtqgbabkw)
-- Execução: Diária às 06:30 da manhã (Horário de Brasília) = 09:30 UTC
-- =========================================================================

-- 1. Habilita as extensões necessárias no banco de dados
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- 2. Remove o cron job anterior apenas se ele existir (para evitar erros ou duplicações)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'este-dia-com-deus-diario';

-- 3. Agenda o novo cron job
-- Substitua a chave ANON_KEY abaixo caso ela seja alterada no projeto.
SELECT cron.schedule(
  'este-dia-com-deus-diario',
  '30 9 * * *', -- 09:30 UTC (06:30 BRT)
  $$
  SELECT net.http_post(
    url := 'https://grpkjytyniohtqgbabkw.supabase.co/functions/v1/este-dia-com-deus',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycGtqeXR5bmlvaHRxZ2JhYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODgwODMsImV4cCI6MjA5NTY2NDA4M30.r_DY6pwgsacCu46mm0UVCsmAoLanYYwra4XfgWzh7nU"}'::jsonb
  );
  $$
);

-- =========================================================================
-- Consultas úteis para monitoramento:
-- =========================================================================
--
-- a) Ver todos os cron jobs cadastrados:
--    SELECT * FROM cron.job;
--
-- b) Ver histórico de execuções do cron (sucesso/falha):
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- c) Executar manualmente o cron job agora mesmo para testar:
--    SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'este-dia-com-deus-diario'; -- se quiser remover
-- =========================================================================
