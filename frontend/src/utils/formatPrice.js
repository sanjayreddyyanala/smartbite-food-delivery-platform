/**
 * Format a number as Indian Rupee currency
 * @param {number} amount
 * @returns {string}
 */
export const formatPrice = (amount) => {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};
