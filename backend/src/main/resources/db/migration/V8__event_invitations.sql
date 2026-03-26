create table event_invitations (
                                   id bigserial primary key,
                                   event_id uuid not null references events(id) on delete cascade,
                                   user_id uuid not null references users(id) on delete cascade,
                                   invited_by uuid not null references users(id) on delete cascade,
                                   target_type varchar(20) not null,
                                   status varchar(20) not null,
                                   message varchar(1000),
                                   sent_at timestamptz not null default now()
);

alter table event_invitations
    add constraint uk_event_user_invitation unique (event_id, user_id);

create index idx_event_invitations_event_id on event_invitations(event_id);
create index idx_event_invitations_user_id on event_invitations(user_id);
create index idx_event_invitations_invited_by on event_invitations(invited_by);
create index idx_event_invitations_status on event_invitations(status);