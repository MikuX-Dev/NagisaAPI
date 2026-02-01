export const getRedisKey = (type: string, value: string) =>
  `${type}:${value}` as `${string}:${string}`
