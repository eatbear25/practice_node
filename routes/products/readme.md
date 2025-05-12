# 商城路由 - products（只有讀取功能）

## 所有商品

- 取得所有商品
  url: GET http://localhost:3001/products/api

- 轉換頁碼
  url: GET http://localhost:3001/products/api?page={頁數}

- 後端回應
  {
  "perPage": 5,
  "page": 1,
  "totalRows": 30,
  "totalPages": 6,
  "rows": [所有商品物件]
  }

## 單項商品

- 取得單項商品
  url: GET http://localhost:3001/products/api/{商品編號}

- 後端回應(成功)
  {
  "success": true,
  "error": "",
  "data": {
  "id": 1,
  "name": "",
  "description": "",
  "price": "",
  "category": "",
  "stock": 0,
  "image_url": "",
  "created_at": ""
  }
  }
