alter table events
    add column audience varchar(20) not null default 'DEPARTMENT';

alter table events
    add column target_department_id bigint references departments(id);

create index idx_events_audience on events(audience);
create index idx_events_target_dept on events(target_department_id);