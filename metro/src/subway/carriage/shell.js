/**
 * The carriage around the doors: wall lining with the door notch and side window, stainless
 * pocket panels and door frame, ad cove, ceiling with light fixture, floor, grab rails, poles.
 * Only the wall the camera faces (and the strip of floor/ceiling in view) is built, out to the
 * car's end bulkheads; the door pairs further along (CAR.moreDoors) get the same surround.
 */
import * as THREE from 'three';
import { CAR } from '../config.js?v=20261028a';
import { roundedRect, frameGeometry, tracker } from '../geo.js';

export function createShell(mats, registry) {
  var keep = tracker(registry);
  var group = new THREE.Group();
  group.name = 'shell';

  var dL = CAR.doorCenterX - CAR.doorWidth / 2;
  var dR = CAR.doorCenterX + CAR.doorWidth / 2;
  var top = CAR.wallTop;
  var w = CAR.window;
  var x0 = CAR.endX0, x1 = CAR.endX1;
  var mid = (x0 + x1) / 2;
  var len = x1 - x0;
  var doorXs = [CAR.doorCenterX].concat(CAR.moreDoors).sort(function (a, b) { return a - b; });
  var windows = [w].concat(CAR.moreWindows);

  // Lining: one flat panel, notched for the doors and holed for the windows.
  var lining = new THREE.Shape();
  lining.moveTo(x0, 0);
  doorXs.forEach(function (cx) {
    var l = cx - CAR.doorWidth / 2, r = cx + CAR.doorWidth / 2;
    lining.lineTo(l, 0);
    lining.lineTo(l, CAR.doorHeight);
    lining.lineTo(r, CAR.doorHeight);
    lining.lineTo(r, 0);
  });
  lining.lineTo(x1, 0);
  lining.lineTo(x1, top);
  lining.lineTo(x0, top);
  lining.lineTo(x0, 0);
  windows.forEach(function (win) {
    lining.holes.push(roundedRect(new THREE.Path(), win.x0, w.y0, win.x1 - win.x0, w.y1 - w.y0, w.radius));
  });
  var liningGeo = keep(new THREE.ShapeGeometry(lining, 8));
  liningGeo.attributes.uv.array.forEach(function (_, i, a) { a[i] *= 0.5; });
  group.add(new THREE.Mesh(liningGeo, mats.panel));

  // Every door pair: stainless pocket panels either side of the opening (the leaves slide in
  // behind them), then jambs and header that show the depth of the car body.
  var pocketW = CAR.doorTravel + 0.05;
  var jambDepth = 0.13;
  var pocketGeo = keep(new THREE.BoxGeometry(pocketW, top, 0.012));
  var jambGeo = keep(new THREE.BoxGeometry(0.035, CAR.doorHeight, jambDepth));
  var trimGeo = keep(new THREE.BoxGeometry(0.05, CAR.doorHeight + 0.05, 0.03));
  var headerGeo = keep(new THREE.BoxGeometry(CAR.doorWidth + 0.1, 0.05, 0.03));
  var soffitGeo = keep(new THREE.BoxGeometry(CAR.doorWidth, 0.02, jambDepth));
  doorXs.forEach(function (cx) {
    var l = cx - CAR.doorWidth / 2, r = cx + CAR.doorWidth / 2;
    [l - pocketW / 2, r + pocketW / 2].forEach(function (px) {
      var panel = new THREE.Mesh(pocketGeo, mats.steel);
      panel.position.set(px, top / 2, 0.006);
      group.add(panel);
    });
    [l, r].forEach(function (x, i) {
      var jamb = new THREE.Mesh(jambGeo, mats.steelDark);
      jamb.position.set(x + (i ? 0.0175 : -0.0175), CAR.doorHeight / 2, -jambDepth / 2 + 0.02);
      group.add(jamb);
      var trim = new THREE.Mesh(trimGeo, mats.chrome);
      trim.position.set(x + (i ? 0.025 : -0.025), (CAR.doorHeight + 0.05) / 2, 0.02);
      group.add(trim);
    });
    var header = new THREE.Mesh(headerGeo, mats.chrome);
    header.position.set(cx, CAR.doorHeight + 0.025, 0.02);
    group.add(header);
    var headerSoffit = new THREE.Mesh(soffitGeo, mats.steelDark);
    headerSoffit.position.set(cx, CAR.doorHeight, -jambDepth / 2 + 0.02);
    group.add(headerSoffit);
  });

  // Side windows: gasketed frame + glass set back into the body.
  var glassMeshes = [];
  windows.map(function (win) { return [win.x0, win.x1]; }).forEach(function (span) {
    var ww = span[1] - span[0];
    var wh = w.y1 - w.y0;
    var frame = new THREE.Mesh(keep(frameGeometry(ww, wh, 0.03, 0.025, w.radius)), mats.steelDark);
    frame.position.set((span[0] + span[1]) / 2, (w.y0 + w.y1) / 2, 0);
    group.add(frame);
    var reveal = new THREE.Mesh(keep(frameGeometry(ww - 0.002, wh - 0.002, 0.001, 0.07, w.radius)), mats.rubber);
    reveal.position.set(frame.position.x, frame.position.y, -0.07);
    group.add(reveal);
    var glass = new THREE.Mesh(keep(new THREE.PlaneGeometry(ww, wh)), mats.glass);
    glass.position.set(frame.position.x, frame.position.y, -0.06);
    glass.renderOrder = 2;
    group.add(glass);
    glassMeshes.push(glass);
    var surface = new THREE.Mesh(glass.geometry, mats.glassSurface);
    surface.position.set(glass.position.x, glass.position.y, -0.058);
    surface.renderOrder = 3;
    group.add(surface);
  });

  // Cove: the angled strip between wall and ceiling that carries the ad cards.
  var coveRise = CAR.ceilingY - top;
  var coveRun = 0.1;
  var coveLen = Math.hypot(coveRise, coveRun);
  var cove = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, coveLen)), mats.panel);
  cove.position.set(mid, top + coveRise / 2, coveRun / 2);
  cove.rotation.x = Math.atan2(coveRun, coveRise);
  group.add(cove);
  var coveFrame = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.025, 0.03)), mats.steel);
  coveFrame.position.set(cove.position.x, top, 0.012);
  group.add(coveFrame);

  // Ceiling and the fluorescent run along the cove edge.
  var ceilingDepth = CAR.aisleDepth - coveRun;
  // Ceilings glow off the tubes; a little self-light keeps them from going muddy.
  var ceilingMat = new THREE.MeshStandardMaterial({ color: 0xd9d3c7, emissive: 0x4a4740, roughness: 0.7 });
  registry.materials.push(ceilingMat);
  var ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, ceilingDepth)), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(cove.position.x, CAR.ceilingY, coveRun + ceilingDepth / 2);
  group.add(ceiling);
  var fixture = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.05, 0.2)), mats.steel);
  fixture.position.set(cove.position.x, CAR.ceilingY - 0.025, coveRun + 0.14);
  group.add(fixture);
  var lens = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, 0.15)), mats.fluorescent);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(cove.position.x, CAR.ceilingY - 0.052, coveRun + 0.14);
  group.add(lens);

  // Floor runs a little past the door line so it meets the threshold.
  var floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(len, CAR.aisleDepth + 0.12)), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cove.position.x, 0, (CAR.aisleDepth - 0.12) / 2);
  group.add(floor);
  // Black cove base where floor meets wall.
  var base = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.08, 0.02)), mats.rubber);
  base.position.set(cove.position.x, 0.04, 0.01);
  group.add(base);

  // Grab rail, drops to the ceiling, and stanchions at the seat ends.
  var railZ = 0.6;
  // Just under the ad strip, so the rail frames the ads instead of slicing through them.
  var railY = 1.74;
  var railR = 0.017;
  var rail = new THREE.Mesh(keep(new THREE.CylinderGeometry(railR, railR, len, 12)), mats.chrome);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(cove.position.x, railY, railZ);
  group.add(rail);
  var dropGeo = keep(new THREE.CylinderGeometry(0.012, 0.012, CAR.ceilingY - railY, 8));
  for (var x = CAR.wallX0 + 0.5 - 1.45 * Math.floor((CAR.wallX0 - x0) / 1.45); x < x1; x += 1.45) {
    var drop = new THREE.Mesh(dropGeo, mats.chrome);
    drop.position.set(x, (railY + CAR.ceilingY) / 2, railZ);
    group.add(drop);
  }

  var poleGeo = keep(new THREE.CylinderGeometry(0.019, 0.019, railY, 14));
  // [x, dir]: dir +1 where the bench runs on toward +x from the pole.
  var seatEnds = [[CAR.seat.x0 - 0.06, 1], [dL - pocketW - 0.08, -1]];
  CAR.moreDoors.forEach(function (cx) {
    seatEnds.push([cx - CAR.doorWidth / 2 - pocketW - 0.08, -1], [cx + CAR.doorWidth / 2 + pocketW + 0.08, 1]);
  });
  seatEnds.forEach(function (end) {
    var px = end[0], dir = end[1];
    var pole = new THREE.Mesh(poleGeo, mats.chrome);
    pole.position.set(px, railY / 2, railZ);
    group.add(pole);
    // Partition bar: from the pole, round and back into the wall at shoulder height.
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, 0.62, railZ),
      new THREE.Vector3(px, 0.98, railZ - 0.06),
      new THREE.Vector3(px + dir * 0.02, 1.12, railZ - 0.3),
      new THREE.Vector3(px + dir * 0.02, 1.16, 0.02)
    ]);
    var bar = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 24, 0.016, 8, false)), mats.chrome);
    group.add(bar);
  });

  // End bulkheads: a lined wall across the car with the shut storm door to the next car, its
  // window dark. Only seen when the head turns well along the car.
  var endDoorW = 0.76, endDoorH = 1.93;
  var endWin = { width: 0.42, height: 0.6, bottom: 1.08 };
  [x0, x1].forEach(function (ex) {
    var inward = ex < 0 ? 1 : -1;
    var end = new THREE.Group();
    end.position.set(ex, 0, CAR.aisleDepth / 2);
    end.rotation.y = inward * Math.PI / 2;
    var wall = new THREE.Shape();
    var hw = CAR.aisleDepth / 2 + 0.06;
    wall.moveTo(-hw, 0);
    wall.lineTo(-endDoorW / 2, 0);
    wall.lineTo(-endDoorW / 2, endDoorH);
    wall.lineTo(endDoorW / 2, endDoorH);
    wall.lineTo(endDoorW / 2, 0);
    wall.lineTo(hw, 0);
    wall.lineTo(hw, CAR.ceilingY);
    wall.lineTo(-hw, CAR.ceilingY);
    wall.lineTo(-hw, 0);
    end.add(new THREE.Mesh(keep(new THREE.ShapeGeometry(wall, 4)), mats.panel));
    var leaf = new THREE.Shape();
    leaf.moveTo(-endDoorW / 2, 0);
    leaf.lineTo(endDoorW / 2, 0);
    leaf.lineTo(endDoorW / 2, endDoorH);
    leaf.lineTo(-endDoorW / 2, endDoorH);
    leaf.lineTo(-endDoorW / 2, 0);
    leaf.holes.push(roundedRect(new THREE.Path(), -endWin.width / 2, endWin.bottom, endWin.width, endWin.height, 0.05));
    var door = new THREE.Mesh(keep(new THREE.ShapeGeometry(leaf, 6)), mats.steel);
    door.position.z = -0.04;
    end.add(door);
    // Beyond the window: the dark gangway to the next car.
    var dark = new THREE.Mesh(keep(new THREE.PlaneGeometry(endWin.width, endWin.height)), mats.rubber);
    dark.position.set(0, endWin.bottom + endWin.height / 2, -0.2);
    end.add(dark);
    [-1, 1].forEach(function (side) {
      var jamb = new THREE.Mesh(jambGeo, mats.steelDark);
      jamb.position.set(side * (endDoorW / 2 + 0.0175), endDoorH / 2, -jambDepth / 2 + 0.02);
      end.add(jamb);
    });
    var endHeader = new THREE.Mesh(keep(new THREE.BoxGeometry(endDoorW + 0.1, 0.05, 0.03)), mats.chrome);
    endHeader.position.set(0, endDoorH + 0.025, 0.02);
    end.add(endHeader);
    var endBase = new THREE.Mesh(keep(new THREE.BoxGeometry(CAR.aisleDepth + 0.12, 0.08, 0.02)), mats.rubber);
    endBase.position.set(0, 0.04, 0.01);
    end.add(endBase);
    group.add(end);
  });

  return {
    group: group,
    glass: glassMeshes,
    /** Where the cove sits, for signage placed on it. */
    cove: { y: top + coveRise / 2, z: coveRun / 2, tilt: cove.rotation.x, length: coveLen }
  };
}
