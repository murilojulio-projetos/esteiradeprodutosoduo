/* =====================================================================
   ODuo · api/webhooks/clicksign.js  ·  ETAPAS 2 + 3B

   Recebe os webhooks do Clicksign, valida o HMAC e, quando o contrato é
   FINALIZADO (todos assinaram → evento auto_close), busca a proposta
   persistida no Supabase e cria a cobrança no Asaas:

     · itens mensais  → assinatura recorrente (subscription) mensal
     · setups+projetos → cobrança única de investimento inicial
     · forma de pagamento UNDEFINED → o cliente escolhe boleto/Pix/cartão
       no checkout do Asaas (resolve o cartão sem precisar dos dados dele)
     · performance (Hunter) → fica de fora (valor variável)

   Por fim, dispara uma linha pra PLANILHA DE CONTROLE: faz POST num webhook
   do n8n (N8N_PLANILHA_WEBHOOK_URL) que adiciona a linha no Google Sheets.
   Regra: a linha entra quando o contrato é ASSINADO — com o link de pagamento
   quando houve cobrança, em branco quando não houve (assinar OU pagar).

   Ambiente: SANDBOX.
   ===================================================================== */

export const config = { runtime: "edge" };

const ASAAS_BASE =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* ---------- HMAC (valida que o POST veio do Clicksign) ---------- */
async function hmacValido(rawBody, header, secret) {
  if (!header) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const recebido = String(header).replace(/^sha256=/i, "").trim().toLowerCase();
  return hex === recebido;
}

/* ---------- Supabase ---------- */
function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
}

async function buscarContrato(documentKey) {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  const res = await fetch(
    `${url}/rest/v1/clicksign_contratos?document_key=eq.${encodeURIComponent(
      documentKey
    )}&select=*`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function atualizarContrato(documentKey, campos) {
  const url = process.env.SUPABASE_URL;
  if (!url) return;
  await fetch(
    `${url}/rest/v1/clicksign_contratos?document_key=eq.${encodeURIComponent(
      documentKey
    )}`,
    {
      method: "PATCH",
      headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify(campos),
    }
  );
}

/* ---------- n8n → planilha de controle ----------
   Dispara a linha pra um webhook do n8n, que faz o Append no Google Sheets.
   Falha aqui NÃO derruba o webhook (só loga) — a cobrança já foi criada. */
async function enviarParaPlanilha(linha) {
  const url = process.env.N8N_PLANILHA_WEBHOOK_URL;
  if (!url) return { ok: false, motivo: "N8N_PLANILHA_WEBHOOK_URL ausente" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(linha),
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 200);
      return { ok: false, motivo: `n8n HTTP ${res.status}`, detalhe: txt };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: "exceção: " + (e && e.message) };
  }
}

/* Achata contrato + cobrança numa linha amigável pra planilha (chaves pt-BR,
   prontas pra virar colunas no Google Sheets). */
function montarLinhaPlanilha({ evento, contrato, criado, link, ambiente }) {
  const c = (contrato && contrato.cliente) || {};
  const p = (contrato && contrato.proposta) || {};
  const mensal = Number(p.mensalTotal) || 0;
  const inicial = (Number(p.setupsTotal) || 0) + (Number(p.projetosTotal) || 0);
  return {
    evento, // "contrato_assinado_cobranca" | "contrato_assinado"
    data: new Date().toISOString(),
    empresa: c.empresa || "",
    responsavel: c.contato || "",
    email: c.email || "",
    cnpj: c.cnpj || c.cpfRepresentante || "",
    telefone: c.telefone || "",
    cidade: c.cidade || "",
    cadencia: p.cadencia || "",
    valor_mensal: mensal,
    valor_inicial: inicial,
    parcelas_inicial: Number(p.parcelasInicial) || 1,
    link_pagamento: link || "",
    status: criado ? "cobranca_criada" : "assinado",
    asaas_customer_id: (criado && criado.customerId) || "",
    asaas_cobranca_id:
      (criado &&
        (criado.subscriptionId || criado.planoId || criado.paymentId)) ||
      "",
    document_key: (contrato && contrato.document_key) || "",
    ambiente,
  };
}

/* ---------- Asaas ---------- */
async function asaas(path, body, method = "POST") {
  const res = await fetch(`${ASAAS_BASE}/${path}`, {
    method,
    headers: {
      access_token: process.env.ASAAS_API_KEY,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data.errors && data.errors[0] && data.errors[0].description) ||
      `Asaas /${path} HTTP ${res.status}`;
    const err = new Error(msg);
    err.detail = data;
    throw err;
  }
  return data;
}

function hojeMais(dias) {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/* Cria/garante o cliente no Asaas e devolve o customerId. */
async function garantirCliente(cliente) {
  const cpfCnpj = String(cliente.cnpj || cliente.cpfRepresentante || "").replace(
    /\D/g,
    ""
  );
  if (!cpfCnpj) {
    throw new Error(
      "Cliente sem CNPJ/CPF — o Asaas exige documento pra criar a cobrança."
    );
  }
  // Reaproveita cliente já existente (por documento)
  const busca = await asaas(
    `customers?cpfCnpj=${cpfCnpj}`,
    null,
    "GET"
  ).catch(() => ({ data: [] }));
  if (busca && busca.data && busca.data.length) return busca.data[0].id;

  const novo = await asaas("customers", {
    name: cliente.empresa || cliente.contato || "Cliente ODuo",
    cpfCnpj,
    email: cliente.email || undefined,
    mobilePhone: String(cliente.telefone || "").replace(/\D/g, "") || undefined,
  });
  return novo.id;
}

/* Etapa 3B · cria as cobranças no Asaas a partir da proposta salva. */
async function processarCobranca(documentKey) {
  const contrato = await buscarContrato(documentKey);
  if (!contrato) return { ok: false, motivo: "contrato não encontrado no Supabase" };

  // Idempotência: se já processou (assinado OU cobrança criada), não repete —
  // o Clicksign pode reenviar o mesmo evento. Evita linha duplicada na planilha.
  if (
    contrato.status === "cobranca_criada" ||
    contrato.status === "assinado" ||
    contrato.asaas_cobranca_id
  ) {
    return { ok: true, motivo: "contrato já processado antes", pulado: true };
  }

  // Cobrança automática só acontece se o closer marcou "cobrar ao assinar"
  // na emissão. Senão, o contrato fica só assinado e a cobrança é manual.
  if (!contrato.cobrar_ao_assinar) {
    await atualizarContrato(documentKey, {
      status: "assinado",
      signed_at: new Date().toISOString(),
    });
    // Sem cobrança, mas o contrato foi ASSINADO → entra na planilha mesmo assim
    // (regra: assinar OU pagar). Link de pagamento fica em branco.
    const planilha = await enviarParaPlanilha(
      montarLinhaPlanilha({
        evento: "contrato_assinado",
        contrato,
        criado: null,
        link: "",
        ambiente: ASAAS_BASE.includes("sandbox") ? "sandbox" : "producao",
      })
    );
    return {
      ok: true,
      semCobranca: true,
      planilha,
      motivo: "contrato assinado — auto-cobrança não marcada (cobrança é manual)",
    };
  }

  const cliente = contrato.cliente || {};
  const p = contrato.proposta || {};
  const mensal = Number(p.mensalTotal) || 0;
  const inicial = (Number(p.setupsTotal) || 0) + (Number(p.projetosTotal) || 0);

  try {
    const customerId = await garantirCliente(cliente);
    const criado = { customerId, subscriptionId: null, planoId: null, paymentId: null };
    let linkMensal = null; // link do 1º pagamento da recorrência / plano no cartão
    let linkInicial = null; // link da cobrança de investimento inicial

    /* Mensal → assinatura recorrente. Trimestral/Semestral → cobrança
       parcelada no cartão (3× / 6×) — período fechado do plano. (Anual saiu:
       o closer negocia direto com o cliente.) */
    const cadencia = p.cadencia || "mensal";
    const PARCELAS = { mensal: 1, trimestral: 3, semestral: 6 };
    if (mensal > 0) {
      if (cadencia === "mensal") {
        const sub = await asaas("subscriptions", {
          customer: customerId,
          billingType: "UNDEFINED",
          value: mensal,
          nextDueDate: hojeMais(3),
          cycle: "MONTHLY",
          description: `ODuo · Mensalidade — ${cliente.empresa || ""}`.trim(),
        });
        criado.subscriptionId = sub.id;
        // A subscription não traz o link direto: busca o 1º pagamento gerado.
        const pgs = await asaas(
          `subscriptions/${sub.id}/payments?limit=1`,
          null,
          "GET"
        ).catch(() => ({ data: [] }));
        linkMensal =
          (pgs && pgs.data && pgs.data[0] && pgs.data[0].invoiceUrl) || null;
      } else {
        const nParc = PARCELAS[cadencia] || 6;
        const pay = await asaas("payments", {
          customer: customerId,
          billingType: "CREDIT_CARD",
          installmentCount: nParc,
          totalValue: mensal * nParc,
          dueDate: hojeMais(3),
          description: `ODuo · Plano ${cadencia} (${nParc}x no cartão) — ${cliente.empresa || ""}`.trim(),
        });
        criado.planoId = pay.id;
        linkMensal = pay.invoiceUrl || null;
      }
    }

    // Investimento inicial — respeita o parcelamento escolhido na proposta.
    if (inicial > 0) {
      const nParcInicial = Number(p.parcelasInicial) || 1;
      const corpo =
        nParcInicial > 1
          ? {
              customer: customerId,
              billingType: "CREDIT_CARD",
              installmentCount: nParcInicial,
              totalValue: inicial,
              dueDate: hojeMais(3),
              description: `ODuo · Investimento inicial (${nParcInicial}x no cartão) — ${cliente.empresa || ""}`.trim(),
            }
          : {
              customer: customerId,
              billingType: "UNDEFINED",
              value: inicial,
              dueDate: hojeMais(3),
              description: `ODuo · Investimento inicial — ${cliente.empresa || ""}`.trim(),
            };
      const pay = await asaas("payments", corpo);
      criado.paymentId = pay.id;
      linkInicial = pay.invoiceUrl || null;
    }

    await atualizarContrato(documentKey, {
      status: "cobranca_criada",
      signed_at: new Date().toISOString(),
      asaas_customer_id: customerId,
      asaas_cobranca_id:
        criado.subscriptionId || criado.planoId || criado.paymentId || null,
      erro: null,
    });

    // Link de pagamento: prioriza o do investimento inicial; senão o da
    // mensalidade/plano. Vai pra planilha de controle via n8n.
    const link = linkInicial || linkMensal || null;
    const planilha = await enviarParaPlanilha(
      montarLinhaPlanilha({
        evento: "contrato_assinado_cobranca",
        contrato,
        criado,
        link,
        ambiente: ASAAS_BASE.includes("sandbox") ? "sandbox" : "producao",
      })
    );

    return { ok: true, ...criado, link, planilha };
  } catch (err) {
    await atualizarContrato(documentKey, {
      status: "erro_cobranca",
      erro: String(err.message || err).slice(0, 300),
    });
    return { ok: false, motivo: err.message, detalhe: err.detail || null };
  }
}

/* --------------------------- handler --------------------------- */
export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Use POST." }, 405);
  }

  const raw = await request.text();
  const hmacHeader =
    request.headers.get("content-hmac") ||
    request.headers.get("Content-Hmac") ||
    request.headers.get("x-clicksign-hmac");
  const secret = process.env.CLICKSIGN_WEBHOOK_SECRET;

  if (secret) {
    const ok = await hmacValido(raw, hmacHeader, secret);
    if (!ok) {
      console.warn("[clicksign webhook] HMAC inválido — rejeitado.");
      return json({ ok: false, error: "Assinatura HMAC inválida." }, 401);
    }
  } else {
    console.warn("[clicksign webhook] sem CLICKSIGN_WEBHOOK_SECRET — sem validar.");
  }

  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ ok: false, error: "Corpo não é JSON válido." }, 400);
  }

  const evento =
    (payload.event && (payload.event.name || payload.event.type)) || "desconhecido";
  const doc = payload.document || {};
  const documentKey = doc.key || null;

  console.log(`[clicksign webhook] evento="${evento}" documento="${documentKey}"`);

  // Contrato finalizado = todos assinaram → cria a cobrança no Asaas.
  const finalizado = ["auto_close", "close", "document_closed"].includes(evento);
  let cobranca = null;
  if (finalizado && documentKey) {
    console.log(`[clicksign webhook] contrato finalizado — gerando cobrança Asaas.`);
    cobranca = await processarCobranca(documentKey);
    console.log(`[clicksign webhook] resultado cobrança:`, JSON.stringify(cobranca));
  }

  return json({ ok: true, evento, documentKey, finalizado, cobranca });
}
