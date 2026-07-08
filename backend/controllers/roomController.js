/**
 * ROOM CONTROLLER
 * Manages room CRUD operations (for Admin/Warden)
 */

const db = require('../config/db');

/**
 * Create a new room
 */
const createRoom = async (req, res) => {
  try {
    const { roomNumber, type, roomCategory, capacity, facilities, floor, hostelBlock } = req.body;

    // Validate required fields
    if (!roomNumber || !type || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Room number, type, and capacity are required'
      });
    }

    // Validate room type
    if (!['Single', 'Double'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Room type must be Single or Double'
      });
    }

    if (roomCategory && !['Regular', 'PhD'].includes(roomCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Room category must be Regular or PhD'
      });
    }

    // Check if room number already exists
    const [existing] = await db.query(
      'SELECT roomID FROM rooms WHERE roomNumber = ?',
      [roomNumber]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Room number already exists'
      });
    }

    // Insert room
    const [result] = await db.query(
      'INSERT INTO rooms (roomNumber, type, roomCategory, capacity, facilities, floor, hostelBlock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [roomNumber, type, roomCategory || 'Regular', capacity, facilities || null, floor || null, hostelBlock || null, 'Available']
    );

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        roomID: result.insertId,
        roomNumber,
        type,
        roomCategory: roomCategory || 'Regular',
        capacity
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create room',
      error: error.message
    });
  }
};

/**
 * Update room details
 */
const updateRoom = async (req, res) => {
  try {
    const { roomID } = req.params;
    const { roomNumber, type, roomCategory, capacity, facilities, status, floor, hostelBlock } = req.body;

    // Check if room exists
    const [rooms] = await db.query(
      'SELECT roomID FROM rooms WHERE roomID = ?',
      [roomID]
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (roomCategory && !['Regular', 'PhD'].includes(roomCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Room category must be Regular or PhD'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (roomNumber) {
      updates.push('roomNumber = ?');
      values.push(roomNumber);
    }
    if (type) {
      updates.push('type = ?');
      values.push(type);
    }
    if (roomCategory) {
      updates.push('roomCategory = ?');
      values.push(roomCategory);
    }
    if (capacity !== undefined) {
      updates.push('capacity = ?');
      values.push(capacity);
    }
    if (facilities !== undefined) {
      updates.push('facilities = ?');
      values.push(facilities);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (floor !== undefined) {
      updates.push('floor = ?');
      values.push(floor);
    }
    if (hostelBlock) {
      updates.push('hostelBlock = ?');
      values.push(hostelBlock);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(roomID);

    await db.query(
      `UPDATE rooms SET ${updates.join(', ')} WHERE roomID = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Room updated successfully'
    });

  } catch (error) {
    console.error('Update room error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to update room',
      error: error.message
    });
  }
};

/**
 * Delete room
 */
const deleteRoom = async (req, res) => {
  try {
    const { roomID } = req.params;

    // Check if room has active allocations
    const [allocations] = await db.query(
      'SELECT allocationID FROM room_allocations WHERE roomID = ? AND status = ?',
      [roomID, 'Active']
    );

    if (allocations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with active allocations'
      });
    }

    // Delete room
    const [result] = await db.query(
      'DELETE FROM rooms WHERE roomID = ?',
      [roomID]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error('Delete room error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete room',
      error: error.message
    });
  }
};

/**
 * Get room details by ID
 */
const getRoomById = async (req, res) => {
  try {
    const { roomID } = req.params;

    const [rooms] = await db.query(
      'SELECT * FROM rooms WHERE roomID = ?',
      [roomID]
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: rooms[0]
    });

  } catch (error) {
    console.error('Get room error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room',
      error: error.message
    });
  }
};

module.exports = {
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomById
};
