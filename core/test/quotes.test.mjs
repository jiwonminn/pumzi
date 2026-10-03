// Every quote must appear verbatim on the page it cites. Whitespace is normalised
// because the PDF text wraps.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";

const excerpt = readFileSync(new URL("../data/who-imci-chart-booklet-2014-pages-5-8.txt", import.meta.url), "utf8");
const normalise = (text) => text.replace(/\s+/g, " ").trim();

const pages = Object.fromEntries(
  excerpt
    .split(/===== PDF page (\d+) =====/)
    .slice(1)
    .reduce((acc, part, i, arr) => (i % 2 === 0 ? [...acc, [Number(part), normalise(arr[i + 1])]] : acc), []),
);

test("the excerpt has pages 5 to 8", () => {
  assert.deepEqual(Object.keys(pages).map(Number), [5, 6, 7, 8]);
});

for (const rule of IMCI_PROTOCOL.rules) {
  test(`${rule.id}: quote is word for word on PDF page ${rule.pdf_page}`, () => {
    assert.ok(pages[rule.pdf_page].includes(normalise(rule.quote)), `not found: "${rule.quote}"`);
  });
  if (rule.note) {
    test(`${rule.id}: note is word for word on PDF page ${rule.pdf_page}`, () => {
      assert.ok(pages[rule.pdf_page].includes(normalise(rule.note)), `not found: "${rule.note}"`);
    });
  }
}

test("age scope quote is on its page", () => {
  const scope = IMCI_PROTOCOL.age_scope;
  assert.ok(pages[scope.pdf_page].includes(normalise(scope.quote)));
});
