/* Valida login por e-mail + senha. POST com form-urlencoded ou JSON.
   Usuários ficam na env var AUTH_USERS no formato:
     email1:hashbase64url;email2:hashbase64url
   Onde hash = SHA-256(`${email}:${senha}`) em base64url.
   Bate? → emite cookie de sessão (mesmo formato do login Google). */

export const config = { runtime: "edge" };

const SESSION_DAYS = 7;
const enc = new TextEncoder();

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

async function hashSenha(email, senha) {
  const data = enc.encode(`${email.toLowerCase()}:${senha}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return b64urlFromBytes(new Uint8Array(buf));
}

// Parse AUTH_USERS → Map<email, hash>
function parseUsers(raw) {
  const map = new Map();
  if (!raw) return map;
  for (const par of String(raw).split(";")) {
    const [email, hash] = par.split(":");
    if (email && hash) map.set(email.trim().toLowerCase(), hash.trim());
  }
  return map;
}

function redirecionarParaLoginComErro(url, msg) {
  const loginUrl = new URL("/api/auth/login", url.origin);
  loginUrl.searchParams.set("erro", msg);
  return new Response(null, {
    status: 302,
    headers: { Location: loginUrl.toString() },
  });
}

export default async function handler(request) {
  const url = new URL(request.url);

  if (request.method !== "POST") {
    return new Response("Use POST.", { status: 405 });
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return new Response("AUTH_SECRET ausente.", { status: 500 });
  }

  // Aceita form-urlencoded (form do navegador) ou JSON.
  let email = "";
  let senha = "";
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await request.json();
      email = String(body.email || "").trim().toLowerCase();
      senha = String(body.senha || body.password || "");
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      email = String(params.get("email") || "").trim().toLowerCase();
      senha = String(params.get("senha") || params.get("password") || "");
    }
  } catch {
    return redirecionarParaLoginComErro(url, "Corpo inválido. Tente de novo.");
  }

  if (!email || !senha) {
    return redirecionarParaLoginComErro(url, "Preencha e-mail e senha.");
  }

  const users = parseUsers(process.env.AUTH_USERS);
  const hashEsperado = users.get(email);
  if (!hashEsperado) {
    return redirecionarParaLoginComErro(url, "E-mail ou senha incorretos.");
  }

  const hashRecebido = await hashSenha(email, senha);
  if (hashRecebido !== hashEsperado) {
    return redirecionarParaLoginComErro(url, "E-mail ou senha incorretos.");
  }

  const session = await signSession(email, authSecret);
  const headers = new Headers();
  headers.set("Location", "/");
  headers.append(
    "Set-Cookie",
    `oduo_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${
      SESSION_DAYS * 24 * 3600
    }`
  );
  // Limpa o cookie de OAuth se sobrar.
  headers.append(
    "Set-Cookie",
    `oduo_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
  return new Response(null, { status: 302, headers });
}
