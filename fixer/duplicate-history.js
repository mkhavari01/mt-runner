import { productionConfig } from "../config/config.js";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool(productionConfig.db);

const exceptionAccounts = [
  // 52050189, 52050602, 52050620, 268234, 52051887, 52048024, 52052202, 52045766,
  // 52049362, 52050856, 52043266,52048189,52017797,52051235
];

async function main() {
  const allUsers = await pool.query(`SELECT "metaUsername",list,"createdAt"
  FROM public."daily-equities"
  WHERE "metaUsername" IN (
      SELECT "metaUsername"
      FROM account
      WHERE "createdAt" > '2024-04-15T00:00:00.000Z'
  )`);
  const users = allUsers.rows;

  // console.log(users[0]);
  const fuckedUpAcc = [];
  users.forEach((user) => {
    const list = user.list;
    const metaUsername = user.metaUsername;

    list.forEach((item) => {
      if (item.minBalance * 2 < item.maxBalance) {
        if (!fuckedUpAcc.includes(metaUsername) && !exceptionAccounts.includes(Number(metaUsername))) {
          if (item.maxBalance == item.maxEquity) {
            console.log(
              "definetly wrong ",
              "https://sgb-prod.liara.run/user/" +
                metaUsername +
                " " +
                new Date(user.createdAt).toLocaleDateString()
            );
          } else {
            console.log(
              "u should check ",
              "https://sgb-prod.liara.run/user/" +
                metaUsername +
                " " +
                new Date(user.createdAt).toLocaleDateString()
            );
          }
          fuckedUpAcc.push(metaUsername);
        }
      }
    });
  });

  console.log(fuckedUpAcc.length + " is total users");

  fuckedUpAcc.forEach((el) => console.log(el + ","));
}

main();
