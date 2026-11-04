/* Render an isolated body from a temporary composition, then remove the copy. */
(function () {
    var root = new File($.fileName).parent;
    var folder = new Folder(root.fsName + '/exports/body'); folder.create();
    var original = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem && app.project.item(i).name === 's_mrkanim') original = app.project.item(i);
    }
    if (!original) throw new Error('s_mrkanim composition not found');
    var copy = original.duplicate();
    try {
        for (var l = 1; l <= copy.numLayers; l++) {
            var layer = copy.layer(l);
            if (layer.enabled) layer.solo = false;
            layer.enabled = layer.name === 'Shape Layer 12';
        }
        var times = [0, 0.25, 0.5, 0.7, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25];
        for (var t = 0; t < times.length; t++) copy.saveFrameToPng(times[t], new File(folder.fsName + '/body-' + Math.round(times[t] * 1000) + '.png'));
    } finally {
        copy.remove();
    }
    alert('Telo exportovano samostatne. Docasna kompozice odstranena; original zachovan.');
})();
