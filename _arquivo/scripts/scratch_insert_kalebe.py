import urllib.request
import json
import ssl
from datetime import datetime, timedelta

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA',
    'x-backend-secret': 'studio-acorde-secret-key-2024',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

aluno_id = 4190
matricula_id = 38
professor_id = 16
curso_id = 4
horario = '20:00:00'

start_date = datetime(2026, 8, 11)
end_date = datetime(2027, 5, 20)

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

print(f"Generating {len(aulas)} classes...")

req = urllib.request.Request(
    'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/aulas',
    data=json.dumps(aulas).encode(),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req, context=ctx) as res:
        response = json.loads(res.read().decode())
        print("Inserted classes successfully!")
        print(f"Total inserted: {len(response)}")
except urllib.error.HTTPError as e:
    print("Error:", e)
    print(e.read().decode())
