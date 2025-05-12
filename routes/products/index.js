import express from "express";
import db from "../../utils/connect-mysql.js";

const router = express.Router();

// 取得全部商品資料
const getProductsData = async (req) => {
  const perPage = 5;
  const output = {
    perPage,
    page: 0,
    totalRows: 0,
    totalPages: 0,
    rows: [],
    redirect: "",
  };

  let page = req.query.page;

  if (page === undefined) {
    page = 1;
  } else {
    page = +page || 0;
  }
  if (page < 1) {
    output.redirect = `?page=1`;
    return output;
  }

  // TODO: 搜尋 / 篩選商品

  const t_sql = `SELECT COUNT(1) AS totalRows FROM products`;
  const [[{ totalRows }]] = await db.query(t_sql);

  let rows = [];
  let totalPages = 0; // 宣告總頁數變數

  if (totalRows > 0) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`;
      return output;
    }

    const sql = `SELECT * FROM products ORDER BY id LIMIT ${
      (page - 1) * perPage
    }, ${perPage}`;

    [rows] = await db.query(sql);
  }

  output["totalRows"] = totalRows;
  output["totalPages"] = totalPages;
  output["rows"] = rows;
  output["page"] = page;
  output.query = req.query;

  return output;
};

// 取得單項商品資料
const getProductData = async (req) => {
  const output = {
    success: false,
    error: "",
    data: {},
  };

  let productId = +req.params.productId; // 轉換成數值

  if (!productId) {
    output.error = "查無該項商品編號";
    return output;
  }

  const sql = `SELECT * FROM products WHERE id=${productId}`;

  const [rows] = await db.query(sql);

  if (rows.length) {
    output.success = true;

    output.data = rows[0];
  } else {
    output.error = "沒有該項商品資料";
  }
  return output;
};

// *** API
// 取得所有商品
router.get("/", async (req, res) => {
  const output = await getProductsData(req);
  res.json(output);
});

// 取得單項商品
router.get("/:productId", async (req, res) => {
  const output = await getProductData(req);
  res.json(output);
});

export default router;
