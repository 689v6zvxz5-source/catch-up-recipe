const test = require("node:test");
const assert = require("node:assert/strict");
const sync = require("../src/sync-core.js");

const recipe = (id, updatedAt, title = id) => ({ id, title, updatedAt, ingredients: [], steps: [] });
const row = (value, deletedAt = null) => ({
  id: value.id,
  data: value,
  updated_at: new Date(value.updatedAt).toISOString(),
  deleted_at: deletedAt,
});

test("empty cloud never converts cached recipes into uploads", () => {
  const local = [recipe("a", 1000)];
  const result = sync.reconcile([], local, sync.emptyQueue());
  assert.deepEqual(result.recipes, local);
  assert.equal(sync.hasPending(result.queue), false);
});

test("explicit local update stays visible and queued", () => {
  const cloud = recipe("a", 1000, "old");
  const local = recipe("a", 2000, "new");
  const queue = sync.queueUpsert(sync.emptyQueue(), local);
  const result = sync.reconcile([row(cloud)], [local], queue);
  assert.equal(result.recipes[0].title, "new");
  assert.ok(result.queue.upserts.a);
});

test("cloud tombstone removes cached recipe and pending offline update", () => {
  const local = recipe("a", 3000, "offline edit");
  const queue = sync.queueUpsert(sync.emptyQueue(), local);
  const result = sync.reconcile([row(recipe("a", 2000), new Date(2000).toISOString())], [local], queue);
  assert.deepEqual(result.recipes, []);
  assert.equal(sync.hasPending(result.queue), false);
});

test("queued delete hides recipe until it syncs", () => {
  const cloud = recipe("a", 1000);
  const queue = sync.queueDelete(sync.emptyQueue(), cloud, 2000);
  const result = sync.reconcile([row(cloud)], [cloud], queue);
  assert.deepEqual(result.recipes, []);
  assert.ok(result.queue.deletes.a);
});

test("legacy queue migrates without losing pending operations", () => {
  const local = [recipe("a", 1000), recipe("b", 2000)];
  const queue = sync.migrateQueue({ up: { a: 1 }, del: { b: 1 } }, local, 3000);
  assert.equal(queue.version, 2);
  assert.equal(queue.upserts.a.recipe.id, "a");
  assert.equal(queue.deletes.b.recipe.id, "b");
  assert.equal(sync.hasPending(queue), true);
});

test("stable ids deduplicate cloud rows", () => {
  const old = recipe("a", 1000, "old");
  const fresh = recipe("a", 2000, "fresh");
  const result = sync.reconcile([row(old), row(fresh)], [], sync.emptyQueue());
  assert.equal(result.recipes.length, 1);
  assert.equal(result.recipes[0].title, "fresh");
});

test("stable id deduplication is independent of response order", () => {
  const old = recipe("a", 1000, "old");
  const fresh = recipe("a", 2000, "fresh");
  const result = sync.reconcile([row(fresh), row(old)], [], sync.emptyQueue());
  assert.equal(result.recipes.length, 1);
  assert.equal(result.recipes[0].title, "fresh");
});
