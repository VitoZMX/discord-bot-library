const config = {
  apps: [
    {
      name: "ds_caretaker",
      script: "./build/src/bots/zmx_caretaker_bot/zmx_caretaker_bot_v1.js",
      watch: ["./build/src"],
      ignore_watch: ["node_modules"],
      watch_delay: 1000,
    }
  ],
};

module.exports = config;
