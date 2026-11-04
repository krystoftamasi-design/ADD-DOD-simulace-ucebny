/* Capture the existing work area, without changing or saving the original composition. */
(function () {
    var root = new File($.fileName).parent;
    var folder = new Folder(root.fsName + '/exports/motion'); folder.create();
    var bodyFolder = new Folder(folder.fsName + '/body'); bodyFolder.create();
    var referenceFolder = new Folder(folder.fsName + '/reference'); referenceFolder.create();
    function json(v) {
        if (v === null) return 'null';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v === 'string') return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        var a = [], i;
        if (v instanceof Array) { for (i = 0; i < v.length; i++) a.push(json(v[i])); return '[' + a.join(',') + ']'; }
        for (i in v) if (v.hasOwnProperty(i)) a.push(json(i) + ':' + json(v[i]));
        return '{' + a.join(',') + '}';
    }
    function write(name, data) {
        var f = new File(folder.fsName + '/' + name); f.encoding = 'UTF-8';
        if (!f.open('w')) throw new Error('Cannot write ' + f.fsName);
        f.write(json(data)); f.close();
    }
    var original = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.name === 's_mrkanim') original = item;
    }
    if (!original) throw new Error('s_mrkanim not found');
    var copy = original.duplicate();
    var data = {schema: 1, composition: original.name, width: original.width, height: original.height,
        fps: original.frameRate, start: original.workAreaStart, frames: []};
    var count = Math.round(original.workAreaDuration * original.frameRate);
    try {
        for (var l = 1; l <= copy.numLayers; l++) {
            var layer = copy.layer(l);
            if (layer.enabled) layer.solo = false;
            layer.enabled = layer.name === 'Shape Layer 12';
        }
        for (var f = 0; f < count; f++) {
            var t = original.workAreaStart + f / original.frameRate;
            var name = ('0000' + f).slice(-4) + '.png';
            original.saveFrameToPng(t, new File(referenceFolder.fsName + '/' + name));
            copy.saveFrameToPng(t, new File(bodyFolder.fsName + '/' + name));
            var frame = {time: t, layers: []};
            for (var n = 1; n <= original.numLayers; n++) {
                var eye = original.layer(n);
                if (!eye.enabled || eye.name === 'Shape Layer 12' || eye.name === 'Shape Layer 1') continue;
                if (t + 0.000001 < eye.inPoint || t >= eye.outPoint - 0.000001) continue;
                var tr = eye.property('ADBE Transform Group');
                frame.layers.push({name: eye.name, position: tr.property('ADBE Position').valueAtTime(t, false),
                    anchor: tr.property('ADBE Anchor Point').valueAtTime(t, false),
                    scale: tr.property('ADBE Scale').valueAtTime(t, false),
                    rotation: tr.property('ADBE Rotate Z').valueAtTime(t, false)});
            }
            data.frames.push(frame);
            if (f % 10 === 0) write('progress.json', {completed: f + 1, total: count});
        }
        write('samples.json', data);
        write('progress.json', {completed: count, total: count, complete: true});
    } finally { copy.remove(); }
    alert('Puvodni pohyb exportovan: ' + count + ' snimku pri ' + original.frameRate + ' fps.');
})();
