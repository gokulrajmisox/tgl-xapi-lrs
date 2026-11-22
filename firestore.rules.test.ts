import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const rulesText = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
const blueprintText = readFileSync(resolve(process.cwd(), "firebase-blueprint.json"), "utf8");

test("firestore.rules enforces global fail-closed default deny and PII isolation", () => {
  assert.match(rulesText, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);
  assert.match(rulesText, /match \/admins\/\{userId\}[\s\S]*allow list, write: if false;/);
  assert.match(rulesText, /match \/private\/\{docId\}/);
  assert.ok(!/allow read, write: if true/.test(rulesText), "Must never allow unauthenticated wildcard read/write");
});

test("firestore.rules locks enrollments, payments, payment_orders, and certificate creation to server SDK", () => {
  assert.match(rulesText, /match \/enrollments\/\{enrollmentId\}[\s\S]*allow write: if false;/);
  assert.match(rulesText, /match \/payments\/\{paymentId\}[\s\S]*allow write: if false;/);
  assert.match(rulesText, /match \/payment_orders\/\{orderId\}[\s\S]*allow write: if false;/);
  assert.match(rulesText, /match \/certificates\/\{certificateId\}[\s\S]*allow create, delete: if false;/);
});

test("firestore.rules prevents role escalation, submission tampering after approval, and checks isValidId", () => {
  assert.match(rulesText, /incoming\(\)\.role == 'student'/);
  assert.match(rulesText, /incoming\(\)\.role == existing\(\)\.role/);
  assert.match(rulesText, /existing\(\)\.status != 'approved'/);
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.match(rulesText, /data\.pricePaise >= 49900 && data\.pricePaise <= 199900/);
});

test("firebase-blueprint.json documents every critical collection and targets Enterprise named DB schema", () => {
  const blueprint = JSON.parse(blueprintText) as {
    entities?: Record<string, unknown>;
    firestore?: Record<string, unknown>;
  };
  assert.ok(blueprint.entities && blueprint.firestore);
  for (const key of [
    "users",
    "courses",
    "internships",
    "enrollments",
    "progress",
    "submissions",
    "certificates",
    "payments",
    "payment_orders",
  ]) {
    assert.ok(
      Object.keys(blueprint.firestore).some((path) => path.includes(key)),
      `Blueprint must include collection path for ${key}`,
    );
  }
});
