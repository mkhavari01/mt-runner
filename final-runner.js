import axios from "axios";
import { pool } from "./index.js";
import { productionConfig } from "./config/config.js";
import { MT4_INVALID_CODE, MT5_INVALID_CODE } from "./consts.js";

// axios.defaults.timeout = 20000;

function settingIp(user, platform) {
  if (user.server === "AMarkets-Demo") {
    user["server"] = "52.18.32.194";
    user["port"] = 443;
  } else if (user.server === "Alpari-MT5-Demo") {
    user["server"] = "23.111.102.26";
    user["port"] = 1119;
  } else if (user.server === "ICMarketsSC-Demo") {
    user["server"] = "192.149.48.199";
    user["port"] = 443;
  } else if (user.server === "UNFXB-Real") {
    user["server"] = "144.76.99.98";
    user["port"] = 443;
  } else if (user.server === "RoboForex-Demo") {
    user["server"] = "95.217.54.177";
    user["port"] = 443;
  } else if (user.server === "CWGMarketsSVG-Demo") {
    user["server"] = "47.91.76.126";
    user["port"] = 443;
  } else if (user.server === "OrbexGlobal-Server") {
    user["server"] = "46.235.34.20";
    user["port"] = 443;
  } else if (user.server === "INGOTGlobalLtd-Demo2") {
    user["server"] = "192.109.17.131";
    user["port"] = 443;
  } else if (user.server === "ICMarketsSC-Demo02") {
    user["server"] = "51.254.68.1";
    user["port"] = 443;
  } else if (user.server === "ICMarketsSC-Demo01") {
    user["server"] = "51.254.68.0";
    user["port"] = 443;
  }
  if (platform === "mt4") {
    user["terminal"] = 0;
  } else if (platform === "mt5") {
    user["terminal"] = 1;
  }
  return user;
}

async function connectUser(user) {
  const result = await axios.post(
    `${productionConfig.socketUrl}/Manage/addAccount`,
    {
      account: Number(user.metaUsername),
      password: user.password,
      server: user.server,
      port: Number(user.port),
      terminal: user.terminal,
    }
  );
  if (
    result.data.message === MT5_INVALID_CODE ||
    result.data.message === MT4_INVALID_CODE
  ) {
    await invalidUser(user);
  }
}

async function deleteUser(user) {
  console.log("delete user is called ", user.metaUsername);
  const ress = await axios.get(
    `${productionConfig.socketUrl}/Manage/deleteAccount?terminal=${user.terminal}&account=${user.metaUsername}`
  );
  console.log("ress is: ", ress.data);
}

async function invalidUser(user) {
  // console.log("came in here invalid ", user);
  if (user.terminal === 0) {
    pool
      .query(
        `UPDATE account SET "credentialsProblemDescription" = 'Invalid account', "hasCredentialsProblem" = 'true', "activeEquityMode" = 'false' where "metaUsername" = $1`,
        [user.metaUsername]
      )
      .catch(() =>
        console.log(`credentials didn't updated for ${user.metaUsername}`)
      );
  } else if (user.terminal === 1) {
    pool
      .query(
        `UPDATE account SET "credentialsProblemDescription" = 'INVALID_ACCOUNT', "hasCredentialsProblem" = 'true', "activeEquityMode" = 'false' where "metaUsername" = $1`,
        [user.metaUsername]
      )
      .catch(() =>
        console.log(`credentials didn't updated for ${user.metaUsername}`)
      );
  }
}

let isRunnedMt5 = false;
let isRunnedMt4 = false;
let users = [];

export async function finalRunner(platform, resetMt5, resetMt4) {
  if (resetMt5 === true) {
    isRunnedMt5 = false;
  }
  if (resetMt4 === true) {
    isRunnedMt4 = false;
  }
  if (isRunnedMt5 === false && platform === "mt5") {
    isRunnedMt5 = true;
    try {
      let allUsers = [];
      allUsers =
        await pool.query(`SELECT "account"."metaUsername","account"."createdAt","account"."password","account"."server","account"."platform", "challenge_result"."dailyDrawdown", "challenge_result"."maxDrawdown" 
        from "account" 
        LEFT JOIN "challenge_result" 
        ON "challenge_result"."metaUsername" = "account"."metaUsername"
        WHERE  "account"."createdAt" > '2024-04-15T00:00:00.000Z' 
        AND "account"."hasCredentialsProblem" = false 
        AND "challenge_result"."dailyDrawdown"->>'isPassed' = 'true'
        AND "challenge_result"."maxDrawdown"->>'isPassed' = 'true'
        AND "account"."platform" = 'mt5' order by "account"."createdAt" desc;    
        `);
      users = allUsers.rows;
    } catch (error) {
      console.log(platform, " error while getting users: ", error.message);
    }
    console.log(`starting ${platform}: ${users.length}`);
    for (const userEl of users) {
      let user = settingIp(userEl, platform);
      try {
        const terminalDataResult = await axios.get(
          `${productionConfig.socketUrl}/Manage/getTerminalData?terminalType=${user.terminal}&accountNumber=${user.metaUsername}`
        );

        if (terminalDataResult.data.message === "no terminal found") {
          console.log(platform, " no terminal: ", user.metaUsername);
          await connectUser(user);
        } else if (terminalDataResult.data.message === "connection is lost") {
          console.log(platform, " connection lost: ", user.metaUsername);
          await deleteUser(user);
        } else if (
          terminalDataResult.data.message === MT5_INVALID_CODE ||
          terminalDataResult.data.message === MT4_INVALID_CODE
        ) {
          console.log(platform, " invalid acc: ", user.metaUsername);
          await invalidUser(user);
          await deleteUser(user);
        } else if (terminalDataResult.data.message === "ok") {
          console.log(platform, " final operation: ", user.metaUsername);
          await finalOperation(user, terminalDataResult.data);
        } else {
          console.log(
            platform,
            " unknown error: ",
            user.metaUsername,
            " ",
            terminalDataResult.data.message
          );
          await deleteUser(user);
        }
      } catch (error2) {
        console.log(
          platform,
          "error message: ",
          error2.message,
          " user: ",
          user.metaUsername
        );
        // try {
        //   await deleteUser(user);
        // } catch (error4) {
        //   platform,
        //     "error message: ",
        //     error4.message,
        //     " user: ",
        //     user.metaUsername;
        // }
      }
    }

    console.log("finished... ", platform);
    isRunnedMt5 = false;
  }
  if (isRunnedMt4 === false && platform === "mt4") {
    isRunnedMt4 = true;
    try {
      let allUsers = [];
      allUsers = await pool.query(
        `SELECT "account"."metaUsername","account"."createdAt","account"."password","account"."server","account"."platform", "challenge_result"."dailyDrawdown", "challenge_result"."maxDrawdown" 
        from "account" 
        LEFT JOIN "challenge_result" 
        ON "challenge_result"."metaUsername" = "account"."metaUsername"
        WHERE  "account"."createdAt" > '2024-04-15T00:00:00.000Z' 
        AND "account"."hasCredentialsProblem" = false 
        AND "challenge_result"."dailyDrawdown"->>'isPassed' = 'true'
        AND "challenge_result"."maxDrawdown"->>'isPassed' = 'true'
        AND "account"."platform" = 'mt4' order by "account"."createdAt" desc;`
      );
      users = allUsers.rows;
    } catch (error) {
      console.log(platform, " error while getting users: ", error.message);
    }
    console.log(`starting ${platform}: ${users.length}`);
    for (const userEl of users) {
      let user = settingIp(userEl, platform);
      try {
        const terminalDataResult = await axios.get(
          `${productionConfig.socketUrl}/Manage/getTerminalData?terminalType=${user.terminal}&accountNumber=${user.metaUsername}`
        );

        if (terminalDataResult.data.message === "no terminal found") {
          console.log(platform, " no terminal: ", user.metaUsername);
          await connectUser(user);
        } else if (terminalDataResult.data.message === "connection is lost") {
          console.log(platform, " connection lost: ", user.metaUsername);
          await deleteUser(user);
        } else if (
          terminalDataResult.data.message === MT5_INVALID_CODE ||
          terminalDataResult.data.message === MT4_INVALID_CODE
        ) {
          console.log(platform, " invalid acc: ", user.metaUsername);
          await invalidUser(user);
          await deleteUser(user);
        } else if (terminalDataResult.data.message === "ok") {
          console.log(platform, " final operation: ", user.metaUsername);
          await finalOperation(user, terminalDataResult.data);
        } else {
          console.log(
            platform,
            " unknown error: ",
            user.metaUsername,
            " ",
            terminalDataResult.data.message
          );
          await deleteUser(user);
        }
      } catch (error2) {
        console.log(
          platform,
          "error message: ",
          error2.message,
          " user: ",
          user.metaUsername
        );
        // try {
        //   await deleteUser(user);
        // } catch (error3) {
        //   platform,
        //     "error message: ",
        //     error3.message,
        //     " user: ",
        //     user.metaUsername;
        // }
      }
    }

    console.log("finished... ", platform);
    isRunnedMt4 = false;
  }
}

function finalOperation(user, data) {
  if (data.message === "ok") {
    const finalData = data.data;
    if (user.terminal === 0) {
      pool
        .query(
          `UPDATE account SET "credentialsProblemDescription" = 'working', "hasCredentialsProblem" = 'false', "activeEquityMode" = 'true',"depositId" = $2 where "metaUsername" = $1`,
          [user.metaUsername, finalData.userHistory[0].ticket]
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
          [JSON.stringify(finalData.userHistory), user.metaUsername]
        )
        .catch(() =>
          console.log(`history didn't updated for: ${user.metaUsername}`)
        );

      // update open_trades table
      pool
        .query(`UPDATE open_trades SET list = $1 WHERE "metaUsername" = $2`, [
          JSON.stringify(finalData.userOpenOrders),
          user.metaUsername,
        ])
        .catch(() =>
          console.log(`open orders didn't updated for: ${user.metaUsername}`)
        );
    } else if (user.terminal === 1) {
      // update the credentials to true
      pool
        .query(
          `UPDATE account SET "credentialsProblemDescription" = 'working', "hasCredentialsProblem" = 'false', "activeEquityMode" = 'true',"depositId" = $2 where "metaUsername" = $1`,
          [user.metaUsername, finalData.userHistory[0].ticket]
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
          [JSON.stringify(finalData.userHistory), user.metaUsername]
        )
        .catch(() =>
          console.log(`history didn't updated for: ${user.metaUsername}`)
        );

      // update open_trades table
      pool
        .query(`UPDATE open_trades SET list = $1 WHERE "metaUsername" = $2`, [
          JSON.stringify(finalData.userOpenOrders),
          user.metaUsername,
        ])
        .catch(() =>
          console.log(`open orders didn't updated for: ${user.metaUsername}`)
        );

      // update deals table only for mt5
      pool
        .query(
          `INSERT INTO deals ("metaUsername", list)
        VALUES ($2, $1)
        ON CONFLICT ("metaUsername") DO UPDATE
        SET list = $1;`,
          [JSON.stringify(finalData.userDeals), user.metaUsername]
        )
        .catch(() =>
          console.log(`deals didn't updated for: ${user.metaUsername}`)
        );
    }
  }
}
