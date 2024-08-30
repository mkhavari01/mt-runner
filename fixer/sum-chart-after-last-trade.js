import { productionConfig } from "../config/config.js";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool(productionConfig.db);

const checkedAccounts = []
// 271392,271431,271326,268194,271211,270954,272898,272885
async function main() {
  const allUsers = await pool.query(`SELECT sc."metaUsername", sc.list, sc."createdAt", a."hasCredentialsProblem"
  FROM public."sum-chart" sc
  JOIN account a ON sc."metaUsername" = a."metaUsername"
  WHERE a."createdAt" > '2024-04-15T00:00:00.000Z';`);

  const allHistories = await pool.query(`SELECT "metaUsername",list,"createdAt"
  FROM public."history_trades"
  WHERE "metaUsername" IN (
      SELECT "metaUsername"
      FROM account
      WHERE "createdAt" > '2024-04-15T00:00:00.000Z'
  )`);
  const allOpenTrades = await pool.query(`SELECT "metaUsername",list,"createdAt"
  FROM public."open_trades"
  WHERE "metaUsername" IN (
      SELECT "metaUsername"
      FROM account
      WHERE "createdAt" > '2024-04-15T00:00:00.000Z'
  )`);

  const allObjectives = await pool.query(`SELECT *
  FROM public."challenge_result"
  WHERE "metaUsername" IN (
      SELECT "metaUsername"
      FROM account
      WHERE "createdAt" > '2024-04-15T00:00:00.000Z'
  )`);

  // const allRequ

  console.log("starting operation");

  const start = new Date().getTime();

  const users = allUsers.rows;
  let histories = allHistories.rows;
  let openes = allOpenTrades.rows;
  let objectives = allObjectives.rows;

  users.forEach((user) => {
    histories.forEach((history) => {
      if (history.metaUsername === user.metaUsername) {
        user.history = history.list;
      }
    });
  });

  users.forEach((user) => {
    openes.forEach((open) => {
      if (open.metaUsername === user.metaUsername) {
        user.openTrades = open.list;
      }
    });
  });

  users.forEach((user) => {
    objectives.forEach((objective) => {
      if (objective.metaUsername === user.metaUsername) {
        user.dailyDraw = objective.dailyDrawdown.isPassed;
        user.maxDraw = objective.maxDrawdown.isPassed;
      }
    });
  });

  const end = new Date().getTime();

  const executionTime = end - start;
  console.log("it took " + executionTime / 1000 + " seconds (the operation)");

  const fuckedUpAcc = [];
  const possibleAcc = [];
  users.forEach((user, index) => {
    let lastDate,
      lastHistory,
      lastOpen = null;

    if (user?.list?.length) {
      lastDate = user.list[user.list.length - 1].date;
    }

    if (user?.history?.length) {
      lastHistory = user.history[user.history.length - 1].closeTime;
    }

    if (user?.openTrades?.length) {
      lastOpen = user.openTrades[user.openTrades.length - 1].closeTime;
    }

    const metaUsername = user.metaUsername;

    if (new Date(lastHistory) > new Date(lastDate)) {
      if(!user.maxDraw || !user.dailyDraw){
        // console.log(metaUsername + " has daily draw")
      }else{
        fuckedUpAcc.push(metaUsername);
      }
    } else {
      if (lastOpen) {
        if (new Date(lastOpen) > new Date(lastDate)) {
          possibleAcc.push(metaUsername)
        }
      }
    }

    // console.log({
    //   metaUsername,
    //   lastOpen,
    //   lastHistory,
    //   lastDate,
    // });
  });

  // console.log(users[0])
  fuckedUpAcc.forEach((el) =>{
    if(!checkedAccounts.includes(Number(el))){
      console.log("definetly wrong " + "https://sgb-prod.liara.run/user/" + el)
    }
  }
  );
  possibleAcc.forEach((el) =>
    console.log("u should check: "+"https://sgb-prod.liara.run/user/"+el)
  );
  console.log(fuckedUpAcc.length + " is totally fucked users");
  console.log(possibleAcc.length + " is total might fucked users");
}

main();
