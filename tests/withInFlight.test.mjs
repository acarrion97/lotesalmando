import assert from "node:assert/strict";
import test from "node:test";
import { withInFlight } from "../src/infrastructure/repositories/supabase/shared/withInFlight.ts";

test("reuses one active request for concurrent cobranza reads", async () => {
  const requests = new Map();
  let queryCount = 0;
  let finishQuery;
  const load = () => {
    queryCount += 1;
    return new Promise((resolve) => {
      finishQuery = resolve;
    });
  };

  const first = withInFlight(requests, 14, load);
  const second = withInFlight(requests, 14, load);

  assert.strictEqual(first, second);
  await Promise.resolve();
  assert.equal(queryCount, 1);
  finishQuery(["cuotas"]);
  assert.deepEqual(await Promise.all([first, second]), [["cuotas"], ["cuotas"]]);
  assert.equal(requests.size, 0);
});

test("allows a fresh read after the previous request settles", async () => {
  const requests = new Map();
  let queryCount = 0;
  const load = async () => ++queryCount;

  assert.equal(await withInFlight(requests, 14, load), 1);
  assert.equal(await withInFlight(requests, 14, load), 2);
  assert.equal(queryCount, 2);
});
