/* Recebe o retorno do Google: troca o `code` por tokens, confere o
   `state`, valida que o e-mail é verificado e do domínio oduo.com.br,
   e emite o cookie de sessão assinado. */

export const config = { runtime: "edge" };

const ALLOWED_DOMAIN = "oduo.com.br";
// Convidados externos liberados manualmente (fora do domínio @oduo.com.br).
const ALLOWED_EMAILS = new Set([
  "jvbp.previtalli@gmail.com",
]);
const SESSION_DAYS = 7;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlFromBytes(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

async function signSession(email, secret) {
  const payload = b64urlFromBytes(
    enc.encode(
      JSON.stringify({
        e: email,
        x: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 3600,
      })
    )
  );
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

function readCookie(header, name) {
  const m = (header || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function decodeJwtPayload(jwt) {
  return JSON.parse(dec.decode(b64urlToBytes(jwt.split(".")[1])));
}

function page(title, message, withRetry) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ODuo</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#04132a;color:#fff;padding:24px}
  .box{max-width:420px;text-align:center}
  h1{font-size:22px;margin:0 0 10px}
  p{color:rgba(255,255,255,.7);line-height:1.6;margin:0 0 22px}
  a{display:inline-block;background:#f08a3a;color:#fff;text-decoration:none;
    font-weight:700;padding:12px 22px;border-radius:10px}
</style></head><body><div class="box">
  <h1>${title}</h1><p>${message}</p>
  ${withRetry ? '<a href="/api/auth/login">Entrar com outra conta</a>' : ""}
</div></body></html>`;
}

export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = readCookie(request.headers.get("cookie"), "oduo_oauth_state");

  const htmlHeaders = { "content-type": "text/html; charset=utf-8" };

  if (!code || !state || !savedState || state !== savedState) {
    return new Response(
      page("Sessão expirada", "O pedido de login expirou ou é inválido. Tente de novo.", true),
      { status: 400, headers: htmlHeaders }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const authSecret = process.env.AUTH_SECRET;
  if (!clientId || !clientSecret || !authSecret) {
    return new Response(
      page("Configuração ausente", "As credenciais de login não estão configuradas no servidor.", false),
      { status: 500, headers: htmlHeaders }
    );
  }

  // Troca o code por tokens direto com o Google (servidor a servidor).
  let tokens;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });
    tokens = await tokenRes.json();
  } catch {
    tokens = null;
  }

  if (!tokens || !tokens.id_token) {
    return new Response(
      page("Falha no login", "Não foi possível concluir o login com o Google. Tente de novo.", true),
      { status: 401, headers: htmlHeaders }
    );
  }

  // id_token veio direto do Google por HTTPS — confiável.
  let claims;
  try {
    claims = decodeJwtPayload(tokens.id_token);
  } catch {
    claims = {};
  }
  const email = String(claims.email || "").toLowerCase();
  const domain = email.split("@")[1] || "";

  const emailAutorizado =
    domain === ALLOWED_DOMAIN || ALLOWED_EMAILS.has(email);
  if (!claims.email_verified || !emailAutorizado) {
    return new Response(
      page(
        "Acesso restrito",
        `Este site é exclusivo para o time ODuo (e-mail @${ALLOWED_DOMAIN}).` +
          (email ? ` A conta ${email} não tem acesso.` : ""),
        true
      ),
      { status: 403, headers: htmlHeaders }
    );
  }

  const session = await signSession(email, authSecret);
  const headers = new Headers();
  headers.set("Location", "/");
  headers.append(
    "Set-Cookie",
    `oduo_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 24 * 3600}`
  );
  // Limpa o cookie temporário de state.
  headers.append(
    "Set-Cookie",
    "oduo_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
  return new Response(null, { status: 302, headers });
}
