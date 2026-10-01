import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("npm:@supabase/supabase-js@2", () => ({
  createClient: mocks.createClient,
}));
let teacherHandler: (req: Request) => Promise<Response>;
let messageHandler: (req: Request) => Promise<Response>;
let client: any;
let env: Record<string, string> = {};
const teacherId = "d3a00000-0000-4000-8000-000000001001";
const teacher = {
  full_name: "Mock Teacher",
  father_name: "Mock Father",
  gender: "female",
  phone: "+12025550101",
  qualification: "Bachelor",
  specialization: "English",
  joining_date: "2026-01-01",
  salary_type: "monthly",
  salary: 18000,
  status: "active",
};
const request = (
  payload: unknown,
  authorized = true,
  origin = "http://localhost:5174",
) =>
  new Request("https://example.com/functions/v1/manage-teacher", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(authorized ? { Authorization: "Bearer test-token" } : {}),
    },
    body: JSON.stringify(payload),
  });
beforeAll(async () => {
  vi.stubGlobal("Deno", {
    env: { get: (key: string) => env[key] },
    serve: (handler: typeof teacherHandler) => {
      teacherHandler = handler;
    },
  });
  await import("../supabase/functions/manage-teacher/index.ts");
  const saved = teacherHandler;
  await import("../supabase/functions/send-message/index.ts");
  messageHandler = teacherHandler;
  teacherHandler = saved;
});
beforeEach(() => {
  env = {};
  const query: any = {};
  for (const method of ["select", "eq", "update"])
    query[method] = vi.fn(() => query);
  query.single = vi
    .fn()
    .mockResolvedValue({
      data: {
        id: teacherId,
        email: "mock.teacher.1@example.com",
        role: "admin",
        status: "active",
        must_change_password: false,
      },
      error: null,
    });
  query.insert = vi.fn().mockResolvedValue({ error: null });
  client = {
    from: vi.fn(() => query),
    rpc: vi.fn().mockResolvedValue({ error: null }),
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: "admin", email: "admin@example.com" } },
          error: null,
        }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: vi
          .fn()
          .mockResolvedValue({
            data: { user: { id: teacherId } },
            error: null,
          }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };
  mocks.createClient.mockReturnValue(client);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

it("answers CORS preflight without APP_ORIGIN or a login", async () => {
  for (const handler of [teacherHandler, messageHandler]) {
    const response = await handler(
      new Request("https://example.com", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:5174" },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5174",
    );
  }
  expect(client.auth.getUser).not.toHaveBeenCalled();
});
it("rejects unauthenticated creation before accessing Auth admin", async () => {
  const response = await teacherHandler(
    request({ action: "create", teacher }, false),
  );
  expect(response.status).toBe(403);
  expect(client.auth.admin.createUser).not.toHaveBeenCalled();
});
it("rejects teachers and inactive administrators", async () => {
  for (const profile of [
    { role: "teacher", status: "active" },
    { role: "admin", status: "inactive" },
    { role: "admin", status: "active", must_change_password: true },
  ]) {
    client.from().single.mockResolvedValue({ data: profile, error: null });
    expect(
      (await teacherHandler(request({ action: "create", teacher }))).status,
    ).toBe(403);
  }
  expect(client.auth.admin.createUser).not.toHaveBeenCalled();
});
it("creates a teacher with admin123 and registers the matching database profile", async () => {
  const response = await teacherHandler(request({ action: "create", teacher }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    id: teacherId,
    email: "mock.teacher@aminzi.af",
  });
  expect(client.auth.admin.createUser).toHaveBeenCalledWith(
    expect.objectContaining({ password: "admin123", email_confirm: true }),
  );
  expect(client.rpc).toHaveBeenCalledWith(
    "register_teacher",
    expect.objectContaining({ teacher_id: teacherId }),
  );
});
it("removes the new Auth user if teacher registration fails and preserves the error", async () => {
  client.rpc.mockResolvedValue({
    error: { message: "Assigned class does not exist" },
  });
  const response = await teacherHandler(request({ action: "create", teacher }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "Assigned class does not exist",
  });
  expect(client.auth.admin.deleteUser).toHaveBeenCalledWith(teacherId);
});
it("rejects invalid teacher data without provisioning an account", async () => {
  expect(
    (
      await teacherHandler(
        request({ action: "create", teacher: { ...teacher, salary: -1 } }),
      )
    ).status,
  ).toBe(400);
  expect(client.auth.admin.createUser).not.toHaveBeenCalled();
});
it("enforces configured browser origins and returns readable CORS errors", async () => {
  env.APP_ORIGIN = "https://academy.example.com/";
  const response = await teacherHandler(request({ action: "create", teacher }));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("Origin not allowed");
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
    "http://localhost:5174",
  );
  expect(client.auth.admin.createUser).not.toHaveBeenCalled();
});
it("uses the requesting allowed origin for reset links with multiple origins", async () => {
  env.APP_ORIGIN = "https://academy.example.com,http://localhost:5174";
  const response = await teacherHandler(
    request({ action: "reset_password", id: teacherId }),
  );
  expect(response.status).toBe(200);
  expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
    "mock.teacher.1@example.com",
    { redirectTo: "http://localhost:5174/reset-password" },
  );
});
it("keeps notifications as drafts when provider secrets are missing", async () => {
  client
    .from()
    .single.mockResolvedValueOnce({
      data: { role: "admin", status: "active", must_change_password: false },
    })
    .mockResolvedValueOnce({
      data: { status: "draft", channel: "SMS", message: "Mock notification" },
    });
  const response = await messageHandler(request({ message_id: teacherId }));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain(
    "Provider secrets are not configured",
  );
  expect(client.from().update).not.toHaveBeenCalled();
});
