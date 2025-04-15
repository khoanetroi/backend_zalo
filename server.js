const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sa123456',
  database: 'za-ticketing-db'
});

db.connect(err => {
  if (err) {
    console.error('Lỗi kết nối database:', err);
    return;
  }
  console.log('Đã kết nối database MySQL');
});


// api để get thông tin từ bảng events
app.get('/api/events', (req, res) => {
  db.query('SELECT * FROM events ORDER BY event_date ASC', (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      res.status(500).json({ error: 'Lỗi server' });
    } else {
      res.json(results);
    }
  });
});


app.listen(port, () => {
  console.log(`API server đang chạy tại http://localhost:${port}`);
});


// api để lấy thông tin khi nhấp vào event ở trang chủ
app.get('/api/events/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  db.query('SELECT * FROM events WHERE event_id = ?', [eventId], (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      res.status(500).json({ error: 'Lỗi server' });
    } else {
      if (results.length === 0) {
        res.status(404).json({ error: 'Không tìm thấy sự kiện' });
      } else {
        res.json(results[0]); // Trả về object sự kiện, không phải mảng
      }
    }
  });
});


// api lấy giá vé
app.get('/api/tickets', (req, res) => {
  const eventId = req.query.eventId; // Lấy eventId từ query param
  if (!eventId) {
      return res.status(400).json({ error: 'eventId là bắt buộc.' });
  }
  db.query('SELECT ticket_id, price_vnd, ticket_type FROM tickets WHERE event_id = ?', [eventId], (err, results) => {
      if (err) {
          console.error("DB Error:", err);
          return res.status(500).json({ error: 'Lỗi truy vấn cơ sở dữ liệu.' });
      }
      if (results.length === 0) {
          return res.status(200).json({ message: 'Không tìm thấy vé cho sự kiện này.', data: [] }); // trả về luôn [] chứ không phải null
      }
      res.status(200).json({ data: results });
  });
});


// json api event ở đây: http://localhost:3001/api/events