#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Este Dia Com Deus - Bot Automatico (Python)

Le configuracoes do config.json local (prompt, contatos, horario).
Extrai transcricao real do YouTube, gera devocional com IA,
e envia no WhatsApp via Evolution API.

USO:  python scripts_ross/este_dia_bot.py
TASK: Agendar no Agendador de Tarefas do Windows
"""

import os
import sys
import io
import json
import time
import re
import logging
from datetime import datetime
from pathlib import Path

import requests
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv

# ============================================================
# PATHS E CONFIGURACAO
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_FILE = SCRIPT_DIR / "config.json"
# Carregar .env do diretorio raiz ou da propria pasta do script
PROJECT_ROOT = SCRIPT_DIR.parent
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(SCRIPT_DIR / ".env")

# Log
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "bot_python.log"

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s | %(message)s",
    datefmt="%d/%m/%Y %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")),
    ],
)
log = logging.getLogger("EsteDiaComDeus")

# .env
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")
EVOLUTION_INSTANCE = os.getenv("EVOLUTION_INSTANCE", "")


# ============================================================
# CONFIG LOCAL
# ============================================================

def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    log.warning("config.json nao encontrado. Usando valores padrao.")
    return {
        "prompt_template": "",
        "contacts": [{"target_id": "5516991080895", "name": "Admin", "is_active": True}],
        "admin_phone": "5516991080895",
        "strict_mode": True,
        "openai_model": "gpt-4o-mini",
        "youtube_channel_id": "UCrWihNP4LHvHSU3UAy4cJaA",
        "execution_logs": [],
    }


def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def save_execution_log(config, log_entry):
    """Salva log de execucao no config.json local."""
    if "execution_logs" not in config:
        config["execution_logs"] = []
    # Manter apenas os ultimos 100 logs
    config["execution_logs"].insert(0, log_entry)
    config["execution_logs"] = config["execution_logs"][:100]
    save_config(config)


# ============================================================
# YOUTUBE
# ============================================================

def get_latest_video(channel_id):
    feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    log.info(f"Buscando RSS feed: {feed_url}")

    resp = requests.get(feed_url, headers={"User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)"}, timeout=15)
    xml = resp.text

    vid_match = re.search(r"<yt:videoId>([^<]+)</yt:videoId>", xml)
    title_match = re.search(r"<entry>[\s\S]*?<title>([^<]+)</title>", xml)

    if not vid_match:
        raise Exception("Nenhum video encontrado no RSS feed do canal.")

    video_id = vid_match.group(1)
    title = title_match.group(1) if title_match else "Sem titulo"
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    log.info(f'Video encontrado: "{title}" ({video_id})')
    return {"videoId": video_id, "title": title, "videoUrl": video_url}


def get_transcript(video_id):
    log.info(f"Extraindo transcricao do video: {video_id}")
    try:
        api = YouTubeTranscriptApi()
        try:
            result = api.fetch(video_id, languages=["pt", "pt-BR"])
        except Exception:
            try:
                transcripts = api.list(video_id)
                first_lang = None
                for t in transcripts:
                    first_lang = t.language_code
                    break
                if first_lang:
                    result = api.fetch(video_id, languages=[first_lang])
                else:
                    return None
            except Exception:
                return None

        text = " ".join(s.text for s in result)
        text = re.sub(r"\s+", " ", text).strip()
        log.info(f"Transcricao extraida: {len(text)} caracteres")
        return text
    except Exception as e:
        log.warning(f"Erro ao extrair transcricao: {e}")
        return None


# ============================================================
# OPENAI
# ============================================================

def generate_summary(video_data, transcript, prompt_template, model):
    prompt = (
        prompt_template
        .replace("{title}", video_data["title"])
        .replace("{videoUrl}", video_data["videoUrl"])
        .replace("{transcript}", transcript)
    )

    log.info(f"Gerando resumo com {model} ({len(transcript)} chars)...")

    for attempt in range(1, 4):
        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1200, "temperature": 0.7},
                timeout=60,
            )
            if resp.status_code == 429:
                wait = 20 * attempt
                log.warning(f"Rate limit (tentativa {attempt}/3). Aguardando {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            summary = resp.json()["choices"][0]["message"]["content"].strip()
            log.info(f"Resumo gerado: {len(summary)} caracteres")
            return summary
        except requests.exceptions.HTTPError:
            if attempt < 3 and resp.status_code == 429:
                continue
            raise

    raise Exception("Falha ao gerar resumo apos 3 tentativas.")


# ============================================================
# WHATSAPP
# ============================================================

def check_whatsapp_status():
    try:
        url = f"{EVOLUTION_API_URL}/instance/connectionState/{EVOLUTION_INSTANCE}"
        resp = requests.get(url, headers={"apikey": EVOLUTION_API_KEY}, timeout=10)
        data = resp.json()
        state = data.get("instance", {}).get("state") or data.get("state")
        log.info(f"Status WhatsApp: {state}")
        return state == "open"
    except Exception as e:
        log.warning(f"Erro ao checar WhatsApp: {e}")
        return False


def send_whatsapp(message, target):
    url = f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}"
    headers = {"Content-Type": "application/json", "apikey": EVOLUTION_API_KEY}

    payloads = [
        {"number": target, "text": message},
        {"number": target, "options": {"delay": 1200, "presence": "composing"}, "textMessage": {"text": message}},
    ]
    for i, payload in enumerate(payloads):
        version = "v2" if i == 0 else "v1"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code in (200, 201):
                log.info(f"  [OK] {target} - {version}, status {resp.status_code}")
                return True
        except Exception as e:
            log.warning(f"  [FALHA] {target} - {version}: {e}")
    return False


def send_admin_alert(admin_phone, error_msg, video_data=None):
    if not all([EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE]):
        return
    title = video_data.get("title", "Desconhecido") if video_data else "Desconhecido"
    ts = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    alert = (
        f"*ALERTA DE ERRO - ESTE DIA COM DEUS*\n\n"
        f"*Erro:* {error_msg}\n*Video:* {title}\n*Data/Hora:* {ts}\n\n"
        f"*Acao:* Envio bloqueado para evitar alucinacao."
    )
    log.info(f"Enviando alerta para admin ({admin_phone})...")
    send_whatsapp(alert, admin_phone)


# ============================================================
# ORQUESTRADOR
# ============================================================

def run_daily_automation():
    config = load_config()
    start = time.time()
    video_data = None

    admin_phone = config.get("admin_phone", "5516991080895")
    channel_id = config.get("youtube_channel_id", "UCrWihNP4LHvHSU3UAy4cJaA")
    model = config.get("openai_model", "gpt-4o-mini")
    prompt_template = config.get("prompt_template", "")
    strict_mode = config.get("strict_mode", True)
    contacts = [c for c in config.get("contacts", []) if c.get("is_active", True)]

    log.info("=" * 60)
    log.info("  INICIANDO AUTOMACAO - Este Dia Com Deus (Python)")
    log.info(f"  Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    log.info("=" * 60)

    try:
        if not OPENAI_API_KEY:
            raise Exception("OPENAI_API_KEY nao configurada no .env")
        if not all([EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE]):
            raise Exception("Evolution API incompleta no .env")
        if not prompt_template:
            raise Exception("Prompt nao configurado. Abra o Painel de Controle e configure.")
        if not contacts:
            raise Exception("Nenhum contato ativo. Abra o Painel e ative pelo menos um contato.")

        # [1/5] WhatsApp
        log.info("[1/5] Verificando WhatsApp...")
        if not check_whatsapp_status():
            raise Exception("WhatsApp nao conectado na Evolution API!")

        # [2/5] YouTube
        log.info("[2/5] Buscando video...")
        video_data = get_latest_video(channel_id)
        log.info(f'  Video: "{video_data["title"]}"')

        # Trava contra envio duplicado do mesmo video no mesmo dia
        force = "--force" in sys.argv
        last_sent = config.get("last_sent_video_id")
        last_date = config.get("last_sent_date", "")
        today_str = datetime.now().strftime("%Y-%m-%d")

        if not force and last_sent == video_data["videoId"] and last_date == today_str:
            log.info(f"  [ANTI-DUPLICADO] O video \"{video_data['title']}\" ({video_data['videoId']}) ja foi enviado hoje ({today_str}).")
            log.info("  Execucao encerrada com seguranca para evitar mensagens repetidas aos contatos.")
            log.info("=" * 60)
            return True

        # [3/5] Transcricao
        log.info("[3/5] Extraindo transcricao...")
        transcript = get_transcript(video_data["videoId"])

        if not transcript or len(transcript) < 100:
            error_msg = f"TRANSCRIPT_UNAVAILABLE: {len(transcript) if transcript else 0} chars"
            if strict_mode:
                raise Exception(error_msg)
            else:
                log.warning(f"AVISO: {error_msg} (modo nao-estrito)")

        # [4/5] IA
        log.info("[4/5] Gerando devocional...")
        summary = generate_summary(video_data, transcript, prompt_template, model)

        # [5/5] WhatsApp
        log.info("[5/5] Enviando mensagens...")
        targets = [c["target_id"] for c in contacts]
        log.info(f"  Destinos: {len(targets)} -> {', '.join(targets)}")

        ok = 0
        for i, target in enumerate(targets):
            log.info(f"  -> {target}")
            if send_whatsapp(summary, target):
                ok += 1
            if i < len(targets) - 1:
                time.sleep(5)

        elapsed = round(time.time() - start, 1)

        log_entry = {
            "date": datetime.now().isoformat(),
            "video_title": video_data["title"],
            "video_id": video_data["videoId"],
            "transcript_length": len(transcript) if transcript else 0,
            "summary_length": len(summary),
            "recipients_sent": ok,
            "recipients_total": len(targets),
            "status": "SUCCESS",
            "elapsed": elapsed,
        }
        config["last_sent_video_id"] = video_data["videoId"]
        config["last_sent_date"] = datetime.now().strftime("%Y-%m-%d")
        save_execution_log(config, log_entry)

        log.info("=" * 60)
        log.info(f"  AUTOMACAO CONCLUIDA ({elapsed}s) - {ok}/{len(targets)} enviados")
        log.info("=" * 60)
        return True

    except Exception as e:
        elapsed = round(time.time() - start, 1)
        log.error("=" * 60)
        log.error(f"  FALHA: {e}")
        log.error("=" * 60)

        send_admin_alert(admin_phone, str(e), video_data)

        log_entry = {
            "date": datetime.now().isoformat(),
            "video_title": video_data["title"] if video_data else "Desconhecido",
            "video_id": video_data["videoId"] if video_data else None,
            "transcript_length": 0,
            "status": "ERROR",
            "error": str(e),
            "elapsed": elapsed,
        }
        save_execution_log(config, log_entry)
        return False


if __name__ == "__main__":
    success = run_daily_automation()
    sys.exit(0 if success else 1)
