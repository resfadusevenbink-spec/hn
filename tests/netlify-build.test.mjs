import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("builds a Netlify-ready static app", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /src="\/assets\/.*\.js"/);
  assert.match(html, /name="booking"/);
  assert.match(html, /data-netlify="true"/);
  assert.match(html, /name="bot-field"/);
  assert.match(html, /\/og\.png/);

  await stat(new URL("../dist/og.png", import.meta.url));
});

test("keeps Netlify configuration simple", async () => {
  const config = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");

  assert.match(config, /command = "npm run build"/);
  assert.match(config, /publish = "dist"/);
  assert.doesNotMatch(config, /cloudflare|d1|vinext/i);
});
