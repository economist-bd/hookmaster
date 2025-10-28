// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BKASH_BASE = process.env.BKASH_BASE || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;
const USERNAME = process.env.BKASH_USERNAME;
const PASSWORD = process.env.BKASH_PASSWORD;

// helper: token grant
async function grantToken() {
  const response = await fetch(`${BKASH_BASE}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      username: USERNAME,
      password: PASSWORD,
    }),
  });
  return response.json();
}

// create payment
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, invoice } = req.body;
    const tokenData = await grantToken();

    if (!tokenData.id_token) {
      return res.status(500).json({ error: "Token grant failed", tokenData });
    }

    const createRes = await fetch(`${BKASH_BASE}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.id_token}`,
        "X-APP-Key": APP_KEY,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: "ECONOMISTBD",
        callbackURL: "https://economist-bd.github.io/hookmaster/pay.html",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoice || `INV-${Date.now()}`,
      }),
    });

    const createData = await createRes.json();
    res.json(createData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// execute payment
app.post("/execute-payment", async (req, res) => {
  try {
    const { paymentID } = req.body;
    const tokenData = await grantToken();

    const execRes = await fetch(`${BKASH_BASE}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.id_token}`,
        "X-APP-Key": APP_KEY,
      },
      body: JSON.stringify({ paymentID }),
    });

    const execData = await execRes.json();
    res.json(execData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
