"""Single-axis placement reused from PR390 @72f13f2 lowpoly.py (solve).

Project noncommercial license. Only placement is reused; source contours choose
facets. No stochastic Delaunay sampling, mixed-axis solver or new shape API.
"""
import math
import numpy as np

class PlacementUnavailable(ValueError):
    pass

def solve(P0, P1, P2):
    M = (P1 + P2) / 2; c1 = P2 - P1; c2 = P0 - M; C = (P0 + M) / 2
    best = None
    for axis in ('x', 'y'):
        p_, q_ = c1; r_, s_ = c2
        if axis == 'x': num, den = -(q_ * s_), (p_ * r_)
        else: num, den = -(p_ * r_), (q_ * s_)
        if abs(p_ * r_ + q_ * s_) < 1e-9: k2 = 1.0
        elif abs(den) < 1e-12: continue
        else: k2 = num / den
        if not (0 < k2 <= 1.0000001): continue
        for k in (math.sqrt(min(k2, 1)), -math.sqrt(min(k2, 1))):
            D = np.array([1, 1 / k]) if axis == 'x' else np.array([1 / k, 1])
            b1, b2 = c1 * D, c2 * D
            W = math.hypot(*b1); th = math.atan2(b1[1], b1[0])
            Hh = b2 @ np.array([-math.sin(th), math.cos(th)])
            if Hh <= 0: continue
            ang = math.degrees(math.acos(max(-1, min(1, k))))
            cand = dict(cx=C[0], cy=C[1], w=W, h=Hh, rz=math.degrees(th), rx=ang if axis == 'x' else 0, ry=ang if axis == 'y' else 0)
            if best is None or ang < best[0]: best = (ang, cand)
    return best[1] if best else None


def place(points, height, depth=0):
    points=np.asarray(points,dtype=float)
    if depth==0:
        points=points+np.sign(points-points.mean(axis=0))*.28
        sides=np.array([np.linalg.norm(points[(i+1)%3]-points[(i+2)%3]) for i in range(3)])
        centre=np.sum(points*sides[:,None],axis=0)/sum(sides)
        u,v=points[1]-points[0],points[2]-points[0]
        area2=abs(float(u[0]*v[1]-u[1]*v[0]))
        radius=area2/sum(sides)
        points=centre+(points-centre)*(1+min(.1,.2/max(radius,1e-8)))
    native=points.copy();native[:,1]=height-native[:,1]
    for a in range(3):
        for flip in (False,True):
            order=[a,(a+1)%3,(a+2)%3]
            if flip:order[1],order[2]=order[2],order[1]
            result=solve(*native[order])
            if result is not None:
                return [(points.tolist(),result)]
    if depth>=2:
        raise PlacementUnavailable('Triangle cannot be placed using a legal single-axis rotation')
    lengths=[np.sum((points[(i+1)%3]-points[(i+2)%3])**2) for i in range(3)]
    a=int(np.argmax(lengths));b,c=(a+1)%3,(a+2)%3;mid=(points[b]+points[c])/2
    return place([points[a],points[b],mid],height,depth+1)+place([points[a],mid,points[c]],height,depth+1)

place.Unavailable=PlacementUnavailable
