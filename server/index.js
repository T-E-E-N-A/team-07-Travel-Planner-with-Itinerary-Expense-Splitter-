const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize SQLite database
const db = new sqlite3.Database('./travel_planner.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Trips table
    db.run(`CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination TEXT,
      start_date DATE,
      end_date DATE,
      cover_image TEXT,
      organizer_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )`);

    // Trip Members table
    db.run(`CREATE TABLE IF NOT EXISTS trip_members (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      permissions TEXT DEFAULT 'view',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(trip_id, user_id)
    )`);

    // Activities table
    db.run(`CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      time TIME,
      location TEXT,
      created_by TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      status TEXT DEFAULT 'suggested',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Expenses table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      paid_by TEXT NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (paid_by) REFERENCES users(id)
    )`);

    // Expense Splits table
    db.run(`CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      percentage REAL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      activity_id TEXT,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (activity_id) REFERENCES activities(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )`);

    // Votes table
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      options TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Vote Responses table
    db.run(`CREATE TABLE IF NOT EXISTS vote_responses (
      id TEXT PRIMARY KEY,
      vote_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option TEXT NOT NULL,
      voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vote_id) REFERENCES votes(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(vote_id, user_id)
    )`);

    // Settlements table
    db.run(`CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      settled_at DATETIME,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )`);
  });
}

// Real-time socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-trip', (tripId) => {
    socket.join(tripId);
    console.log(`User ${socket.id} joined trip ${tripId}`);
  });

  socket.on('leave-trip', (tripId) => {
    socket.leave(tripId);
    console.log(`User ${socket.id} left trip ${tripId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to emit to trip room
function emitToTrip(tripId, event, data) {
  io.to(tripId).emit(event, data);
}

// API Routes

// Users
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const id = uuidv4();
  
  db.run(
    'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
    [id, name, email || null],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ id, name, email });
    }
  );
});

app.get('/api/users/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(row);
  });
});

// Trips
app.post('/api/trips', (req, res) => {
  const { name, destination, start_date, end_date, cover_image, organizer_id } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO trips (id, name, destination, start_date, end_date, cover_image, organizer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, destination, start_date, end_date, cover_image || null, organizer_id],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      // Add organizer as admin member
      const memberId = uuidv4();
      db.run(
        'INSERT INTO trip_members (id, trip_id, user_id, role, permissions) VALUES (?, ?, ?, ?, ?)',
        [memberId, id, organizer_id, 'admin', 'edit'],
        (err) => {
          if (err) {
            console.error('Error adding organizer as member:', err);
          }
        }
      );
      
      res.json({ id, name, destination, start_date, end_date, cover_image, organizer_id });
    }
  );
});

app.get('/api/trips/:id', (req, res) => {
  db.get('SELECT * FROM trips WHERE id = ?', [req.params.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  });
});

app.get('/api/trips', (req, res) => {
  const userId = req.query.userId;
  if (userId) {
    db.all(
      `SELECT t.* FROM trips t
       INNER JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = ?`,
      [userId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);
      }
    );
  } else {
    db.all('SELECT * FROM trips', (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  }
});

// Trip Members
app.post('/api/trips/:tripId/members', (req, res) => {
  const { tripId } = req.params;
  const { user_id, role, permissions } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO trip_members (id, trip_id, user_id, role, permissions)
     VALUES (?, ?, ?, ?, ?)`,
    [id, tripId, user_id, role || 'member', permissions || 'view'],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      emitToTrip(tripId, 'member-added', { id, trip_id: tripId, user_id, role, permissions });
      res.json({ id, trip_id: tripId, user_id, role, permissions });
    }
  );
});

app.get('/api/trips/:tripId/members', (req, res) => {
  db.all(
    `SELECT tm.*, u.name, u.email FROM trip_members tm
     INNER JOIN users u ON tm.user_id = u.id
     WHERE tm.trip_id = ?`,
    [req.params.tripId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Activities
app.post('/api/trips/:tripId/activities', (req, res) => {
  const { tripId } = req.params;
  const { title, description, date, time, location, created_by, position } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO activities (id, trip_id, title, description, date, time, location, created_by, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tripId, title, description, date, time || null, location || null, created_by, position || 0],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      const activity = { id, trip_id: tripId, title, description, date, time, location, created_by, position: position || 0, status: 'suggested' };
      emitToTrip(tripId, 'activity-added', activity);
      res.json(activity);
    }
  );
});

app.get('/api/trips/:tripId/activities', (req, res) => {
  db.all(
    'SELECT * FROM activities WHERE trip_id = ? ORDER BY date, time, position',
    [req.params.tripId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

app.put('/api/activities/:id', (req, res) => {
  const { title, description, date, time, location, position, status } = req.body;
  
  db.get('SELECT trip_id FROM activities WHERE id = ?', [req.params.id], (err, activity) => {
    if (err || !activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    db.run(
      `UPDATE activities SET title = ?, description = ?, date = ?, time = ?, location = ?, position = ?, status = ?
       WHERE id = ?`,
      [title, description, date, time, location, position, status, req.params.id],
      function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        emitToTrip(activity.trip_id, 'activity-updated', { id: req.params.id, title, description, date, time, location, position, status });
        res.json({ id: req.params.id, title, description, date, time, location, position, status });
      }
    );
  });
});

app.delete('/api/activities/:id', (req, res) => {
  db.get('SELECT trip_id FROM activities WHERE id = ?', [req.params.id], (err, activity) => {
    if (err || !activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    db.run('DELETE FROM activities WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      emitToTrip(activity.trip_id, 'activity-deleted', { id: req.params.id });
      res.json({ success: true });
    });
  });
});

// Expenses
app.post('/api/trips/:tripId/expenses', (req, res) => {
  const { tripId } = req.params;
  const { description, amount, currency, paid_by, date, splits } = req.body;
  const expenseId = uuidv4();
  
  db.run(
    `INSERT INTO expenses (id, trip_id, description, amount, currency, paid_by, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [expenseId, tripId, description, amount, currency || 'USD', paid_by, date],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      // Insert expense splits
      const splitPromises = splits.map(split => {
        return new Promise((resolve, reject) => {
          const splitId = uuidv4();
          db.run(
            'INSERT INTO expense_splits (id, expense_id, user_id, amount, percentage) VALUES (?, ?, ?, ?, ?)',
            [splitId, expenseId, split.user_id, split.amount, split.percentage || null],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      });
      
      Promise.all(splitPromises).then(() => {
        emitToTrip(tripId, 'expense-added', { id: expenseId, description, amount, currency, paid_by, date, splits });
        res.json({ id: expenseId, description, amount, currency, paid_by, date, splits });
      }).catch(err => {
        res.status(400).json({ error: err.message });
      });
    }
  );
});

app.get('/api/trips/:tripId/expenses', (req, res) => {
  db.all(
    `SELECT e.*, u.name as paid_by_name FROM expenses e
     INNER JOIN users u ON e.paid_by = u.id
     WHERE e.trip_id = ? ORDER BY e.date DESC`,
    [req.params.tripId],
    (err, expenses) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get splits for each expense
      const expenseIds = expenses.map(e => e.id);
      if (expenseIds.length === 0) {
        return res.json([]);
      }
      
      const placeholders = expenseIds.map(() => '?').join(',');
      db.all(
        `SELECT es.*, u.name as user_name FROM expense_splits es
         INNER JOIN users u ON es.user_id = u.id
         WHERE es.expense_id IN (${placeholders})`,
        expenseIds,
        (err, splits) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const splitsByExpense = {};
          splits.forEach(split => {
            if (!splitsByExpense[split.expense_id]) {
              splitsByExpense[split.expense_id] = [];
            }
            splitsByExpense[split.expense_id].push(split);
          });
          
          const expensesWithSplits = expenses.map(expense => ({
            ...expense,
            splits: splitsByExpense[expense.id] || []
          }));
          
          res.json(expensesWithSplits);
        }
      );
    }
  );
});

// User balances
app.get('/api/trips/:tripId/balances', (req, res) => {
  const { tripId } = req.params;
  
  db.all(
    `SELECT e.*, es.user_id, es.amount as split_amount FROM expenses e
     INNER JOIN expense_splits es ON e.id = es.expense_id
     WHERE e.trip_id = ?`,
    [tripId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const balances = {};
      
      rows.forEach(row => {
        const paidBy = row.paid_by;
        const splitBy = row.user_id;
        const amount = parseFloat(row.split_amount);
        
        if (!balances[paidBy]) balances[paidBy] = { paid: 0, owed: 0, net: 0 };
        if (!balances[splitBy]) balances[splitBy] = { paid: 0, owed: 0, net: 0 };
        
        balances[paidBy].paid += amount;
        balances[paidBy].net += amount;
        balances[splitBy].owed += amount;
        balances[splitBy].net -= amount;
      });
      
      // Get user names
      const userIds = Object.keys(balances);
      if (userIds.length === 0) {
        return res.json({});
      }
      
      const placeholders = userIds.map(() => '?').join(',');
      db.all(
        `SELECT id, name FROM users WHERE id IN (${placeholders})`,
        userIds,
        (err, users) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const userMap = {};
          users.forEach(u => userMap[u.id] = u.name);
          
          const result = {};
          Object.keys(balances).forEach(userId => {
            result[userId] = {
              ...balances[userId],
              name: userMap[userId] || 'Unknown',
              paid: parseFloat(balances[userId].paid.toFixed(2)),
              owed: parseFloat(balances[userId].owed.toFixed(2)),
              net: parseFloat(balances[userId].net.toFixed(2))
            };
          });
          
          res.json(result);
        }
      );
    }
  );
});

// Votes
app.post('/api/trips/:tripId/votes', (req, res) => {
  const { tripId } = req.params;
  const { title, description, options, created_by } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO votes (id, trip_id, title, description, options, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, tripId, title, description, JSON.stringify(options), created_by],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      emitToTrip(tripId, 'vote-created', { id, trip_id: tripId, title, description, options, created_by });
      res.json({ id, trip_id: tripId, title, description, options, created_by });
    }
  );
});

app.get('/api/trips/:tripId/votes', (req, res) => {
  db.all(
    `SELECT v.*, u.name as created_by_name FROM votes v
     INNER JOIN users u ON v.created_by = u.id
     WHERE v.trip_id = ? ORDER BY v.created_at DESC`,
    [req.params.tripId],
    (err, votes) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const votesWithResponses = votes.map(vote => {
        vote.options = JSON.parse(vote.options);
        return vote;
      });
      
      // Get vote responses
      const voteIds = votesWithResponses.map(v => v.id);
      if (voteIds.length === 0) {
        return res.json([]);
      }
      
      const placeholders = voteIds.map(() => '?').join(',');
      db.all(
        `SELECT vr.*, u.name as user_name FROM vote_responses vr
         INNER JOIN users u ON vr.user_id = u.id
         WHERE vr.vote_id IN (${placeholders})`,
        voteIds,
        (err, responses) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          const responsesByVote = {};
          responses.forEach(response => {
            if (!responsesByVote[response.vote_id]) {
              responsesByVote[response.vote_id] = [];
            }
            responsesByVote[response.vote_id].push(response);
          });
          
          const votesWithData = votesWithResponses.map(vote => ({
            ...vote,
            responses: responsesByVote[vote.id] || []
          }));
          
          res.json(votesWithData);
        }
      );
    }
  );
});

app.post('/api/votes/:voteId/responses', (req, res) => {
  const { voteId } = req.params;
  const { user_id, option } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT OR REPLACE INTO vote_responses (id, vote_id, user_id, option)
     VALUES (?, ?, ?, ?)`,
    [id, voteId, user_id, option],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      db.get('SELECT trip_id FROM votes WHERE id = ?', [voteId], (err, vote) => {
        if (!err && vote) {
          emitToTrip(vote.trip_id, 'vote-response', { vote_id: voteId, user_id, option });
        }
      });
      
      res.json({ id, vote_id: voteId, user_id, option });
    }
  );
});

// Currency conversion
app.get('/api/currency/convert', async (req, res) => {
  const { amount, from, to } = req.query;
  
  try {
    // Using a free API (you can replace with OpenExchangeRates API key)
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const rate = response.data.rates[to];
    const converted = parseFloat(amount) * rate;
    
    res.json({ 
      original: parseFloat(amount),
      from,
      to,
      rate,
      converted: parseFloat(converted.toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ error: 'Currency conversion failed' });
  }
});

// Documents
app.post('/api/trips/:tripId/documents', (req, res) => {
  const { tripId } = req.params;
  const { name, file_path, file_type, activity_id, uploaded_by } = req.body;
  const id = uuidv4();
  
  db.run(
    `INSERT INTO documents (id, trip_id, activity_id, name, file_path, file_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tripId, activity_id || null, name, file_path, file_type || null, uploaded_by],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      emitToTrip(tripId, 'document-added', { id, trip_id: tripId, name, file_path, file_type, activity_id, uploaded_by });
      res.json({ id, trip_id: tripId, name, file_path, file_type, activity_id, uploaded_by });
    }
  );
});

app.get('/api/trips/:tripId/documents', (req, res) => {
  const { activityId } = req.query;
  let query = 'SELECT * FROM documents WHERE trip_id = ?';
  const params = [req.params.tripId];
  
  if (activityId) {
    query += ' AND activity_id = ?';
    params.push(activityId);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

