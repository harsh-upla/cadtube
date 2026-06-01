module.exports = {
  apps: [
    {
      name: "cadtube",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max", // Utilizes all CPU cores
      exec_mode: "cluster", // Enables zero-downtime reloads
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
  ],
};