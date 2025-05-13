import express from "express";
import db from "../../utils/connect-mysql.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

function generateOrderNumber() {
  const now = new Date();
  const timestamp = `${now.getFullYear().toString().slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const randomPart = uuidv4().slice(0, 6);

  return `NF-${timestamp}${randomPart.toUpperCase()}`;
}

// middleware 模擬取得登入的 user_id
router.use((req, res, next) => {
  req.user = { id: 1 }; // 假裝 user_id = 1，日後可接 JWT
  next();
});

// 查詢使用者所有訂單 API
router.get("/user/:user_id", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);

    const [orders] = await db.query(`SELECT * FROM orders WHERE user_id = ?`, [
      userId,
    ]);
    res.json({ orders });
  } catch (error) {
    console.error("查詢使用者訂單失敗：", error.message);
    res.status(500).json({ message: "查詢失敗" });
  }
});

// 查詢單筆訂單詳情 API
router.get("/:order_id", async (req, res) => {
  try {
    const orderId = req.params.order_id;
    console.log(orderId);

    const [order] = await db.query(`SELECT * FROM orders WHERE id = ?`, [
      orderId,
    ]);

    if (order.length === 0) {
      return res.status(404).json({ message: "訂單不存在" });
    }

    const [items] = await db.query(
      `SELECT oi.product_id, p.name, oi.unit_price, oi.quantity, oi.subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ order: order[0], items });
  } catch (error) {
    console.error("查詢訂單失敗：", error.message);
    res.status(500).json({ message: "查詢失敗" });
  }
});

// 建立訂單 API
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      recipient_name,
      recipient_phone,
      shipping_address,
      payment_method,
      discount,
      total,
      items,
    } = req.body;

    // 驗證資料完整性
    if (!user_id || !recipient_name || !recipient_phone || !items) {
      return res.status(400).json({ message: "缺少必要的訂單資訊" });
    }

    if (isNaN(total)) {
      console.log("價格格式錯誤", { total });
      return res.status(400).json({ message: "價格格式錯誤" });
    }

    // 生成訂單號碼
    const order_number = generateOrderNumber();

    // ! 目前折扣金額寫死成0，之後修正
    // 建立訂單 (orders)
    const [orderResult] = await db.query(
      `INSERT INTO orders (user_id, order_number, recipient_name, recipient_phone, total, discount, payment_method, payment_status, shipping_status, shipping_address)
       VALUES (?, ?, ?, ?, ?, 0, ?, 'pending', '待出貨', ?)`,
      [
        user_id,
        order_number,
        recipient_name,
        recipient_phone,
        parseInt(total), // 轉為整數格式
        // parseInt(discount), // 轉為整數格式
        payment_method,
        shipping_address,
      ]
    );
    const orderId = orderResult.insertId;

    // 準備訂單商品資料
    const orderItems = items.map((item) => [
      orderId,
      item.product_id,
      parseInt(item.price), // 轉為整數格式
      item.quantity,
      parseInt(item.price) * item.quantity, // subtotal
    ]);

    // 插入訂單商品
    await db.query(
      `INSERT INTO order_items (order_id, product_id, unit_price, quantity, subtotal) VALUES ?`,
      [orderItems]
    );

    // 生成付款連結
    const paymentUrl =
      payment_method === "ecpay"
        ? `http://localhost:3001/api/ecpay-test-only?amount=${total}`
        : "https://www.youtube.com/?gl=TW&hl=zh-TW&hl=zh-TW";

    res.json({
      success: true,
      message: "訂單建立成功",
      order_number,
      paymentUrl,
    });
  } catch (error) {
    console.error("建立訂單失敗：", error.message);
    res.status(500).json({ message: `訂單建立失敗: ${error.message}` });
  }
});

export default router;
