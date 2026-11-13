"""Technical contact sheet of inputs and actual SDK captures (no art edits)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent
evidence=Path(sys.argv[1])
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
width,height=836,470
sheet=Image.new('RGB',(width*2,1660),'#172534')
draw=ImageDraw.Draw(sheet)
panels=[(root/'input/source.png','原参考图：五官来源'),
        (root/'input/structure-reference.png','新参考图：头发／背景结构来源'),
        (evidence/'native-1600.png','实际原生1600图元：SDK场景树软件渲染'),
        (evidence/'native-3200.png','实际原生3200图元：SDK场景树软件渲染')]
for index,(file,label) in enumerate(panels):
    x=(index%2)*width
    y=(index//2)*515
    draw.text((x+14,y+8),label,font=font,fill='#f5ead7')
    image=Image.open(file).convert('RGB').resize((width,height),Image.Resampling.LANCZOS)
    sheet.paste(image,(x,y+40))
for index,(file,label) in enumerate([(root/'input/source.png','原五官局部'),(evidence/'native-1600.png','实际1600五官局部')]):
    image=Image.open(file).convert('RGB')
    crop=image.crop((round(image.width*.335),round(image.height*.33),round(image.width*.67),round(image.height*.69)))
    crop=crop.resize((710,450),Image.Resampling.LANCZOS)
    x=index*width
    draw.text((x+14,1040),label,font=font,fill='#f5ead7')
    sheet.paste(crop,(x+50,1080))
draw.text((14,1550),'上方为参考图，下方为实际原生场景显示；局部放大用于检查眼睛、鼻、嘴和颜色。',font=small,fill='#f5ead7')
draw.text((14,1585),'并非离线拟合预览；不代表官方客户端、手机画质或性能验收。运行时无普通PNG纹理。',font=small,fill='#f5ead7')
sheet.save(evidence/'comparison.png')
