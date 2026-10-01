begin;

-- Teachers must be able to read messages addressed to their own class/course.
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated using (
 is_admin() or (account_active()
   and (audience in ('all','teachers') or (audience='students_group' and (class_id is not null or course_id is not null)))
   and (class_id is null or teaches(class_id))
   and (course_id is null or teaches_course(course_id)))
);

create or replace function public.admin_update_teacher(teacher_id uuid,teacher_data jsonb) returns void
language plpgsql security definer set search_path=public as $$begin
 perform private.check_teacher_assignments(teacher_data);
 if not exists(select 1 from teachers where id=teacher_id) then raise exception 'Teacher not found'; end if;
 -- Classes require a teacher: do not silently ignore a removed assignment.
 if teacher_data ? 'class_ids' and exists(
   select 1 from classes c where c.teacher_id=admin_update_teacher.teacher_id
   and c.id not in (select jsonb_array_elements_text(teacher_data->'class_ids')::uuid)
 ) then raise exception 'Reassign classes to another teacher before removing them from this teacher'; end if;
 update teachers set full_name=teacher_data->>'full_name',father_name=teacher_data->>'father_name',dob=nullif(teacher_data->>'dob','')::date,gender=teacher_data->>'gender',phone=teacher_data->>'phone',address=coalesce(teacher_data->>'address',''),qualification=teacher_data->>'qualification',specialization=teacher_data->>'specialization',joining_date=(teacher_data->>'joining_date')::date,salary_type=teacher_data->>'salary_type',salary=(teacher_data->>'salary')::numeric,photo=coalesce(teacher_data->>'photo',''),status=teacher_data->>'status',can_announce=coalesce((teacher_data->>'can_announce')::boolean,false) where id=teacher_id;
 update profiles set full_name=teacher_data->>'full_name',status=teacher_data->>'status',can_announce=coalesce((teacher_data->>'can_announce')::boolean,false) where id=teacher_id;
 if teacher_data ? 'course_ids' then
   update courses c set teacher_id=null where c.teacher_id=admin_update_teacher.teacher_id
   and c.id not in (select jsonb_array_elements_text(teacher_data->'course_ids')::uuid);
 end if;
 update classes set teacher_id=admin_update_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'class_ids','[]'))::uuid);
 update courses set teacher_id=admin_update_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'course_ids','[]'))::uuid);
end $$;
revoke all on function public.admin_update_teacher(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_update_teacher(uuid,jsonb) to service_role;

commit;
