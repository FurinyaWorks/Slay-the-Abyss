"""Run directly with Python; no simulator or full test suite required."""
import json
import math
from pathlib import Path
import unittest
from triangulate import signed_area, triangulate


def covered(point, poly):
    """Independent boundary-inclusive ray-crossing oracle."""
    x,y = point
    inside = False
    for a,b in zip(poly, poly[1:]+poly[:1]):
        dx,dy = b[0]-a[0],b[1]-a[1]
        if abs(dx*(y-a[1])-dy*(x-a[0])) < 1e-8 and min(a[0],b[0])-1e-8 <= x <= max(a[0],b[0])+1e-8 and min(a[1],b[1])-1e-8 <= y <= max(a[1],b[1])+1e-8:
            return True
        if (a[1]>y) != (b[1]>y) and x < a[0]+(y-a[1])*dx/dy:
            inside = not inside
    return inside


def geometry_rows():
    root=Path(__file__).parent
    paths=[root/'cleave-a.geometry.json', *sorted((root/'round2').glob('*.geometry.json'))]
    return [row for path in paths for row in json.loads(path.read_text()) if 'points' in row]


class TriangulationTests(unittest.TestCase):
    def assert_mesh(self, poly):
        tris = triangulate(poly)
        self.assertAlmostEqual(sum(abs(signed_area(t)) for t in tris), abs(signed_area(poly)), places=7)
        self.assertEqual(tris, triangulate(poly))
        for tri in tris:
            self.assertGreater(signed_area(tri)*signed_area(poly), 0)
            self.assertTrue(all(p in [tuple(x) for x in poly] for p in tri))
            # Dense samples include all vertices, edges and interiors, not just centroid.
            for i in range(21):
                for j in range(21-i):
                    weights = (i/20,j/20,(20-i-j)/20)
                    point = tuple(sum(w*p[k] for w,p in zip(weights,tri)) for k in (0,1))
                    self.assertTrue(covered(point,poly), (point,poly,tri))
        return tris

    def test_real_archived_polygons_all_and_both_windings(self):
        # Frozen fixture protects regression even when the visual authoring source changes.
        bad = [
            [[0,43],[52,46],[79,38],[144,39],[115,55],[51,62]],
            [[0,50],[49,51],[65,46],[144,43],[108,52],[56,57]],
            [[36,15],[45,21],[88,21],[91,17],[48,18]],
        ]
        for poly in bad:
            for p in (poly,poly[::-1]):
                self.assert_mesh(p)
        source = Path(__file__).with_name('cleave-a.geometry.json')
        for row in geometry_rows():
            for p in (row['points'],row['points'][::-1]):
                self.assert_mesh(p)

    def test_fan_was_wrong_for_regression_shapes(self):
        poly = [[36,15],[45,21],[88,21],[91,17],[48,18]]
        fan = [(poly[0],poly[i],poly[i+1]) for i in range(1,len(poly)-1)]
        self.assertGreater(sum(abs(signed_area(t)) for t in fan), abs(signed_area(poly)))
        self.assert_mesh(poly)

    def test_adjacent_duplicates_closing_vertex_collinear(self):
        poly = [[0,0],[0,0],[2,0],[4,0],[4,4],[0,4],[0,0]]
        self.assertEqual(len(self.assert_mesh(poly)),2)
        self.assertEqual(len(self.assert_mesh(poly[::-1])),2)

    def test_deep_concavity(self):
        self.assert_mesh([[0,0],[5,0],[5,5],[4,5],[4,1],[1,1],[1,5],[0,5]])

    def test_scaled_translated(self):
        for scale in (1e-4,1,1e4):
            poly = [[x*scale+10,y*scale-20] for x,y in [[0,0],[4,0],[2,1],[4,4],[0,4]]]
            tris=triangulate(poly)
            self.assertTrue(math.isclose(sum(abs(signed_area(t)) for t in tris),abs(signed_area(poly)), rel_tol=1e-10))

    def test_reject_invalid(self):
        invalid = [[],[[0,0],[1,1]], [[0,0],[1,1],[2,2]],
            [[0,0],[4,4],[0,4],[4,0]],  # bow tie
            [[0,0],[4,0],[4,4],[2,0],[0,4]], # non-adjacent edge touch
            [[0,0],[4,0],[2,0],[4,4],[0,4]], # adjacent reversal
            [[0,0],[4,0],[4,4],[0,0],[0,4]], # repeated vertex
            [[0,0],[float('nan'),0],[0,1]],[[0,0],[float('inf'),0],[0,1]],
            [[0,0],[True,0],[0,1]],[[0,0],['4',0],[0,1]],[[0,0],[1,2,3],[0,1]],None]
        for poly in invalid:
            with self.subTest(poly=poly), self.assertRaises(ValueError):
                triangulate(poly)


class ExactPlacementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import importlib.util
        path = Path(__file__).resolve().parents[2] / 'scripts/art/native-triangle-placement.py'
        spec=importlib.util.spec_from_file_location('existing_placement',path)
        cls.placement=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.placement)

    def test_all_archived_polygon_triangles_reconstruct(self):
        from triangulate import exact_placements
        source=Path(__file__).with_name('cleave-a.geometry.json')
        split_count=0
        for row in geometry_rows():
            for tri in triangulate(row['points']):
                placed=exact_placements(tri,64,self.placement)
                split_count += len(placed)>1
                self.assertAlmostEqual(sum(abs(signed_area(p)) for p,_ in placed),abs(signed_area(tri)),places=7)
                for pts,p in placed:
                    for point in pts:
                        self.assertTrue(covered(point,list(tri)))
                    # Reconstruct the actual single-axis scaled/rotated native glyph.
                    angle=math.radians(p['rz']); sx=math.cos(math.radians(p['ry'])); sy=math.cos(math.radians(p['rx']))
                    actual=[]
                    for x,y in [(0,p['h']/2),(-p['w']/2,-p['h']/2),(p['w']/2,-p['h']/2)]:
                        rx=x*math.cos(angle)-y*math.sin(angle)
                        ry=x*math.sin(angle)+y*math.cos(angle)
                        actual.append((p['cx']+sx*rx,64-p['cy']-sy*ry))
                    for point in actual:
                        self.assertLess(min(math.dist(point,q) for q in pts),1e-7)
        self.assertGreater(split_count,0, 'fixture must exercise exact altitude fallback')

    def test_rotated_thin_triangles(self):
        from triangulate import exact_placements
        for degrees in range(0,180,7):
            angle=math.radians(degrees)
            for h in (.01,.1,1,10):
                tri=[(x*math.cos(angle)-y*math.sin(angle),x*math.sin(angle)+y*math.cos(angle)) for x,y in [(0,0),(100,0),(20,h)]]
                placed=exact_placements(tri,64,self.placement)
                self.assertTrue(math.isclose(sum(abs(signed_area(p)) for p,_ in placed),abs(signed_area(tri)),rel_tol=1e-7))


if __name__ == '__main__':
    unittest.main()
