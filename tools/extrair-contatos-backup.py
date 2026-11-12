"""
Extrai do backup do WhatsApp (msgstore.db já descriptografado) uma planilha com
telefone, primeira conversa, última conversa, total de mensagens e quem falou por último.
Não copia o conteúdo das mensagens.

Uso: python extrair-contatos-backup.py msgstore.db saida.csv
"""
import csv
import sqlite3
import sys
from datetime import datetime, timezone, timedelta

BR = timezone(timedelta(hours=-4))  # Cuiabá


def dia(ms):
    return datetime.fromtimestamp(ms / 1000, BR).strftime('%Y-%m-%d') if ms else ''


def main(origem, destino):
    db = sqlite3.connect(f'file:{origem}?mode=ro', uri=True)
    tabelas = {r[0] for r in db.execute("select name from sqlite_master where type='table'")}

    # @lid -> telefone (versões novas do WhatsApp)
    lid_para_tel = {}
    if 'jid_map' in tabelas:
        for lid_id, jid_id in db.execute('select lid_row_id, jid_row_id from jid_map'):
            lid_para_tel[lid_id] = jid_id

    jids = {r[0]: (r[1] or '', r[2] or '') for r in db.execute('select _id, user, server from jid')}

    def telefone_do_jid(jid_id):
        user, server = jids.get(jid_id, ('', ''))
        if server == 'lid':
            user, server = jids.get(lid_para_tel.get(jid_id), ('', ''))
        if server != 's.whatsapp.net' or not user.isdigit():
            return None
        return user if 10 <= len(user) <= 15 else None

    # Só mensagens de verdade: o tipo 7 (e os tipos >= 50) são avisos automáticos do WhatsApp
    # ("criptografia", "conta comercial", "código de segurança mudou"...). Eles aparecem em
    # chats de todos os contatos salvos no aparelho, mesmo sem conversa nenhuma.
    REAL = 'timestamp > 0 and chat_row_id is not null and message_type <> 7 and message_type < 50'
    stats = db.execute(f'''
        select chat_row_id, min(timestamp), max(timestamp), count(*),
               sum(case when from_me = 1 then 1 else 0 end)
        from message where {REAL}
        group by chat_row_id
        having sum(case when from_me = 0 then 1 else 0 end) > 0''').fetchall()
    stats = {r[0]: r[1:] for r in stats}

    # Contas comerciais (lojas, bancos, fornecedores) não são leads
    comerciais = set()
    if 'message_system_business_state' in tabelas:
        comerciais = {r[0] for r in db.execute('''
            select distinct m.chat_row_id from message_system_business_state b
            join message m on m._id = b.message_row_id where coalesce(b.business_name, '') <> '' ''')}

    ultimo_de_quem = {}
    for chat_id, from_me in db.execute(f'''
        select m.chat_row_id, m.from_me from message m
        join (select chat_row_id, max(timestamp) t from message where {REAL} group by chat_row_id) u
          on u.chat_row_id = m.chat_row_id and u.t = m.timestamp'''):
        ultimo_de_quem[chat_id] = 'escola' if from_me else 'contato'

    por_tel = {}
    for chat_id, jid_id in db.execute('select _id, jid_row_id from chat'):
        tel = telefone_do_jid(jid_id)
        st = stats.get(chat_id)
        if not tel or not st or chat_id in comerciais:
            continue
        primeira, ultima, total, minhas = st
        atual = por_tel.get(tel)
        if atual:  # mesma pessoa em dois chats (lid + número): junta
            primeira = min(primeira, atual['p']); ultima = max(ultima, atual['u'])
            total += atual['t']; minhas += atual['m']
        por_tel[tel] = {'p': primeira, 'u': ultima, 't': total, 'm': minhas,
                        'q': ultimo_de_quem.get(chat_id, '')}

    linhas = sorted(por_tel.items(), key=lambda kv: kv[1]['u'], reverse=True)
    with open(destino, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(['telefone', 'primeira_conversa', 'ultima_conversa', 'mes_primeira', 'mensagens',
                    'mensagens_da_escola', 'ultima_fala'])
        for tel, d in linhas:
            w.writerow([tel, dia(d['p']), dia(d['u']), dia(d['p'])[:7], d['t'], d['m'], d['q']])
    print(f'{len(linhas)} contatos exportados para {destino}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
