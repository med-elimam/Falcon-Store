(function () {
  var root = new Folder("C:/Users/HP ZBOOK/Desktop/falcon-store/production/hero");
  if (!root.exists) root.create();
  var log = new File(root.fsName + "/ae-inspection.txt");
  log.encoding = "UTF-8";
  log.open("w");
  log.writeln("After Effects: " + app.version);
  log.writeln("Project items: " + app.project.numItems);
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    log.writeln(i + " | " + item.name + " | " + item.typeName);
    if (item instanceof FootageItem) {
      log.writeln("  " + item.width + "x" + item.height + " duration=" + item.duration + " fps=" + item.frameRate);
    }
  }
  var probe = app.project.items.addComp("__OUTPUT_TEMPLATE_PROBE__", 16, 16, 1, 1, 24);
  var rq = app.project.renderQueue.items.add(probe);
  log.writeln("Output module templates:");
  var templates = rq.outputModule(1).templates;
  for (var t = 0; t < templates.length; t++) log.writeln("  " + templates[t]);
  rq.remove();
  probe.remove();
  log.close();
})(this);
