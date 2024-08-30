import { productionConfig } from "../config/config.js";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool(productionConfig.db);

async function main() {
  const allUsers = await pool.query(`SELECT "metaUsername",list,"createdAt"
  FROM public."daily-equities"
  WHERE "metaUsername" IN (
      SELECT "metaUsername"
      FROM account
      WHERE "createdAt" > '2024-04-15T00:00:00.000Z'
  )`);
  const users = allUsers.rows;

  const fuckedUpAcc = [];
  users.forEach((user) => {
    const list = user.list;
    const metaUsername = user.metaUsername;

    const dayList = []

    list.forEach((item) => {
      const day = item.maxBalanceDate.split("T")[0]
      if(dayList.includes(day)){
        // console.log("problem ",metaUsername)
        if(!fuckedUpAcc.includes(metaUsername)){
          fuckedUpAcc.push(metaUsername)
        }
      }else{
        dayList.push(day)
      }
    });
  });

  console.log(fuckedUpAcc.length + " is total users");

  // console.log(users[0])
  fuckedUpAcc.forEach((el) => console.log(el + ","));
}

main();
