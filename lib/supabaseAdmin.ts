import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "./adminConfig";

// UYARI: Bu dosya yalnızca sunucu tarafında (app/api/.../route.ts) import edilmelidir.
// "use client" bileşenlerinde ASLA import edilmemeli — service_role anahtarı
// RLS'i tamamen atlar, tarayıcıya sızarsa veritabanına sınırsız erişim verir.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireAdmin(request: Request): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; message: string }
> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { ok: false, status: 401, message: "Oturum bulunamadı." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, message: "Geçersiz oturum." };
  }
  const email = data.user.email ?? "";
  if (!ADMIN_EMAILS.includes(email)) {
    return { ok: false, status: 403, message: "Bu işlem için yetkin yok." };
  }
  return { ok: true, userId: data.user.id, email };
}
