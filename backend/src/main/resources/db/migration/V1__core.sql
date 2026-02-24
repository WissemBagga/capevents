-- UUID generation
create extension if not exists pgcrypto;

-- 1) roles
create table roles (
                       id bigserial primary key,
                       code varchar(60) not null unique,
                       label varchar(120) not null
);

-- 2) departments
create table departments (
                             id bigserial primary key,
                             name varchar(120) not null unique
);

-- 3) users
create table users (
                       id uuid primary key default gen_random_uuid(),
                       first_name varchar(80) not null,
                       last_name varchar(80) not null,
                       email varchar(190) not null unique,
                       password_hash varchar(255) not null,
                       phone varchar(20),
                       job_title varchar(120),
                       department_id bigint references departments(id),
                       is_active boolean not null default true,
                       avatar_url text,
                       created_at timestamptz not null default now(),
                       updated_at timestamptz not null default now(),
                       last_login_at timestamptz
);

create index idx_users_department on users(department_id);

-- 4) user_roles
create table user_roles (
                            user_id uuid not null references users(id) on delete cascade,
                            role_id bigint not null references roles(id) on delete cascade,
                            primary key (user_id, role_id)
);
