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


// API lấy danh sách vé theo eventId
app.get('/api/tickets', (req, res) => {
  const { eventId } = req.query;
  if (!eventId) {
    return res.status(400).json({ error: '400' });
  }

  db.query('SELECT ticket_id, event_id, price_vnd, quantity FROM tickets WHERE event_id = ?', [eventId], (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn tickets:', err);
      return res.status(500).json({ error: 'Lỗi server khi truy vấn tickets' });
    }
    res.json(results);
  });
});




// json api event ở đây: http://localhost:3001/api/events