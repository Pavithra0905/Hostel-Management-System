const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const receiptDir = path.join(__dirname, '..', 'uploads', 'receipts');

if (!fs.existsSync(receiptDir)) {
  fs.mkdirSync(receiptDir, { recursive: true });
}

const formatCurrency = (amount) => `INR ${Number(amount || 0).toFixed(2)}`;

const generateBookingReceiptPdf = async ({
  bookingID,
  studentID,
  roomNumber,
  roomType,
  roomCategory,
  startDate,
  duration,
  monthlyFee,
  totalAmount,
  paymentStatus,
  generatedAt = new Date()
}) => {
  const filename = `auto-receipt-booking-${bookingID}-${Date.now()}.pdf`;
  const fullPath = path.join(receiptDir, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(fullPath);

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(writeStream);

    doc.fontSize(20).text('Hostel Management System', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(14).text('Booking Fee Receipt', { align: 'center' });
    doc.moveDown(1.2);

    doc.fontSize(11);
    doc.text(`Receipt Generated At: ${new Date(generatedAt).toLocaleString()}`);
    doc.text(`Booking ID: ${bookingID}`);
    doc.text(`Student ID: ${studentID}`);
    doc.moveDown(0.8);

    doc.text(`Room Number: ${roomNumber}`);
    doc.text(`Room Type: ${roomType}`);
    doc.text(`Room Category: ${roomCategory}`);
    doc.text(`Start Date: ${new Date(startDate).toLocaleDateString()}`);
    doc.text(`Duration (Days): ${duration}`);
    doc.moveDown(0.8);

    doc.text(`Monthly Fee: ${formatCurrency(monthlyFee)}`);
    doc.text(`Total Amount: ${formatCurrency(totalAmount)}`);
    doc.text(`Payment Status: ${paymentStatus}`);
    doc.moveDown(1.2);

    doc.fontSize(10).fillColor('#555').text('This is a system-generated provisional receipt submitted with booking request.');
    doc.end();
  });

  return {
    receiptPath: `/uploads/receipts/${filename}`,
    receiptOriginalName: `booking-receipt-${bookingID}.pdf`,
    receiptMimeType: 'application/pdf'
  };
};

module.exports = {
  generateBookingReceiptPdf
};
