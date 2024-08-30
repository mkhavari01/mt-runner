// const finalTestConfig = {
//   type : "socket",
//   db: {
//     host: "gina.iran.liara.ir",
//     port: 30130,
//     user: "root",
//     password: "ZX1QfjpPYm2aT5twDJ8pJ0M3",
//     database: "final_test",
//   },
//   BatchSizeMt4: 1,
//   BatchSizeMt5: 1,
//   mt4Urls: ["https://final-test-mt-manager.liara.run"],
//   mt5Urls: ["https://final-test-mt-manager.liara.run"],
//   socketUrlMt5 : "https://final-test-mt-manager.liara.run",
//   socketUrlMt4 : "https://final-test-mt-manager.liara.run",
//   socketUrl : "https://final-test-mt-manager.liara.run",
// };

const sgbProdConfig = {
  type: "socket",
  db: {
    host: "fitz-roy.liara.cloud",
    port: 32789,
    user: "root",
    password: "OhUzZBoJfJpzcQcjzYIjjoDq",
    database: "sgb_prod",
  },
  BatchSizeMt4: 10,
  BatchSizeMt5: 1,
  mt4Urls: ["https://sgb-manager.liara.run"],
  mt5Urls: ["https://sgb-manager.liara.run"],
  socketUrlMt5: "https://sgb-manager.liara.run",
  socketUrlMt4: "https://sgb-manager.liara.run",
  socketUrl: "https://sgb-manager.liara.run",
  runnerPlatform: "mt5",
};

const tpfProdConfig = {
  type: "runner",
  db: {
    host: "fitz-roy.liara.cloud",
    port: 32789,
    user: "root",
    password: "OhUzZBoJfJpzcQcjzYIjjoDq",
    database: "tpf_prod",
  },
  BatchSizeMt4: 7,
  BatchSizeMt5: 1,
  mt4Urls: ["https://tpf-manager2.liara.run"],
  mt5Urls: ["https://tpf-manager2.liara.run"],
  socketUrlMt5: "https://tpf-manager2.liara.run",
  socketUrlMt4: "https://tpf-manager2.liara.run",
  socketUrl: "https://tpf-manager2.liara.run",
  runnerPlatform: "mt5",
};

const fxTechProdConfig = {
  type: "socket",
  db: {
    host: "217.197.97.110",
    port: 5432,
    user: "root",
    password: "o43ubf93v49bWEBD)i20ie03biQ@#@N0ip*@#grb9uwbr93ub9G(Wbge98iuh",
    database: "metatechs_dev_db",
  },
  BatchSizeMt4: 10,
  BatchSizeMt5: 1,
  mt4Urls: ["https://fxtech-manager.liara.run"],
  mt5Urls: ["https://fxtech-manager.liara.run"],
  socketUrlMt5: "https://fxtech-manager.liara.run",
  socketUrlMt4: "https://fxtech-manager.liara.run",
  socketUrl: "https://fxtech-manager.liara.run",
  runnerPlatform: "mt3",
};

const dockerConfig = {
  type: "socket",
  db: {
    host: "gina.iran.liara.ir",
    port: 30130,
    user: "root",
    password: "ZX1QfjpPYm2aT5twDJ8pJ0M3",
    database: "sgb_prod",
  },
  BatchSizeMt4: 10,
  BatchSizeMt5: 1,
  mt4Urls: ["http://82.115.16.78:5001"],
  mt5Urls: ["http://82.115.16.78:5001"],
  socketUrlMt5: "http://82.115.16.78:5001",
  socketUrlMt4: "http://82.115.16.78:5001",
  socketUrl: "http://82.115.16.78:5001",
  runnerPlatform: "mt5",
};

const developConfig = {
  type: "runner",
  db: {
    host: "fitz-roy.liara.cloud",
    port: 32789,
    user: "root",
    password: "OhUzZBoJfJpzcQcjzYIjjoDq",
    database: "tpf_prod",
  },
  BatchSizeMt4: 7,
  BatchSizeMt5: 1,
  mt4Urls: ["http://localhost:5001"],
  mt5Urls: ["http://localhost:5001"],
  socketUrlMt5: "http://localhost:5001",
  socketUrlMt4: "http://localhost:5001",
  socketUrl: "http://localhost:5001",
  runnerPlatform: "mt5",
};

export const productionConfig = developConfig;