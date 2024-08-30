import axios from "axios";
import { pool } from "./index.js";
import { productionConfig } from "./config/config.js";

async function fetchUsers() {
  try {
    const query = `SELECT "account"."metaUsername","account"."createdAt","account"."password","account"."server","account"."platform", "challenge_result"."dailyDrawdown", "challenge_result"."maxDrawdown" 
        from "account" 
        LEFT JOIN "challenge_result" 
        ON "challenge_result"."metaUsername" = "account"."metaUsername"
        WHERE  "account"."createdAt" > '2024-04-15T00:00:00.000Z' 
        AND "account"."hasCredentialsProblem" = false 
        AND "challenge_result"."dailyDrawdown"->>'isPassed' = 'true'
        AND "challenge_result"."maxDrawdown"->>'isPassed' = 'true'
        AND "account"."platform" = 'mt4' 
        order by "account"."createdAt" desc;`;
    const allUsers = await pool.query(query);
    return allUsers.rows;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

let failedAccounts = [];
let users = [];
let servers = productionConfig.mt4Urls.map((url) => ({ url, busy: false }));

async function findFreeServer() {
  return servers.find((server) => !server.busy) || null;
}

async function sendUser(user, serverUrl) {
  try {
    const response = await axios.post(`${serverUrl}/Manage/trades`, {
      metaUsername: String(user.metaUsername),
      password: user.password,
      server: user.server,
    });

    if (response.data.statusCode) {
      if (response.data.message === "Invalid account") {
        console.log("credential problem account ", user.metaUsername);
        pool
          .query(
            `UPDATE account SET "credentialsProblemDescription" = 'Invalid account', "hasCredentialsProblem" = 'true', "activeEquityMode" = 'false' where "metaUsername" = $1`,
            [user.metaUsername]
          )
          .catch(() =>
            console.log(`credentials didn't updated for ${user.metaUsername}`)
          );
      } else {
        failedAccounts.push(user);
      }
    } else {
      console.log("mt4 final operation ",user.metaUsername)
      pool
        .query(
          `UPDATE account SET "credentialsProblemDescription" = 'working', "hasCredentialsProblem" = 'false', "activeEquityMode" = 'true',"depositId" = $2 where "metaUsername" = $1`,
          [user.metaUsername, response.data.userHistory[0].ticket]
        )
        .catch(() =>
          console.log(
            `credentials didn't updated in true manner for ${user.metaUsername}`
          )
        );

      // update history_trades table
      pool
        .query(
          `UPDATE history_trades SET list = $1 WHERE "metaUsername" = $2`,
          [JSON.stringify(response.data.userHistory), user.metaUsername]
        )
        .catch(() =>
          console.log(`history didn't updated for: ${user.metaUsername}`)
        );

      // update open_trades table
      pool
        .query(`UPDATE open_trades SET list = $1 WHERE "metaUsername" = $2`, [
          JSON.stringify(response.data.userOpenOrders),
          user.metaUsername,
        ])
        .catch(() =>
          console.log(`open orders didn't updated for: ${user.metaUsername}`)
        );
    }

    return response.data; // Handle response for individual user
  } catch (error) {
    failedAccounts.push(user);
    console.error(`Failed to send user: ${user.metaUsername} `, error.message);
    // No throw here to continue processing other users
  }
}

async function processUsersInBatches(
  users,
  batchSize = productionConfig.BatchSizeMt4
) {
  failedAccounts = []; // Reset failed accounts

  let currentIndex = 0;
  let batchIndex = 0;

  // Function to process a single batch
  async function processBatch(batch, serverUrl) {
    await Promise.allSettled(
      batch.map((user) => sendUser(user, serverUrl))
    ).then((results) => {
      // Process results, handle successes and rejections
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Request for user ${batch[index].metaUsername} failed: ${result.reason}`
          );
          failedAccounts.push(batch[index]);
        }
      });
    });
    console.log(`Batch ${batchIndex + 1} processed mt4`);
  }

  while (currentIndex < users.length) {
    const server = await findFreeServer();
    if (server) {
      const batch = users.slice(currentIndex, currentIndex + batchSize);
      currentIndex += batchSize; // Prepare index for the next batch

      server.busy = true; // Mark server as busy

      processBatch(batch, server.url, batchIndex).finally(() => {
        server.busy = false; // Mark server as free when done
      });

      batchIndex++;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for a server to become free
    }
  }

  // Ensure all servers have finished processing
  await Promise.all(
    servers.map(async (server) => {
      while (server.busy) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    })
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mainMt4(arg) {
  if (arg === "reset") {
    users = [];
  }
  try {
    if (users.length === 0) {
      await delay(10000);
      users = await fetchUsers();
      console.log("new Start mt4 processing...", users.length);
      await processUsersInBatches(users);
      const retryAccounts = [...failedAccounts];
      failedAccounts = [];
      console.log("retryAccounts mt4 length: ", retryAccounts.length);
      await processUsersInBatches(retryAccounts, productionConfig.BatchSizeMt4);

      console.log("Processing completed. mt4");
      users = [];
    }
  } catch (error) {
    users = [];
    console.log("the runner mt4 stopped: ", error.message);
  }
}
