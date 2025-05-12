import multer from "multer";
import { v4 } from "uuid";

const extMap = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const fileFilter = (req, file, callback) => {
  // 第一個參數 null, 沒有要丟錯誤
  callback(null, !!extMap[file.mimetype]);
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "public/img");
  },
  filename: (req, file, callback) => {
    const f = v4(); // 主檔案名
    const ext = extMap[file.mimetype]; // 副檔名
    callback(null, f + ext);
  },
});

export default multer({ fileFilter, storage });
