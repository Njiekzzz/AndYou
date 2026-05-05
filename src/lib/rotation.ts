export function getRotationFromSeed(seed: number): number {
  const normalized = ((seed * 2654435761) >>> 0) / 4294967296
  return (normalized * 8) - 4
}
