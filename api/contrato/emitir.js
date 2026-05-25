/* =====================================================================
   ODuo · api/contrato/emitir.js  ·  ETAPA 1 da integração Clicksign

   Recebe (POST JSON) o PDF do contrato gerado pela ferramenta + os dados
   do cliente. Cria o documento no Clicksign, cadastra os 2 signatários
   (cliente + ODuo/Lucas), vincula ao documento e dispara os e-mails de
   assinatura. Autenticação dos signatários: token por e-mail.

   Ambiente: SANDBOX (sem valor legal) até virarmos a chave pra produção.
   ===================================================================== */

export const config = { runtime: "edge" };

// Sandbox enquanto testamos. CLICKSIGN_ENV=production troca pra conta real.
const CLICKSIGN_BASE =
  process.env.CLICKSIGN_ENV === "production"
    ? "https://app.clicksign.com"
    : "https://sandbox.clicksign.com";

// Signatário fixo da ODuo (sócio da operação)
const ODUO_SIGNER = {
  name: "Lucas Ferrari Pereira",
  email: "lucasferraripereira@gmail.com",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Chamada genérica à API v1 do Clicksign. Lança erro com detalhe em falha. */
async function clicksign(path, token, body) {
  const res = await fetch(
    `${CLICKSIGN_BASE}/api/v1/${path}?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Clicksign /${path} respondeu ${res.status}`);
    err.detail = data;
    err.httpStatus = res.status;
    throw err;
  }
  return data;
}

/* Persiste o contrato emitido no Supabase. Quando o webhook do Clicksign
   avisar que foi assinado, a Etapa 3 busca este registro pra criar a
   cobrança no Asaas. Falha aqui não derruba a emissão (só loga). */
async function salvarContratoSupabase(documentKey, cliente, proposta, cobrarAoAssinar) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return { ok: false, motivo: `env ausente (url=${!!url} key=${!!key})` };
  }
  try {
    const res = await fetch(`${url}/rest/v1/clicksign_contratos`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        document_key: documentKey,
        cliente: cliente || {},
        proposta: proposta || {},
        cobrar_ao_assinar: !!cobrarAoAssinar,
      }),
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 250);
      return { ok: false, motivo: `supabase HTTP ${res.status}`, detalhe: txt };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: "exceção: " + (e && e.message) };
  }
}

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cliente"
  );
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Método não permitido. Use POST." }, 405);
  }

  const token = process.env.CLICKSIGN_API_TOKEN;
  if (!token) {
    return json(
      { ok: false, error: "CLICKSIGN_API_TOKEN não configurado no Vercel." },
      500
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(
      { ok: false, error: "Corpo inválido — esperado JSON." },
      400
    );
  }

  const { pdfBase64, cliente } = payload || {};
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return json({ ok: false, error: "pdfBase64 ausente ou inválido." }, 400);
  }
  if (!cliente || !cliente.empresa || !cliente.email) {
    return json(
      {
        ok: false,
        error: "Dados do cliente incompletos — 'empresa' e 'email' são obrigatórios.",
      },
      400
    );
  }

  // O Clicksign exige nome + sobrenome (2+ palavras) no signatário.
  const nomeCliente = String(cliente.contato || "").trim();
  if (nomeCliente.split(/\s+/).filter(Boolean).length < 2) {
    return json(
      {
        ok: false,
        error:
          "Informe o nome completo do responsável (nome e sobrenome) — o Clicksign exige isso pra assinatura.",
      },
      400
    );
  }

  /* Normaliza o conteúdo. O jsPDF (output 'datauristring') manda
     "data:application/pdf;filename=generated.pdf;base64,XXXX" — o
     ";filename=" no meio quebra o Clicksign. Extrai só o base64 puro
     e remonta um data URI limpo. */
  const b64idx = pdfBase64.indexOf("base64,");
  const rawB64 = (b64idx !== -1 ? pdfBase64.slice(b64idx + 7) : pdfBase64).trim();
  if (!rawB64 || rawB64.length < 100) {
    return json({ ok: false, error: "PDF vazio ou inválido (base64 muito curto)." }, 400);
  }
  const content = `data:application/pdf;base64,${rawB64}`;

  // Prazo de assinatura: 7 dias a partir de agora.
  const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
  const stamp = Date.now();

  try {
    // 1 · Cria o documento (upload do PDF)
    const docRes = await clicksign("documents", token, {
      document: {
        path: `/contrato-oduo-${slugify(cliente.empresa)}-${stamp}.pdf`,
        content_base64: content,
        deadline_at: deadline,
        auto_close: true,
        locale: "pt-BR",
        sequence_enabled: false,
      },
    });
    const documentKey = docRes.document && docRes.document.key;
    if (!documentKey) {
      throw new Error("Clicksign não retornou a key do documento.");
    }

    // 2 · Signatários: cliente + ODuo (Lucas)
    const signers = [
      { role: "cliente", name: nomeCliente, email: cliente.email },
      { role: "oduo", name: ODUO_SIGNER.name, email: ODUO_SIGNER.email },
    ];

    const resultado = [];
    for (const s of signers) {
      // 2a · cria o signatário (autenticação por token de e-mail)
      const signerRes = await clicksign("signers", token, {
        signer: {
          email: s.email,
          name: s.name,
          auths: ["email"],
          delivery: "email",
          has_documentation: false,
        },
      });
      const signerKey = signerRes.signer && signerRes.signer.key;
      if (!signerKey) {
        throw new Error(`Clicksign não retornou key do signatário (${s.role}).`);
      }

      // 2b · vincula o signatário ao documento
      const listRes = await clicksign("lists", token, {
        list: {
          document_key: documentKey,
          signer_key: signerKey,
          sign_as: "party",
          message: `Contrato de Serviços Digitais ODuo — ${cliente.empresa}.`,
        },
      });
      const requestSignatureKey =
        listRes.list && listRes.list.request_signature_key;

      // 2c · dispara o e-mail de assinatura
      if (requestSignatureKey) {
        await clicksign("notifications", token, {
          request_signature_key: requestSignatureKey,
          message: `Olá! Segue o Contrato de Serviços Digitais da ODuo para ${cliente.empresa}. É só assinar por aqui.`,
        });
      }

      resultado.push({
        parte: s.role,
        nome: s.name,
        email: s.email,
        signerKey,
        requestSignatureKey: requestSignatureKey || null,
      });
    }

    // Persiste o contrato (cliente + proposta) pra Etapa 3 — a cobrança
    // no Asaas é criada quando o webhook avisar que o contrato foi assinado.
    const persistencia = await salvarContratoSupabase(
      documentKey,
      cliente,
      payload.proposta || {},
      payload.cobrarAoAssinar
    );

    return json({
      ok: true,
      ambiente: CLICKSIGN_BASE.includes("sandbox") ? "sandbox" : "producao",
      documentKey,
      signatarios: resultado,
      persistencia,
      mensagem:
        "Contrato criado no Clicksign e e-mails de assinatura enviados ao cliente e à ODuo.",
    });
  } catch (err) {
    const isClientErr =
      err.httpStatus && err.httpStatus >= 400 && err.httpStatus < 500;
    return json(
      {
        ok: false,
        error: err.message || "Falha ao criar o contrato no Clicksign.",
        detalhe: err.detail || null,
      },
      isClientErr ? 400 : 502
    );
  }
}
