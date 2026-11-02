const WITHDRAWAL_MARGIN = 12; // Percentage points of the sensor's Z range above the touch height.
const RELEASE_DELAY_MS = 600;

export class ListeningState {
  active = false;
  sensorControlled = false;
  touchZ = null;
  awaySince = null;

  touch(position, now) {
    this.active = true;
    this.sensorControlled = true;
    this.touchZ = position?.z ?? null;
    this.awaySince = null;
    this.update(position, now);
  }

  update(position, now) {
    if (!this.active || !this.sensorControlled) return;
    if (position) this.touchZ = Math.min(this.touchZ ?? position.z, position.z);
    const near = position && position.z <= this.touchZ + WITHDRAWAL_MARGIN;
    if (near) {
      this.awaySince = null;
    } else {
      this.awaySince ??= now;
      if (now - this.awaySince >= RELEASE_DELAY_MS) this.active = false;
    }
  }

  toggle() {
    this.active = !this.active;
    this.sensorControlled = false;
  }
}
