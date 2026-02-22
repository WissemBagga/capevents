insert into roles(code, label) values
                                   ('ROLE_EMPLOYEE', 'Employé'),
                                   ('ROLE_MANAGER', 'Manager'),
                                   ('ROLE_HR', 'RH')
    on conflict (code) do nothing;

insert into departments(name) values
                                  ('IT'),
                                  ('HR'),
                                  ('Finance')
    on conflict (name) do nothing;
