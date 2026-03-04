create table audit_logs (
                            id bigserial primary key,
                            actor_user_id uuid,
                            action varchar(80) not null,
                            entity_type varchar(80),
                            entity_id varchar(64),
                            ip_address varchar(64),
                            created_at timestamptz not null default now(),
                            details jsonb
);

create index idx_audit_actor on audit_logs(actor_user_id);
create index idx_audit_action on audit_logs(action);
create index idx_audit_created_at on audit_logs(created_at);
create index idx_audit_entity on audit_logs(entity_type, entity_id);