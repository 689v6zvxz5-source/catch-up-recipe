(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CatchUpRecipeCloud = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createRecipeCloudService({ url, key, library }) {
    if (!url || !key || !library?.createClient) throw new Error("Supabase configuration is incomplete");

    const client = library.createClient(url, key, {
      auth: {
        persistSession: true,      // เก็บ session ไว้ใน localStorage ของเครื่องนี้
        autoRefreshToken: true,    // ต่ออายุ token ให้เองเบื้องหลัง
        detectSessionInUrl: false, // ไม่ใช้ magic link แล้ว จึงไม่ต้องอ่าน token จาก URL
        storageKey: "catchup_recipe_auth_v1",
      },
    });

    async function session() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session || null;
    }

    // Email + Password: session ถูกสร้างในหน้าต่างที่ผู้ใช้ล็อกอินโดยตรง ไม่มี redirect ออก Safari
    // จึงไม่มีปัญหา session ข้าม context บนมือถือ (คง Supabase Auth + RLS + allowlist 2 อีเมลเดิมไว้)
    async function signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: String(email).trim(), password });
      if (error) throw error;
    }

    async function signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }

    async function access() {
      const { data, error } = await client.rpc("current_recipe_access");
      if (error) throw error;
      return data || null;
    }

    async function loadRows() {
      const { data, error } = await client
        .from("recipes")
        .select("id,data,updated_at,deleted_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }

    async function applyChange({ id, recipe, updatedAt, deletedAt = null }) {
      const { data, error } = await client.rpc("apply_recipe_change", {
        p_id: id,
        p_data: recipe || { id },
        p_updated_at: updatedAt,
        p_deleted_at: deletedAt,
      });
      if (error) throw error;
      return data;
    }

    return {
      client,
      session,
      signIn,
      signOut,
      access,
      loadRows,
      applyChange,
      onAuthStateChange: (callback) => client.auth.onAuthStateChange(callback),
    };
  }

  return { createRecipeCloudService };
});
