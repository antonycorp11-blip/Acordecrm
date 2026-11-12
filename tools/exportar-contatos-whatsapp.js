/*
 * EXPORTAR CONTATOS DO WHATSAPP WEB  ·  Studio Acorde CRM
 * -------------------------------------------------------
 * Gera uma planilha (CSV) com todas as conversas individuais do WhatsApp Web:
 * telefone, nome, data da última conversa e mês. Só LÊ: não envia nada, não apaga nada.
 *
 * Como usar (no computador, Google Chrome ou Edge):
 *  1. Abra https://web.whatsapp.com, entre com o WhatsApp da escola e espere carregar tudo
 *     (deixe uns minutos aberto; se aparecer "sincronizando", espere terminar).
 *  2. Aperte F12 (ou Ctrl+Shift+J) e clique na aba "Console".
 *  3. Se o Chrome avisar que não deixa colar, digite:  permitir colar   (ou  allow pasting ) e Enter.
 *  4. Cole TODO este arquivo no Console e aperte Enter.
 *  5. Espere a mensagem final: o arquivo "contatos-whatsapp-AAAA-MM-DD.csv" é baixado sozinho.
 */
(async () => {
  const log = (...a) => console.log('%c[Acorde]', 'color:#ff6b00;font-weight:bold', ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, '0');
  const isoDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // ---------- 1) Leitura do banco local do WhatsApp Web (IndexedDB) ----------
  // Abre o banco SEM criar um novo (se não existir, cancela a criação).
  const abrirExistente = (nome) => new Promise((resolve) => {
    let criando = false;
    const req = indexedDB.open(nome);
    req.onupgradeneeded = () => { criando = true; req.transaction.abort(); };
    req.onsuccess = () => resolve(criando ? null : req.result);
    req.onerror = () => resolve(null);
  });
  const lerTudo = (db, store) => new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(store)) return resolve([]);
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
  const idTexto = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return id._serialized;
    if (id.user && id.server) return `${id.user}@${id.server}`;
    return String(id);
  };
  const soDigitos = (s) => String(s || '').replace(/\D/g, '');

  const porTelefone = new Map(); // telefone -> { telefone, nome, ts, fonte }
  const guardar = (telefone, nome, ts, fonte) => {
    const tel = soDigitos(telefone);
    if (tel.length < 10 || tel.length > 15) return;
    const atual = porTelefone.get(tel);
    if (!atual || (ts || 0) > (atual.ts || 0)) {
      porTelefone.set(tel, { telefone: tel, nome: (nome || atual?.nome || '').trim(), ts: ts || atual?.ts || 0, fonte });
    } else if (!atual.nome && nome) {
      atual.nome = nome.trim();
    }
  };

  const resumo = { conversas: 0, grupos: 0, outros: 0, semNumero: 0 };
  let leuBanco = false;
  try {
    const nomes = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : ['model-storage'];
    const nomeBanco = nomes.includes('model-storage') ? 'model-storage' : nomes.find((n) => /model|storage/i.test(n || ''));
    const db = nomeBanco ? await abrirExistente(nomeBanco) : null;
    if (db) {
      const [chats, contatos] = await Promise.all([lerTudo(db, 'chat'), lerTudo(db, 'contact')]);
      const contatoPorId = new Map(contatos.map((c) => [idTexto(c.id), c]));
      log(`Banco local: ${chats.length} conversas e ${contatos.length} contatos encontrados.`);
      chats.forEach((ch) => {
        const id = idTexto(ch.id);
        if (!id) return;
        if (id.endsWith('@g.us')) { resumo.grupos++; return; }
        if (/@(broadcast|newsletter)$/.test(id) || id.startsWith('status@')) { resumo.outros++; return; }
        const ct = contatoPorId.get(id) || {};
        let telefone = '';
        if (id.endsWith('@c.us') || id.endsWith('@s.whatsapp.net')) telefone = id.split('@')[0];
        else if (id.endsWith('@lid')) telefone = idTexto(ct.phoneNumber || ch.phoneNumber).split('@')[0];
        if (!telefone) { resumo.semNumero++; return; }
        let ts = Number(ch.t || ch.timestamp || ch.conversationTimestamp || 0);
        if (ts && ts < 1e12) ts *= 1000;
        const nome = ct.name || ct.verifiedName || ct.pushname || ct.notifyName || ch.name || ch.formattedTitle || '';
        resumo.conversas++;
        guardar(telefone, nome, ts, 'banco');
      });
      leuBanco = porTelefone.size > 0;
    }
  } catch (e) {
    log('Não consegui ler o banco local, vou ler pela tela.', e);
  }

  // ---------- 2) Plano B: rolar a lista de conversas na tela ----------
  // (pega só números de quem NÃO está salvo na agenda; contato salvo aparece só com o nome)
  if (!leuBanco) {
    const painel = document.querySelector('#pane-side');
    if (!painel) { alert('Não achei a lista de conversas. Abra o WhatsApp Web, espere carregar e rode de novo.'); return; }
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    const semana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const dataDoTexto = (t) => {
      t = (t || '').trim().toLowerCase();
      let m;
      if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
        const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        return new Date(ano, Number(m[2]) - 1, Number(m[1]), 12).getTime();
      }
      if (/^\d{1,2}:\d{2}$/.test(t)) return hoje.getTime();
      if (t === 'ontem' || t === 'yesterday') return hoje.getTime() - 864e5;
      const i = semana.findIndex((d) => t.startsWith(d));
      if (i >= 0) { let diff = (hoje.getDay() - i + 7) % 7 || 7; return hoje.getTime() - diff * 864e5; }
      return 0;
    };
    painel.scrollTop = 0;
    await sleep(800);
    let parado = 0, ultimoTopo = -1;
    log('Lendo a lista de conversas na tela (pode levar alguns minutos)...');
    while (parado < 4) {
      painel.querySelectorAll('[role="listitem"], [role="row"]').forEach((linha) => {
        const titulo = linha.querySelector('span[title]')?.getAttribute('title') || '';
        if (!/^\+?[\d\s().-]{10,}$/.test(titulo)) return; // só números (contatos não salvos)
        const tempo = Array.from(linha.querySelectorAll('div, span'))
          .map((el) => (el.childElementCount === 0 ? el.textContent : ''))
          .find((tx) => dataDoTexto(tx) > 0);
        resumo.conversas++;
        guardar(titulo, '', dataDoTexto(tempo), 'tela');
      });
      painel.scrollTop += Math.floor(painel.clientHeight * 0.8);
      await sleep(450);
      if (painel.scrollTop === ultimoTopo) parado++; else parado = 0;
      ultimoTopo = painel.scrollTop;
    }
  }

  // ---------- 3) Gerar a planilha ----------
  const linhas = Array.from(porTelefone.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (linhas.length === 0) { alert('Nenhuma conversa encontrada. Espere o WhatsApp Web terminar de carregar e rode de novo.'); return; }
  const csvCampo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['telefone;nome;ultima_conversa;mes;fonte']
    .concat(linhas.map((l) => {
      const d = l.ts ? new Date(l.ts) : null;
      return [l.telefone, l.nome, d ? isoDia(d) : '', d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : '', l.fonte].map(csvCampo).join(';');
    }))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `contatos-whatsapp-${isoDia(new Date())}.csv`;
  document.body.appendChild(a); a.click(); a.remove();

  // Resumo por mês no Console
  const porMes = {};
  linhas.forEach((l) => { const k = l.ts ? `${new Date(l.ts).getFullYear()}-${pad(new Date(l.ts).getMonth() + 1)}` : 'sem data'; porMes[k] = (porMes[k] || 0) + 1; });
  console.table(Object.keys(porMes).sort().reverse().map((k) => ({ mes: k, contatos: porMes[k] })));
  const datas = linhas.filter((l) => l.ts).map((l) => l.ts);
  const maisAntiga = datas.length ? isoDia(new Date(Math.min(...datas))) : '-';
  log(`PRONTO: ${linhas.length} números exportados (conversa mais antiga: ${maisAntiga}). Grupos ignorados: ${resumo.grupos}. Sem número visível: ${resumo.semNumero}.`);
  alert(`Pronto! ${linhas.length} contatos exportados.\nConversa mais antiga: ${maisAntiga}\nO arquivo foi baixado: contatos-whatsapp-${isoDia(new Date())}.csv`);
})();
