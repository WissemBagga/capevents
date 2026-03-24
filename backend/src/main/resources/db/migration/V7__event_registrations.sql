create table event_registrations (
                                     id bigserial primary key,
                                     event_id uuid not null references events(id) on delete cascade,
                                     user_id uuid not null references users(id) on delete cascade,
                                     status varchar(20) not null,
                                     registered_at timestamptz not null default now(),
                                     cancelled_at timestamptz
);

alter table event_registrations
    add constraint uk_event_user_registration unique (event_id, user_id);

create index idx_event_registrations_event_id on event_registrations(event_id);
create index idx_event_registrations_user_id on event_registrations(user_id);
create index idx_event_registrations_status on event_registrations(status);