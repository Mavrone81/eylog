/**
 * Simulates sending an SMS notification.
 * In a real-world scenario, this would integrate with a provider like Twilio.
 */
const sendSMS = (to, message) => {
  console.log(`[SMS] To: ${to} | Message: ${message}`);
};

module.exports = { sendSMS };
