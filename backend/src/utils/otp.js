function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isOtpValid(user, code) {
  if (!user || !user.otpCode || !user.otpExpiresAt) return false;
  if (String(user.otpCode) !== String(code)) return false;
  return new Date(user.otpExpiresAt).getTime() >= Date.now();
}

module.exports = {
  generateOtpCode,
  isOtpValid,
};
