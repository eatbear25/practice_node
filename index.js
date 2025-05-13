import express from "express";
import { z } from "zod";
import multer from "multer";
import session from "express-session";
import moment from "moment-timezone";
import mysql_session from "express-mysql-session";
import cors from "cors";
import bcrypt from "bcrypt";
import upload from "./utils/upload-imgs.js";
import db from "./utils/connect-mysql.js";
import admin2Router from "./routes/admin2.js";
import abRouter from "./routes/address-book.js";
import jwt from "jsonwebtoken";

import productsRouter from "./routes/products/index.js";
import cartRouter from "./routes/cart/index.js";
import orderRouter from "./routes/orders/index.js";
import ecpayRouter from "./routes/ecpay-test-only/index.js";
import linePayRouter from "./routes/line-pay-test-only/index.js";

const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);

const app = express();

app.set("view engine", "ejs");

// *** 設定靜態內容資料夾
app.use(express.static("public"));

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // console.log({ origin });
      cb(null, true); // 讓所有的網站都允許
    },
  })
);

// Top-level middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 路由定義, 兩個條件: 1. 拜訪的 HTTP 方法, 2. 路徑
app.get("/", (req, res) => {
  res.render("home");
});

// *** 路由定義處
app.use("/admins", admin2Router);
app.use("/address-book", abRouter);

// ##### 商城 #####
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);

// ##### ECPay #####
app.use("/api/ecpay-test-only", ecpayRouter);

// ##### Line Pay #####
app.use("/api/line-pay-test-only", linePayRouter);

// 測試用 pay
app.get("/pay", (req, res) => {
  const { orderId } = req.query;
  res.send(`
    <html>
      <body>
        <h2>訂單編號：${orderId}</h2>
        <p>正在轉跳付款平台...</p>
        <script>
          setTimeout(() => {
            window.location.href = "http://localhost:3001/api/ecpay-test-only?amount=300"
          }, 2000); // 兩秒後轉跳
        </script>
      </body>
    </html>
  `);
});

// 自訂路由, 都放在 404 設定之前
// ************ 404 頁面 ************
app.use((req, res) => {
  res.status(404).send(`<h1>您走錯路了</h1>`);
});

const port = process.env.WEB_PORT || 3002;

app.listen(port, () => {
  console.log(`Express Server 啟動: ${port}`);
});
