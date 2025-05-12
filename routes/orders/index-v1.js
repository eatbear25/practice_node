import express from "express";
import db from "../../utils/connect-mysql.js";

const router = express.Router();

// middleware 模擬取得登入的 user_id
router.use((req, res, next) => {
  req.user = { id: 1 }; // 假裝 user_id = 1，日後可接 JWT
  next();
});

// 查詢使用者所有訂單 API
router.get("/user/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const [orders] = await db.query(`SELECT * FROM orders WHERE user_id = ?`, [
      userId,
    ]);
    res.json({ orders });
  } catch (error) {
    console.error("查詢使用者訂單失敗：", error);
    res.status(500).json({ message: "查詢失敗" });
  }
});

// 查詢單筆訂單詳情 API
router.get("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    // 查詢訂單資料
    const [order] = await db.query(`SELECT * FROM orders WHERE id = ?`, [
      orderId,
    ]);

    if (order.length === 0) {
      return res.status(404).json({ message: "訂單不存在" });
    }

    // 查詢訂單商品資料
    const [items] = await db.query(
      `SELECT oi.product_id, p.name, oi.unit_price, oi.quantity, (oi.unit_price * oi.quantity) AS subtotal
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ order: order[0], items });
  } catch (error) {
    console.error("查詢訂單失敗：", error);
    res.status(500).json({ message: "查詢失敗" });
  }
});

// 建立訂單 API
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      cart_id,
      recipient_name,
      recipient_phone,
      shipping_address,
      payment_method,
    } = req.body;

    // 驗證輸入資料
    if (!user_id || !cart_id || !recipient_name || !recipient_phone) {
      return res.status(400).json({ message: "缺少必要的訂單資訊" });
    }

    // 查詢購物車商品資料
    const [cartItems] = await db.query(
      `SELECT ci.product_id, p.name, p.price, ci.quantity 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.cart_id = ?`,
      [cart_id]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "購物車為空或不存在" });
    }

    // 計算總金額
    const total = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    // 建立訂單(orders)
    const [orderResult] = await db.query(
      `INSERT INTO orders (user_id, recipient_name, recipient_phone, total, payment_method, payment_status, shipping_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        recipient_name,
        recipient_phone,
        total,
        payment_method,
        "pending",
        shipping_address,
      ]
    );
    const orderId = orderResult.insertId;

    // 準備訂單商品資料
    const orderItems = cartItems.map((item) => [
      orderId,
      item.product_id,
      parseFloat(item.price),
      item.quantity,
    ]);

    // 批量插入訂單商品
    await db.query(
      `INSERT INTO order_items (order_id, product_id, unit_price, quantity) VALUES ?`,
      [orderItems]
    );

    // 清空購物車
    await db.query(`DELETE FROM cart_items WHERE cart_id = ?`, [cart_id]);

    // 生成付款連結
    const paymentUrl = `http://localhost:3001/pay?orderId=${orderId}`;

    // 回傳訂單ID與付款連結
    res.json({ message: "訂單建立成功", orderId, paymentUrl });
  } catch (error) {
    console.error("建立訂單失敗：", error);
    res.status(500).json({ message: "訂單建立失敗" });
  }
});

export default router;
