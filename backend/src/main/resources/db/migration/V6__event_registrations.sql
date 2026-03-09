create table event_registrations (
                                     id bigserial primary key,
                                     event_id uuid not null references events(id) on delete cascade,
                                     user_id uuid not null references users(id) on delete cascade,
                                     rsvp_status varchar(20) not null default 'PENDING',
                                     registered_at timestamptz not null default now(),
                                     validated_by uuid references users(id),
                                     validated_at timestamptz,
                                     attendance_status varchar(20) not null default 'UNKNOWN',

                                     constraint uq_event_user unique (event_id, user_id),
                                     constraint chk_rsvp_status check (rsvp_status in ('PENDING','YES','NO','MAYBE','CONFIRMED','REJECTED')),
                                     constraint chk_attendance_status check (attendance_status in ('UNKNOWN','PRESENT','ABSENT'))
);

create index idx_event_registrations_event on event_registrations(event_id);
create index idx_event_registrations_user on event_registrations(user_id);