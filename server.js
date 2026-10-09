require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Product = require("./models/Product");

const app = express();

// Đọc dữ liệu JSON được gửi lên API.
app.use(express.json());

// Lấy đúng bốn trường của Product.
// Khi thêm hoặc sửa, phải gửi đủ bốn trường.
function getProductData(body) {
  const fields = ["pid", "pname", "price", "quantity"];

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    fields.some((field) => body[field] === undefined)
  ) {
    const error = new Error(
      "Phải cung cấp đủ pid, pname, price, quantity"
    );
    error.status = 400;
    throw error;
  }

  return {
    pid: body.pid,
    pname: body.pname,
    price: body.price,
    quantity: body.quantity
  };
}

// Kiểm tra API đang hoạt động.
app.get("/", (req, res) => {
  res.json({ message: "Product API đang chạy" });
});

// Kiểm tra API và kết nối MongoDB.
app.get("/health", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      status: "unhealthy",
      service: "product-api",
      database: "disconnected"
    });
  }

  try {
    await mongoose.connection.db.admin().ping();

    res.status(200).json({
      status: "healthy",
      service: "product-api",
      database: "connected"
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      service: "product-api",
      database: "unavailable"
    });
  }
});

// CREATE: thêm sản phẩm.
app.post("/api/products", async (req, res) => {
  const product = await Product.create(getProductData(req.body));
  res.status(201).json(product);
});

// READ: lấy danh sách sản phẩm.
app.get("/api/products", async (req, res) => {
  const products = await Product.find().sort({ pid: 1 });
  res.json(products);
});

// READ: tìm sản phẩm theo pid.
app.get("/api/products/:pid", async (req, res) => {
  const product = await Product.findOne({ pid: req.params.pid });

  if (!product) {
    return res.status(404).json({
      message: "Không tìm thấy sản phẩm"
    });
  }

  res.json(product);
});

// UPDATE: cập nhật sản phẩm theo pid.
app.put("/api/products/:pid", async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { pid: req.params.pid },
    { $set: getProductData(req.body) },
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      message: "Không tìm thấy sản phẩm"
    });
  }

  res.json(product);
});

// DELETE: xóa sản phẩm theo pid.
app.delete("/api/products/:pid", async (req, res) => {
  const product = await Product.findOneAndDelete({
    pid: req.params.pid
  });

  if (!product) {
    return res.status(404).json({
      message: "Không tìm thấy sản phẩm"
    });
  }

  res.json({ message: "Đã xóa sản phẩm" });
});

// Đường dẫn không tồn tại.
app.use((req, res) => {
  res.status(404).json({ message: "Đường dẫn không tồn tại" });
});

// Xử lý lỗi của API.
app.use((error, req, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "pid đã tồn tại" });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({ message: error.message });
  }

  if (error.status === 400) {
    return res.status(400).json({
      message:
        error.type === "entity.parse.failed"
          ? "Body JSON không hợp lệ"
          : error.message
    });
  }

  console.error(error);
  res.status(500).json({ message: "Lỗi máy chủ" });
});

// Kết nối database rồi mới khởi động API.
async function start() {
  const { HOST, PORT, MONGODB_URI } = process.env;
  const port = Number(PORT);

  if (
    !HOST ||
    !MONGODB_URI ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Kiểm tra HOST, PORT, MONGODB_URI trong .env");
  }

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });

  // Chờ tạo chỉ mục chống trùng pid.
  await Product.init();

  console.log("Kết nối MongoDB thành công");

  app.listen(port, HOST, () => {
    console.log(`API đang chạy tại http://${HOST}:${port}`);
  }).on("error", (error) => {
    console.error("Không thể mở API:", error.message);
    process.exit(1);
  });
}

start().catch((error) => {
  console.error("Khởi động thất bại:", error.message);
  process.exit(1);
});