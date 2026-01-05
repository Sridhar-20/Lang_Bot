/**
 * Simple utility to merge class names.
 */
export function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}
