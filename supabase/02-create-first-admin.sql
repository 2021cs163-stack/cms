-- Run AFTER all-migrations.sql.
-- First create your administrator in Supabase > Authentication > Users > Add user.
-- Choose your own strong password there. No passwords belong in this SQL file.
-- Replace only the email and display name below, then run the complete block.
do $$
declare
 administrator_email text := 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
 administrator_name text := 'Amin Zai';
 administrator_id uuid;
begin
 if position('@' in administrator_email)=0 then
  raise exception 'Replace REPLACE_WITH_YOUR_ADMIN_EMAIL with the email of your existing Supabase Auth user';
 end if;
 select id into administrator_id from auth.users where lower(email)=lower(administrator_email);
 if administrator_id is null then
  raise exception 'Create this user in Supabase Authentication first: %',administrator_email;
 end if;
 if exists(select 1 from public.profiles where role='admin' and id<>administrator_id) then
  raise exception 'An administrator already exists. This script is only for first-time setup';
 end if;
 if exists(select 1 from public.teachers where id=administrator_id) then
  raise exception 'Use a separate administrator account; do not convert an existing teacher';
 end if;
 insert into public.profiles(id,full_name,email,role,status,must_change_password,can_announce)
 values(administrator_id,administrator_name,administrator_email,'admin','active',false,true)
 on conflict(id) do update set full_name=excluded.full_name,email=excluded.email,role='admin',status='active',must_change_password=false,can_announce=true;
 insert into public.activity(actor,action,resource,record_id)
 values(administrator_name,'first administrator initialized','profiles',administrator_id::text);
end $$;
