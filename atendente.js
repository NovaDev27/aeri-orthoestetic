/* Aeri — atendente virtual da OrthoEstetic (demonstração)
   Tudo roda no navegador: sem servidor, sem chave de API.
   O pedido de agendamento vai pro WhatsApp da clínica com a mensagem pronta. */

// >>> PREENCHER quando a clínica confirmar o WhatsApp (só números, com 55 + DDD). <<<
// Enquanto for o marcador abaixo, o link abre o WhatsApp sem destinatário (a pessoa escolhe o contato).
const WHATSAPP_NUMERO = "55XXXXXXXXXXX";
const TELEFONE = "(43) 3256-3680", TEL_LINK = "tel:+554332563680";
const MAPA = "https://www.google.com/maps/search/?api=1&query=OrthoEstetic,+Avenida+Tiradentes+891,+Rol%C3%A2ndia+PR";

// Só fatos do levantamento público (orthoestetic.md). O que não se sabe fica "a confirmar".
const FAQ = [
  { id: "horario", chaves: ["horario", "hora", "abre", "fecha", "funciona", "aberto", "sabado", "domingo", "expediente", "atende que"],
    humor: "happy",
    resposta: "De segunda a sexta a clínica atende das 9h às 12h e das 13h às 18h.\nSábado de manhã ainda está a confirmar (uma fonte diz 8h–12h, outra 9h–12h).\nDomingo aparece como fechado." },
  { id: "endereco", chaves: ["endereco", "onde", "fica", "localizacao", "local", "chegar", "mapa", "rua", "avenida", "tiradentes"],
    humor: "happy",
    resposta: `Fica na Av. Tiradentes, 891, Centro de Rolândia-PR (CEP 86600-059).\n<a href="${MAPA}" target="_blank" rel="noopener">Abrir no mapa</a>` },
  { id: "servicos", chaves: ["servico", "tratamento", "faz", "fazem", "atende", "especialidade", "procedimento", "oferece"],
    humor: "happy",
    resposta: "A clínica fala em público de:\n• Aparelho e ortodontia\n• Odontologia (consulta e cuidado do dia a dia)\n• Saúde bucal infantil\n• Restauração estética\nOutras áreas ficam a confirmar com a clínica — pode perguntar na hora de agendar." },
  { id: "aparelho", chaves: ["aparelho", "ortodont", "manutencao", "alinhador", "dente torto"],
    humor: "happy",
    resposta: "Sim! Ortodontia é o forte da clínica, inclusive acompanhamento e manutenção de aparelho. O tipo certo pro seu caso o dentista vê na avaliação. Quer que eu monte o pedido de agendamento?" },
  { id: "crianca", chaves: ["crianca", "filho", "filha", "infantil", "bebe", "kids", "criancas"],
    humor: "happy",
    resposta: "Atende sim! A clínica se apresenta como clínica de aparelhos e saúde bucal infantil. A idade e o tipo de acompanhamento o dentista vê na avaliação." },
  { id: "convenio", chaves: ["convenio", "plano", "unimed", "odontoprev", "amil", "particular", "seguro"],
    humor: "relaxed",
    resposta: "O cadastro público indica atendimento particular e por plano de saúde privado, mas quais planos exatamente fica a confirmar. Vale perguntar na hora de agendar." },
  { id: "preco", chaves: ["preco", "valor", "quanto", "custa", "orcamento", "pagamento", "parcela"],
    humor: "relaxed",
    resposta: "Não passo valores por aqui — depende do que cada pessoa precisa, e isso o dentista vê na avaliação. Posso montar o pedido de agendamento pra você?" },
  { id: "contato", chaves: ["telefone", "ligar", "contato", "fone", "email", "e-mail", "numero"],
    humor: "happy",
    resposta: `Telefone: <a href="${TEL_LINK}">${TELEFONE}</a>\nE-mail: falecom@orthoestetic.com.br\nWhatsApp: a confirmar com a clínica.` },
  { id: "responsavel", chaves: ["dentista", "doutor", "doutora", "responsavel", "cro", "quem atende"],
    humor: "relaxed",
    resposta: "O nome e o CRO do responsável técnico ainda estão a confirmar com a clínica." },
  { id: "urgencia", chaves: ["dor", "urgente", "urgencia", "emergencia", "quebrou", "sangra", "inchado"],
    humor: "sad",
    resposta: `Sinto muito! Pra algo urgente, o melhor é ligar direto: <a href="${TEL_LINK}">${TELEFONE}</a>. Se for fora do horário ou grave, procure um pronto-atendimento.` },
  { id: "oi", chaves: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "eai", "opa", "hey"],
    humor: "happy",
    resposta: "Oi! 😊 Posso te ajudar com horário, endereço, serviços ou já montar seu pedido de agendamento." },
  { id: "obrigado", chaves: ["obrigad", "valeu", "brigad", "agradeco", "tchau"],
    humor: "happy",
    resposta: "Imagina! Qualquer coisa é só chamar. Cuide bem do seu sorriso 💙" },
];

const SERVICOS = ["Aparelho / ortodontia", "Consulta odontológica", "Atendimento infantil", "Restauração estética", "Ainda não sei"];
const RAPIDOS = [["🕘 Horário", "horario"], ["📍 Endereço", "endereco"], ["🦷 Serviços", "servicos"], ["📅 Agendar", "agendar"]];

// Contexto vindo do QR (ex.: ?qr=1&local=recepcao). Ajuda o dono a saber de onde veio o pedido.
const params = new URLSearchParams(location.search);
const MODO_QR = params.has("qr") || params.has("local") || params.has("mesa");
const LOCAL = (params.get("local") || params.get("mesa") || "").slice(0, 40);

window.aeri = { ok3d: false, humor: "", nivel: null, voz: false };

const $ = id => document.getElementById(id);
const chat = $("chat"), painel = $("aeri");
const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, " ");
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const espera = ms => new Promise(r => setTimeout(r, ms));

function bolha(html, quem) {
  const d = document.createElement("div");
  d.className = "msg " + quem;
  d.innerHTML = html;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

// Fala da Aeri: "digitando…", boca mexendo, expressão e (opcional) voz do aparelho
let fila = Promise.resolve();
function aeriDiz(html, humor = "happy") { fila = fila.then(() => falar(html, humor)); return fila; }
async function falar(html, humor) {
  const tmp = bolha('<span class="digitando"><span></span><span></span><span></span></span>', "ela");
  aeri.nivel = "fake"; document.body.classList.add("falando");
  await espera(Math.min(1400, 450 + html.length * 6));
  tmp.innerHTML = html;
  chat.scrollTop = chat.scrollHeight;
  aeri.humor = humor;
  const texto = tmp.textContent;
  if (aeri.voz && "speechSynthesis" in window) await vozDoAparelho(texto);
  else await espera(Math.min(2200, 300 + texto.length * 25));
  aeri.nivel = null; document.body.classList.remove("falando");
  setTimeout(() => { if (aeri.nivel === null) aeri.humor = ""; }, 2500);
}

const FEM = /maria|francisca|thalita|leila|luciana|joana|fernanda|vitoria|vitória|camila|female|feminina|pt-br-x-afs/i;
const MASC = /daniel|antonio|antônio|ricardo|felipe|male|masculin/i;
function vozFeminina() {
  const vs = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang));
  return vs.find(v => FEM.test(v.name)) || vs.find(v => /google/i.test(v.name) && !MASC.test(v.name)) || vs.find(v => !MASC.test(v.name)) || vs[0];
}
function vozDoAparelho(texto) {
  return new Promise(res => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto.replace(/[•📍🕘🦷📅💙😊]/g, ""));
    u.lang = "pt-BR"; const v = vozFeminina(); if (v) u.voice = v;
    u.pitch = 1.4; u.rate = 1.08;
    u.onend = u.onerror = res;
    setTimeout(res, 1500 + texto.length * 75);   // alguns aparelhos nunca disparam onend
    speechSynthesis.speak(u);
  });
}

function rapidos(lista) {
  const r = $("rapidos"); r.innerHTML = "";
  for (const [rotulo, acao] of lista) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = rotulo;
    b.onclick = () => entrada(rotulo.replace(/^\W+\s*/, ""), acao);
    r.appendChild(b);
  }
}

// ---------- Fluxo de agendamento (nome → serviço → dia → WhatsApp) ----------
let pedido = null;
function iniciarAgendamento() {
  pedido = { passo: "nome" };
  aeriDiz("Vamos lá! Eu monto a mensagem e você manda pra clínica pelo WhatsApp. 📅\nQual é o seu nome?");
  rapidos([["Cancelar", "cancelar"]]);
  $("entrada").placeholder = "Seu nome…"; $("entrada").focus({ preventScroll: true });
}
function passoAgendamento(texto, acao) {
  if (acao === "cancelar" || /^cancel/.test(norm(texto))) {
    pedido = null; $("entrada").placeholder = "Escreva sua pergunta…";
    aeriDiz("Tudo bem, cancelei. Posso ajudar em mais alguma coisa?"); rapidos(RAPIDOS); return;
  }
  if (pedido.passo === "nome") {
    pedido.nome = texto.trim().slice(0, 60);
    pedido.passo = "servico";
    aeriDiz(`Prazer, ${esc(pedido.nome.split(" ")[0])}! O que você procura?`);
    rapidos([...SERVICOS.map(s => [s, "servico"]), ["Cancelar", "cancelar"]]);
    $("entrada").placeholder = "Ou escreva aqui…";
  } else if (pedido.passo === "servico") {
    pedido.servico = texto.trim().slice(0, 80);
    pedido.passo = "dia";
    aeriDiz("Qual o melhor dia ou período pra você? (ex.: terça à tarde)");
    rapidos([["Manhã", "dia"], ["Tarde", "dia"], ["Qualquer dia", "dia"], ["Cancelar", "cancelar"]]);
    $("entrada").placeholder = "Dia ou período…";
  } else if (pedido.passo === "dia") {
    pedido.dia = texto.trim().slice(0, 80);
    finalizarAgendamento();
  }
}
function finalizarAgendamento() {
  const { nome, servico, dia } = pedido;
  let msg = `Olá, meu nome é ${nome}. Queria agendar uma avaliação na OrthoEstetic (Av. Tiradentes, 891, Centro de Rolândia). ` +
            `Tenho interesse em: ${servico}. O período que me encaixa melhor é: ${dia}.`;
  if (LOCAL) msg += ` (Pedido feito pela Aeri — QR: ${LOCAL})`;
  else msg += " (Pedido feito pela Aeri no site)";
  const confirmado = /^\d{12,13}$/.test(WHATSAPP_NUMERO);
  const link = `https://wa.me/${confirmado ? WHATSAPP_NUMERO : ""}?text=${encodeURIComponent(msg)}`;
  const aviso = confirmado ? "" : '<span class="aviso">Demonstração: o WhatsApp da clínica ainda está a confirmar, então o link abre sem destinatário.</span>';
  aeriDiz(`Prontinho! Ficou assim:\n\n“${esc(msg)}”\n\n<a class="btn" href="${link}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>${aviso}\nO horário só fica marcado quando a clínica confirmar. Se preferir, ligue: <a href="${TEL_LINK}">${TELEFONE}</a>`, "happy");
  pedido = null; $("entrada").placeholder = "Escreva sua pergunta…";
  rapidos(RAPIDOS);
}

// ---------- Entender a pergunta ----------
function responder(texto) {
  const t = " " + norm(texto) + " ";
  if (/agend|marcar|consulta|avaliacao|horario livre|vaga/.test(t) && !/que horas|horario de|quanto|preco|valor|custa|convenio|plano/.test(t)) return iniciarAgendamento();
  let melhor = null, pontos = 0;
  for (const f of FAQ) {
    let p = 0;
    for (const c of f.chaves) if (t.includes(c.length <= 3 ? ` ${c} ` : c)) p += c.length;   // palavra mais específica pesa mais
    if (p > pontos) { pontos = p; melhor = f; }
  }
  if (melhor) return aeriDiz(melhor.resposta, melhor.humor);
  aeriDiz(`Hmm, essa eu não sei responder com certeza 😅 Pra não te passar informação errada, o melhor é falar com a clínica: <a href="${TEL_LINK}">${TELEFONE}</a>.\nOu escolha uma opção abaixo.`, "sad");
}

function entrada(texto, acao) {
  if (!texto.trim()) return;
  bolha(esc(texto), "voce");
  if (pedido) return passoAgendamento(texto, acao);
  if (acao === "agendar") return iniciarAgendamento();
  if (acao) { const f = FAQ.find(x => x.id === acao); if (f) return aeriDiz(f.resposta, f.humor); }
  responder(texto);
}

$("form").onsubmit = e => {
  e.preventDefault();
  const v = $("entrada").value; $("entrada").value = "";
  entrada(v);
};

// ---------- Abrir / fechar e voz ----------
let saudou = false;
function abrir(fluxo) {
  painel.classList.remove("fechada");
  if (!saudou) saudar();
  if (fluxo === "agendar" && !pedido) { bolha("Agendar", "voce"); iniciarAgendamento(); }
}
function saudar() {
  saudou = true;
  const oi = (() => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; })();
  aeriDiz(`${oi}! Eu sou a Aeri, atendente virtual da OrthoEstetic 💙${LOCAL ? `\nVi que você veio pela plaquinha (${esc(LOCAL)}).` : ""}\nPosso te contar horário, endereço e serviços, ou montar seu pedido de agendamento pro WhatsApp da clínica.`, "happy");
  rapidos(RAPIDOS);
}
document.querySelectorAll("[data-abrir-aeri]").forEach(b => b.addEventListener("click", () => abrir(b.dataset.fluxo)));
$("btnMin").onclick = () => painel.classList.add("fechada");
$("btnVoz").onclick = () => {
  aeri.voz = !aeri.voz;
  $("btnVoz").textContent = aeri.voz ? "🔊" : "🔇";
  $("btnVoz").setAttribute("aria-pressed", aeri.voz);
  if (!aeri.voz && "speechSynthesis" in window) speechSynthesis.cancel();
};

if (MODO_QR) {
  document.body.classList.add("modo-qr");
  const barra = () => document.body.style.setProperty("--barra", document.querySelector(".demo-bar").offsetHeight + "px");
  barra(); addEventListener("resize", barra);
}
// No celular o painel começa fechado (vira o botão "Falar com a Aeri"); no QR e no PC já começa aberto.
if (!MODO_QR && matchMedia("(max-width:700px)").matches && !params.has("aberta")) painel.classList.add("fechada");
else abrir();
