"""Read the original binary AEP without running or saving After Effects."""
import hashlib
import json
from enum import Enum
from pathlib import Path

import py_aep

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source/digimon_file.aep"
ERRORS = []


def value(v):
    if v is None or isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, Enum):
        return v.name
    if isinstance(v, (list, tuple)):
        return [value(x) for x in v]
    if isinstance(v, dict):
        return {k: value(x) for k, x in v.items()}
    if hasattr(v, "vertices"):
        return {k: value(getattr(v, k)) for k in ("vertices", "in_tangents", "out_tangents", "closed")}
    if hasattr(v, "speed") and hasattr(v, "influence"):
        return {"speed": v.speed, "influence": v.influence}
    return str(v)


def prop(p):
    d = {"name": p.name, "matchName": p.match_name, "enabled": getattr(p, "enabled", True)}
    if hasattr(p, "num_properties"):
        d["children"] = [prop(x) for x in p]
    else:
        try:
            d["value"] = value(p.value_at_time(0))
            d["expression"] = p.expression
            d["expressionEnabled"] = p.expression_enabled
            d["keys"] = []
            for k in p.keyframes:
                data = {name: value(getattr(k, name)) for name in (
                    "time", "value", "in_interpolation_type", "out_interpolation_type",
                    "in_temporal_ease", "out_temporal_ease", "temporal_continuous",
                    "temporal_auto_bezier", "in_spatial_tangent", "out_spatial_tangent", "roving",
                )}
                d["keys"].append(data)
        except Exception as e:
            ERRORS.append(f"{p.match_name}: {e}")
    return d


def main():
    app = py_aep.parse(str(SOURCE))
    data = {"schema": 1, "source": SOURCE.name,
            "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "parser": "py-aep 0.18.2", "compositions": [], "errors": ERRORS}
    for c in app.project.compositions:
        comp = {"name": c.name, "width": c.width, "height": c.height, "fps": c.frame_rate,
                "duration": c.duration, "workAreaStart": c.work_area_start,
                "workAreaDuration": c.work_area_duration, "layers": []}
        for i, l in enumerate(c.layers, 1):
            matte = l.track_matte_layer
            comp["layers"].append({
                "name": l.name, "index": i, "enabled": l.enabled, "inPoint": l.in_point,
                "outPoint": l.out_point, "startTime": l.start_time, "stretch": l.stretch,
                "parent": l.parent.name if l.parent else None,
                "trackMatte": value(l.track_matte_type), "matteLayer": matte.name if matte else None,
                "properties": [prop(p) for p in l],
            })
        data["compositions"].append(comp)
    path = ROOT / "exports/aep-original.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Wrote {path.name}: {len(data['compositions'])} compositions, {len(ERRORS)} extraction errors")


if __name__ == "__main__":
    main()
