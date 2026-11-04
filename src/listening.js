const WITHDRAWAL_MARGIN = 12; // Percentage points of the sensor's Z range above the touch height.
const RELEASE_CONFIRM_MS = 120;

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
  }

  update(position, now) {
    if (!this.active || !this.sensorControlled) return;
    if (position && this.touchZ === null) this.touchZ = position.z;
    const near = position && position.z <= this.touchZ + WITHDRAWAL_MARGIN;
    if (near) this.awaySince = null;
    else {
      this.awaySince ??= now;
      if (now - this.awaySince >= RELEASE_CONFIRM_MS) this.active = false;
    }
  }

  toggle() {
    this.active = !this.active;
    this.sensorControlled = false;
  }
}
