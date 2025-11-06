--seed admin user to users table with all module permissions
INSERT INTO users (username, pswd_hash)
VALUES ('admin', 'hashed_password_here');
-- Grant all module permissions to admin user
INSERT INTO usermodulepermissions (user_id, module_id)
SELECT u.user_id, m.module_id
FROM users u, modules m
WHERE u.username = 'admin';
-- You can add more seed users below as needed
INSERT INTO users (username, pswd_hash)
VALUES ('Steven', 'hashed_password_here');
INSERT INTO users (username, pswd_hash)
VALUES ('Dèmi', 'hashed_password_here');
-- Grant specific module permissions to admin user
INSERT INTO usermodulepermissions (user_id, module_id)
SELECT u.user_id, m.module_id
FROM users u, modules m
WHERE u.username = 'admin' AND m.module_name IN ('recipe');
