import urllib.request
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
    with urllib.request.urlopen(req, context=ctx) as res:
        return json.loads(res.read().decode())

aluno_id = 4190

try:
    print("Fetching matriculas...")
    matriculas = fetch(f'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/matriculas?aluno_id=eq.{aluno_id}')
    for m in matriculas:
        print(m)
        
    print("Fetching faturas...")
    faturas = fetch(f'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/faturas?aluno_id=eq.{aluno_id}')
    for f in faturas:
        print(f"Fatura {f['id']}: Vencimento {f.get('data_vencimento')} - Status {f.get('status')} - Valor {f.get('valor')}")
except Exception as e:
    print("Error:", e)
