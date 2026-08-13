import urllib.request
import json
import ssl
from datetime import datetime, timedelta

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA'

headers = {
    'Authorization': f'Bearer {anon_key}',
    'apikey': anon_key,
    'x-backend-secret': 'studio-acorde-secret-key-2024',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

aluno_id = 4190
matricula_id = 38
professor_id = 2
curso_id = 4
horario = '20:00:00'

print("Deleting incorrect classes...")
del_req = urllib.request.Request(
    f'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/aulas?aluno_id=eq.{aluno_id}&data=gte.2026-08-11',
    headers=headers,
    method='DELETE'
)
try:
    with urllib.request.urlopen(del_req, context=ctx) as res:
        response = json.loads(res.read().decode())
        print(f"Deleted {len(response)} classes.")
except urllib.error.HTTPError as e:
    print("Error deleting classes:", e)
    print(e.read().decode())

start_date = datetime(2026, 8, 13)
end_date = datetime(2026, 9, 24)

aulas = []
current_date = start_date

while current_date <= end_date:
    aulas.append({
        'aluno_id': aluno_id,
        'matricula_id': matricula_id,
        'professor_id': professor_id,
        'curso_id': curso_id,
        'data': current_date.strftime('%Y-%m-%d'),
        'horario': horario,
        'status': 'pendente',
        'tipo': 'regular',
        'xp_ganho': 50
    })
    current_date += timedelta(days=7)

print(f"Generating {len(aulas)} correct classes for Thursdays...")

ins_req = urllib.request.Request(
    'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/aulas',
    data=json.dumps(aulas).encode(),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(ins_req, context=ctx) as res:
        response = json.loads(res.read().decode())
        print("Inserted correct classes successfully!")
        print(f"Total inserted: {len(response)}")
        for r in response:
            print(f"- {r['data']} at {r['horario']}")
except urllib.error.HTTPError as e:
    print("Error inserting classes:", e)
    print(e.read().decode())
