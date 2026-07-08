const twilio = require('twilio');

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
};

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;

  const defaultCountryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');
  let digits = String(phoneNumber).replace(/\D/g, '');

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  }

  if (!digits.startsWith(defaultCountryCode) && digits.length < 12) {
    digits = `${defaultCountryCode}${digits}`;
  }

  return digits;
};

const formatWhatsAppAddress = (phoneNumber) => {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return null;
  return normalized.startsWith('whatsapp:') ? normalized : `whatsapp:+${normalized.replace(/^\+/, '')}`;
};

const isConfigured = () => {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
};

const sendWhatsAppMessage = async ({ to, body }) => {
  if (!isConfigured()) {
    return { sent: false, skipped: true, reason: 'Twilio WhatsApp is not configured' };
  }

  const client = getTwilioClient();
  if (!client) {
    return { sent: false, skipped: true, reason: 'Twilio client unavailable' };
  }

  const formattedTo = formatWhatsAppAddress(to);
  if (!formattedTo) {
    return { sent: false, skipped: true, reason: 'Invalid WhatsApp recipient number' };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? process.env.TWILIO_WHATSAPP_FROM
    : `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

  const message = await client.messages.create({
    from,
    to: formattedTo,
    body
  });

  return { sent: true, sid: message.sid };
};

const sendBookingConfirmationWhatsApp = async ({ phoneNumber, studentName, bookingID, roomNumber, roomType, totalAmount, receiptUrl }) => {
  const body = [
    `Hostel booking confirmed for ${studentName || 'student'}.`,
    `Booking ID: ${bookingID}`,
    `Room: ${roomNumber} (${roomType})`,
    `Amount: INR ${Number(totalAmount || 0).toFixed(2)}`,
    receiptUrl ? `Receipt: ${receiptUrl}` : null,
    'Your booking is now pending admin approval.'
  ].filter(Boolean).join('\n');

  return sendWhatsAppMessage({ to: phoneNumber, body });
};

const sendBookingDecisionWhatsApp = async ({ phoneNumber, studentName, bookingID, roomNumber, decision, remarks, receiptUrl }) => {
  const isApproved = String(decision).toLowerCase() === 'approved';
  const body = [
    `Your hostel booking has been ${isApproved ? 'approved' : 'rejected'}, ${studentName || 'student'}.`,
    `Booking ID: ${bookingID}`,
    `Room: ${roomNumber}`,
    remarks ? `Remarks: ${remarks}` : null,
    receiptUrl ? `Receipt: ${receiptUrl}` : null,
    isApproved ? 'You may now use your allotted room.' : 'Please check the booking remarks in your dashboard.'
  ].filter(Boolean).join('\n');

  return sendWhatsAppMessage({ to: phoneNumber, body });
};

const sendPasswordResetWhatsApp = async ({ phoneNumber, studentName, resetLink }) => {
  const body = [
    `Hello ${studentName || 'student'},`,
    'You requested a hostel account password reset.',
    `Reset link: ${resetLink}`,
    'This link expires in 1 hour.'
  ].join('\n');

  return sendWhatsAppMessage({ to: phoneNumber, body });
};

const sendFeeReminderWhatsApp = async ({ phoneNumber, studentName, month, feeAmount, dueDate, paymentUrl }) => {
  const body = [
    `Fee reminder for ${studentName || 'student'}.`,
    `Month: ${month}`,
    `Amount due: INR ${Number(feeAmount || 0).toFixed(2)}`,
    dueDate ? `Due date: ${new Date(dueDate).toLocaleDateString()}` : null,
    paymentUrl ? `Payment/receipt link: ${paymentUrl}` : null,
    'Please pay on time to avoid late fees.'
  ].filter(Boolean).join('\n');

  return sendWhatsAppMessage({ to: phoneNumber, body });
};

module.exports = {
  normalizePhoneNumber,
  formatWhatsAppAddress,
  isConfigured,
  sendWhatsAppMessage,
  sendBookingConfirmationWhatsApp,
  sendBookingDecisionWhatsApp,
  sendPasswordResetWhatsApp,
  sendFeeReminderWhatsApp
};
