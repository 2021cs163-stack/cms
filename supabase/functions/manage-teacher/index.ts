import { z } from "npm:zod@4";
import { authorize, body, headers, response } from "../_shared/security.ts";
const text = z.string().trim().min(1).max(200);
const teacherSchema = z.object({
  full_name: text,
  father_name: text,
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .nullable()
    .optional(),
  gender: z.enum(["male", "female"]),
  phone: z.string().regex(/^\+?[\d ()-]{7,20}$/),
  address: z.string().max(2000).default(""),
  qualification: text,
  specialization: text,
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  salary_type: z.enum(["monthly", "hourly", "per_class"]),
  salary: z.number().nonnegative().max(100000000),
  photo: z.string().max(2048).default(""),
  status: z.enum(["active", "inactive"]),
  can_announce: z.boolean().default(false),
  course_ids: z.array(z.uuid()).max(100).default([]),
  class_ids: z.array(z.uuid()).max(100).default([]),
});
Deno.serve(async (req) => {
  let cors: Record<string, string> = {};
  try {
    cors = headers(req);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")
      return response({ error: "Method not allowed" }, 405, cors);
    const { client, user } = await authorize(req);
    const payload = await body(req);
    const action = z
      .enum(["create", "update", "reset_password", "temporary_password"])
      .parse(payload.action);
    if (action === "create") {
      const teacher = teacherSchema.parse(payload.teacher);
      const base =
        teacher.full_name
          .normalize("NFKD")
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .trim()
          .replace(/\s+/g, ".")
          .slice(0, 48) || "teacher";
      let createdId: string | undefined,
        email = "";
      for (let attempt = 0; attempt < 30; attempt++) {
        email = `${base}${attempt ? "." + (attempt + 1) : ""}@aminzi.af`;
        const result = await client.auth.admin.createUser({
          email,
          password: "admin123",
          email_confirm: true,
          user_metadata: { full_name: teacher.full_name },
        });
        if (result.data.user) {
          createdId = result.data.user.id;
          break;
        }
        if (
          result.error?.code !== "email_exists" &&
          result.error?.code !== "user_already_exists"
        )
          throw result.error;
      }
      if (!createdId)
        throw new Error("Unable to reserve a unique teacher email");
      const { error } = await client.rpc("register_teacher", {
        teacher_id: createdId,
        teacher_email: email,
        teacher_data: teacher,
      });
      if (error) {
        await client.auth.admin.deleteUser(createdId);
        throw error;
      }
      await client.from("activity").insert({
        actor: user.email,
        action: "created teacher account",
        resource: "teachers",
        record_id: createdId,
      });
      return response(
        {
          id: createdId,
          email,
          message:
            "Account created. The teacher must change the temporary password before accessing any records.",
        },
        200,
        cors,
      );
    }
    const id = z.uuid().parse(payload.id);
    const { data: existing, error } = await client
      .from("profiles")
      .select("id,email,role")
      .eq("id", id)
      .eq("role", "teacher")
      .single();
    if (error || !existing) throw new Error("Teacher account not found");
    if (action === "update") {
      const teacher = teacherSchema.parse(payload.teacher);
      const { error } = await client.rpc("admin_update_teacher", {
        teacher_id: id,
        teacher_data: teacher,
      });
      if (error) throw error;
      // RLS checks status on every request, even for an existing JWT.
      await client.from("activity").insert({
        actor: user.email,
        action: "updated teacher account",
        resource: "teachers",
        record_id: id,
      });
      return response({ id, email: existing.email }, 200, cors);
    }
    if (action === "temporary_password") {
      const password = Array.from(
        crypto.getRandomValues(new Uint8Array(20)),
        (n) =>
          "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#"[
            n % 58
          ],
      ).join("");
      const { error } = await client.auth.admin.updateUserById(id, {
        password,
      });
      if (error) throw error;
      const { error: forceError } = await client.rpc(
        "require_password_change",
        { teacher_id: id },
      );
      if (forceError) throw forceError;
      // Returned exactly once; never logged or stored outside the auth password hash.
      return response(
        { temporary_password: password, email: existing.email },
        200,
        cors,
      );
    }
    const resetOrigin =
      req.headers.get("origin") ||
      Deno.env.get("APP_ORIGIN")?.split(",")[0].trim();
    if (!resetOrigin)
      throw new Error(
        "APP_ORIGIN must be configured for password reset emails",
      );
    const { error: resetError } = await client.auth.resetPasswordForEmail(
      existing.email,
      { redirectTo: resetOrigin.replace(/\/$/, "") + "/reset-password" },
    );
    if (resetError) throw resetError;
    const { error: forceError } = await client.rpc("require_password_change", {
      teacher_id: id,
    });
    if (forceError) throw forceError;
    return response(
      {
        message:
          "Password reset email requested; a new password is required before access.",
      },
      200,
      cors,
    );
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Request failed";
    return response(
      { error: message },
      message.includes("required") ? 403 : 400,
      cors,
    );
  }
});
