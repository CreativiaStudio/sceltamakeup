import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AUTH_SHORT_TTL_SECONDS,
  AUTH_TOKEN_TTL_SECONDS,
  createSignedAdminToken,
  inspectSignedAdminToken,
  verifySignedAdminToken,
} from "../lib/adminAuth";

const ROOT = path.resolve(__dirname, "..");

describe("Dual PWA, Footer CTA & 180-Day Persistent Session", () => {
  it("should set persistent admin session TTL to 180 days (>= 90 days)", () => {
    assert.ok(
      AUTH_TOKEN_TTL_SECONDS >= 90 * 24 * 60 * 60,
      `Expected >= 90 days, got ${AUTH_TOKEN_TTL_SECONDS}`
    );
    assert.strictEqual(AUTH_TOKEN_TTL_SECONDS, 180 * 24 * 60 * 60);
    assert.strictEqual(AUTH_SHORT_TTL_SECONDS, 12 * 60 * 60);
  });

  it("should sign, verify and inspect 180-day tokens and reject tampered tokens", () => {
    const token = createSignedAdminToken();
    assert.strictEqual(verifySignedAdminToken(token), true);

    const inspection = inspectSignedAdminToken(token);
    assert.strictEqual(inspection.valid, true);
    assert.strictEqual(inspection.shouldRefresh, false);
    assert.ok(inspection.exp && inspection.iat);
    assert.strictEqual(inspection.exp! - inspection.iat!, AUTH_TOKEN_TTL_SECONDS);

    const tampered = `${token.slice(0, -4)}0000`;
    assert.strictEqual(verifySignedAdminToken(tampered), false);
    assert.strictEqual(inspectSignedAdminToken(tampered).valid, false);
    assert.strictEqual(verifySignedAdminToken(null), false);
    assert.strictEqual(verifySignedAdminToken("invalid"), false);
  });

  it("should remove 'Cassa & Cockpit Store' from Footer and expose 'Scarica l\\'App'", () => {
    const footerPath = path.join(ROOT, "components", "Footer.tsx");
    const content = fs.readFileSync(footerPath, "utf-8");

    assert.strictEqual(content.includes("Cassa &"), false, "Footer must not mention Cassa &");
    assert.strictEqual(
      content.includes("/admin/appuntamenti"),
      false,
      "Footer must not link to /admin/appuntamenti"
    );
    assert.ok(
      content.includes("Scarica l&apos;App") || content.includes("Scarica l'App"),
      "Footer must expose Scarica l'App action"
    );
  });

  it("should provide valid store manifest, admin manifest, 6 PNG icons and network-only sw.js", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "app", "manifest.ts")));

    const adminManifestPath = path.join(ROOT, "public", "manifest-admin.webmanifest");
    assert.ok(fs.existsSync(adminManifestPath));
    const adminManifest = JSON.parse(fs.readFileSync(adminManifestPath, "utf-8")) as {
      start_url: string;
      scope: string;
      display: string;
      icons: Array<{ src: string; sizes: string }>;
    };
    assert.strictEqual(adminManifest.start_url, "/admin");
    assert.strictEqual(adminManifest.scope, "/admin");
    assert.strictEqual(adminManifest.display, "standalone");
    assert.ok(adminManifest.icons.length >= 2);

    const swPath = path.join(ROOT, "public", "sw.js");
    assert.ok(fs.existsSync(swPath));
    const swContent = fs.readFileSync(swPath, "utf-8");
    assert.strictEqual(swContent.includes("caches.put"), false);
    assert.strictEqual(swContent.includes("cache.add"), false);
    assert.strictEqual(swContent.includes("caches.open"), false);

    const expectedIcons = [
      "apple-touch-icon.png",
      "icon-192.png",
      "icon-512.png",
      "admin-icon-180.png",
      "admin-icon-192.png",
      "admin-icon-512.png",
    ];
    for (const icon of expectedIcons) {
      const p = path.join(ROOT, "public", "icons", icon);
      assert.ok(fs.existsSync(p), `Missing icon ${icon}`);
      const buf = fs.readFileSync(p);
      assert.strictEqual(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    }
  });

  it("should respect Brand Vault terminology (zero 'Atelier' in new PWA/session files)", () => {
    const newFiles = [
      "app/manifest.ts",
      "public/manifest-admin.webmanifest",
      "public/sw.js",
      "lib/pwaUtils.ts",
      "components/InstallAppModal.tsx",
      "components/PwaManager.tsx",
      "components/InstallAppLandingClient.tsx",
      "app/app/page.tsx",
      "app/api/account/session/route.ts",
    ];
    for (const rel of newFiles) {
      const content = fs.readFileSync(path.join(ROOT, rel), "utf-8");
      assert.strictEqual(
        /\batelier\b/i.test(content),
        false,
        `Banned word 'Atelier' found in ${rel}`
      );
    }
  });
});
