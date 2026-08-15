import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url):
    req = urllib.request.Request(
        url,
        headers={
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBzdHVkaW9hY29yZGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgxMTA2NDkyfQ.s6irE-f0E8n_XGqrB0keWdhgRrExQ_Aezuvx-4AGzFs',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA'
        }
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            return json.loads(res.read().decode())
    except Exception as e:
        print("Error fetching:", url, e)
        return []

profs = fetch('https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/professores?email=eq.gilmarcom@hotmail.com')
print("Professores:", profs)

if profs:
    prof_id = profs[0]['id']
    nome = profs[0]['nome']
    
    agenda = fetch(f'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/agenda?professor_id=eq.{prof_id}')
    print(f"Total agendas by prof_id ({prof_id}) for {nome}: {len(agenda)}")
    
    agenda_nome = fetch(f'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/agenda?professor_nome=ilike.*{urllib.parse.quote(nome.split()[0])}*')
    print(f"Total agendas by nome ({nome.split()[0]}): {len(agenda_nome)}")
    
    today = "2026-08-13" # The current local time
    agenda_today = [a for a in agenda if a.get('data') == today]
    agenda_nome_today = [a for a in agenda_nome if a.get('data') == today]
    
    print(f"Agendas for today (by prof_id):", len(agenda_today))
    print(f"Agendas for today (by nome):", len(agenda_nome_today))
