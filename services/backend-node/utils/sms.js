const sendSMS = (to, message) => {
  console.log(`[SMS Notification] To: ${to}, Message: ${message}`);
};

module.exports = { sendSMS };
