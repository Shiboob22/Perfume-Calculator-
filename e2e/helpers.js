// Shared by the signed-in specs that run against a fake API: a fake
// session, and JSON answers. Nothing here reaches a real project.
export const USER = { id: "00000000-0000-4000-8000-000000000001", email: "e2e@example.test", aud: "authenticated", role: "authenticated" };

export const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

// A signed-in session for whatever Supabase project the build points at:
// the auth client reads it from localStorage under sb-<ref>-auth-token.
export async function signIn(page) {
  await page.addInitScript((user) => {
    const session = JSON.stringify({
      access_token: "e2e-access-token", token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "e2e-refresh-token", user,
    });
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      return /^sb-.+-auth-token$/.test(key) ? session : getItem.call(this, key);
    };
  }, USER);
}
