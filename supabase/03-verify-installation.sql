-- Read-only checks after installation. Each section should return the expected result.
-- 1. All 20 application tables must have RLS enabled.
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname in (
 'profiles','teachers','students','courses','classes','subjects','attendance','exams','results',
 'fees','payments','payroll','certificates','announcements','templates','messages','activity','settings',
 'student_groups','certificate_templates'
) order by c.relname;

-- 2. At least one active administrator after running 02-create-first-admin.sql.
select full_name,email,role,status from public.profiles where role='admin';

-- 3. Photo bucket must be private with a 2 MB limit.
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='photos';

-- 4. Public RPCs and their grants. Teacher management RPCs must be service_role only.
select routine_name,grantee,privilege_type from information_schema.routine_privileges
where routine_schema='public' and routine_name in (
 'register_teacher','admin_update_teacher','require_password_change','verify_certificate','update_own_profile','complete_password_change'
) order by routine_name,grantee;

-- 5. Empty result is expected: anonymous users must not have application table access.
select table_name,privilege_type from information_schema.table_privileges
where table_schema='public' and grantee='anon' and table_name in (
 'profiles','teachers','students','courses','classes','subjects','attendance','exams','results',
 'fees','payments','payroll','certificates','announcements','templates','messages','activity','settings',
 'student_groups','certificate_templates'
);
