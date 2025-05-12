# 查詢使用者"所有"訂單

method: GET
url: http://localhost:3001/api/orders/user/${user_id}

# 查詢使用者"單筆訂單詳情"

method: GET
url: http://localhost:3001/api/orders/${order_id}

# 建立訂單

method: POST
url: http//localhost:3001/api/orders

# 前端請求範例：

{
"user_id": 1,
"recipient_name": "王小明",
"recipient_phone": "0912345678",
"shipping_address": "台北市信義區 XX 路 1 號",
"payment_method": "credit_card",
"total": 3097,
"discount": 100,
"items": [
{
"product_id": 5,
"quantity": 2,
"price": 999
},
{
"product_id": 7,
"quantity": 1,
"price": 1099
}
]
}

#　成功回應範例：
{
"success": true,
"message": "訂單建立成功",
"order_id": 101
}

---
