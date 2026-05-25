/* =====================================================================
   ODuo · Esteira de Produtos · middleware.js
   Edge Middleware: trava o site inteiro. Só passa quem tem um cookie de
   sessão válido (assinado). Sem cookie → manda pro login do Google.

   A proteção é no servidor (edge), antes de qualquer arquivo ser
   servido — não dá pra burlar vendo o código nem desligando o JS.
   ===================================================================== */

export const config = {
  // ⚠ GATE DE LOGIN DESATIVADO (Murilo · 2026-05-25): site PÚBLICO pra que
  // qualquer pessoa/IA consiga acessar e baixar tudo. Com este matcher, o
  // middleware não roda em nenhuma rota real (nada é travado).
  // Pra REATIVAR a proteção de login, restaure:
  //   matcher: ["/((?!api/auth/|api/webhooks/).*)"]
  matcher: ["/__gate_desativado__"],
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlFromBytes(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlFromBytes(new Uint8Array(sig));
}

async function verifySession(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = await hmac(parts[0], secret);
  if (parts[1] !== expected) return false;
  try {
    const payload = JSON.parse(dec.decode(b64urlToBytes(parts[0])));
    return typeof payload.x === "number" && payload.x > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function readCookie(header, name) {
  const m = (header || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function middleware(request) {
  const url = new URL(request.url);

  // Rotas de auth e webhooks nunca são travadas (o matcher já cobre, mas
  // garantimos aqui também). Webhook da Clicksign é validado por HMAC,
  // sem sessão.
  if (url.pathname.startsWith("/api/auth/")) return;
  if (url.pathname.startsWith("/api/webhooks/")) return;

  const token = readCookie(request.headers.get("cookie"), "oduo_session");
  const ok = await verifySession(token, process.env.AUTH_SECRET);
  if (ok) return; // sessão válida → segue pro conteúdo

  // Sem sessão → vai pro login do Google.
  const loginUrl = new URL("/api/auth/login", url.origin);
  return new Response(null, {
    status: 302,
    headers: { Location: loginUrl.toString() },
  });
}
