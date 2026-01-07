import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  action: 'create';
  email: string;
  password: string;
  nome: string;
  role: 'admin' | 'vendedor' | 'projetos';
  filial?: string;
  telefone?: string;
}

interface UpdateUserRequest {
  action: 'update';
  userId: string;
  nome?: string;
  role?: 'admin' | 'vendedor' | 'projetos';
  filial?: string;
  telefone?: string;
}

interface ResetPasswordRequest {
  action: 'reset_password';
  userId: string;
  newPassword: string;
}

interface DeleteUserRequest {
  action: 'delete';
  userId: string;
}

type RequestBody = CreateUserRequest | UpdateUserRequest | ResetPasswordRequest | DeleteUserRequest;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the user token from the request to verify they're admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    console.log("manage-users action:", body.action);

    switch (body.action) {
      case "create": {
        const { email, password, nome, role, filial, telefone } = body;

        // Create user in auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome },
        });

        if (createError) {
          console.error("Error creating user:", createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profile with additional data
        if (filial || telefone) {
          await supabaseAdmin
            .from("profiles")
            .update({ filial, telefone })
            .eq("id", newUser.user.id);
        }

        // Update role if not default
        if (role !== "vendedor") {
          await supabaseAdmin
            .from("user_roles")
            .update({ role })
            .eq("user_id", newUser.user.id);
        }

        return new Response(
          JSON.stringify({ success: true, user: { id: newUser.user.id, email: newUser.user.email } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        const { userId, nome, role, filial, telefone } = body;

        // Update profile
        const profileUpdate: Record<string, string | undefined> = {};
        if (nome) profileUpdate.nome = nome;
        if (filial !== undefined) profileUpdate.filial = filial;
        if (telefone !== undefined) profileUpdate.telefone = telefone;

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdate)
            .eq("id", userId);

          if (profileError) {
            console.error("Error updating profile:", profileError);
            return new Response(
              JSON.stringify({ error: profileError.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Update role
        if (role) {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .update({ role })
            .eq("user_id", userId);

          if (roleError) {
            console.error("Error updating role:", roleError);
            return new Response(
              JSON.stringify({ error: roleError.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { userId, newPassword } = body;

        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        );

        if (resetError) {
          console.error("Error resetting password:", resetError);
          return new Response(
            JSON.stringify({ error: resetError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { userId } = body;

        // Prevent self-deletion
        if (userId === requestingUser.id) {
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error("Error deleting user:", deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Error in manage-users:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
