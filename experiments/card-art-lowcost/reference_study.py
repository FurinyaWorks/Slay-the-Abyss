"""Two isolated, reference-led stages; numbers are coordinates on 144x64 canvas.
No textures; each shape is a native ellipse, rectangle or triangulated polygon.
"""
def reference_study(Art, id, stage):
 a=Art(id)
 a.rect(0,0,144,64,'182d37')
 # Broad directional background planes, lower contrast than the subject.
 for pts,c in [([[0,0],[22,0],[45,39],[18,28]],'28434a'),([[26,0],[68,0],[91,25],[54,19]],'203843'),([[144,0],[132,0],[101,43],[144,25]],'263e44'),([[0,45],[45,46],[144,51],[144,64],[0,64]],'353c3b')]:a.poly(pts,c)
 # Reference stage 1 retains a quiet ground; stage 2 adds directional impact.
 if stage==2:
  for pts,c in [([[54,55],[0,17],[4,35],[28,48]],'b38950'),([[54,55],[0,30],[16,46],[5,44]],'f3c674'),([[57,55],[144,19],[119,44]],'b98d49'),([[57,55],[138,30],[112,46]],'ffdf89'),([[50,56],[0,45],[33,54],[8,56]],'ffdf90'),([[55,56],[144,47],[109,57],[87,56]],'e8b966'),([[37,51],[50,56],[77,55],[108,50],[92,56],[56,59]],'fff0ad')]:a.poly(pts,c)
 # Segmented rounded body: silhouette + recessed joints + five uneven blocks.
 a.ellipse(27,10,54,43,'483a32',-6)
 for pts,c in [([[32,10],[50,12],[44,25],[28,22]],'ad8653'),([[29,24],[42,27],[42,49],[33,44],[27,35]],'916a40'),([[51,8],[63,10],[66,25],[60,34],[48,28],[46,20]],'b28a54'),([[46,29],[60,36],[58,51],[43,48],[40,38]],'997344'),([[65,15],[77,16],[80,26],[77,28],[66,26]],'b89158'),([[66,28],[78,29],[74,44],[62,50],[62,37]],'785a39')]:a.poly(pts,c)
 # A few source-matched chipped planes; avoid per-pixel texture controls.
 for pts,c in [([[52,11],[60,12],[62,16],[57,15]],'c6a06a'),([[48,30],[52,35],[50,40],[45,34]],'76583a'),([[74,17],[77,17],[79,24],[76,22]],'c8a366'),([[28,29],[33,28],[32,38],[29,35]],'ac8048')]:a.poly(pts,c)
 # Lit bevels vs dark seams, not equally bright outlines.
 for aa,bb,w,c in [((32,11),(28,20),1.4,'d9b977'),((53,9),(61,11),1.2,'e8cb88'),((76,17),(79,25),1.2,'e3bd77'),((29,26),(29,34),1.2,'d8a558'),((43,47),(46,50),1.2,'c69753'),((65,27),(77,28),1.1,'3d332e')]:a.line(aa,bb,w,c)
 # Thick broad rounded stone cap, two native ellipses and a top highlight.
 a.ellipse(38,4,39,10,'71563a',-7)
 a.ellipse(38,3,39,7,'d7b477',-7)
 a.ellipse(40,3.6,34,2.8,'ffe1a1',-7)
 # Reference angular luminous channels: one continuous recognizable central zig.
 veins=[((38,13),(41,14)),((41,14),(35,24)),((34,27),(33,34)),((33,34),(37,40)),((37,40),(38,47)),((50,16),(57,17)),((57,17),(56,24)),((56,24),(64,31)),((64,31),(61,48)),((49,20),(53,21)),((53,21),(52,25)),((52,25),(47,25)),((47,25),(46,29)),((46,29),(52,35)),((52,35),(51,43))]
 for aa,bb in veins:a.line(aa,bb,2.2,'df9a3e')
 for aa,bb in veins:a.line(aa,bb,1.05,'ffe788')
 # Round, asymmetric slime silhouettes, slanted elliptical eyes (no house roofs).
 for x,y,w,h,rot in [(5,26,19,15,22),(94,35,24,17,-12),(125,29,14,11,-15)]:
  a.ellipse(x,y,w,h,'1e2339',rot);a.ellipse(x+1,y+.7,w-2,h-2,'36374f',rot)
  a.ellipse(x+1.5,y+1,w*.65,2,'777185',rot)
  a.ellipse(x+w*.34,y+h*.35,1.8,h*.3,'ffe6a0',rot);a.ellipse(x+w*.65,y+h*.35,1.6,h*.28,'ffe6a0',rot)
 if stage==2:
  for pts in [[[20,21],[23,18],[25,23],[22,25]],[[105,30],[109,26],[111,29],[107,33]],[[118,24],[121,20],[124,21],[121,26]],[[88,43],[91,39],[94,41],[91,46]],[[18,43],[20,40],[24,44],[22,46]]]:a.poly(pts,'766047')
 return a
