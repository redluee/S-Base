-- admin seed
INSERT INTO users (user_id, username, pswd_hash)
VALUES ('1','admin', '$argon2id$v=19$m=65536,t=2,p=1$gk1FBnX70MAmwufEpVkDJdPIJ7cTHv6RHjhJ/qkjbA8$S77uPjXvIaSafBxS83MzK+KXqB5ZvTjA4qnKuM/V9Nk');
INSERT INTO UserModulePermissions (user_id, module_id)
VALUES (1, 1);

-- tester seed
INSERT INTO users (user_id, username, pswd_hash)
VALUES ('2','tester', '$argon2id$v=19$m=65536,t=2,p=1$E+2GpQWmGwwrQL4Q5SJoMnDFN+MzW8YunUYwKiN2NNU$aT9QtkUnT3bI7JyGOOi9JhsaQC7wgdGJChONxB62kPA');
INSERT INTO UserModulePermissions (user_id, module_id)
VALUES (2, 1);
