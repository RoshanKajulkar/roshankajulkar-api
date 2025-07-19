require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const DEVTO_API_KEY = process.env.DEVTO_API_KEY;

const client = new MongoClient(MONGO_URI);
const dbName = "portfolio";

app.use(cors());

async function getIPDetails(ip) {
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);
    return res.data;
  } catch (err) {
    return { error: "Failed to fetch IP details" };
  }
}

app.get("/", (req, res) => {
  res.send("api.roshakjulkar.in API is running!");
});

app.get("/api/log", async (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const details = await getIPDetails(ip);

  const {
    city = "Unknown",
    region = "Unknown",
    region_code = "Unknown",
    country = "Unknown",
    country_name = "Unknown",
    country_code = "Unknown",
  } = details;

  const logData = {
    city,
    region,
    region_code,
    country,
    country_name,
    country_code,
    createdAt: new Date(),
  };

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("logs");
    await collection.insertOne(logData);

    res.json({ message: "Logged", location: logData });
  } catch (err) {
    console.error("MongoDB Error:", err);
    res.status(500).json({ error: "Failed to log data" });
  } finally {
    await client.close();
  }
});

app.get("/api/log/stats", async (req, res) => {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("logs");

    const totalPageViews = await collection.countDocuments();
    const last24HoursPageViews = await collection.countDocuments({
      createdAt: { $gte: yesterday },
    });

    res.json({
      totalPageViews,
      last24HoursPageViews,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Error fetching stats" });
  } finally {
    await client.close();
  }
});

app.get("/api/devto/stats", async (req, res) => {
  try {
    const response = await axios.get(
      "https://dev.to/api/articles/me/published",
      {
        headers: {
          "api-key": DEVTO_API_KEY,
        },
      }
    );

    res.json({ data: response.data });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Dev.to data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
