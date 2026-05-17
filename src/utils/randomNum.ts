// src/utils/randomNum.ts

import crypto from "crypto";

/**
 * Generates a random numeric string of given length.
 * Uses crypto for better randomness (production safe).
 *
 * @param digit - Length of the random number
 * @returns string
 */
export  default function random(digit: number): string {
  if (!Number.isInteger(digit) || digit <= 0) {
    throw new Error("Digit must be a positive integer");
  }

  const min = 10 ** (digit - 1);
  const max = 10 ** digit - 1;

  const randomNumber = crypto.randomInt(min, max + 1);

  return randomNumber.toString();
}
