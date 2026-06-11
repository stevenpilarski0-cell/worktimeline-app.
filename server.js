// server.js

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// ✅ ROUTES
app.post("/api/sync", require("./api/sync"));
app.post("/api/witness-invite", require("./api/witness-invite"));

// ✅ FRONTEND
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log("✅ Server running on http://localhost:3000");
});
