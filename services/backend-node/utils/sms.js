function sendSMS(to, message) {
  console.log(`[SMS] Sending to ${to}: ${message}`);
}

module.exports = { sendSMS };
