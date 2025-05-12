import express from "express";

const router = express.Router();

router.get("/:p1?/:p2?", (req, res) => {
  const { url, baseUrl, originalUrl } = req;
  res.json({
    params: req.params,
    url,
    baseUrl,
    originalUrl,
  });
});

export default router;
