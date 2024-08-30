import express, { json } from "express";
import cors from "cors";
import pkg from "pg";
import cron from "node-cron";
import { productionConfig } from "./config/config.js";
import { finalRunner } from "./final-runner.js";
import { mainMt4 } from "./simple-runner.js";
import axios from "axios";

const { Pool } = pkg;

export const pool = new Pool(productionConfig.db);

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "300mb" }));

app.use(express.json({ limit: "300mb" }));

app.use((req, res, next) => {
  if (pool.totalCount > 50) {
    console.log("number of connections are:", pool.totalCount);
  }
  next();
});

app.get("/", async (req, res, next) => {
  try {
    res.json("everything works fine");
  } catch (error) {
    errorWrapper(req, error, next);
  }
});

app.post("/quote", async (req, res, next) => {
  try {
    const { time, bid, ask, symbol } = req.body;
    console.log("data recieved", {
      time: req.body.time,
      bid: req.body.bid,
      ask: req.body.ask,
      symbol: req.body.symbol,
    });
    pool
      .query(
        `INSERT INTO forex_data (timestamp, bid, ask, symbol) VALUES ($1, $2, $3, $4);`,
        [time, bid, ask, symbol]
      )
      // .then(() => console.log("saved"))
      .catch((err) => console.log("not saved", err.message));
    res.json("everything works fine");
  } catch (error) {
    errorWrapper(req, error, next);
  }
});

app.post("/update-mt4-trades", async (req, res, next) => {
  try {
    const { metaUsername, password, server } = req.body;

    const result = await axios.post(
      `${productionConfig.socketUrl}/Manage/trades`,
      {
        metaUsername: metaUsername,
        password: password,
        server: server,
      }
    );
    const { historyForTicks, userHistory, userOpenOrders } = result.data;

    pool
      .query(
        `UPDATE account SET "credentialsProblemDescription" = 'working', "hasCredentialsProblem" = 'false', "activeEquityMode" = 'true',"depositId" = $2 where "metaUsername" = $1`,
        [metaUsername, userHistory[0].ticket]
      )
      .catch(() =>
        console.log(
          `credentials didn't updated in true manner for ${metaUsername}`
        )
      );

    // update history_trades table
    pool
      .query(`UPDATE history_trades SET list = $1 WHERE "metaUsername" = $2`, [
        JSON.stringify(userHistory),
        metaUsername,
      ])
      .catch(() => console.log(`history didn't updated for: ${metaUsername}`));

    // update open_trades table
    pool
      .query(`UPDATE open_trades SET list = $1 WHERE "metaUsername" = $2`, [
        JSON.stringify(userOpenOrders),
        metaUsername,
      ])
      .catch(() =>
        console.log(`open orders didn't updated for: ${metaUsername}`)
      );

    res.json("everything works fine");
  } catch (error) {
    errorWrapper(req, error, next);
  }
});

app.post("/update-mt5-trades", async (req, res, next) => {
  try {
    const { metaUsername, password, server } = req.body;

    const result = await axios.post(
      `${productionConfig.socketUrl}/Manage/trades-mt5`,
      {
        metaUsername: metaUsername,
        password: password,
        server: server,
      }
    );

    console.log("Resss: ", result.data);

    const { userDeals, userHistory, userOpenOrders } = result.data;
    // update the credentials to true
    pool
      .query(
        `UPDATE account SET "credentialsProblemDescription" = 'working', "hasCredentialsProblem" = 'false', "activeEquityMode" = 'true',"depositId" = $2 where "metaUsername" = $1`,
        [metaUsername, userHistory[0].ticket]
      )
      .catch(() =>
        console.log(
          `credentials didn't updated in true manner for ${metaUsername}`
        )
      );

    // update history_trades table
    pool
      .query(`UPDATE history_trades SET list = $1 WHERE "metaUsername" = $2`, [
        JSON.stringify(userHistory),
        metaUsername,
      ])
      .catch(() => console.log(`history didn't updated for: ${metaUsername}`));

    // update open_trades table
    pool
      .query(`UPDATE open_trades SET list = $1 WHERE "metaUsername" = $2`, [
        JSON.stringify(userOpenOrders),
        metaUsername,
      ])
      .catch(() =>
        console.log(`open orders didn't updated for: ${metaUsername}`)
      );

    // update deals table only for mt5
    pool
      .query(
        `INSERT INTO deals ("metaUsername", list)
    VALUES ($2, $1)
    ON CONFLICT ("metaUsername") DO UPDATE
    SET list = $1;`,
        [JSON.stringify(userDeals), metaUsername]
      )
      .catch(() => console.log(`deals didn't updated for: ${metaUsername}`));

    res.json(`${metaUsername} trades updated`);
  } catch (error) {
    errorWrapper(req, error, next);
  }
});

app.use((req, res) => {
  if (req.error) {
    res.status(500).json({ message: "fail better" });
  }
});

pool
  .connect()
  .then(() => {
    app.listen(3000, "0.0.0.0", () => {
      console.log("connected to postgre db");
      cron.schedule("*/10 * * * * *", () => {
        if (productionConfig.type === "socket") {
          if (productionConfig.runnerPlatform === "mt5") {
            finalRunner("mt5", false, false);
          } else if (productionConfig.runnerPlatform === "mt4") {
            finalRunner("mt4", false, false);
          }
        } else {
          finalRunner("mt5", false, false);
          // mainMt4();
        }
      });
      cron.schedule("*/15 * * * *", () => {
        if (productionConfig.type === "socket") {
          if (productionConfig.runnerPlatform === "mt5") {
            finalRunner("mt5", true, false);
          } else if (productionConfig.runnerPlatform === "mt4") {
            finalRunner("mt4", false, true);
          }
        } else {
          finalRunner("mt5", true, false);
          // mainMt4("reset");
        }
      });
    });
  })
  .catch((err) => {
    pool
      .end()
      .then(() => {
        console.log("connection closed or ended with postgres");
      })
      .catch((err2) => {
        console.log("we got error in end process: ", err2.message);
      });

    console.log("err db connection is: ", err);
  });

function errorWrapper(req, err, next) {
  console.log("error is ", err.message);
  req.error = true;
  req.errorMessage = err.message;
  next();
}
