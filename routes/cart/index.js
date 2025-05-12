import express from "express";

import {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  clearCart,
} from "../../controllers/cartController.js";

const router = express.Router();

// middleware 模擬取得登入的 user_id
router.use((req, res, next) => {
  req.user = { id: 1 }; // 假裝 user_id = 1，日後可接 JWT
  next();
});

router.get("/", getCart);

// INSERT INTO `cart_items`(`cart_id`, `product_id`, `quantity`) VALUES (1,8,1)
router.post("/", addToCart);

router.put("/:cartItemId", updateCartItem);

router.delete("/:cartItemId", deleteCartItem);

router.delete("/", clearCart);

export default router;
