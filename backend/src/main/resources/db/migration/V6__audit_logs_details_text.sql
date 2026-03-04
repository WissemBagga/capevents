alter table audit_logs
alter column details type text
  using details::text;