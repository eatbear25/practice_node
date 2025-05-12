待處理: 全都要送 req.user 進來 (等 JWT 整合完)

# 查詢購物車

url: GET /api/cart

# 新增商品到購物車

url: POST http://localhost:3001/api/cart/

發送請求: JSON 格式
{
"product_id": 8,
"quantity": 1
}

# 修改購物車數量

<!-- /api/cart/1，修改 id=1 商品數量 -->
<!-- 這邊的 cartItemId 是 cart_items 資料表的 id -->

url: PUT /api/cart/:cartItemId

發送請求: JSON 格式
{
"quantity": 1
}

# 刪除單一商品

# 刪除所有商品

url: DELETE /api/cart
