"""Deterministic ear clipping for one simple polygon (no holes), stdlib only.

triangulate(points) -> list of three-point tuples, preserving input winding.
Adjacent duplicates, an optional closing point and redundant collinear vertices
are removed. Invalid, self-touching or self-intersecting polygons raise ValueError.
Coordinates are not moved, fitted, expanded or clipped to hide invalid geometry.
"""
import math
from numbers import Real


def _cross(a, b, c):
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])


def signed_area(points):
    """Signed shoelace area; positive for counterclockwise Cartesian input."""
    # Shift to the first point to avoid cancellation for translated polygons.
    if len(points) < 3:
        return 0.0
    return math.fsum(_cross(points[0], points[i], points[i+1])
                     for i in range(1, len(points)-1)) / 2


def triangulate(points):
    """Return non-overlapping triangles, or fail rather than emit a bad mesh."""
    try:
        raw = list(points)
        for p in raw:
            if len(p) != 2 or any(isinstance(v, bool) or not isinstance(v, Real)
                                  or not math.isfinite(v) for v in p):
                raise ValueError('points must be finite numeric x/y pairs')
        raw = [tuple(map(float, p)) for p in raw]
    except (TypeError, OverflowError) as exc:
        raise ValueError('points must be finite numeric x/y pairs') from exc
    if len(raw) < 3:
        raise ValueError('polygon needs at least three vertices')
    span = max(max(p[k] for p in raw)-min(p[k] for p in raw) for k in (0, 1))
    if not math.isfinite(span) or span == 0:
        raise ValueError('polygon has invalid or zero extent')
    eps = span * 1e-12
    area_eps = span * span * 1e-12
    if not math.isfinite(area_eps):
        raise ValueError('coordinate range is too large')

    def same(a, b):
        return abs(a[0]-b[0]) <= eps and abs(a[1]-b[1]) <= eps

    def on_segment(a, b, p):
        return (abs(_cross(a, b, p)) <= area_eps and
                min(a[0], b[0])-eps <= p[0] <= max(a[0], b[0])+eps and
                min(a[1], b[1])-eps <= p[1] <= max(a[1], b[1])+eps)

    def intersects(a, b, c, d):
        ab_c, ab_d, cd_a, cd_b = _cross(a,b,c), _cross(a,b,d), _cross(c,d,a), _cross(c,d,b)
        if (((ab_c > area_eps and ab_d < -area_eps) or (ab_c < -area_eps and ab_d > area_eps)) and
            ((cd_a > area_eps and cd_b < -area_eps) or (cd_a < -area_eps and cd_b > area_eps))):
            return True
        return (on_segment(a,b,c) or on_segment(a,b,d) or
                on_segment(c,d,a) or on_segment(c,d,b))

    clean = []
    for p in raw:
        if not clean or not same(clean[-1], p):
            clean.append(p)
    if len(clean) > 1 and same(clean[0], clean[-1]):
        clean.pop()
    if len(clean) < 3:
        raise ValueError('polygon needs three distinct vertices')
    n = len(clean)
    for i in range(n):
        a, b, c = clean[i-1], clean[i], clean[(i+1)%n]
        if abs(_cross(a,b,c)) <= area_eps and not on_segment(a,c,b):
            raise ValueError('adjacent polygon edges overlap or reverse')
        for j in range(i+1,n):
            if same(clean[i], clean[j]):
                raise ValueError('non-adjacent repeated vertex')
            if j == i+1 or (i == 0 and j == n-1):
                continue
            if intersects(clean[i], clean[(i+1)%n], clean[j], clean[(j+1)%n]):
                raise ValueError('polygon edges intersect or touch')
    # Drop only collinear vertices between their neighbors, retaining shape.
    while len(clean) > 3:
        for i in range(len(clean)):
            if on_segment(clean[i-1], clean[(i+1)%len(clean)], clean[i]):
                del clean[i]
                break
        else:
            break
    area = signed_area(clean)
    if abs(area) <= area_eps:
        raise ValueError('polygon has zero or numerically degenerate area')
    direction = 1 if area > 0 else -1
    remaining = list(clean)
    triangles = []
    while len(remaining) > 3:
        for i, b in enumerate(remaining):
            a, c = remaining[i-1], remaining[(i+1)%len(remaining)]
            if direction * _cross(a,b,c) <= area_eps:
                continue
            # Boundary points count as inside to avoid cutting across a vertex.
            if any(all(direction*_cross(u,v,p) >= -area_eps for u,v in ((a,b),(b,c),(c,a)))
                   for j,p in enumerate(remaining) if j not in ((i-1)%len(remaining), i, (i+1)%len(remaining))):
                continue
            triangles.append((a,b,c))
            del remaining[i]
            break
        else:
            raise ValueError('no stable ear: polygon is degenerate at this precision')
    triangles.append(tuple(remaining))
    if (any(direction*signed_area(t) <= area_eps/2 for t in triangles) or
        abs(math.fsum(signed_area(t) for t in triangles)-area) > area_eps*len(clean)):
        raise ValueError('triangulation failed area/winding validation')
    return triangles


def exact_placements(triangle, height, placement):
    """Use existing placement without its expansion; split at altitude if needed.

    ``placement`` is the loaded native-triangle-placement module. The original
    solver is untouched. depth=2 disables both its enlargement and midpoint
    recursion. Splitting along the altitude to the longest side produces two
    right triangles whose union is exactly the input triangle. A remaining
    solver failure propagates; no coordinate nudges or overlap are permitted.
    """
    if len(triangle) != 3:
        raise ValueError('exact_placements needs one triangle')
    # Reuse validation, but preserve supplied order and coordinates.
    tris = triangulate(triangle)
    if len(tris) != 1:
        raise ValueError('exact_placements needs a nondegenerate triangle')
    points = tris[0]
    try:
        return placement.place(points, height, depth=2)
    except placement.PlacementUnavailable:
        pass
    # Opposite index to the longest side; altitude foot is inside that side.
    a = max(range(3), key=lambda i: sum((points[(i+1)%3][k]-points[(i+2)%3][k])**2 for k in (0,1)))
    apex, b, c = points[a], points[(a+1)%3], points[(a+2)%3]
    dx,dy = c[0]-b[0],c[1]-b[1]
    t = ((apex[0]-b[0])*dx+(apex[1]-b[1])*dy)/(dx*dx+dy*dy)
    if not 0 < t < 1:
        raise ValueError('altitude split is numerically degenerate')
    foot = (b[0]+t*dx, b[1]+t*dy)
    return (placement.place([apex,b,foot], height, depth=2) +
            placement.place([apex,foot,c], height, depth=2))
