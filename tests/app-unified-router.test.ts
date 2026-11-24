import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import manifest from "../app/manifest";
import { signCustomerSession, verifyCustomerToken } from "../lib/customerSessionCookie";

const ROOT = path.resolve(__dirname, "..");

describe("Unified App Router & Automatic Role Dispatch (/app-start)", () => {
  it("should point store manifest start_url to /app-start", () => {
    const m = manifest();
    assert.strictEqual(m.start_url, "/app-start");
    assert.strictEqual(m.scope, "/");
    assert.strictEqual(m.display, "standalone");
  });

  it("should sign and verify customer session cookies with HMAC-SHA256", () => {
    const token = signCustomerSession({
      email: "cliente@example.com",
      name: "Cliente Test",
    });
    const verified = verifyCustomerToken(token);
    assert.ok(verified);
    assert.strictEqual(verified.email, "cliente@example.com");

    const tampered = `${token.slice(0, -4)}ffff`;
    assert.strictEqual(verifyCustomerToken(tampered), null);
  });

  it("should keep admin emails strictly server-side and show zero manual role choice in AppLauncherClient", () => {
    const launcher = fs.readFileSync(
      path.join(ROOT, "components", "AppLauncherClient.tsx"),
      "utf-8"
    );
    assert.strictEqual(launcher.includes("federica.cesiano@gmail.com"), false);
    assert.strictEqual(launcher.includes("mario@creativiastudio.com"), false);
    assert.strictEqual(launcher.includes("Sei un cliente"), false);
    assert.strictEqual(launcher.includes("Accesso Gestione Salone (Admin)"), false);
    assert.ok(launcher.includes("/api/app/identify"));

    const identifyRoute = fs.readFileSync(
      path.join(ROOT, "app", "api", "app", "identify", "route.ts"),
      "utf-8"
    );
    assert.ok(identifyRoute.includes("consumeRateLimit"));
    assert.ok(identifyRoute.includes("federica.cesiano@gmail.com"));
    assert.ok(identifyRoute.includes("signCustomerSession"));
  });

  it("should suppress Header and Footer on /app-start and respect Brand Vault (no Atelier)", () => {
    const header = fs.readFileSync(path.join(ROOT, "components", "Header.tsx"), "utf-8");
    const footer = fs.readFileSync(path.join(ROOT, "components", "Footer.tsx"), "utf-8");
    assert.ok(header.includes("/app-start"));
    assert.ok(footer.includes("/app-start"));

    for (const rel of [
      "lib/customerSessionCookie.ts",
      "app/api/app/identify/route.ts",
      "components/AppLauncherClient.tsx",
      "app/app-start/page.tsx",
    ]) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf-8");
      assert.strictEqual(/\batelier\b/i.test(text), false, `Found Atelier in ${rel}`);
    }
  });
});
