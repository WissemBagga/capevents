create table password_reset_tokens (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  token varchar(120) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_prt_user_id on password_reset_tokens(user_id);
create index idx_prt_expires_at on password_reset_tokens(expires_at);
