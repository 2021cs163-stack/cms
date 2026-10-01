-- READ ONLY: run this after "relation profiles already exists".
-- Returns schema metadata only: no student data, passwords, or API keys.
-- Share the single JSON result to determine the appropriate upgrade path.
with expected(name) as (
 values ('profiles'),('teachers'),('students'),('courses'),('classes'),
 ('subjects'),('attendance'),('exams'),('results'),('fees'),('payments'),
 ('payroll'),('certificates'),('announcements'),('templates'),('messages'),
 ('activity'),('settings'),('student_groups'),('certificate_templates')
), inventory as (
 select e.name,c.oid is not null as present,c.relkind,c.relrowsecurity as rls_enabled
 from expected e
 left join pg_namespace n on n.nspname='public'
 left join pg_class c on c.relnamespace=n.oid and c.relname=e.name
)
select jsonb_build_object(
 'application_objects', (select jsonb_agg(to_jsonb(i) order by i.name) from inventory i),
 'profiles_columns', coalesce((
  select jsonb_agg(jsonb_build_object('column',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position)
  from information_schema.columns where table_schema='public' and table_name='profiles'
 ),'[]'::jsonb),
 'profiles_constraints',coalesce((
  select jsonb_agg(pg_get_constraintdef(c.oid))
  from pg_constraint c where c.conrelid=to_regclass('public.profiles')
 ),'[]'::jsonb),
 'migration_1_markers',jsonb_build_object(
  'register_teacher',to_regprocedure('public.register_teacher(uuid,text,jsonb)') is not null,
  'verify_certificate',to_regprocedure('public.verify_certificate(text)') is not null,
  'password_reset_guard',to_regclass('private.password_resets') is not null
 ),
 'migration_2_marker',to_regclass('public.certificate_templates') is not null,
 'migration_3_marker',to_regclass('public.students_code_casefold_idx') is not null,
 'application_policies',coalesce((
  select jsonb_agg(jsonb_build_object('table',tablename,'policy',policyname,'command',cmd) order by tablename,policyname)
  from pg_policies where schemaname='public' and tablename in (select name from expected)
 ),'[]'::jsonb)
) as schema_diagnosis;
