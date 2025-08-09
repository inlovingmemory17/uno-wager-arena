-- Fix function search paths for security compliance

-- Update the update_updated_at_column function
create or replace function public.update_updated_at_column()
returns trigger
security definer
set search_path = ''
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Update the handle_new_user function  
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = ''
language plpgsql
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  
  insert into public.balances (user_id)
  values (new.id);
  
  return new;
end;
$$;