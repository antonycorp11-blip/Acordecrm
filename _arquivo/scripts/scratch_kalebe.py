import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    'https://acordecrm.vercel.app/api/alunos/4190',
    headers={
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBzdHVkaW9hY29yZGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgxMTA2NDkyfQ.s6irE-f0E8n_XGqrB0keWdhgRrExQ_Aezuvx-4AGzFs'
    }
)

with urllib.request.urlopen(req, context=ctx) as res:
    print(json.dumps(json.loads(res.read().decode()), indent=2))
