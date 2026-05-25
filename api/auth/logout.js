/* Encerra a sessão: limpa o cookie e volta pro login. */

export const config = { runtime: "edge" };

export default function handler() {
  const headers = new Headers();
  headers.set("Location", "/api/auth/login");
  headers.append(
    "Set-Cookie",
    "oduo_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
  return new Response(null, { status: 302, headers });
}
