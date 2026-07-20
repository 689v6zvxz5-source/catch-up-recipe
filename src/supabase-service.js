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
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "catchup_recipe_auth_v1",
      },
    });

    async function session() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session || null;
    }

    // ส่งรหัสเข้าสู่ระบบทางอีเมล (อีเมลจะมีทั้งรหัส 6 หลักและลิงก์สำรอง)
    // การกรอกรหัสทำให้ session ถูกสร้างใน "หน้าต่างที่ผู้ใช้เปิดอยู่" — สำคัญมากบนมือถือ
    // เพราะการกดลิงก์จากแอปอีเมลจะเด้งไป Safari เสมอ ทำให้ session ไปอยู่คนละที่กับ PWA
    async function signIn(email, redirectTo) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) throw error;
    }

    async function verifyCode(email, token) {
      const { data, error } = await client.auth.verifyOtp({ email, token: String(token).trim(), type: "email" });
      if (error) throw error;
      return data.session || null;
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
      verifyCode,
      signOut,
      access,
      loadRows,
      applyChange,
      onAuthStateChange: (callback) => client.auth.onAuthStateChange(callback),
    };
  }

  return { createRecipeCloudService };
});
