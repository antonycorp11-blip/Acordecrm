import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    'https://saojbwipdxebibjmtxqc.supabase.co/rest/v1/agenda?aluno_id=eq.4190',
    headers={
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBzdHVkaW9hY29yZGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgxMTA2NDkyfQ.s6irE-f0E8n_XGqrB0keWdhgRrExQ_Aezuvx-4AGzFs',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA'
    }
)

try:
    with urllib.request.urlopen(req, context=ctx) as res:
        agenda = json.loads(res.read().decode())
        print(f"Total agenda items (raw table): {len(agenda)}")
        for item in agenda:
            print(f"ID: {item.get('id')} - Data: {item.get('data')} - Status: {item.get('status')} - Deleted At: {item.get('deleted_at')} - Cancelado: {item.get('cancelado')}")
except Exception as e:
    print("Error:", e)
