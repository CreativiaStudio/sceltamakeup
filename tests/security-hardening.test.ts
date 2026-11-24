import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  checkRateLimit,
  consumeRateLimit,
  recordRateLimitFailure,
  resetRateLimit,
} from "../lib/rateLimit";
import { maskCustomerName, maskShippingAddress } from "../lib/orderTracking";

const ROOT = path.resolve(__dirname, "..");

describe("Security Hardening & Cassa RT Compatibility", () => {
  it("should enforce rate limiting after 8 failures and reset on success", () => {
    const key = `test_auth_${Date.now()}`;
    const windowMs = 15 * 60 * 1000;

    assert.strictEqual(checkRateLimit(key, 8).allowed, true);
    for (let i = 0; i < 7; i++) {
      const res = recordRateLimitFailure(key, 8, windowMs);
      assert.strictEqual(res.blocked, false);
    }

    const eighth = recordRateLimitFailure(key, 8, windowMs);
    assert.strictEqual(eighth.blocked, true);
    assert.ok(eighth.retryAfterSeconds > 0);

    const blockedGate = checkRateLimit(key, 8);
    assert.strictEqual(blockedGate.allowed, false);
    assert.ok(blockedGate.retryAfterSeconds > 0);

    resetRateLimit(key);
    assert.strictEqual(checkRateLimit(key, 8).allowed, true);
  });

  it("should enforce fixed-window rate limiting on consumeRateLimit", () => {
    const key = `test_pub_${Date.now()}`;
    assert.strictEqual(consumeRateLimit(key, 2, 60_000).allowed, true);
    assert.strictEqual(consumeRateLimit(key, 2, 60_000).allowed, true);
    const third = consumeRateLimit(key, 2, 60_000);
    assert.strictEqual(third.allowed, false);
    assert.ok(third.retryAfterSeconds > 0);
  });

  it("should remove hardcoded PIN, master password and Stripe webhook secret from source", () => {
    const authRoute = fs.readFileSync(
      path.join(ROOT, "app", "api", "admin", "auth", "route.ts"),
      "utf-8"
    );
    assert.strictEqual(authRoute.includes("2829"), false, "Hardcoded PIN must be removed");
    assert.strictEqual(
      authRoute.includes("%sceltamakeup%2026"),
      false,
      "Hardcoded master password must be removed"
    );
    assert.ok(authRoute.includes("timingSafeEqual"));
    assert.ok(authRoute.includes("recordRateLimitFailure"));

    const webhookRoute = fs.readFileSync(
      path.join(ROOT, "app", "api", "webhooks", "stripe", "route.ts"),
      "utf-8"
    );
    assert.strictEqual(
      webhookRoute.includes("DEFAULT_STRIPE_WEBHOOK_SECRET"),
      false,
      "Hardcoded webhook fallback constant must be removed"
    );
    assert.strictEqual(
      /whsec_[A-Za-z0-9]{10,}/.test(webhookRoute),
      false,
      "No real whsec_ token may remain in source"
    );
  });

  it("should mask customer surname and street address while keeping city/CAP/province", () => {
    assert.strictEqual(maskCustomerName("Maria Rossi"), "Maria R.");
    assert.strictEqual(maskCustomerName("Federica"), "Federica");
    assert.strictEqual(maskCustomerName(""), "Cliente");

    const masked = maskShippingAddress({
      street: "Via Toledo 123",
      city: "Napoli",
      postalCode: "80134",
      province: "NA",
    });
    assert.ok(masked);
    assert.strictEqual(masked.street.includes("Toledo"), false);
    assert.strictEqual(masked.city, "Napoli");
    assert.strictEqual(masked.postalCode, "80134");
    assert.strictEqual(masked.province, "NA");
  });

  it("should sign customer session cookie with HMAC-SHA256 and prevent IDOR in order confirm", () => {
    const accountSessionRoute = fs.readFileSync(
      path.join(ROOT, "app", "api", "account", "session", "route.ts"),
      "utf-8"
    );
    assert.ok(accountSessionRoute.includes("customerSessionCookie"));
    assert.ok(accountSessionRoute.includes("signCustomerSession"));
    assert.ok(accountSessionRoute.includes("verifyCustomerToken"));

    const customerCookieLib = fs.readFileSync(
      path.join(ROOT, "lib", "customerSessionCookie.ts"),
      "utf-8"
    );
    assert.ok(customerCookieLib.includes("createHmac"));
    assert.ok(customerCookieLib.includes("timingSafeEqual"));

    const confirmRoute = fs.readFileSync(
      path.join(ROOT, "app", "api", "orders", "confirm", "route.ts"),
      "utf-8"
    );
    assert.ok(confirmRoute.includes("!o.stripeSessionId || o.stripeSessionId === session.id"));
    assert.ok(confirmRoute.includes("toPublicOrder("));
  });

  it("should configure SAMEORIGIN and security headers without blocking Cassa RT HTTP", () => {
    const nextConfig = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf-8");
    assert.ok(nextConfig.includes("Strict-Transport-Security"));
    assert.ok(nextConfig.includes("X-Content-Type-Options"));
    assert.ok(nextConfig.includes("SAMEORIGIN"));
    assert.strictEqual(nextConfig.includes("DENY"), false, "Must NOT use DENY (breaks admin iframes)");
    assert.ok(nextConfig.includes("Referrer-Policy"));
    assert.strictEqual(
      nextConfig.includes("upgrade-insecure-requests"),
      false,
      "Must NOT set upgrade-insecure-requests (breaks local Cassa RT 192.168.68.63)"
    );
  });
});
