/* Read-only extraction of the open AE project. Does not save or alter it. */
(function () {
    var root = new File($.fileName).parent;
    var output = new Folder(root.fsName + '/exports');
    output.create();
    $.__bodymovin = $.__bodymovin || {};
/****** INIT JSON PARSER ******/
if (typeof $.__bodymovin.JSON !== 'object') {
    $.__bodymovin.JSON = {};
}
(function () {
    'use strict';

    var JSON = $.__bodymovin.JSON;

    function f(n) {
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
                Boolean.prototype.toJSON = function () {
                    return this.valueOf();
                };
    }

    var cx,
        escapable,
        gap,
        indent,
        meta,
        rep;

    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {
        var i,

            k,
            v,
            length,
            mind = gap,
            partial,
            value = holder[key];
        if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }
        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }
        switch (typeof value) {
            case 'string':
                return quote(value);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null':
                return String(value);
            case 'object':
                if (!value) {
                    return 'null';
                }
                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }
                    v = partial.length === 0
                        ? '[]'
                        : gap
                        ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                        : '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }
                if (rep && typeof rep === 'object') {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        if (typeof rep[i] === 'string') {
                            k = rep[i];
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                } else {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ': ' : ':') + v);
                            }
                        }
                    }
                }
                v = partial.length === 0
                    ? '{}'
                    : gap
                    ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                    : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
        }
    }
    if (typeof JSON.stringify !== 'function') {
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        };
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = '';
            indent = '';
            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }
            } else if (typeof space === 'string') {
                indent = space;
            }
            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }
            return str('', {'': value});
        };
    }
    if (typeof JSON.parse !== 'function') {
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        JSON.parse = function (text, reviver) {
            var j;
            function walk(holder, key) {
                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }
            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }
            if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

                j = eval('(' + text + ')');
                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }
            throw new SyntaxError('JSON.parse');
        };
    }
}());
    var JSON = $.__bodymovin.JSON;
    var errors = [];
    function val(v) {
        if (v === undefined || v === null) return null;
        if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
        if (v instanceof Array) {
            var a = []; for (var i = 0; i < v.length; i++) a.push(val(v[i])); return a;
        }
        if (v instanceof Shape) return {vertices: v.vertices, inTangents: v.inTangents, outTangents: v.outTangents, closed: v.closed};
        if (v instanceof MarkerValue) return {comment: v.comment, duration: v.duration};
        return String(v);
    }
    function ease(a) {
        var out = []; for (var i = 0; i < a.length; i++) out.push({speed: a[i].speed, influence: a[i].influence}); return out;
    }
    function property(p) {
        var d = {name: p.name, matchName: p.matchName, index: p.propertyIndex};
        if (p.propertyType !== PropertyType.PROPERTY) {
            d.children = [];
            for (var i = 1; i <= p.numProperties; i++) {
                try { d.children.push(property(p.property(i))); }
                catch (e) { errors.push(p.name + '/' + i + ': ' + e); }
            }
            return d;
        }
        d.valueType = String(p.propertyValueType);
        try { d.value = val(p.valueAtTime(0, true)); } catch (e) { d.valueError = String(e); }
        if (p.canSetExpression) {
            d.expression = p.expression;
            d.expressionEnabled = p.expressionEnabled;
        }
        d.keys = [];
        for (var k = 1; k <= p.numKeys; k++) {
            var key = {time: p.keyTime(k), value: val(p.keyValue(k))};
            try {
                key.inInterpolation = String(p.keyInInterpolationType(k));
                key.outInterpolation = String(p.keyOutInterpolationType(k));
                key.inEase = ease(p.keyInTemporalEase(k));
                key.outEase = ease(p.keyOutTemporalEase(k));
                key.temporalContinuous = p.keyTemporalContinuous(k);
                key.temporalAutoBezier = p.keyTemporalAutoBezier(k);
            } catch (e) {}
            if (p.isSpatial) {
                try { key.inTangent = p.keyInSpatialTangent(k); key.outTangent = p.keyOutSpatialTangent(k); key.roving = p.keyRoving(k); } catch (e) {}
            }
            d.keys.push(key);
        }
        return d;
    }
    var data = {schema: 1, applicationVersion: app.version, compositions: [], errors: errors};
    for (var i = 1; i <= app.project.numItems; i++) {
        var c = app.project.item(i);
        if (!(c instanceof CompItem)) continue;
        var comp = {name: c.name, id: c.id, width: c.width, height: c.height, duration: c.duration, fps: c.frameRate,
            pixelAspect: c.pixelAspect, workAreaStart: c.workAreaStart, workAreaDuration: c.workAreaDuration, background: c.bgColor, layers: []};
        for (var j = 1; j <= c.numLayers; j++) {
            var l = c.layer(j);
            var layer = {name: l.name, index: l.index, enabled: l.enabled, solo: l.solo, inPoint: l.inPoint, outPoint: l.outPoint,
                startTime: l.startTime, stretch: l.stretch, parentIndex: l.parent ? l.parent.index : null,
                threeD: l.threeDLayer, blendMode: String(l.blendingMode), properties: []};
            try { layer.trackMatte = String(l.trackMatteType); layer.matteLayerIndex = l.trackMatteLayer ? l.trackMatteLayer.index : null; } catch (e) {}
            for (var n = 1; n <= l.numProperties; n++) {
                try { layer.properties.push(property(l.property(n))); } catch (e) { errors.push(c.name + '/' + l.name + ': ' + e); }
            }
            comp.layers.push(layer);
        }
        data.compositions.push(comp);
        var times = [0, 0.7, 1.6, 1.7, 1.8, 1.9, 2, 3, 5];
        for (var t = 0; t < times.length; t++) {
            try { c.saveFrameToPng(times[t], new File(output.fsName + '/' + c.name + '-' + Math.round(times[t] * 1000) + '.png')); }
            catch (e) { errors.push('Reference frame ' + c.name + ': ' + e); break; }
        }
    }
    var f = new File(output.fsName + '/ae-project.json');
    f.encoding = 'UTF-8';
    if (!f.open('w')) throw new Error('Cannot write extraction: ' + f.error);
    f.write(JSON.stringify(data, null, 2)); f.close();
    alert('Export maskota dokoncen: ' + data.compositions.length + ' kompozice.\n' + f.fsName + '\nZaznamenane chyby: ' + errors.length);
})();
