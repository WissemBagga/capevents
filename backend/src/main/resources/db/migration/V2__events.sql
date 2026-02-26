create table events (
                        id uuid primary key default gen_random_uuid(),
                        title varchar(100) not null,
                        category varchar(60),
                        description text,
                        start_at timestamptz not null,
                        duration_minutes int not null,
                        location_type varchar(20) not null,
                        location_name varchar(180),
                        meeting_url text,
                        address text,
                        capacity int not null,
                        registration_deadline timestamptz not null,
                        status varchar(20) not null default 'DRAFT',
                        created_by uuid not null references users(id),
                        created_at timestamptz not null default now(),
                        updated_at timestamptz not null default now(),
                        cancel_reason text,
                        image_url text,

                        constraint chk_event_title_len check (char_length(title) between 5 and 100),
                        constraint chk_event_duration check (duration_minutes > 0 and duration_minutes <= 1440),
                        constraint chk_event_capacity check (capacity >= 1 and capacity <= 500),
                        constraint chk_deadline_before_start check (registration_deadline < start_at),

                        constraint chk_event_location_type check (location_type in ('ONSITE','ONLINE','EXTERNAL')),
                        constraint chk_event_status check (status in ('DRAFT','PUBLISHED','PENDING','CANCELLED','ARCHIVED'))
);

create index idx_events_status_start on events(status, start_at);
create index idx_events_created_by on events(created_by);