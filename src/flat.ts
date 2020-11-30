export function flat<T>(arrayOfArraysOrItems: Array<T | T[]>): T[] {
  const result: T[] = [];
  arrayOfArraysOrItems.forEach((arrayOrItem) => {
    if (Array.isArray(arrayOrItem)) {
      result.push(...arrayOrItem);
    } else {
      result.push(arrayOrItem);
    }
  });
  return result;
}
