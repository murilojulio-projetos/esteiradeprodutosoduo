/* Tela de login do site. Dois caminhos:
     · Entrar com Google (continua sendo o padrão do time @oduo.com.br)
     · Entrar com e-mail e senha (convidados externos cadastrados)

   GET /api/auth/login                → renderiza a tela
   GET /api/auth/login?provider=google → dispara o OAuth do Google
*/

export const config = { runtime: "edge" };

const ALLOWED_DOMAIN = "oduo.com.br";

function googleOAuthRedirect(url) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response(
      "Login indisponível: GOOGLE_CLIENT_ID não configurado.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  // Não restringe ao domínio no Google (a validação fina é no callback):
  // convidado externo pode logar com Gmail comum se estiver na whitelist.
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", state);

  const headers = new Headers();
  headers.set("Location", authUrl.toString());
  headers.append(
    "Set-Cookie",
    `oduo_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  );
  return new Response(null, { status: 302, headers });
}

function loginPage(erro = "") {
  const erroHtml = erro
    ? `<p class="erro">${erro}</p>`
    : "";
  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Entrar · ODuo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;font-family:'Inter',system-ui,sans-serif}
    body{min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#0a1f3d 0%,#1e3a6b 100%);color:#fff;padding:24px}
    .card{width:100%;max-width:420px;background:#fff;color:#0a1f3d;border-radius:18px;padding:36px 32px;box-shadow:0 18px 60px rgba(0,0,0,.35)}
    .logo{display:flex;justify-content:center;margin-bottom:18px}
    .logo img{height:38px}
    h1{font-size:22px;font-weight:700;margin:0 0 6px;text-align:center}
    .sub{color:#6b7a99;text-align:center;font-size:14px;margin:0 0 26px}
    .erro{background:#fff1f0;border:1px solid #ffccc7;color:#a8071a;padding:10px 12px;border-radius:10px;font-size:14px;margin:0 0 16px}
    label{display:block;font-size:13px;font-weight:600;color:#33415c;margin:14px 0 6px}
    input[type=email],input[type=password]{width:100%;padding:11px 13px;border:1px solid #d6dee8;border-radius:10px;font-size:15px;outline:none;font-family:inherit}
    input:focus{border-color:#1e3a6b;box-shadow:0 0 0 3px rgba(30,58,107,.12)}
    .btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 16px;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer;border:0;font-family:inherit}
    .btn-primary{background:#0a1f3d;color:#fff;margin-top:18px}
    .btn-primary:hover{background:#143063}
    .btn-google{background:#fff;color:#1a1a1a;border:1px solid #d6dee8;margin-top:14px}
    .btn-google:hover{background:#f7f9fc}
    .sep{display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:12px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.08em}
    .sep::before,.sep::after{content:"";flex:1;height:1px;background:#e2e8f0}
    .foot{text-align:center;font-size:12px;color:#94a3b8;margin-top:22px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <strong style="font-size:20px;letter-spacing:.04em;color:#0a1f3d">ODuo</strong>
    </div>
    <h1>Entrar na esteira</h1>
    <p class="sub">Acesso restrito ao time ODuo e convidados.</p>
    ${erroHtml}
    <form method="POST" action="/api/auth/login-password" autocomplete="on">
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="voce@exemplo.com" />
      <label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" required autocomplete="current-password" placeholder="••••••••" />
      <button class="btn btn-primary" type="submit">Entrar</button>
    </form>
    <div class="sep">ou</div>
    <a class="btn btn-google" href="/api/auth/login?provider=google" style="text-decoration:none">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.4-4.6 2.3-7.3 2.3-5.3 0-9.7-3.4-11.3-8L6.2 33.1C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.3c-.4.4 6.4-4.7 6.4-14.7 0-1.2-.1-2.4-.4-3.5z"/></svg>
      Entrar com Google
    </a>
    <p class="foot">© ODuo · Marketing para Locadoras</p>
  </div>
</body>
</html>`;
}

export default function handler(request) {
  const url = new URL(request.url);

  // Caminho Google (clique no botão "Entrar com Google" ou redirect direto)
  if (url.searchParams.get("provider") === "google") {
    return googleOAuthRedirect(url);
  }

  // Caminho padrão: renderiza a tela de login com as 2 opções.
  const erro = url.searchParams.get("erro") || "";
  return new Response(loginPage(erro), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
