import express from "express";
import { z } from "zod";
import moment from "moment-timezone";
import upload from "../utils/upload-imgs.js";
import db from "../utils/connect-mysql.js";

const dateFm = "YYYY-MM-DD";
const abItemSchema = z.object({
  name: z
    .string({ message: "姓名欄為必填欄位" })
    .min(3, { message: "至少三個字" }),
  email: z
    .string({ message: "電子郵件欄為必填欄位" })
    .email({ message: "請填寫正確的 Email 格式" }),
  birthday: z
    .string()
    .date({ message: "請填寫正確的日期格式" })
    .optional()
    .or(z.literal("")),
});

const router = express.Router();

const getListData = async (req) => {
  const perPage = 25;
  const output = {
    perPage,
    page: 0,
    totalRows: 0,
    totalPages: 0,
    rows: [],
    redirect: "",
    likes: []
  };

  let page = req.query.page;
  let keyword = req.query.keyword;
  if (page === undefined) {
    page = 1;
  } else {
    page = +page || 0;
  }
  if (page < 1) {
    output.redirect = `?page=1`;
    return output;
  }
  let where = ` WHERE 1 `;
  if (keyword) {
    keyword = keyword.trim(); // 去掉頭尾空白字元
    const keyword_ = db.escape(`%${keyword}%`); // 做 SQL 特殊字元跳脫
    where += ` AND (name LIKE ${keyword_} OR mobile LIKE ${keyword_}) `;
  }

  const t_sql = `SELECT COUNT(1) AS totalRows FROM address_book ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);

  let rows = [];
  let totalPages = 0; // 宣告總頁數變數
  if (totalRows > 0) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`;
      return output;
    }

    const sql = `SELECT * FROM address_book ${where} ORDER BY ab_id DESC LIMIT ${
      (page - 1) * perPage
    }, ${perPage}`;

    [rows] = await db.query(sql);
    rows.forEach((r) => {
      const m = moment(r.birthday);
      if (m.isValid()) {
        r.birthday = m.format(dateFm);
      } else {
        r.birthday = "";
      }
    });
  }
  output["totalRows"] = totalRows;
  output["totalPages"] = totalPages;
  output["rows"] = rows;
  output["page"] = page;
  output.query = req.query;

  // 如果有登入用戶
  if(req.session.admin){
    const sql = "SELECT ab_id FROM ab_likes WHERE member_id=?";
    const [rows] = await db.query(sql, [req.session.admin.id]);
    output.likes = rows;
  }

  return output;
};

// 取得單筆資料的函式
const getItemData = async (req) => {
  const output = {
    success: false,
    error: "",
    data: {},
  };
  let ab_id = +req.params.ab_id; // 轉換成數值
  if (!ab_id) {
    output.error = "錯誤的編號";
    return res.json(output);
  }
  const sql = `SELECT * FROM address_book WHERE ab_id=${ab_id}`;
  const [rows] = await db.query(sql);
  if (rows.length) {
    output.success = true;

    const m = moment(rows[0].birthday);
    if (m.isValid()) {
      rows[0].birthday = m.format(dateFm);
    } else {
      rows[0].birthday = "";
    }

    output.data = rows[0];
  } else {
    output.error = "沒有該筆資料";
  }
  return output;
};

// 此 router 檔的 top-level middleware
router.use((req, res, next) => {
  return next(); // *********** 取消後面的動作

  // 情境 2: 使用白名單路由
  const whiteList = ["/", "/api"];
  let url = req.url.split("?")[0];
  if (req.session.admin) {
    return next();
  } else {
    if (whiteList.includes(url)) {
      return next();
    } else {
      // 告訴 login 頁, 是從哪裡轉到登入頁的
      return res.redirect(`/login?bt=${req.originalUrl}`);
    }
  }

  /*
  // 情境 1: 有登入才可以使用 address-book 所有功能
  if (!req.session.admin) {
    return res.redirect("/login");
  }
  next();
  */
});

// ************* HTML 頁面 ***************************
router.get("/", async (req, res) => {
  const output = await getListData(req);
  if (output.redirect) {
    return res.redirect(output.redirect);
  }

  res.locals.title = "通訊錄列表 - " + res.locals.title;
  res.locals.pageName = "ab-list";

  if (req.session.admin) {
    res.render("address-book/list", output);
  } else {
    res.render("address-book/list-no-admin", output);
  }
});
// *** 新增資料的表單頁面
router.get("/add", async (req, res) => {
  res.locals.title = "新增通訊錄 - " + res.locals.title;
  res.locals.pageName = "ab-add";
  res.render("address-book/add");
});
// *** 編輯資料的表單頁面
router.get("/edit/:ab_id", async (req, res) => {
  res.locals.title = "編輯通訊錄 - " + res.locals.title;
  const output = await getItemData(req);
  if (!output.success) {
    return res.redirect("/address-book"); // 跳轉到列表頁
  }
  res.render("address-book/edit", output.data);
});

// ************* API ***************************
router.get("/api", async (req, res) => {
  const output = await getListData(req);
  res.json(output);
});
router.post("/api", upload.none(), async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: {},
  };
  let { name, email, mobile, birthday, address } = req.body;
  // 表單資料的驗證
  const zodResult = abItemSchema.safeParse({ name, email, birthday });
  if (!zodResult.success) {
    // 沒有通過 zod 的驗證
    output.error = zodResult.error;
    return res.json(output);
  }
  const b = moment(birthday);
  birthday = b.isValid() ? b.format(dateFm) : null;

  try {
    const sql = `INSERT INTO address_book SET ?`;
    const [result] = await db.query(sql, [
      { name, email, mobile, birthday, address },
    ]);

    output.result = result;
    output.success = !!result.affectedRows;
  } catch (ex) {
    output.ex = ex;
  }

  res.json(output);
});

router.delete("/api/:ab_id", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    error: "",
  };
  let ab_id = +req.params.ab_id; // 轉換成數值
  if (!ab_id) {
    output.error = "錯誤的編號";
    return res.json(output);
  }
  const sql = `DELETE FROM address_book WHERE ab_id=${ab_id}`;
  const [result] = await db.query(sql);
  output.success = !!result.affectedRows;
  if (!output.success) {
    output.error = "沒有這筆資料";
  }
  res.json(output);
});
// 取得單項資料
router.get("/api/:ab_id", async (req, res) => {
  const output = await getItemData(req);
  res.json(output);
});
router.put("/api/:ab_id", upload.none(), async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: {},
  };
  const item = await getItemData(req); // 先查看有沒有要修改的該筆資料
  if (!item.success) {
    return res.json(item); // 沒有該筆資料
  }

  let { name, email, mobile, birthday, address } = req.body;
  // 表單資料的驗證
  const zodResult = abItemSchema.safeParse({ name, email, birthday });
  if (!zodResult.success) {
    // 沒有通過 zod 的驗證
    output.error = zodResult.error;
    return res.json(output);
  }
  const b = moment(birthday);
  birthday = b.isValid() ? b.format(dateFm) : null;

  try {
    const sql = `UPDATE address_book SET ? WHERE ab_id=?`;
    const [result] = await db.query(sql, [
      { name, email, mobile, birthday, address },
      req.params.ab_id,
    ]);

    output.result = result;
    output.success = !!result.affectedRows;
    // output.success = !!result.changedRows;
  } catch (ex) {
    output.ex = ex;
  }

  res.json(output);
});

// 人事時地物
// *** 加入或移除喜愛的項目 (需要的資料: 會員, 對象[商品])
router.post("/toggle-like/:ab_id", async (req, res) => {
  const output = {
    success: false,
    action: "", // add, remove
    ab_id: 0, // 操作的項目是哪一個
    error: "",
  };
  if (!req.session.admin) {
    // 用戶必須是已經登入的狀態
    output.error = "請先登入會員";
    return res.json(output);
  }
  // 確認有沒有這個項目
  const item = await getItemData(req);
  if (!item.success) {
    output.error = "沒有這個編號的朋友";
    return res.json(output);
  }
  output.ab_id = req.params.ab_id;
  // 判斷是否已加入過
  const sql = "SELECT like_id FROM ab_likes WHERE member_id=? AND ab_id=? ";
  const [rows] = await db.query(sql, [req.session.admin.id, req.params.ab_id]);
  let result = {};
  if (rows.length) {
    // 有資料, 做刪除
    output.action = "remove";
    const remove_sql = "DELETE FROM ab_likes WHERE like_id=?";
    [result] = await db.query(remove_sql, rows[0].like_id);
  } else {
    // 沒資料, 做加入
    output.action = "add";
    const add_sql = "INSERT INTO ab_likes (member_id, ab_id) VALUES (?, ?)";
    [result] = await db.query(add_sql, [
      req.session.admin.id,
      req.params.ab_id,
    ]);
  }
  output.success = !! result.affectedRows;
  res.json(output);
});
export default router;
