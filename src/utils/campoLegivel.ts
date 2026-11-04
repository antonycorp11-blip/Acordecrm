// Garante que o texto digitado em qualquer campo (input/textarea/select) seja legível:
// se a cor do texto tiver pouco contraste com o fundo real do campo (ex.: texto branco em campo branco),
// o texto passa a ser escuro (fundo claro) ou claro (fundo escuro). Também corrige a cor do placeholder.

const SELETOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]):not([type="color"]):not([type="submit"]):not([type="button"]), textarea, select';

const CONTRASTE_MINIMO = 4.5;
const ESCURO = '#1a0f0a';
const CLARO = '#ffffff';

type RGBA = { r: number; g: number; b: number; a: number };

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, RGBA>();

// Converte qualquer cor CSS (rgb, hex, oklch, color-mix...) em RGBA usando o próprio navegador
const parseCor = (cor: string): RGBA => {
  if (!cor || cor === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const guardada = cache.get(cor);
  if (guardada) return guardada;
  if (!ctx) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    ctx = c.getContext('2d', { willReadFrequently: true });
  }
  if (!ctx) return { r: 0, g: 0, b: 0, a: 1 };
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  const rgba = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  if (cache.size > 500) cache.clear();
  cache.set(cor, rgba);
  return rgba;
};

const misturar = (topo: RGBA, base: RGBA): RGBA => ({
  r: topo.r * topo.a + base.r * (1 - topo.a),
  g: topo.g * topo.a + base.g * (1 - topo.a),
  b: topo.b * topo.a + base.b * (1 - topo.a),
  a: 1,
});

const luminancia = (c: RGBA) => {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};

const contraste = (a: RGBA, b: RGBA) => {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Fundo "de verdade" do campo: junta o fundo do campo com o dos elementos por trás dele
const fundoEfetivo = (el: Element): RGBA => {
  const camadas: RGBA[] = [];
  for (let e: Element | null = el; e; e = e.parentElement) {
    const c = parseCor(getComputedStyle(e).backgroundColor);
    if (c.a > 0) {
      camadas.push(c);
      if (c.a >= 1) break;
    }
  }
  let base: RGBA = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = camadas.length - 1; i >= 0; i--) base = misturar(camadas[i], base);
  return base;
};

const corrigirCampo = (el: HTMLElement) => {
  // reavalia do zero (o fundo pode ter mudado desde a última vez)
  if (el.dataset.legivel === '1') {
    el.style.removeProperty('color');
    el.style.removeProperty('-webkit-text-fill-color');
    el.style.removeProperty('caret-color');
    delete el.dataset.legivel;
  }
  if (el.dataset.legivelPh === '1') {
    el.style.removeProperty('--cor-placeholder');
    delete el.dataset.legivelPh;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return;

  const fundo = fundoEfetivo(el);
  const fundoClaro = luminancia(fundo) > 0.35;
  const alvo = fundoClaro ? ESCURO : CLARO;

  const texto = misturar(parseCor(cs.color), fundo);
  if (contraste(texto, fundo) < CONTRASTE_MINIMO) {
    el.style.setProperty('color', alvo, 'important');
    el.style.setProperty('-webkit-text-fill-color', alvo, 'important');
    el.style.setProperty('caret-color', alvo, 'important');
    el.dataset.legivel = '1';
  }

  // placeholder (só existe em input/textarea)
  if (el.tagName !== 'SELECT') {
    const ph = misturar(parseCor(getComputedStyle(el, '::placeholder').color), fundo);
    if (contraste(ph, fundo) < 3) {
      el.style.setProperty('--cor-placeholder', fundoClaro ? '#6b5448' : '#d9c3b8');
      el.dataset.legivelPh = '1';
    }
  }
};

const varrer = (raiz: ParentNode = document) => {
  raiz.querySelectorAll<HTMLElement>(SELETOR).forEach((el) => {
    try {
      corrigirCampo(el);
    } catch {
      /* nunca deve quebrar a tela */
    }
  });
};

export function iniciarGuardaLegibilidade() {
  if (typeof window === 'undefined' || (window as any).__guardaLegibilidade) return;
  (window as any).__guardaLegibilidade = true;

  // Ao focar/digitar: corrige na hora, antes de a pessoa precisar ler o que escreve
  const noCampo = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (t && t.matches && t.matches(SELETOR)) {
      try { corrigirCampo(t); } catch { /* ignora */ }
    }
  };
  document.addEventListener('focusin', noCampo, true);
  document.addEventListener('input', noCampo, true);

  // Telas e modais novos: varre campos recém-criados
  let agendado = 0;
  const agendar = () => {
    if (agendado) return;
    agendado = window.setTimeout(() => {
      agendado = 0;
      varrer();
    }, 120);
  };
  new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', agendar);
  agendar();
}
