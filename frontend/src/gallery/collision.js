// Circle-vs-world collision on the ground plane. Colliders are
//   segments: [ax, az, bx, bz, pad]  capsules (walls, benches)
//   circles:  [x, z, r]              solid round obstacles
//   rings:    [x, z, R]              round rooms the circle must stay inside
//
// `point` is anything with x / z (a THREE.Vector3 works). It is pushed out of
// every collider it overlaps; the return value is the last contact normal, or null.
export const resolveCircle = (point, radius, colliders) => {
  let contact = null;
  const push = (nx, nz, depth) => {
    point.x += nx * depth;
    point.z += nz * depth;
    contact = [nx, nz];
  };

  for (let iteration = 0; iteration < 3; iteration++) {
    colliders.segments.forEach(([ax, az, bx, bz, pad = 0]) => {
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.z - az) * dz) / (dx * dx + dz * dz)));
      const ox = point.x - (ax + dx * t);
      const oz = point.z - (az + dz * t);
      const distance = Math.hypot(ox, oz);
      const min = radius + pad;
      if (distance < min && distance > 1e-6) push(ox / distance, oz / distance, min - distance);
    });
    colliders.circles.forEach(([cx, cz, r]) => {
      const ox = point.x - cx;
      const oz = point.z - cz;
      const distance = Math.hypot(ox, oz);
      const min = radius + r;
      if (distance < min && distance > 1e-6) push(ox / distance, oz / distance, min - distance);
    });
    colliders.rings.forEach(([cx, cz, r]) => {
      const ox = point.x - cx;
      const oz = point.z - cz;
      const distance = Math.hypot(ox, oz);
      const max = r - radius;
      if (distance > max) push(-ox / distance, -oz / distance, distance - max);
    });
  }
  return contact;
};

// --- height ---------------------------------------------------------------
// Rooms can also hold slabs: solid boxes with a top to stand on, such as steps,
// ramps and floating platforms. See `slab` in layout/geometry.js for their shape.
// `colliders.floor` is the height of the room's own floor (0 when left out), or
// null for a room with nothing underneath.

// how high a ledge the body walks up (or down) without jumping, and how tall it is
export const STEP_HEIGHT = 0.4;
export const BODY_HEIGHT = 1.7;
// the body stays up while its centre is at most this far past a slab's edge
const EDGE_GRIP = 0.12;

// Height of a slab's top, `along` metres from its middle (ramps rise along their length).
const topAt = (item, along) => {
  if (item.top0 === item.top1) return item.top0;
  const t = Math.max(0, Math.min(1, (along + item.halfLength) / (item.halfLength * 2)));
  return item.top0 + (item.top1 - item.top0) * t;
};

const standing = {ground: 0, slab: null};

/**
 * Collide a body with the room: walls first, then slabs. `point` (x / y / z, y at the
 * feet) is pushed out of whatever is in its way, sideways or down from under a slab.
 * @param {object} point the body's position
 * @param {number} radius the body's radius
 * @param {object} colliders the room's colliders
 * @param {number} previousY the height of the feet before this move
 * @return {{ground: number, slab: ?object}} the height of the surface under the body
 *   (-Infinity over a drop) and the slab it belongs to; the object is reused between calls
 */
export const resolveBody = (point, radius, colliders, previousY = point.y) => {
  resolveCircle(point, radius, colliders);
  standing.ground = colliders.floor === null ? -Infinity : colliders.floor || 0;
  standing.slab = null;
  const slabs = colliders.slabs;
  if (!slabs) return standing;

  for (let i = 0; i < slabs.length; i++) {
    const item = slabs[i];
    const dx = point.x - item.x;
    const dz = point.z - item.z;
    let along = dx * item.ux + dz * item.uz;
    let across = dz * item.ux - dx * item.uz;
    const pastEnd = Math.abs(along) - item.halfLength;
    const pastSide = Math.abs(across) - item.halfWidth;
    if (pastEnd >= radius || pastSide >= radius) continue;

    const top = topAt(item, along);
    if (top <= point.y + STEP_HEIGHT) {
      // low enough to stand on or step up
      if (pastEnd <= EDGE_GRIP && pastSide <= EDGE_GRIP && top > standing.ground) {
        standing.ground = top;
        standing.slab = item;
      }
      continue;
    }
    if (item.bottom >= point.y + BODY_HEIGHT) continue;

    if (pastEnd < 0 && pastSide < 0) {
      if (previousY + BODY_HEIGHT <= item.bottom + 0.05) {
        // rose into it from underneath: the head stops at its underside
        point.y = item.bottom - BODY_HEIGHT;
        continue;
      }
      // inside it: out through the nearest face
      if (pastEnd > pastSide) along = Math.sign(along || 1) * (item.halfLength + radius);
      else across = Math.sign(across || 1) * (item.halfWidth + radius);
    } else {
      const nearAlong = Math.max(-item.halfLength, Math.min(item.halfLength, along));
      const nearAcross = Math.max(-item.halfWidth, Math.min(item.halfWidth, across));
      const distance = Math.hypot(along - nearAlong, across - nearAcross);
      if (distance >= radius || distance < 1e-6) continue;
      along = nearAlong + ((along - nearAlong) / distance) * radius;
      across = nearAcross + ((across - nearAcross) / distance) * radius;
    }
    point.x = item.x + along * item.ux - across * item.uz;
    point.z = item.z + along * item.uz + across * item.ux;
  }
  return standing;
};
