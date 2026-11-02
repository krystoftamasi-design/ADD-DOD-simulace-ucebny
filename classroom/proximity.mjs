// Flick reports height as a percentage of its sensing range, not centimetres.
export function proximityFromSensor(sensor) {
  const z=sensor?.position?.z;
  if(sensor?.connected!==true || !Number.isFinite(z) || z<0 || z>100) return 0;
  return Math.max(0,Math.min(1,(75-z)/65));
}
