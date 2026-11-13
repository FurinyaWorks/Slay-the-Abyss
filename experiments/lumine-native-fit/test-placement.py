"""Independent vertex reconstruction, not a mirror of the solver's search."""
import importlib.util
import math
from pathlib import Path
import unittest
import numpy as np

source=Path(__file__).resolve().parents[2]/'scripts/art/native-triangle-placement.py'
spec=importlib.util.spec_from_file_location('placement',source)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class Placement(unittest.TestCase):
    def test_toolchain_fault_cannot_silently_become_masked_geometry(self):
        spec=importlib.util.spec_from_file_location('segment',source.with_name('segment-lowpoly.py'))
        segment=importlib.util.module_from_spec(spec);spec.loader.exec_module(segment)
        from shapely.geometry import Polygon
        def broken(*_):
            raise ValueError('toolchain unavailable')
        broken.Unavailable=module.PlacementUnavailable
        with self.assertRaisesRegex(ValueError,'toolchain unavailable'):
            segment.geometry([(Polygon([(0,0),(20,0),(8,30)]),[128,128,128])],.08,836,470,broken)

    def test_single_axis_vertices_match_original_contours(self):
        rng=np.random.default_rng(20261113)
        tested=0
        for _ in range(120):
            points=rng.uniform([0,0],[836,470],(3,2))
            try:
                placed=module.place(points,470)
            except ValueError:
                continue  # Explicit masked-triangle fallback; never dropped geometry.
            for original,p in placed:
                rx,ry,rz=np.deg2rad([p['rx'],p['ry'],p['rz']])
                cx,sx,cy,sy,c,s=math.cos(rx),math.sin(rx),math.cos(ry),math.sin(ry),math.cos(rz),math.sin(rz)
                matrix=np.array([[cy*c+sy*sx*s,-cy*s+sy*sx*c],[cx*s,cx*c]])
                vertices=np.array([[0,p['h']/2],[-p['w']/2,-p['h']/2],[p['w']/2,-p['h']/2]])@matrix.T+[p['cx'],p['cy']]
                target=np.asarray(original);target[:,1]=470-target[:,1]
                distances=np.linalg.norm(vertices[:,None,:]-target[None,:,:],axis=2)
                self.assertLess(float(np.max(np.min(distances,axis=1))),1e-6)
                self.assertTrue(p['rx']==0 or p['ry']==0)
                tested+=1
        self.assertGreater(tested,80)


if __name__=='__main__':
    unittest.main()
