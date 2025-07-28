export { calculateTotal } from "./calculateTotal/calculateTotal";

/**
 * Converts a human-readable token amount to the proper decimal units
 * @param amount - The human-readable amount (e.g., "1" for 1 token)
 * @param decimals - The number of decimal places the token uses (default: 18)
 * @returns The amount in the smallest token unit (e.g., wei)
 */
export function parseTokenAmount(
  amount: string,
  decimals: number = 18
): bigint {
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    throw new Error("Invalid amount");
  }

  // Convert to the smallest unit by multiplying by 10^decimals
  const multiplier = BigInt(10 ** decimals);
  const wholePart = BigInt(Math.floor(parsedAmount));
  const fractionalPart = parsedAmount - Math.floor(parsedAmount);

  // Handle fractional parts
  const fractionalMultiplier = BigInt(10 ** decimals);
  const fractionalBigInt = BigInt(
    Math.round(fractionalPart * Number(fractionalMultiplier))
  );

  return wholePart * multiplier + fractionalBigInt;
}
