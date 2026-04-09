import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'receipt');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 업로드된 파일을 브라우저에서 읽을 수 있게 열어줌
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  //파일명: receiptId_현재시간확장자
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const receiptId = req.body.receiptId || 'receipt';
    cb(null, `${receiptId}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '파일이 없습니다.' });
  }

  const imagePath = `/uploads/receipt/${req.file.filename}`;
  res.json({ imagePath });
});

app.listen(3001, () => {
  console.log('파일 업로드 서버 실행 중: http://localhost:3001');
});
