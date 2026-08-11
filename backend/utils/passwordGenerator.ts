import crypto from 'crypto';

/**
 * Generates a strong temporary password.
 * Must include at least:
 * - one uppercase letter
 * - one lowercase letter
 * - one number
 * - one special character
 * 
 * Total length is 12 characters.
 */
export const generateSecureTemporaryPassword = (): string => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+~|}{[]:;?><,./-=';

  // Ensure at least one of each required type
  const passwordChars = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    numbers[crypto.randomInt(numbers.length)],
    special[crypto.randomInt(special.length)]
  ];

  const allChars = upper + lower + numbers + special;
  
  // Fill the rest up to 12 characters
  for (let i = passwordChars.length; i < 12; i++) {
    passwordChars.push(allChars[crypto.randomInt(allChars.length)]);
  }

  // Shuffle the array to avoid predictable patterns (like upper always first)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
};
