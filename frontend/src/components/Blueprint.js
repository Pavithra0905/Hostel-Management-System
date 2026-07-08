import React from 'react';

// Blueprint render: simple SVG-based floor plan
// Props:
// - rooms: array of room objects (roomID, roomNumber, type, occupancy, capacity, hostelBlock, floor, status, facilities)
// - selectedRoom: currently selected room object
// - onRoomClick: fn(room) called when room clicked
// - currentAllocation: user's current allocation (to highlight user's room)

const Blueprint = ({ rooms = [], selectedRoom, onRoomClick, currentAllocation, roomsPerFloor = 10 }) => {
  // Layout settings
  const roomWidth = 120;
  const roomHeight = 90;
  const gap = 12;
  const roomsPerRow = Math.max(roomsPerFloor, Math.ceil(rooms.length / 2), 7);
  const svgWidth = (roomWidth + gap) * roomsPerRow + gap;
  const svgHeight = 620;

  const getFill = (room) => {
    const isAllocated = currentAllocation && currentAllocation.roomID === room.roomID;
    const occupancy = Number(room.occupancy) || 0;
    const capacity = Number(room.capacity) || 0;
    const isDoubleWithOneOccupant = room.type === 'Double' && occupancy === 1 && capacity === 2;
    const isAvailable = room.status === 'Available' && occupancy < capacity;
    if (isAllocated) return '#4f83ff'; // blue for your allocation
    if (isDoubleWithOneOccupant) return '#f7b267';
    return isAvailable ? '#9fe6a6' : '#f6a6a6'; // green available, red booked/occupied
  };

  const getStroke = (room, isSelected) => {
    if (isSelected) return '#222';
    if (room.roomCategory === 'PhD') return '#0ea5a3';
    return '#666';
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    const block = String(room.hostelBlock || '').toUpperCase();
    if (!acc[block]) acc[block] = [];
    acc[block].push(room);
    return acc;
  }, {});

  const layoutOrder = ['A', 'B'];
  const positions = layoutOrder.flatMap((block, blockIndex) => {
    const blockRooms = (groupedRooms[block] || []).slice().sort((left, right) => String(left.roomNumber).localeCompare(String(right.roomNumber)));
    const y = blockIndex === 0 ? gap + 30 : svgHeight - roomHeight - gap - 30;
    return blockRooms.map((room, idx) => ({
      room,
      x: gap + idx * (roomWidth + gap),
      y,
    }));
  });

  return (
    <div className="blueprint-wrap">
      <div className="blueprint-legend">
        <div><span className="legend-swatch legend-available"></span> Available</div>
        <div><span className="legend-swatch legend-booked"></span> Booked</div>
        <div><span className="legend-swatch legend-double-single"></span> Double room, 1 occupied</div>
        <div><span className="legend-swatch legend-phd"></span> PhD Room</div>
        <div><span className="legend-swatch legend-me"></span> Your Allocation</div>
      </div>

      <svg className="blueprint-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
        {/* Outer walls */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#f3f8ff" stroke="#1f5fa8" strokeWidth="2" rx="6" />

        {/* Central common corridor */}
        <rect x={gap * 2} y={(svgHeight / 2) - 72} width={svgWidth - gap * 4} height="144" fill="#edf3f8" stroke="#b9c7d6" strokeDasharray="8 5" rx="10" />
        <text x={svgWidth / 2} y={(svgHeight / 2) - 22} textAnchor="middle" fontSize="18" fill="#2f3b45">Main Corridor</text>
        <text x={svgWidth / 2} y={(svgHeight / 2) + 8} textAnchor="middle" fontSize="16" fill="#2f3b45">Living Area / Dining / Common Space</text>

        {/* Wing labels */}
        <text x={gap + 6} y={gap + 18} textAnchor="start" fontSize="13" fill="#51606e">Block A Wing</text>
        <text x={gap + 6} y={svgHeight - 12} textAnchor="start" fontSize="13" fill="#51606e">Block B Wing</text>

        {/* Bathrooms / Showers on right side */}
        <rect x={svgWidth - 160} y={(svgHeight / 2) - 190} width="140" height="120" fill="#eef6ff" stroke="#8fa" rx="8" />
        <text x={svgWidth - 90} y={(svgHeight / 2) - 160} textAnchor="middle" fontSize="12" fill="#333">Bathrooms</text>
        <rect x={svgWidth - 160} y={(svgHeight / 2) + 70} width="140" height="120" fill="#eef6ff" stroke="#8fa" rx="8" />
        <text x={svgWidth - 90} y={(svgHeight / 2) + 100} textAnchor="middle" fontSize="12" fill="#333">Showers</text>

        {/* Rooms - top and bottom rows */}
        {positions.map(({ room, x, y }) => {
          const fill = getFill(room);
          const isSelected = selectedRoom && selectedRoom.roomID === room.roomID;
          const stroke = getStroke(room, isSelected);
          return (
            <g key={room.roomID} transform={`translate(${x},${y})`} className="blueprint-room-group" onClick={() => onRoomClick && onRoomClick(room)} style={{ cursor: 'pointer' }}>
              <rect x={0} y={0} width={roomWidth} height={roomHeight} fill={fill} stroke={stroke} strokeWidth={isSelected ? 3 : (room.roomCategory === 'PhD' ? 2 : 1)} rx="6" />
              <text x={10} y={22} fontSize={14} fill="#072a3b">Room {room.roomNumber}</text>
              <text x={10} y={44} fontSize={12} fill="#072a3b">{room.type} • Block {room.hostelBlock}</text>
              <text x={10} y={64} fontSize={12} fill="#072a3b">{room.roomCategory || 'Regular'} • {room.occupancy}/{room.capacity} occupied</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default Blueprint;
