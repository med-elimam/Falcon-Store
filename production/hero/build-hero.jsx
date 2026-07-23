(function () {
  app.beginUndoGroup("Build Falcon Hero Master");

  function findFootage(namePart) {
    var needle = namePart.toLowerCase();
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof FootageItem && item.name.toLowerCase().indexOf(needle) !== -1) return item;
    }
    return null;
  }

  function findComp(exactName) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === exactName) return item;
    }
    return null;
  }

  function addEllipseMask(layer, cx, cy, rx, ry, feather, inverted) {
    var mask = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var k = 0.5522847498;
    var shape = new Shape();
    shape.vertices = [[cx - rx, cy], [cx, cy - ry], [cx + rx, cy], [cx, cy + ry]];
    shape.inTangents = [[0, ry * k], [-rx * k, 0], [0, -ry * k], [rx * k, 0]];
    shape.outTangents = [[0, -ry * k], [rx * k, 0], [0, ry * k], [-rx * k, 0]];
    shape.closed = true;
    mask.property("ADBE Mask Shape").setValue(shape);
    mask.property("ADBE Mask Feather").setValue([feather, feather]);
    mask.inverted = inverted === true;
    return mask;
  }

  function setEffectValue(effect, displayName, fallbackIndex, value) {
    try {
      var prop = effect.property(displayName) || effect.property(fallbackIndex);
      if (prop) prop.setValue(value);
    } catch (ignore) {}
  }

  function addColorKey(layer, color, tolerance, feather) {
    try {
      var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Color Key");
      setEffectValue(fx, "Key Color", 1, color);
      setEffectValue(fx, "Color Tolerance", 2, tolerance);
      setEffectValue(fx, "Edge Thin", 3, 0);
      setEffectValue(fx, "Edge Feather", 4, feather);
    } catch (ignore) {}
  }

  function addTint(layer, amount) {
    try {
      var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Tint");
      setEffectValue(fx, "Map Black To", 1, [0.006, 0.002, 0.004]);
      setEffectValue(fx, "Map White To", 2, [0.92, 0.64, 0.40]);
      setEffectValue(fx, "Amount to Tint", 3, amount);
    } catch (ignore) {}
  }

  function addExposure(layer, exposure) {
    try {
      var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Exposure2");
      setEffectValue(fx, "Exposure", 1, exposure);
    } catch (ignore) {}
  }

  function setEase(prop) {
    try {
      for (var i = 1; i <= prop.numKeys; i++) {
        var ease = new KeyframeEase(0, 70);
        prop.setTemporalEaseAtKey(i, [ease], [ease]);
      }
    } catch (ignore) {}
  }

  var base = findFootage("Create_a_seamless_second_cin") || findFootage("veo-base");
  var person = findFootage("person-hand-cutout") || findFootage("person-hand");
  var bottle = findFootage("falcon-bottle");
  if (!base || !person || !bottle) {
    alert("Missing required footage: base video, person-hand-cutout, or falcon-bottle.");
    app.endUndoGroup();
    return;
  }

  var old = findComp("FALCON_HERO_MASTER");
  if (old) old.name = "FALCON_HERO_MASTER_PREVIOUS";

  var duration = Math.max(6, base.duration || 10);
  var fps = base.frameRate || 24;
  var comp = app.project.items.addComp("FALCON_HERO_MASTER", 1280, 720, 1, duration, fps);
  comp.bgColor = [0.003, 0.002, 0.003];
  comp.workAreaStart = 0;
  comp.workAreaDuration = duration;

  var baseLayer = comp.layers.add(base);
  baseLayer.name = "01_VEO_ATMOSPHERE_BASE";
  baseLayer.property("ADBE Transform Group").property("ADBE Position").setValue([640, 360]);
  var fitScale = Math.max(1280 / base.width, 720 / base.height) * 100;
  baseLayer.property("ADBE Transform Group").property("ADBE Scale").setValue([fitScale, fitScale]);

  var sceneGrade = comp.layers.addSolid([0.18, 0.015, 0.025], "02_BURGUNDY_SCENE_GRADE", 1280, 720, 1, duration);
  sceneGrade.blendingMode = BlendingMode.SOFT_LIGHT;
  sceneGrade.property("ADBE Transform Group").property("ADBE Opacity").setValue(22);

  var bottleShadow = comp.layers.addSolid([0, 0, 0], "03_BOTTLE_BACKPLATE", 1280, 720, 1, duration);
  addEllipseMask(bottleShadow, 285, 380, 255, 420, 150, false);
  bottleShadow.property("ADBE Transform Group").property("ADBE Opacity").setValue(70);

  var personShadow = comp.layers.addSolid([0, 0, 0], "04_PERSON_BACKPLATE", 1280, 720, 1, duration);
  addEllipseMask(personShadow, 1040, 365, 360, 460, 165, false);
  personShadow.property("ADBE Transform Group").property("ADBE Opacity").setValue(78);

  var personLayer = comp.layers.add(person);
  personLayer.name = "05_ORIGINAL_PERSON_IDENTITY_LOCKED";
  personLayer.inPoint = 0;
  personLayer.outPoint = duration;
  if (person.name.toLowerCase().indexOf("cutout") === -1) {
    addColorKey(personLayer, [1, 1, 1], 9, 1.4);
    addColorKey(personLayer, [0.922, 0.922, 0.922], 8, 1.8);
    addColorKey(personLayer, [0.965, 0.965, 0.965], 5, 1.2);
  }
  addTint(personLayer, 29);
  addExposure(personLayer, -0.55);
  var pTransform = personLayer.property("ADBE Transform Group");
  var pPos = pTransform.property("ADBE Position");
  var pScale = pTransform.property("ADBE Scale");
  pPos.setValueAtTime(0, [1000, 372]);
  pPos.setValueAtTime(duration / 2, [996, 365]);
  pPos.setValueAtTime(duration, [1000, 372]);
  pScale.setValueAtTime(0, [-58, 58]);
  pScale.setValueAtTime(duration / 2, [-59.2, 59.2]);
  pScale.setValueAtTime(duration, [-58, 58]);
  setEase(pPos);
  setEase(pScale);

  var bottleGlow = comp.layers.add(bottle);
  bottleGlow.name = "06_BOTTLE_AMBER_GLOW";
  bottleGlow.inPoint = 0;
  bottleGlow.outPoint = duration;
  bottleGlow.property("ADBE Transform Group").property("ADBE Position").setValue([295, 365]);
  bottleGlow.property("ADBE Transform Group").property("ADBE Scale").setValue([72, 72]);
  bottleGlow.property("ADBE Transform Group").property("ADBE Opacity").setValue(36);
  bottleGlow.blendingMode = BlendingMode.ADD;
  addTint(bottleGlow, 100);
  try {
    var blur = bottleGlow.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
    setEffectValue(blur, "Blurriness", 1, 34);
    setEffectValue(blur, "Repeat Edge Pixels", 3, true);
  } catch (ignore) {}

  var bottleLayer = comp.layers.add(bottle);
  bottleLayer.name = "07_ORIGINAL_FALCON_BOTTLE_TEXT_LOCKED";
  bottleLayer.inPoint = 0;
  bottleLayer.outPoint = duration;
  var bTransform = bottleLayer.property("ADBE Transform Group");
  var bPos = bTransform.property("ADBE Position");
  var bScale = bTransform.property("ADBE Scale");
  var bRot = bTransform.property("ADBE Rotate Z");
  bPos.setValueAtTime(0, [295, 365]);
  bPos.setValueAtTime(duration / 2, [298, 356]);
  bPos.setValueAtTime(duration, [295, 365]);
  bScale.setValueAtTime(0, [70, 70]);
  bScale.setValueAtTime(duration / 2, [71.5, 71.5]);
  bScale.setValueAtTime(duration, [70, 70]);
  bRot.setValueAtTime(0, -0.35);
  bRot.setValueAtTime(duration / 2, 0.35);
  bRot.setValueAtTime(duration, -0.35);
  setEase(bPos);
  setEase(bScale);
  setEase(bRot);
  try {
    var sweep = bottleLayer.property("ADBE Effect Parade").addProperty("CC Light Sweep");
    var centerProp = sweep.property("Center") || sweep.property(1);
    centerProp.setValueAtTime(1.4, [155, 360]);
    centerProp.setValueAtTime(3.4, [430, 360]);
    centerProp.setValueAtTime(duration - 1.1, [155, 360]);
  } catch (ignore) {}

  var textSafe = comp.layers.addSolid([0, 0, 0], "08_CENTER_TEXT_SAFE_ZONE", 1280, 720, 1, duration);
  addEllipseMask(textSafe, 640, 370, 250, 430, 185, false);
  textSafe.property("ADBE Transform Group").property("ADBE Opacity").setValue(24);

  var vignette = comp.layers.addSolid([0, 0, 0], "09_CINEMATIC_VIGNETTE", 1280, 720, 1, duration);
  addEllipseMask(vignette, 640, 350, 555, 310, 150, true);
  vignette.property("ADBE Transform Group").property("ADBE Opacity").setValue(46);

  var warmBloom = comp.layers.addSolid([0.72, 0.29, 0.06], "10_WARM_BLOOM", 1280, 720, 1, duration);
  addEllipseMask(warmBloom, 470, 250, 420, 260, 210, false);
  warmBloom.blendingMode = BlendingMode.SCREEN;
  warmBloom.property("ADBE Transform Group").property("ADBE Opacity").setValue(7);

  comp.markerProperty.setValueAtTime(0, new MarkerValue("Seamless loop start"));
  comp.markerProperty.setValueAtTime(duration / 2, new MarkerValue("Hero movement apex"));
  comp.markerProperty.setValueAtTime(duration, new MarkerValue("Seamless loop end"));

  comp.openInViewer();
  app.endUndoGroup();
})(this);
