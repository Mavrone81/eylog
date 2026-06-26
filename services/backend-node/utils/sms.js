/**
 * Sends an SMS notification (simulated).
 * @param {string} to - The recipient's phone number.
 * @param {string} message - The message content.
 */
function sendSMS(to, message) {
  console.log(`[SMS] To: ${to}, Message: ${message}`);
}

module.exports = { sendSMS };
