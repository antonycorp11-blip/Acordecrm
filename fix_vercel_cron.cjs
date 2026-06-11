const fs = require('fs');

let vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
vercelJson.crons = [
  {
    "path": "/api/cron/cleanup-videos",
    "schedule": "0 3 * * *"
  }
];
fs.writeFileSync('vercel.json', JSON.stringify(vercelJson, null, 2));

console.log("Cron added to vercel.json");
