import db from "../utils/connect-mysql.js";

// 查詢購物車
export async function getCart(req, res) {
  const userId = req.user.id;
  const [[cart]] = await db.query(`SELECT * FROM carts WHERE user_id = ?`, [
    userId,
  ]);

  if (!cart) return res.json({ items: [], totalAmount: 0 });

  const [items] = await db.query(
    `
    SELECT ci.id AS cartItemId, ci.product_id, ci.quantity,
           p.name, p.price, p.image_url
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = ?
  `,
    [cart.id]
  );

  const totalAmount = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  res.json({ cart_id: cart.id, items, totalAmount });
}

// 新增商品到購物車 (按下加入購物車的按鈕，發送 POST 請求)
export async function addToCart(req, res) {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  // 建立購物車
  // 1. 先查詢是否有購物車，沒有就建立一個新的購物車
  // 查詢不到的狀況會變成 undefined，這時候 cart 就是 undefined
  const [[cart]] = await db.query(`SELECT * FROM carts WHERE user_id = ?`, [
    userId,
  ]);

  let cartId = cart?.id;

  // 2. 如果有購物車，就使用這個購物車的 id
  if (!cartId) {
    const [result] = await db.query(`INSERT INTO carts (user_id) VALUES (?)`, [
      userId,
    ]);
    cartId = result.insertId;
  }

  // 商品已存在就更新數量
  const [[exist]] = await db.query(
    `SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?`,
    [cartId, product_id]
  );

  if (exist) {
    await db.query(
      `UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`,
      [quantity, exist.id]
    );
  } else {
    await db.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)`,
      [cartId, product_id, quantity]
    );
  }

  res.json({ success: true });
}

// 修改購物車商品數量
export async function updateCartItem(req, res) {
  const { cartItemId } = req.params;
  const { quantity } = req.body;

  await db.query(`UPDATE cart_items SET quantity = ? WHERE id = ?`, [
    quantity,
    cartItemId,
  ]);
  res.json({ success: true, quantity });
}

// 刪除購物車中單一商品
export async function deleteCartItem(req, res) {
  const { cartItemId } = req.params;
  await db.query(`DELETE FROM cart_items WHERE id = ?`, [cartItemId]);
  res.json({ success: true });
}

// 清空購物車
export async function clearCart(req, res) {
  const userId = req.user.id;
  const [[cart]] = await db.query(`SELECT * FROM carts WHERE user_id = ?`, [
    userId,
  ]);

  if (cart) {
    await db.query(`DELETE FROM cart_items WHERE cart_id = ?`, [cart.id]);
  }
  res.json({ success: true });
}
