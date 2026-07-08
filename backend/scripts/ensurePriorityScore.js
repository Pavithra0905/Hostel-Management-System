const db = require('../config/db');

(async () => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'complaints' AND COLUMN_NAME = 'priorityScore'"
    );

    const cnt = rows && rows[0] ? rows[0].cnt : 0;

    if (!cnt || cnt === 0) {
      console.log('priorityScore column not found — adding column...');
      await db.query('ALTER TABLE complaints ADD COLUMN priorityScore INT DEFAULT 0');
      console.log('priorityScore column added successfully.');
    } else {
      console.log('priorityScore column already exists. Nothing to do.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error ensuring priorityScore column:', err);
    process.exit(1);
  }
})();
