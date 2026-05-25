/* =====================================================================
   ODuo · api/cobranca/criar.js

   Cria a cobrança no Asaas DIRETO — sem depender de contrato assinado.
   É o botão "Gerar cobrança" da página de proposta: cobrar e contrato
   são ações independentes.

   Recebe (POST JSON): { cliente, proposta }
     · itens mensais  → assinatura recorrente mensal
     · setups+projetos → cobrança única de investimento inicial
     · billingType UNDEFINED → cliente escolhe boleto/Pix/cartão

   Ambiente: SANDBOX (ASAAS_ENV=production troca pra real).
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
  return new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
}

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
  const busca = await asaas(`customers?cpfCnpj=${cpfCnpj}`, null, "GET").catch(
    () => ({ data: [] })
  );
  if (busca && busca.data && busca.data.length) return busca.data[0].id;

  const novo = await asaas("customers", {
    name: cliente.empresa || cliente.contato || "Cliente ODuo",
    cpfCnpj,
    email: cliente.email || undefined,
    mobilePhone: String(cliente.telefone || "").replace(/\D/g, "") || undefined,
  });
  return novo.id;
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Use POST." }, 405);
  }
  if (!process.env.ASAAS_API_KEY) {
    return json({ ok: false, error: "ASAAS_API_KEY não configurada." }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Corpo inválido — esperado JSON." }, 400);
  }

  const cliente = payload.cliente || {};
  const p = payload.proposta || {};
  if (!cliente.empresa) {
    return json({ ok: false, error: "Dados do cliente incompletos." }, 400);
  }

  const mensal = Number(p.mensalTotal) || 0;
  const inicial = (Number(p.setupsTotal) || 0) + (Number(p.projetosTotal) || 0);
  if (mensal <= 0 && inicial <= 0) {
    return json(
      { ok: false, error: "Proposta sem valores a cobrar (mensal e inicial zerados)." },
      400
    );
  }

  try {
    const customerId = await garantirCliente(cliente);
    const criado = { customerId, subscriptionId: null, planoId: null, paymentId: null };

    /* Mensal → assinatura recorrente (boleto/Pix, cobra todo mês).
       Trimestral/Semestral → cobrança PARCELADA no cartão (3× / 6×) — é o
       período fechado do plano, não uma recorrência. (Anual saiu: o closer
       negocia direto com o cliente, fora da esteira.) */
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
          description: `ODuo · Mensalidade — ${cliente.empresa}`,
        });
        criado.subscriptionId = sub.id;
      } else {
        const nParc = PARCELAS[cadencia] || 6;
        const pay = await asaas("payments", {
          customer: customerId,
          billingType: "CREDIT_CARD",
          installmentCount: nParc,
          totalValue: mensal * nParc,
          dueDate: hojeMais(3),
          description: `ODuo · Plano ${cadencia} (${nParc}x no cartão) — ${cliente.empresa}`,
        });
        criado.planoId = pay.id;
      }
    }

    if (inicial > 0) {
      // Investimento inicial: respeita o parcelamento escolhido no dropdown.
      // > 1 parcela → parcelado no cartão; 1 → à vista (cliente escolhe forma).
      const nParcInicial = Number(p.parcelasInicial) || 1;
      const corpo =
        nParcInicial > 1
          ? {
              customer: customerId,
              billingType: "CREDIT_CARD",
              installmentCount: nParcInicial,
              totalValue: inicial,
              dueDate: hojeMais(3),
              description: `ODuo · Investimento inicial (${nParcInicial}x no cartão) — ${cliente.empresa}`,
            }
          : {
              customer: customerId,
              billingType: "UNDEFINED",
              value: inicial,
              dueDate: hojeMais(3),
              description: `ODuo · Investimento inicial — ${cliente.empresa}`,
            };
      const pay = await asaas("payments", corpo);
      criado.paymentId = pay.id;
    }

    return json({
      ok: true,
      ambiente: ASAAS_BASE.includes("sandbox") ? "sandbox" : "producao",
      ...criado,
      mensagem: "Cobrança criada no Asaas. O cliente recebe pra pagar.",
    });
  } catch (err) {
    return json(
      {
        ok: false,
        error: err.message || "Falha ao criar a cobrança no Asaas.",
        detalhe: err.detail || null,
      },
      502
    );
  }
}
