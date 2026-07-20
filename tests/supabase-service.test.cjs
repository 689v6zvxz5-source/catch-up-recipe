const test = require("node:test");
const assert = require("node:assert/strict");
const { createRecipeCloudService } = require("../src/supabase-service.js");

function mockLibrary({ role = "editor", rows = [], failure = null } = {}) {
  const calls = [];
  const result = (data) => failure ? { data: null, error: new Error(failure) } : { data, error: null };
  const client = {
    auth: {
      getSession: async () => result({ session: { user: { id: "u1", email: "member@example.com" } } }),
      signInWithPassword: async (args) => { calls.push(["password", args]); return result(null); },
      signOut: async () => result(null),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    rpc: async (name, args) => {
      calls.push([name, args]);
      return result(name === "current_recipe_access" ? role : true);
    },
    from: () => ({
      select: () => ({ order: async () => result(rows) }),
    }),
  };
  return { library: { createClient: () => client }, calls };
}

test("authorized member role is returned", async () => {
  const mock = mockLibrary({ role: "editor" });
  const service = createRecipeCloudService({ url: "https://example.test", key: "public", library: mock.library });
  assert.equal(await service.access(), "editor");
});

test("unauthorized member is represented by an empty role", async () => {
  const mock = mockLibrary({ role: null });
  const service = createRecipeCloudService({ url: "https://example.test", key: "public", library: mock.library });
  assert.equal(await service.access(), null);
});

test("Supabase errors are surfaced instead of becoming empty data", async () => {
  const mock = mockLibrary({ failure: "permission denied" });
  const service = createRecipeCloudService({ url: "https://example.test", key: "public", library: mock.library });
  await assert.rejects(service.loadRows(), /permission denied/);
});

test("password sign-in passes trimmed email and password through", async () => {
  const mock = mockLibrary();
  const service = createRecipeCloudService({ url: "https://example.test", key: "public", library: mock.library });
  await service.signIn("  member@example.com  ", "s3cret");
  assert.deepEqual(mock.calls[0], ["password", { email: "member@example.com", password: "s3cret" }]);
});
