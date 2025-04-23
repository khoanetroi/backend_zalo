const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // import UUID

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


// api để get thông tin từ bảng events - cho ra event nào sắp diễn ra
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


// api lấy danh sách hot event
app.get('/api/hot-events', (req, res) => {
  db.query('SELECT * FROM events ORDER BY hot_level desc', (err, results) => {
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


// api để get thông tin khi nhấp vào event ở trang chủ
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
  const eventId = req.query.eventId;

  if (!eventId) {
    return res.status(400).json({ error: "Thiếu eventId" });
  }

  const sql = `
    SELECT 
      t.*, 
      (t.quantity - IFNULL(SUM(b.quantity), 0)) AS remaining_quantity
    FROM tickets t
    LEFT JOIN bookings b ON t.ticket_id = b.ticket_id
    WHERE t.event_id = ?
    GROUP BY t.ticket_id
  `;

  db.query(sql, [eventId], (err, results) => {
    if (err) {
      console.error("Lỗi khi lấy vé:", err);
      return res.status(500).json({ error: "Lỗi máy chủ" });
    }

    res.json(results);
  });
});



// api tạo booking mới
app.post("/api/bookings", (req, res) => {
  const { ticket_id, quantity, booking_date } = req.body;
  if (!ticket_id || !quantity || !booking_date) {
    return res.status(400).json({ error: "Thiếu thông tin đặt vé" });
  }

  const booking_id = `booking_${Date.now()}`;
  const status = 'confirmed'; 

  db.query(
    "INSERT INTO bookings (booking_id, ticket_id, booking_date, quantity, status) VALUES (?, ?, ?, ?, ?)",
    [booking_id, ticket_id, booking_date, quantity, status],
    (err) => {
      if (err) {
        console.error("Lỗi khi thêm booking:", err);
        return res.status(500).json({ error: "Lỗi khi đặt vé" });
      }
      return res.status(200).json({ message: "Đặt vé thành công" });
    }
  );
});


// api lấy tất cả vé đã đặt
app.get("/api/bookings", (req, res) => {
  const sql = `
    SELECT 
      b.booking_id, 
      b.quantity, 
      b.booking_date, 
      b.status,
      e.event_name, 
      e.event_date, 
      e.event_location
    FROM bookings b
    JOIN tickets t ON b.ticket_id = t.ticket_id
    JOIN events e ON t.event_id = e.event_id
    ORDER BY b.booking_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("[API /api/bookings] Lỗi truy vấn:", err.message);
      return res.status(500).json({ error: "Không thể lấy danh sách vé" });
    }

    res.status(200).json(results);
  });
});



// api hủy vé
app.post('/api/bookings/:bookingId/cancel', (req, res) => {
  const bookingId = req.params.bookingId;

  db.query(
    "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?",
    [bookingId],
    (err, result) => {
      if (err) {
        console.error("Lỗi khi hủy vé:", err);
        return res.status(500).json({ error: "Lỗi server" });
      }
      return res.json({ message: "Hủy vé thành công" });
    }
  );
});


// Cập nhật trạng thái hủy vé
app.put("/api/bookings/cancel/:bookingId", (req, res) => {
  const { bookingId } = req.params;
  db.query(
    "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?",
    [bookingId],
    (err) => {
      if (err) {
        console.error("Lỗi khi hủy vé:", err);
        return res.status(500).json({ error: "Lỗi server" });
      }
      res.json({ message: "Đã hủy vé thành công" });
    }
  );
});



// api tạo sự kiện mới
app.post("/api/events", (req, res) => {
  const {
    event_name,
    event_date,
    event_time,
    event_location,
    event_description,
    banner_url,
    hot_level,
    tickets
  } = req.body;

  if (!event_name || !event_date || !event_time || !event_location || !event_description || !banner_url || !tickets?.length) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  // Tạo event_id tự động bằng UUID
  const event_id = uuidv4();

  const insertEventQuery = `
    INSERT INTO events (event_id, event_name, event_date, event_time, event_location, event_description, banner_url, hot_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(insertEventQuery, [
    event_id,
    event_name,
    event_date,
    event_time,
    event_location,
    event_description,
    banner_url,
    hot_level
  ], (err, result) => {
    if (err) {
      console.error("Lỗi khi thêm sự kiện:", err);
      return res.status(500).json({ error: "Không thể tạo sự kiện" });
    }

    // Chèn vé vào bảng tickets, tự động tạo ticket_id bằng UUID
    const insertTicketsQuery = `
      INSERT INTO tickets (ticket_id, event_id, ticket_type, price_vnd, quantity)
      VALUES ?
    `;

    const ticketValues = tickets.map(ticket => [
      uuidv4(),  // Tạo ticket_id tự động bằng UUID
      event_id,  // Liên kết với event_id mới tạo
      ticket.ticket_type,
      ticket.price_vnd,
      ticket.quantity
    ]);

    db.query(insertTicketsQuery, [ticketValues], (ticketErr) => {
      if (ticketErr) {
        console.error("Lỗi khi thêm vé:", ticketErr);
        return res.status(500).json({ error: "Không thể tạo vé cho sự kiện" });
      }

      res.json({ message: "Tạo sự kiện và vé thành công!" });
    });
  });
});








// json api event: http://localhost:3001/api/events - muon tim api nao thi doi duoi