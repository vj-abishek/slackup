import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { nanoid } from "nanoid";

const DB_PATH = "./subscriptions.db";

export const db = await open({
  filename: DB_PATH,
  driver: sqlite3.Database,
});

const initDB = async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      subscription_id TEXT NOT NULL UNIQUE,
      clickup_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      webhook_id TEXT,
      subscribed BOOLEAN DEFAULT FALSE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Database initialized");
  return db;
};

export const insertSubscription = async ({
  subscription_id,
  clickup_id,
  channel,
  uuid,
}) => {
  const db = await initDB();
  await db.run(
    `INSERT INTO subscriptions (uuid, subscription_id, clickup_id, channel) VALUES (?, ?, ?, ?);`,
    [uuid, subscription_id, clickup_id, channel],
  );
  console.log(`✅ Inserted subscription with ID: ${uuid}`);
};

export const updateSubscription = async (subscription_id, subscribed) => {
  const db = await initDB();
  await db.run(
    `UPDATE subscriptions SET subscribed = ? WHERE subscription_id = ?;`,
    [subscribed, subscription_id],
  );
  const rows = await db.all(`SELECT * FROM subscriptions;`);
  return rows;
};

export const deleteSubscription = async (subscription_id) => {
  const db = await initDB();
  await db.run(`DELETE FROM subscriptions WHERE subscription_id = ?;`, [
    subscription_id,
  ]);
  console.log(`✅ Deleted subscription with ID: ${subscription_id}`);
};

export const getSubscriptions = async () => {
  const db = await initDB();
  const rows = await db.all(`SELECT * FROM subscriptions;`);
  console.log(rows);
  return rows;
};

export const getSubscription = async (subscription_id) => {
  const db = await initDB();
  const row = await db.get(
    `SELECT * FROM subscriptions WHERE subscription_id = ?;`,
    [subscription_id],
  );
  console.log(row);
  return row;
};

export const getSubscriptionByClickupId = async (clickup_id) => {
  const db = await initDB();
  const row = await db.get(
    `SELECT * FROM subscriptions WHERE clickup_id = ?;`,
    [clickup_id],
  );
  console.log(row);
  return row;
};

export const storeWebhookId = async (subscription_id, webhook_id) => {
  const db = await initDB();
  await db.run(
    `UPDATE subscriptions SET webhook_id = ? WHERE subscription_id = ?;`,
    [webhook_id, subscription_id],
  );
};

(async () => {
  // await getSubscriptions();
})();
