import { productionConfig } from "../config/config.js";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool(productionConfig.db);

async function main() {
  const allUsers = await pool.query(`SELECT "metaUsername",list,"createdAt"
  FROM public."sum-chart"
  WHERE "metaUsername" IN (
      SELECT "metaUsername"
      FROM account
      WHERE "createdAt" > '2024-04-15T00:00:00.000Z'
  )`);
  const users = allUsers.rows;
  console.log("total users are: ",users.length)
  const fuckedUpAcc = [];
  users.forEach((user,index) => {
    const list = user.list;
    const metaUsername = user.metaUsername;

    const dateList = [];

    list.forEach((item) => {
      const date = item.date;
      if (dateList.includes(date)) {
        console.log("date is duplicated: ",date)
        console.log("item is duplicated: ",item)
        if (!fuckedUpAcc.includes(metaUsername)) {
          fuckedUpAcc.push(metaUsername);
        }
      } else {
        dateList.push(date);
      }
      // console.log(index+" finished")
    });
  });

  // console.log(users[0])
  fuckedUpAcc.forEach((el) =>
    console.log("https://sgb-prod.liara.run/user/" + el)
  );
  console.log(fuckedUpAcc.length + " is total users");
}

main();
