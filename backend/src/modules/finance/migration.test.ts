import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../db/migrate";
import { mkdtemp, readdir, copyFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const migrations = join(import.meta.dir, "../../../migrations");
const financeSql = () =>
  Bun.file(join(migrations, "0041_create_finance.sql")).text();

describe("Finance production migration on disposable databases", () => {
  it("adds only finance tables and registration, preserving existing data and permissions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sbase-finance-migration-"));
    const sqlite = new Database(join(directory, "disposable.sqlite"));
    sqlite.run("PRAGMA foreign_keys = ON");
    try {
      const previous = join(directory, "previous");
      await import("node:fs/promises").then((fs) => fs.mkdir(previous));
      for (const name of await readdir(migrations))
        if (name.endsWith(".sql") && name < "0041_create_finance.sql")
          await copyFile(join(migrations, name), join(previous, name));
      await runMigrations(sqlite, previous);
      sqlite.run(
        "INSERT INTO users (username, pswd_hash) VALUES ('synthetic-finance-migration', 'unused')",
      );
      const user = sqlite
        .query<
          { user_id: number },
          []
        >("SELECT user_id FROM users WHERE username = 'synthetic-finance-migration'")
        .get()!;
      sqlite.run(
        "INSERT INTO cashflow_clients (user_id, name) VALUES (?, 'Sample business client')",
        [user.user_id],
      );
      const usersBefore = sqlite.query("SELECT * FROM users").all();
      const cashflowBefore = sqlite
        .query("SELECT * FROM cashflow_clients")
        .all();
      const permissionsBefore = sqlite
        .query("SELECT * FROM usermodulepermissions")
        .all();
      expect((await runMigrations(sqlite)).applied).toBe(7);
      expect(sqlite.query("SELECT * FROM users").all()).toEqual(usersBefore);
      expect(sqlite.query("SELECT * FROM cashflow_clients").all()).toEqual(
        cashflowBefore,
      );
      expect(sqlite.query("SELECT * FROM usermodulepermissions").all()).toEqual(
        permissionsBefore,
      );
      expect(
        sqlite
          .query("SELECT module_alias FROM modules WHERE module_name='finance'")
          .get(),
      ).toEqual({ module_alias: "Finance" });
      sqlite.run(
        "INSERT INTO finance_accounts (user_id,name,type,opening_date) VALUES (?, 'Sample', 'savings','2025-01-01')",
        [user.user_id],
      );
      const id = Number(
        sqlite
          .query<{ id: number }, []>("SELECT id FROM finance_accounts")
          .get()!.id,
      );
      sqlite.run(
        "INSERT INTO finance_observations (account_id,date,balance_cents) VALUES (?, '2025-01-01', 12345)",
        [id],
      );
      expect(() =>
        sqlite.run(
          "INSERT INTO finance_observations (account_id,date,balance_cents) VALUES (?, '2025-01-01', 1)",
          [id],
        ),
      ).toThrow();
      expect(() =>
        sqlite.run(
          "INSERT INTO finance_observations (account_id,date,balance_cents) VALUES (?, '2025-02-01', 1.5)",
          [id],
        ),
      ).toThrow();
      const financeBefore = sqlite
        .query("SELECT * FROM finance_observations")
        .all();
      expect((await runMigrations(sqlite)).applied).toBe(0);
      await sqlite.exec(await financeSql());
      expect(sqlite.query("SELECT * FROM finance_observations").all()).toEqual(
        financeBefore,
      );
      expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(sqlite.query("PRAGMA integrity_check").get()).toEqual({
        integrity_check: "ok",
      });
    } finally {
      sqlite.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("applies finance on an untracked legacy database without changing existing records", async () => {
    const sqlite = new Database(":memory:");
    try {
      sqlite.exec(
        "CREATE TABLE users (user_id INTEGER PRIMARY KEY, username TEXT); CREATE TABLE modules (module_id INTEGER PRIMARY KEY, module_name TEXT UNIQUE, module_alias TEXT, description TEXT); INSERT INTO users VALUES (1, 'synthetic-legacy');",
      );
      expect((await runMigrations(sqlite)).applied).toBe(7);
      expect(sqlite.query("SELECT * FROM users").all()).toEqual([
        { user_id: 1, username: "synthetic-legacy" },
      ]);
      expect(
        sqlite
          .query(
            "SELECT name FROM sqlite_master WHERE name = 'finance_accounts'",
          )
          .get(),
      ).toBeTruthy();
      expect((await runMigrations(sqlite)).applied).toBe(0);
    } finally {
      sqlite.close();
    }
  });
  it("adds transaction storage to existing finance balances without altering them", async () => {
    const sqlite = new Database(":memory:");
    sqlite.run("PRAGMA foreign_keys = ON");
    try {
      sqlite.exec("CREATE TABLE users (user_id INTEGER PRIMARY KEY); CREATE TABLE modules (module_id INTEGER PRIMARY KEY, module_name TEXT UNIQUE, module_alias TEXT, description TEXT); INSERT INTO users VALUES (1);");
      sqlite.exec(await financeSql());
      sqlite.exec("INSERT INTO finance_accounts (id,user_id,name,type,opening_date) VALUES (1,1,'Sample savings','savings','2025-01-01'); INSERT INTO finance_observations (account_id,date,balance_cents) VALUES (1,'2025-01-01',12345);");
      const before = sqlite.query("SELECT * FROM finance_observations").all();
      const migration = await Bun.file(join(migrations, "0043_finance_transactions.sql")).text();
      sqlite.exec(migration);
      sqlite.exec(migration);
      expect(sqlite.query("SELECT * FROM finance_observations").all()).toEqual(before);
      expect(sqlite.query("SELECT * FROM finance_transactions").all()).toEqual([]);
      expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally { sqlite.close(); }
  });

});


it("adds account icons to populated finance tables without changing existing data", async () => {
  const sqlite = new Database(":memory:");
  try {
    sqlite.exec("CREATE TABLE users (user_id INTEGER PRIMARY KEY); CREATE TABLE modules (module_id INTEGER PRIMARY KEY, module_name TEXT UNIQUE, module_alias TEXT, description TEXT); INSERT INTO users VALUES (1);");
    sqlite.exec(await financeSql());
    sqlite.exec("INSERT INTO finance_accounts (id,user_id,name,type,opening_date) VALUES (1,1,'Sample','current','2025-01-01'); INSERT INTO finance_observations (account_id,date,balance_cents) VALUES (1,'2025-01-01',12345);");
    const balances = sqlite.query("SELECT * FROM finance_observations").all();
    const account = sqlite.query("SELECT * FROM finance_accounts").get() as Record<string, unknown>;
    sqlite.exec(await Bun.file(join(migrations, "0044_finance_account_icons.sql")).text());
    expect(sqlite.prepare("SELECT * FROM finance_accounts").get()).toEqual({ ...account, icon: null });
    sqlite.exec("UPDATE finance_accounts SET icon='wallet' WHERE id=1");
    expect(() => sqlite.exec("UPDATE finance_accounts SET icon='unsupported' WHERE id=1")).toThrow();
    expect(sqlite.query("SELECT * FROM finance_observations").all()).toEqual(balances);
  } finally { sqlite.close(); }
});

it("adds subscription preferences without changing transactions or balances", async () => {
  const sqlite = new Database(":memory:");
  sqlite.run("PRAGMA foreign_keys = ON");
  try {
    sqlite.exec("CREATE TABLE users (user_id INTEGER PRIMARY KEY); CREATE TABLE modules (module_id INTEGER PRIMARY KEY, module_name TEXT UNIQUE, module_alias TEXT, description TEXT); INSERT INTO users VALUES (1);");
    sqlite.exec(await financeSql());
    sqlite.exec(await Bun.file(join(migrations, "0043_finance_transactions.sql")).text());
    sqlite.exec("INSERT INTO finance_accounts (id,user_id,name,type,opening_date) VALUES (1,1,'Sample','current','2025-01-01'); INSERT INTO finance_observations (account_id,date,balance_cents) VALUES (1,'2025-01-01',12345); INSERT INTO finance_transactions (account_id,fingerprint,date,amount_cents,name,description) VALUES (1,'sample-payment','2025-01-01',-1000,'Sample subscription','Sample payment');");
    const transactions = sqlite.query("SELECT * FROM finance_transactions").all();
    const balances = sqlite.query("SELECT * FROM finance_observations").all();
    const migration = await Bun.file(join(migrations, "0046_finance_subscription_preferences.sql")).text();
    sqlite.exec(migration);
    sqlite.exec(migration);
    sqlite.exec("INSERT INTO finance_subscription_preferences (user_id,source_key,group_key,name,excluded) VALUES (1,'sample-source','sample-group','Sample name',1)");
    expect(sqlite.query("SELECT * FROM finance_transactions").all()).toEqual(transactions);
    expect(sqlite.query("SELECT * FROM finance_observations").all()).toEqual(balances);
    expect(() => sqlite.exec("INSERT INTO finance_subscription_preferences (user_id,source_key,group_key) VALUES (1,'sample-source','other-group')")).toThrow();
    const preference = sqlite.query("SELECT * FROM finance_subscription_preferences").get() as Record<string, unknown>;
    sqlite.exec(await Bun.file(join(migrations, "0047_finance_manual_subscriptions.sql")).text());
    expect(sqlite.query("SELECT user_id, source_key, group_key, name, excluded, cadence FROM finance_subscription_preferences").get()).toEqual({ ...preference, cadence: null });
    sqlite.exec("UPDATE finance_subscription_preferences SET cadence='monthly'");
    expect(() => sqlite.exec("UPDATE finance_subscription_preferences SET cadence='daily'")).toThrow();
    expect(sqlite.query("SELECT * FROM finance_transactions").all()).toEqual(transactions);
    expect(sqlite.query("SELECT * FROM finance_observations").all()).toEqual(balances);
    expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { sqlite.close(); }
});
