create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  url text not null,
  cover_url text,
  tag text not null default 'Experiment',
  embeddable boolean not null default true,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.tools to anon, authenticated;
grant insert, update, delete on public.tools to authenticated;
grant all on public.tools to service_role;
alter table public.tools enable row level security;
create policy "public reads published" on public.tools for select to anon, authenticated using (published or public.has_role(auth.uid(),'admin'));
create policy "admins insert" on public.tools for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admins update" on public.tools for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins delete" on public.tools for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.purchases (
  user_id uuid primary key,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);
grant select on public.purchases to authenticated;
grant all on public.purchases to service_role;
alter table public.purchases enable row level security;
create policy "read own purchase" on public.purchases for select to authenticated using (user_id = auth.uid());

create or replace function public.is_premium(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.purchases where user_id = _user_id and status = 'paid') or public.has_role(_user_id,'admin') $$;

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tool_id uuid references public.tools(id) on delete set null,
  title text not null,
  url text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.saved_items to authenticated;
grant all on public.saved_items to service_role;
alter table public.saved_items enable row level security;
create policy "own read" on public.saved_items for select to authenticated using (user_id = auth.uid());
create policy "premium insert" on public.saved_items for insert to authenticated with check (user_id = auth.uid() and public.is_premium(auth.uid()));
create policy "own update" on public.saved_items for update to authenticated using (user_id = auth.uid());
create policy "own delete" on public.saved_items for delete to authenticated using (user_id = auth.uid());

insert into public.tools (slug,name,tagline,description,url,tag,sort_order) values
('sample-one','Sample Tool One','Replace me from the admin page','A placeholder tool. Sign in as admin and swap in your real app URL.','https://lovable.dev','Experiment',1),
('sample-two','Sample Tool Two','Another placeholder','Add your own Lovable apps from the admin page.','https://docs.lovable.dev','Beta',2);