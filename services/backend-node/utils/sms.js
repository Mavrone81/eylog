/**
 * Simulated SMS utility for customer notifications.
 * In a real-world scenario, this would integrate with a service like Twilio or AWS SNS.
 */
const sendSMS = (to, message) => {
  console.log(`[SMS] Sending to ${to}: ${message}`);
  // Simulated success
  return Promise.resolve({ success: true, messageId: 'simulated-id-' + Date.now() });
};

module.exports = { sendSMS };
