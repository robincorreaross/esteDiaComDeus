#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Este Dia Com Deus - Painel de Controle (Python/tkinter)

Interface grafica local para gerenciar todas as configuracoes
do bot: prompt, contatos, horario, testes e logs.
"""

import os
import sys
import io
import json
import re
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from datetime import datetime
from pathlib import Path

import requests
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv

# ============================================================
# PATHS E CONFIGURACAO
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONFIG_FILE = SCRIPT_DIR / "config.json"
LOG_FILE = PROJECT_ROOT / "logs" / "bot_python.log"

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(SCRIPT_DIR / ".env")

# Cores do tema escuro
BG = "#0f172a"
BG_CARD = "#1e293b"
BG_INPUT = "#0f172a"
FG = "#e2e8f0"
FG_DIM = "#94a3b8"
FG_ACCENT = "#818cf8"
FG_SUCCESS = "#34d399"
FG_ERROR = "#f87171"
FG_WARN = "#fbbf24"
BORDER = "#334155"
BTN_BG = "#4f46e5"
BTN_BG_HOVER = "#6366f1"
BTN_FG = "#ffffff"
BTN_SUCCESS = "#059669"
BTN_DANGER = "#dc2626"


# ============================================================
# CONFIG MANAGER
# ============================================================

def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "prompt_template": "",
        "contacts": [],
        "schedule": {"cron": "0 6 * * *", "timezone": "America/Sao_Paulo"},
        "admin_phone": "5516991080895",
        "strict_mode": True,
        "openai_model": "gpt-4o-mini",
        "youtube_channel_id": "UCrWihNP4LHvHSU3UAy4cJaA",
        "execution_logs": [],
    }


def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


# ============================================================
# API HELPERS (para testes)
# ============================================================

def get_env(key, fallback=""):
    return os.getenv(key, fallback)


def test_youtube(channel_id):
    """Busca video e transcricao — retorna dict com resultado."""
    feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    resp = requests.get(feed_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
    xml = resp.text

    vid_match = re.search(r"<yt:videoId>([^<]+)</yt:videoId>", xml)
    title_match = re.search(r"<entry>[\s\S]*?<title>([^<]+)</title>", xml)
    if not vid_match:
        return {"success": False, "error": "Nenhum video no RSS"}

    video_id = vid_match.group(1)
    title = title_match.group(1) if title_match else "Sem titulo"

    # Extrair transcricao
    transcript = ""
    try:
        api = YouTubeTranscriptApi()
        result = api.fetch(video_id, languages=["pt", "pt-BR"])
        transcript = " ".join(s.text for s in result)
        transcript = re.sub(r"\s+", " ", transcript).strip()
    except Exception as e:
        transcript = f"[ERRO] {e}"

    return {
        "success": True,
        "video_id": video_id,
        "title": title,
        "transcript": transcript,
        "transcript_length": len(transcript),
    }


def test_openai(prompt_template, title, video_url, transcript, model):
    """Gera resumo com OpenAI — retorna string."""
    api_key = get_env("OPENAI_API_KEY")
    if not api_key:
        return "[ERRO] OPENAI_API_KEY nao configurada no .env"

    prompt = (
        prompt_template
        .replace("{title}", title)
        .replace("{videoUrl}", video_url)
        .replace("{transcript}", transcript)
    )

    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1200, "temperature": 0.7},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def test_whatsapp(message, target):
    """Envia mensagem de teste — retorna dict."""
    evo_url = get_env("EVOLUTION_API_URL")
    evo_key = get_env("EVOLUTION_API_KEY")
    evo_instance = get_env("EVOLUTION_INSTANCE")
    if not all([evo_url, evo_key, evo_instance]):
        return {"success": False, "error": "Evolution API incompleta no .env"}

    url = f"{evo_url}/message/sendText/{evo_instance}"
    resp = requests.post(
        url,
        json={"number": target, "text": message},
        headers={"Content-Type": "application/json", "apikey": evo_key},
        timeout=30,
    )
    if resp.status_code in (200, 201):
        return {"success": True}
    return {"success": False, "error": f"Status {resp.status_code}: {resp.text[:200]}"}


# ============================================================
# GUI APPLICATION
# ============================================================

class EsteDiaApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Este Dia Com Deus - Painel de Controle")
        self.geometry("900x680")
        self.configure(bg=BG)
        self.resizable(True, True)
        self.minsize(800, 600)

        self.config_data = load_config()

        # Estado dos testes
        self._test_video = {}
        self._test_summary = ""

        self._build_ui()

    def _build_ui(self):
        # Header
        header = tk.Frame(self, bg=BG_CARD, padx=16, pady=10)
        header.pack(fill="x")
        tk.Label(header, text="Este Dia Com Deus", font=("Segoe UI", 16, "bold"), fg=FG_ACCENT, bg=BG_CARD).pack(side="left")
        tk.Label(header, text="Painel de Controle Local", font=("Segoe UI", 10), fg=FG_DIM, bg=BG_CARD).pack(side="left", padx=(10, 0))

        # Notebook (abas)
        style = ttk.Style()
        style.theme_use("default")
        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", background=BG_CARD, foreground=FG, padding=[14, 6], font=("Segoe UI", 10, "bold"))
        style.map("TNotebook.Tab", background=[("selected", BTN_BG)], foreground=[("selected", BTN_FG)])

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=8, pady=(4, 8))

        self._build_prompt_tab()
        self._build_contacts_tab()
        self._build_settings_tab()
        self._build_test_tab()
        self._build_logs_tab()

    # --------------------------------------------------------
    # ABA 1: PROMPT
    # --------------------------------------------------------
    def _build_prompt_tab(self):
        frame = tk.Frame(self.notebook, bg=BG)
        self.notebook.add(frame, text="  Prompt IA  ")

        tk.Label(frame, text="Template de Prompt para o GPT-4o mini", font=("Segoe UI", 11, "bold"), fg=FG, bg=BG).pack(anchor="w", padx=12, pady=(12, 4))
        tk.Label(frame, text="Use {title}, {videoUrl} e {transcript} como variaveis dinamicas.", font=("Segoe UI", 9), fg=FG_DIM, bg=BG).pack(anchor="w", padx=12)

        self.prompt_text = scrolledtext.ScrolledText(frame, wrap="word", font=("Consolas", 10), bg=BG_INPUT, fg=FG, insertbackground=FG, relief="flat", borderwidth=1, highlightbackground=BORDER, highlightthickness=1)
        self.prompt_text.pack(fill="both", expand=True, padx=12, pady=8)
        self.prompt_text.insert("1.0", self.config_data.get("prompt_template", ""))

        btn_frame = tk.Frame(frame, bg=BG)
        btn_frame.pack(fill="x", padx=12, pady=(0, 12))
        tk.Button(btn_frame, text="Salvar Prompt", command=self._save_prompt, bg=BTN_BG, fg=BTN_FG, font=("Segoe UI", 10, "bold"), relief="flat", padx=20, pady=6, cursor="hand2").pack(side="right")
        self.prompt_status = tk.Label(btn_frame, text="", font=("Segoe UI", 9), fg=FG_SUCCESS, bg=BG)
        self.prompt_status.pack(side="right", padx=10)

    def _save_prompt(self):
        self.config_data["prompt_template"] = self.prompt_text.get("1.0", "end-1c")
        save_config(self.config_data)
        self.prompt_status.config(text="Prompt salvo com sucesso!", fg=FG_SUCCESS)
        self.after(3000, lambda: self.prompt_status.config(text=""))

    # --------------------------------------------------------
    # ABA 2: CONTATOS
    # --------------------------------------------------------
    def _build_contacts_tab(self):
        frame = tk.Frame(self.notebook, bg=BG)
        self.notebook.add(frame, text="  Contatos  ")

        tk.Label(frame, text="Destinatarios do WhatsApp", font=("Segoe UI", 11, "bold"), fg=FG, bg=BG).pack(anchor="w", padx=12, pady=(12, 4))
        tk.Label(frame, text="Marque/desmarque para ativar/desativar o envio.", font=("Segoe UI", 9), fg=FG_DIM, bg=BG).pack(anchor="w", padx=12)

        # Lista de contatos
        self.contacts_frame = tk.Frame(frame, bg=BG)
        self.contacts_frame.pack(fill="both", expand=True, padx=12, pady=8)
        self._refresh_contacts_list()

        # Adicionar contato
        add_frame = tk.Frame(frame, bg=BG_CARD, padx=10, pady=10)
        add_frame.pack(fill="x", padx=12, pady=(0, 12))

        tk.Label(add_frame, text="Adicionar Contato:", font=("Segoe UI", 9, "bold"), fg=FG, bg=BG_CARD).grid(row=0, column=0, columnspan=4, sticky="w", pady=(0, 6))

        tk.Label(add_frame, text="Nome:", font=("Segoe UI", 9), fg=FG_DIM, bg=BG_CARD).grid(row=1, column=0, sticky="w")
        self.new_name = tk.Entry(add_frame, font=("Segoe UI", 10), bg=BG_INPUT, fg=FG, insertbackground=FG, relief="flat", highlightbackground=BORDER, highlightthickness=1, width=20)
        self.new_name.grid(row=1, column=1, padx=(4, 10), pady=2)

        tk.Label(add_frame, text="Numero/ID:", font=("Segoe UI", 9), fg=FG_DIM, bg=BG_CARD).grid(row=1, column=2, sticky="w")
        self.new_target = tk.Entry(add_frame, font=("Consolas", 10), bg=BG_INPUT, fg=FG, insertbackground=FG, relief="flat", highlightbackground=BORDER, highlightthickness=1, width=30)
        self.new_target.grid(row=1, column=3, padx=(4, 10), pady=2)

        tk.Button(add_frame, text="+ Adicionar", command=self._add_contact, bg=BTN_SUCCESS, fg=BTN_FG, font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=3, cursor="hand2").grid(row=1, column=4, padx=4)

        self.contacts_status = tk.Label(frame, text="", font=("Segoe UI", 9), fg=FG_SUCCESS, bg=BG)
        self.contacts_status.pack(anchor="w", padx=12)

    def _refresh_contacts_list(self):
        for w in self.contacts_frame.winfo_children():
            w.destroy()

        self._contact_vars = []
        for i, c in enumerate(self.config_data.get("contacts", [])):
            row = tk.Frame(self.contacts_frame, bg=BG_CARD, padx=8, pady=6)
            row.pack(fill="x", pady=2)

            var = tk.BooleanVar(value=c.get("is_active", True))
            self._contact_vars.append(var)

            cb = tk.Checkbutton(row, variable=var, bg=BG_CARD, activebackground=BG_CARD, selectcolor=BG_INPUT, command=lambda idx=i, v=var: self._toggle_contact(idx, v))
            cb.pack(side="left")

            name_label = c.get("name", "Sem nome")
            target_label = c.get("target_id", "")
            ctype = "Grupo" if "@g.us" in target_label else "Individual"

            tk.Label(row, text=name_label, font=("Segoe UI", 10, "bold"), fg=FG, bg=BG_CARD, width=20, anchor="w").pack(side="left", padx=(4, 8))
            tk.Label(row, text=target_label, font=("Consolas", 9), fg=FG_DIM, bg=BG_CARD, anchor="w").pack(side="left", padx=(0, 8), fill="x", expand=True)
            tk.Label(row, text=ctype, font=("Segoe UI", 8), fg=FG_ACCENT, bg=BG_CARD, width=10).pack(side="left")

            tk.Button(row, text="X", command=lambda idx=i: self._remove_contact(idx), bg=BTN_DANGER, fg=BTN_FG, font=("Segoe UI", 8, "bold"), relief="flat", width=3, cursor="hand2").pack(side="right")

    def _toggle_contact(self, idx, var):
        self.config_data["contacts"][idx]["is_active"] = var.get()
        save_config(self.config_data)

    def _add_contact(self):
        name = self.new_name.get().strip()
        target = self.new_target.get().strip()
        if not name or not target:
            messagebox.showwarning("Aviso", "Preencha o nome e o numero/ID do contato.")
            return
        ctype = "group" if "@g.us" in target else "individual"
        self.config_data["contacts"].append({"target_id": target, "name": name, "type": ctype, "is_active": True})
        save_config(self.config_data)
        self.new_name.delete(0, "end")
        self.new_target.delete(0, "end")
        self._refresh_contacts_list()
        self.contacts_status.config(text=f"Contato '{name}' adicionado!", fg=FG_SUCCESS)
        self.after(3000, lambda: self.contacts_status.config(text=""))

    def _remove_contact(self, idx):
        name = self.config_data["contacts"][idx].get("name", "")
        if messagebox.askyesno("Confirmar", f"Remover '{name}' da lista de contatos?"):
            self.config_data["contacts"].pop(idx)
            save_config(self.config_data)
            self._refresh_contacts_list()

    # --------------------------------------------------------
    # ABA 3: CONFIGURACOES
    # --------------------------------------------------------
    def _build_settings_tab(self):
        frame = tk.Frame(self.notebook, bg=BG)
        self.notebook.add(frame, text="  Configuracoes  ")

        tk.Label(frame, text="Configuracoes Gerais", font=("Segoe UI", 11, "bold"), fg=FG, bg=BG).pack(anchor="w", padx=12, pady=(12, 8))

        settings_inner = tk.Frame(frame, bg=BG_CARD, padx=16, pady=16)
        settings_inner.pack(fill="x", padx=12)

        fields = [
            ("Expressao Cron:", "cron", self.config_data["schedule"]["cron"]),
            ("Fuso Horario:", "timezone", self.config_data["schedule"]["timezone"]),
            ("Telefone Admin:", "admin_phone", self.config_data.get("admin_phone", "")),
            ("Modelo OpenAI:", "openai_model", self.config_data.get("openai_model", "gpt-4o-mini")),
            ("Channel ID YouTube:", "youtube_channel_id", self.config_data.get("youtube_channel_id", "")),
        ]

        self._setting_entries = {}
        for i, (label, key, value) in enumerate(fields):
            tk.Label(settings_inner, text=label, font=("Segoe UI", 9, "bold"), fg=FG_DIM, bg=BG_CARD, anchor="w").grid(row=i, column=0, sticky="w", pady=4)
            entry = tk.Entry(settings_inner, font=("Consolas", 10), bg=BG_INPUT, fg=FG, insertbackground=FG, relief="flat", highlightbackground=BORDER, highlightthickness=1, width=50)
            entry.insert(0, value)
            entry.grid(row=i, column=1, padx=(10, 0), pady=4, sticky="ew")
            self._setting_entries[key] = entry

        settings_inner.columnconfigure(1, weight=1)

        # Trava anti-alucinacao
        strict_frame = tk.Frame(frame, bg=BG_CARD, padx=16, pady=12)
        strict_frame.pack(fill="x", padx=12, pady=(8, 0))

        self._strict_var = tk.BooleanVar(value=self.config_data.get("strict_mode", True))
        tk.Checkbutton(strict_frame, text="Trava Anti-Alucinacao (bloqueia envio se transcricao < 100 chars)", variable=self._strict_var, font=("Segoe UI", 10), fg=FG, bg=BG_CARD, activebackground=BG_CARD, selectcolor=BG_INPUT).pack(anchor="w")

        # Botao salvar
        btn_frame = tk.Frame(frame, bg=BG)
        btn_frame.pack(fill="x", padx=12, pady=12)
        tk.Button(btn_frame, text="Salvar Configuracoes", command=self._save_settings, bg=BTN_BG, fg=BTN_FG, font=("Segoe UI", 10, "bold"), relief="flat", padx=20, pady=6, cursor="hand2").pack(side="right")
        self.settings_status = tk.Label(btn_frame, text="", font=("Segoe UI", 9), fg=FG_SUCCESS, bg=BG)
        self.settings_status.pack(side="right", padx=10)

    def _save_settings(self):
        self.config_data["schedule"]["cron"] = self._setting_entries["cron"].get().strip()
        self.config_data["schedule"]["timezone"] = self._setting_entries["timezone"].get().strip()
        self.config_data["admin_phone"] = self._setting_entries["admin_phone"].get().strip()
        self.config_data["openai_model"] = self._setting_entries["openai_model"].get().strip()
        self.config_data["youtube_channel_id"] = self._setting_entries["youtube_channel_id"].get().strip()
        self.config_data["strict_mode"] = self._strict_var.get()
        save_config(self.config_data)
        self.settings_status.config(text="Configuracoes salvas!", fg=FG_SUCCESS)
        self.after(3000, lambda: self.settings_status.config(text=""))

    # --------------------------------------------------------
    # ABA 4: TESTES
    # --------------------------------------------------------
    def _build_test_tab(self):
        frame = tk.Frame(self.notebook, bg=BG)
        self.notebook.add(frame, text="  Testes  ")

        tk.Label(frame, text="Area de Testes e Diagnostico", font=("Segoe UI", 11, "bold"), fg=FG, bg=BG).pack(anchor="w", padx=12, pady=(12, 4))
        tk.Label(frame, text="Os testes de WhatsApp enviam APENAS para o admin.", font=("Segoe UI", 9), fg=FG_WARN, bg=BG).pack(anchor="w", padx=12)

        # Botoes de teste
        btns = tk.Frame(frame, bg=BG)
        btns.pack(fill="x", padx=12, pady=8)

        tk.Button(btns, text="1. Testar YouTube", command=self._run_test_youtube, bg="#2563eb", fg=BTN_FG, font=("Segoe UI", 10, "bold"), relief="flat", padx=16, pady=8, cursor="hand2").pack(side="left", padx=(0, 8))
        tk.Button(btns, text="2. Testar IA (GPT)", command=self._run_test_openai, bg="#7c3aed", fg=BTN_FG, font=("Segoe UI", 10, "bold"), relief="flat", padx=16, pady=8, cursor="hand2").pack(side="left", padx=(0, 8))
        tk.Button(btns, text="3. Testar WhatsApp (Admin)", command=self._run_test_whatsapp, bg=BTN_SUCCESS, fg=BTN_FG, font=("Segoe UI", 10, "bold"), relief="flat", padx=16, pady=8, cursor="hand2").pack(side="left")

        # Area de resultado
        self.test_output = scrolledtext.ScrolledText(frame, wrap="word", font=("Consolas", 9), bg=BG_INPUT, fg=FG, insertbackground=FG, relief="flat", borderwidth=1, highlightbackground=BORDER, highlightthickness=1, state="disabled")
        self.test_output.pack(fill="both", expand=True, padx=12, pady=(0, 12))

    def _log_test(self, msg):
        self.test_output.config(state="normal")
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.test_output.insert("end", f"[{timestamp}] {msg}\n")
        self.test_output.see("end")
        self.test_output.config(state="disabled")

    def _run_test_youtube(self):
        def worker():
            self._log_test("--- TESTE YOUTUBE ---")
            self._log_test("Buscando video mais recente e transcricao...")
            try:
                result = test_youtube(self.config_data.get("youtube_channel_id", "UCrWihNP4LHvHSU3UAy4cJaA"))
                self._test_video = result
                if result["success"]:
                    self._log_test(f"Video: {result['title']}")
                    self._log_test(f"ID: {result['video_id']}")
                    self._log_test(f"Transcricao: {result['transcript_length']} caracteres")
                    if result['transcript_length'] > 200:
                        self._log_test(f"Trecho: {result['transcript'][:300]}...")
                    else:
                        self._log_test(f"Conteudo: {result['transcript']}")
                    self._log_test("[OK] YouTube testado com sucesso!")
                else:
                    self._log_test(f"[ERRO] {result['error']}")
            except Exception as e:
                self._log_test(f"[ERRO] {e}")
        threading.Thread(target=worker, daemon=True).start()

    def _run_test_openai(self):
        def worker():
            self._log_test("--- TESTE OPENAI ---")
            if not self._test_video or not self._test_video.get("success"):
                self._log_test("[AVISO] Execute o teste do YouTube primeiro!")
                return
            transcript = self._test_video.get("transcript", "")
            if len(transcript) < 100:
                self._log_test(f"[AVISO] Transcricao muito curta ({len(transcript)} chars). Teste o YouTube primeiro.")
                return
            self._log_test(f"Gerando devocional com {self.config_data.get('openai_model', 'gpt-4o-mini')}...")
            try:
                prompt = self.config_data.get("prompt_template", "")
                if not prompt:
                    prompt = self.prompt_text.get("1.0", "end-1c")
                title = self._test_video["title"]
                video_url = f"https://www.youtube.com/watch?v={self._test_video['video_id']}"
                summary = test_openai(prompt, title, video_url, transcript, self.config_data.get("openai_model", "gpt-4o-mini"))
                self._test_summary = summary
                self._log_test(f"Resumo gerado: {len(summary)} caracteres")
                self._log_test("--- PREVIEW ---")
                self._log_test(summary)
                self._log_test("--- FIM PREVIEW ---")
                self._log_test("[OK] IA testada com sucesso!")
            except Exception as e:
                self._log_test(f"[ERRO] {e}")
        threading.Thread(target=worker, daemon=True).start()

    def _run_test_whatsapp(self):
        def worker():
            self._log_test("--- TESTE WHATSAPP (APENAS ADMIN) ---")
            admin = self.config_data.get("admin_phone", "5516991080895")
            msg = self._test_summary if self._test_summary else "*Teste Este Dia Com Deus*\n\nConexao com Evolution API funcionando!"
            self._log_test(f"Enviando para: {admin}")
            try:
                result = test_whatsapp(msg, admin)
                if result["success"]:
                    self._log_test(f"[OK] Mensagem enviada para {admin}!")
                else:
                    self._log_test(f"[ERRO] {result['error']}")
            except Exception as e:
                self._log_test(f"[ERRO] {e}")
        threading.Thread(target=worker, daemon=True).start()

    # --------------------------------------------------------
    # ABA 5: LOGS
    # --------------------------------------------------------
    def _build_logs_tab(self):
        frame = tk.Frame(self.notebook, bg=BG)
        self.notebook.add(frame, text="  Logs  ")

        top = tk.Frame(frame, bg=BG)
        top.pack(fill="x", padx=12, pady=(12, 4))
        tk.Label(top, text="Historico de Execucoes", font=("Segoe UI", 11, "bold"), fg=FG, bg=BG).pack(side="left")
        tk.Button(top, text="Atualizar", command=self._refresh_logs, bg=BTN_BG, fg=BTN_FG, font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=3, cursor="hand2").pack(side="right")

        # Logs do arquivo
        self.logs_text = scrolledtext.ScrolledText(frame, wrap="word", font=("Consolas", 9), bg=BG_INPUT, fg=FG, relief="flat", borderwidth=1, highlightbackground=BORDER, highlightthickness=1, state="disabled")
        self.logs_text.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        self._refresh_logs()

    def _refresh_logs(self):
        self.logs_text.config(state="normal")
        self.logs_text.delete("1.0", "end")
        try:
            if LOG_FILE.exists():
                with open(LOG_FILE, "r", encoding="utf-8") as f:
                    # Ultimas 200 linhas
                    lines = f.readlines()
                    for line in lines[-200:]:
                        self.logs_text.insert("end", line)
                self.logs_text.see("end")
            else:
                self.logs_text.insert("end", "Nenhum log encontrado ainda.\nExecute o bot para gerar logs.")
        except Exception as e:
            self.logs_text.insert("end", f"Erro ao ler logs: {e}")
        self.logs_text.config(state="disabled")


# ============================================================
# PONTO DE ENTRADA
# ============================================================

if __name__ == "__main__":
    app = EsteDiaApp()
    app.mainloop()
