import { test, expect } from "@playwright/test";
import { signIn, json, USER } from "./helpers";

test("owner searches, reviews a trial extension and retries a revocation", async ({page}) => {
  await signIn(page);
  const expires = "2090-01-01T00:00:00.000Z";
  const account = { account: { "User ID": USER.id, Email: USER.email }, plan: { Source: "trial", "Trial end": expires },
    preferences: {}, work: {}, sessions: [], timeline: [] };
  const attempts = [];
  await page.route("**/api/me?owner=1", async route => {
    const body = route.request().postDataJSON();
    switch (body.view) {
      case "overview": return json(route, { Accounts: 1 });
      case "directory": return json(route, { rows: body.search ? [{ ...USER, name: "Test owner", plan: "pro" }] : [], more: false });
      case "detail": return json(route, account);
      case "action":
        attempts.push(body);
        if (attempts.length === 2) return json(route, {error: "Please retry."}, 503);
        if (body.end) account.plan["Trial end"] = body.end;
        return json(route, {ok:true, message:body.end ? "Trial extended" : "1 sessions revoked"});
    }
  });
  await page.goto("/admin");
  await page.getByLabel("Name or email").fill("Test");
  await page.getByRole("button", {name:"Search",exact:true}).click();
  await page.getByRole("link", {name:"Test owner"}).click();
  await page.getByRole("combobox", {name:"Action",exact:true}).selectOption("extend_trial");
  await page.getByLabel("New expiration").fill("2090-02-01T12:00");
  await page.getByLabel("Reason").fill("Support request");
  await page.getByRole("button",{name:"Review action"}).click();
  expect(attempts).toHaveLength(0);
  await page.getByRole("button",{name:"Confirm action"}).click();
  await expect(page.getByRole("status")).toHaveText("Trial extended");
  await page.getByRole("combobox",{name:"Action",exact:true}).selectOption("revoke_sessions");
  await page.getByLabel("Reason").fill("Lost device");
  await page.getByRole("button",{name:"Review action"}).click();
  await page.getByRole("button",{name:"Confirm action"}).click();
  await expect(page.getByRole("status")).toHaveText("Please retry.");
  await page.getByRole("button",{name:"Confirm action"}).click();
  await expect(page.getByRole("status")).toHaveText("1 sessions revoked");
  expect(attempts[2]).toEqual(attempts[1]);
});
