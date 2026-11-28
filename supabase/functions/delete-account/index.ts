import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Authenticate caller user with their token
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for optional target_user_id (admin action)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      if (body?.target_user_id && typeof body.target_user_id === "string") {
        targetUserId = body.target_user_id.trim();
      }
    } catch {
      /* body was empty or not json */
    }

    // Admin client with service role key to delete records and auth user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let effectiveUserId = user.id;

    if (targetUserId && targetUserId !== user.id) {
      // Caller wants to delete another user -> verify caller has admin role
      const { data: roleRow, error: roleError } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleRow) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Admin privileges required to delete other accounts" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      effectiveUserId = targetUserId;
    }

    // Call database cleanup function
    const { error: rpcError } = await adminClient.rpc("delete_user_account", {
      target_user_id: effectiveUserId,
    });
    if (rpcError) {
      console.warn("delete_user_account rpc warning/error:", rpcError);
    }

    // Delete user permanently from auth.users
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(effectiveUserId);
    if (deleteError) {
      console.error("deleteUser error:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, deleted_user_id: effectiveUserId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to delete account" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
