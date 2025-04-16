const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

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
        res.json(results[0]);
      }
    }
  });
});


// api lấy danh sách vé theo eventId
app.get('/api/tickets', (req, res) => {
  const { eventId } = req.query;
  if (!eventId) {
    return res.status(400).json({ error: '400' });
  }

  db.query('SELECT ticket_id, event_id, price_vnd, quantity FROM tickets WHERE event_id = ?', [eventId], (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn', err);
      return res.status(500).json({ error: 'Lỗi server' });
    }
    res.json(results);
  });
});


// api tạo booking mới (không cần user)
app.post("/api/bookings", (req, res) => {

  const { ticket_id, quantity, booking_date } = req.body;
  if (!ticket_id || !quantity || !booking_date) {
    return res.status(400).json({ error: "Thiếu thông tin đặt vé" });
  }
  const booking_id = `booking_${Date.now()}`;

  // Chèn vào bảng bookings
  db.query(
    "INSERT INTO bookings (booking_id, ticket_id, booking_date, quantity) VALUES (?, ?, ?, ?)",
    [booking_id, ticket_id, booking_date, quantity],
    (err) => {
      if (err) {
        console.error("Lỗi khi thêm booking:", err);
        return res.status(500).json({ error: "Lỗi khi đặt vé" });
      }
      return res.status(200).json({ message: "Đặt vé thành công" });
    }
  );
});

// API lấy tất cả vé đã đặt
app.get("/api/bookings", (req, res) => {
  db.query(
    `SELECT b.booking_id, b.quantity, b.booking_date, e.event_name, e.event_date, e.event_location
     FROM bookings b
     JOIN tickets t ON b.ticket_id = t.ticket_id
     JOIN events e ON t.event_id = e.event_id
     ORDER BY b.booking_date DESC`,
    (err, results) => {
      if (err) {
        console.error("Lỗi khi lấy danh sách vé:", err);
        return res.status(500).json({ error: "Lỗi server" });
      }
      return res.json(results);
    }
  );
});








// json api event: http://localhost:3001/api/events