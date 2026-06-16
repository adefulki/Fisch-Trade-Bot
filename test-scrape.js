const https = require("https");
console.log("Starting...");
const req = https.get("https://www.game.guide/fisch-value-list", { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Page length:", data.length);
    const lower = data.toLowerCase();
    console.log("seastrum:", (lower.match(/seastrum/g) || []).length);
    console.log("malevolence:", (lower.match(/malevolence/g) || []).length);
    console.log("evangeline:", (lower.match(/evangeline/g) || []).length);
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.setTimeout(10000, () => { console.log("TIMEOUT"); req.destroy(); });
