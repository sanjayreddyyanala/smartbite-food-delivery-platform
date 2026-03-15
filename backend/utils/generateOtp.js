import bcrypt from 'bcryptjs';

/**
 * Generates an N-digit OTP string with its bcrypt hash and expiry date.
 * @param {number} digits - Number of digits (e.g. 4 for delivery, 6 for NGO)
 * @param {number} expiryMinutes - Expiry time in minutes
 * @returns {Promise<{ otp: string, otpHash: string, expiresAt: Date }>}
 */
const generateOtp = async (digits, expiryMinutes) => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const otp = String(Math.floor(min + Math.random() * (max - min + 1)));

  const otpHash = await bcrypt.hash(otp, 10);

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return { otp, otpHash, expiresAt };
};

export default generateOtp;
