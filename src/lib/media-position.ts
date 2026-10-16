export function imagePosition(image?: {focalX?:number|null;focalY?:number|null}) {
  if (image?.focalX == null && image?.focalY == null) return undefined;
  const coordinate = (value: number|null|undefined) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1,Math.max(0,value))*100 : 50;
  return `object-position:${coordinate(image?.focalX)}% ${coordinate(image?.focalY)}%`;
}
