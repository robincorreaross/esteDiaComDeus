import os
import sys
import subprocess

def rodar_comando(comando):
    """Executa o comando no terminal e retorna o resultado ou erro."""
    resultado = subprocess.run(comando, shell=True, text=True, capture_output=True)
    if resultado.returncode != 0:
        print(f"\n[ERRO] Falha ao executar: {comando}")
        print(resultado.stderr)
        sys.exit(1)
    return resultado.stdout

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("🚀 Iniciando Automação Git...\n")
    
    # Pede a mensagem do commit
    mensagem = input("Digite a mensagem do commit (ou aperte Enter para 'Atualização de rotina'): ")
    if not mensagem.strip():
        mensagem = "Atualização de rotina"

    # Verifica se é a primeira vez (se a pasta oculta .git NÃO existe)
    if not os.path.exists(".git"):
        print("\n[!] Repositório não inicializado. Configurando pela primeira vez...")
        url_remota = input("Cole a URL do repositório no GitHub: ")
        
        if not url_remota.strip():
            print("[ERRO] Para o primeiro envio, a URL é obrigatória.")
            sys.exit(1)

        rodar_comando("git init")
        rodar_comando("git add .")
        rodar_comando(f'git commit -m "{mensagem}"')
        rodar_comando("git branch -M main")
        rodar_comando(f"git remote add origin {url_remota}")
        rodar_comando("git push -u origin main")
        
        print("\n✅ Primeiro commit e envio realizados com sucesso!")

    # Se a pasta .git já existe, é apenas uma atualização
    else:
        print("\n[!] Repositório detectado. Preparando atualizações...")
        
        rodar_comando("git add .")
        
        # O rodar_comando vai parar o script se não houver nada para commitar, 
        # mas como estamos automatizando, deixamos ele tentar de qualquer forma.
        try:
            resultado = subprocess.run(f'git commit -m "{mensagem}"', shell=True, text=True, capture_output=True)
            if resultado.returncode != 0 and "nothing to commit" not in resultado.stdout.lower() and "nada a fazer" not in resultado.stdout.lower():
                print(f"\n[ERRO] Falha ao commitar: {resultado.stderr}")
                sys.exit(1)
        except Exception as e:
            pass
        
        print("🔄 Sincronizando com o GitHub (puxando alterações remotas)...")
        # Baixa mudanças da nuvem antes de enviar as suas (sem usar rodar_comando para não travar se falhar por não ter nada)
        subprocess.run("git pull origin main --rebase", shell=True, capture_output=True)
        
        print("🚀 Subindo código atualizado...")
        rodar_comando("git push")
        
        print("\n✅ Código atualizado com sucesso no GitHub!")

if __name__ == "__main__":
    main()