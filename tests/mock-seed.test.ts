import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, afterAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const db = new PGlite({ extensions: { pgcrypto } });
const seed = readFileSync(
  new URL("../supabase/05-seed-mock-data.sql", import.meta.url),
  "utf8",
);
const id = (n: number) =>
  `d3a00000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeAll(async () => {
  // The application migrations use Supabase's Auth/storage interfaces. Emulate
  // their schema locally; pgcrypto itself runs real PostgreSQL bcrypt hashing.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users (
      id uuid primary key, instance_id uuid, aud text, role text, email text unique,
      encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb,
      raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
      confirmation_token text, recovery_token text, email_change_token_new text,
      email_change text, email_change_token_current text, reauthentication_token text,
      phone_change text, phone_change_token text
    );
    create table auth.identities (
      id uuid primary key, user_id uuid not null references auth.users(id),
      provider_id text not null, provider text not null, identity_data jsonb not null,
      created_at timestamptz, updated_at timestamptz, unique(provider_id,provider)
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth,public,storage to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,name text,bucket_id text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$select string_to_array(name,'/')$$;
  `);
  await db.exec(
    readFileSync(
      new URL("../supabase/all-migrations.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(seed);
}, 60000);
afterAll(async () => {
  await db.close();
});

it("populates all data pages with coherent linked records", async () => {
  const expected: Record<string, number> = {
    teachers: 4,
    profiles: 4,
    courses: 4,
    classes: 4,
    students: 24,
    student_groups: 4,
    subjects: 8,
    exams: 8,
    results: 48,
    attendance: 120,
    fees: 24,
    payments: 16,
    payroll: 8,
    certificates: 4,
    certificate_templates: 4,
    announcements: 3,
    templates: 2,
    messages: 3,
    settings: 1,
  };
  for (const [table, count] of Object.entries(expected)) {
    expect(
      (await db.query(`select count(*)::int as n from public.${table}`))
        .rows[0],
      table,
    ).toEqual({ n: count });
  }
  expect(
    (await db.query("select count(*)::int as n from activity")).rows[0].n,
  ).toBeGreaterThan(100);
  expect((await db.query("select distinct status from messages")).rows).toEqual(
    [{ status: "draft" }],
  );
});

it("creates hashed teacher logins and enforces the initial password change", async () => {
  expect(
    (
      await db.query(
        "select count(*)::int as n from auth.users where encrypted_password=crypt('admin123',encrypted_password) and email_confirmed_at is not null",
      )
    ).rows[0].n,
  ).toBe(4);
  expect(
    (
      await db.query(
        "select count(*)::int as n from auth.identities where provider='email' and identity_data->>'sub'=user_id::text",
      )
    ).rows[0].n,
  ).toBe(4);
  expect(
    (
      await db.query(
        "select count(*)::int as n from profiles where must_change_password and role='teacher'",
      )
    ).rows[0].n,
  ).toBe(4);
  await db.exec(
    `set request.jwt.claim.sub='${id(1001)}'; set role authenticated;`,
  );
  expect((await db.query("select * from students")).rows).toHaveLength(0);
  await expect(db.query("select complete_password_change()")).rejects.toThrow(
    /temporary password first/,
  );
  await db.exec("reset role");
});

it("reruns without duplicates, overwrites or password resets", async () => {
  await db.exec(`update students set address='Edited by administrator' where id='${id(4001)}';
    update auth.users set encrypted_password=crypt('ChangedPassword456!',gen_salt('bf')) where id='${id(1001)}';`);
  const before = (await db.query("select count(*)::int as n from activity"))
    .rows[0].n;
  await db.exec(seed);
  expect(
    (await db.query("select count(*)::int as n from activity")).rows[0].n,
  ).toBe(before);
  expect(
    (await db.query(`select address from students where id='${id(4001)}'`))
      .rows[0].address,
  ).toBe("Edited by administrator");
  expect(
    (
      await db.query(
        `select encrypted_password=crypt('ChangedPassword456!',encrypted_password) as valid from auth.users where id='${id(1001)}'`,
      )
    ).rows[0].valid,
  ).toBe(true);
});

it("exposes only assigned mock records after changing a teacher password", async () => {
  await db.exec(
    `set request.jwt.claim.sub='${id(1001)}'; set role authenticated; select complete_password_change();`,
  );
  for (const [table, count] of Object.entries({
    students: 6,
    classes: 1,
    teachers: 1,
    payroll: 2,
    results: 12,
    student_groups: 1,
    certificates: 1,
    payments: 0,
    fees: 0,
  })) {
    expect((await db.query(`select * from ${table}`)).rows, table).toHaveLength(
      count,
    );
  }
  await db.exec("reset role");
});

it("includes paid, partially paid and unpaid fees without overpayments", async () => {
  const result = await db.query(`select status,count(*)::int as n from (
    select case when coalesce(sum(p.amount),0)=0 then 'unpaid'
      when sum(p.amount)=f.total then 'paid' else 'partial' end as status
    from fees f left join payments p on p.student_id=f.student_id group by f.id
  ) balances group by status order by status`);
  expect(result.rows).toEqual([
    { status: "paid", n: 8 },
    { status: "partial", n: 8 },
    { status: "unpaid", n: 8 },
  ]);
});

it("verifies seeded certificates without exposing student contact data", async () => {
  await db.exec("set role anon");
  const result = await db.query(
    "select * from verify_certificate('MOCK-CERT-005')",
  );
  expect(result.rows).toHaveLength(1);
  expect(Object.keys(result.rows[0]).sort()).toEqual([
    "completion_date",
    "course_name",
    "institution_name",
    "number",
    "student_name",
  ]);
  await db.exec("reset role");
});
