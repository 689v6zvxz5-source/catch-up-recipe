(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CatchUpRecipeSync = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const emptyQueue = () => ({ version: 2, upserts: {}, deletes: {} });

  const timestamp = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const iso = (value) => new Date(timestamp(value) || Date.now()).toISOString();

  function normalizeCloudRow(row) {
    const data = row && row.data && typeof row.data === "object" ? row.data : {};
    return {
      id: String(row?.id || data.id || ""),
      recipe: { ...data, id: String(row?.id || data.id || "") },
      updatedAt: iso(row?.updated_at || data.updatedAt),
      deletedAt: row?.deleted_at ? iso(row.deleted_at) : null,
    };
  }

  function migrateQueue(rawQueue, localRecipes, now = Date.now()) {
    if (rawQueue?.version === 2) {
      return {
        version: 2,
        upserts: { ...(rawQueue.upserts || {}) },
        deletes: { ...(rawQueue.deletes || {}) },
      };
    }

    const migrated = emptyQueue();
    const localById = Object.fromEntries((localRecipes || []).map((recipe) => [recipe.id, recipe]));
    for (const id of Object.keys(rawQueue?.up || {})) {
      const recipe = localById[id];
      if (recipe) migrated.upserts[id] = { recipe, updatedAt: iso(recipe.updatedAt || now) };
    }
    for (const id of Object.keys(rawQueue?.del || {})) {
      migrated.deletes[id] = { deletedAt: iso(now), recipe: localById[id] || { id } };
      delete migrated.upserts[id];
    }
    return migrated;
  }

  function queueUpsert(queue, recipe) {
    const next = migrateQueue(queue, []);
    next.upserts[recipe.id] = { recipe: { ...recipe }, updatedAt: iso(recipe.updatedAt) };
    delete next.deletes[recipe.id];
    return next;
  }

  function queueDelete(queue, recipeOrId, deletedAt = Date.now()) {
    const next = migrateQueue(queue, []);
    const recipe = typeof recipeOrId === "string" ? { id: recipeOrId } : { ...recipeOrId };
    next.deletes[recipe.id] = { recipe, deletedAt: iso(deletedAt) };
    delete next.upserts[recipe.id];
    return next;
  }

  const hasPending = (queue) =>
    Object.keys(queue?.upserts || {}).length + Object.keys(queue?.deletes || {}).length > 0;

  function reconcile(cloudRows, cachedRecipes, queue) {
    const nextQueue = migrateQueue(queue, cachedRecipes);
    const cloud = new Map();
    for (const raw of cloudRows || []) {
      const row = normalizeCloudRow(raw);
      if (!row.id) continue;
      const existing = cloud.get(row.id);
      if (!existing || row.deletedAt || timestamp(row.updatedAt) > timestamp(existing.updatedAt)) {
        cloud.set(row.id, row);
      }
      if (row.deletedAt) {
        delete nextQueue.upserts[row.id];
        delete nextQueue.deletes[row.id];
      }
    }

    // A successful-but-empty response must never upload an old cache. Keep the
    // last snapshot visible, but only explicit queued operations may write.
    const visible = new Map();
    if (!cloud.size && (cachedRecipes || []).length) {
      for (const recipe of cachedRecipes) visible.set(recipe.id, recipe);
    } else {
      for (const row of cloud.values()) {
        if (!row.deletedAt) visible.set(row.id, { ...row.recipe, updatedAt: row.updatedAt });
      }
    }

    for (const [id, op] of Object.entries(nextQueue.upserts)) {
      visible.set(id, { ...op.recipe, id, updatedAt: op.updatedAt });
    }
    for (const id of Object.keys(nextQueue.deletes)) visible.delete(id);

    return {
      recipes: [...visible.values()].sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt)),
      queue: nextQueue,
    };
  }

  return {
    emptyQueue,
    timestamp,
    normalizeCloudRow,
    migrateQueue,
    queueUpsert,
    queueDelete,
    hasPending,
    reconcile,
  };
});
