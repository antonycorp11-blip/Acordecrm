import urllib.request
import json
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://acordecrm.vercel.app/api/professores'

try:
    with urllib.request.urlopen(url, context=ctx) as res:
        data = json.loads(res.read().decode())
        for p in data:
            if p.get('nome') and 'gilmar' in p.get('nome').lower():
                print(f"Nome: {p.get('nome')}, Email: {p.get('email')}")
            if p.get('email') and 'gilmar' in p.get('email').lower():
                print(f"Nome: {p.get('nome')}, Email: {p.get('email')}")
except Exception as e:
    print("Error:", e)
