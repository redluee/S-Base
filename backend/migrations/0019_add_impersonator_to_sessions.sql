ALTER TABLE sessions ADD COLUMN impersonator_user_id INTEGER REFERENCES users(user_id);
