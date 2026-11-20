# Rebuild product photos from the originals, painting out the "Net Wt." text.
import sys
from PIL import Image, ImageOps, ImageFilter
import numpy as np
D='/private/tmp/claude-502/-Users-gopi-4423-Documents/f7d3f5e5-024e-4aca-96a1-651d4fc018a6/images/'
OUT='/Users/gopi-4423/Documents/dryharvest/public/products/'
SRC={4:'dried-mango-slices',5:'dried-beetroot-chips',6:'dried-amla-candy-free-pieces',7:'dried-dragon-fruit',8:'dried-guava-slices',9:'dried-jackfruit-chips',10:'dried-onion-flakes',11:'dried-pineapple-rings',12:'dried-garlic-flakes',13:'dried-carrot-cubes',14:'dried-chikoo-slices',15:'dried-spinach-leaves',16:'banana-chips',17:'dried-apple-rings',18:'dried-okra-slices',19:'dried-papaya-cubes',20:'sun-dried-tomatoes',21:'dried-capsicum-strips',22:'dried-drumstick-pieces',23:'dried-pumpkin-cubes',25:'mushroom-powder',26:'dried-shiitake-mushrooms',27:'dried-curry-leaves',28:'dried-tulsi-leaves',29:'lemongrass-cut',30:'moringa-leaf-powder',31:'dried-mint-leaves'}

def find_text_box(a, x0, x1, y0, y1):
    """Bounding box of the label text inside the search window, by contrast with the band colour."""
    reg=a[y0:y1,x0:x1].astype(int)
    bg=np.median(reg.reshape(-1,3),axis=0)
    d=np.abs(reg-bg).sum(axis=2)
    ys,xs=np.where(d>120)
    if len(xs)==0: return None,bg
    return (x0+xs.min(), y0+ys.min(), x0+xs.max(), y0+ys.max()), bg

def erase(im, x0, x1, y0, y1):
    a=np.array(im)
    box,bg=find_text_box(a,x0,x1,y0,y1)
    if box is None: return im, None
    bx0,by0,bx1,by1=box; p=6
    bx0,by0,bx1,by1=bx0-p,by0-p,bx1+p,by1+p
    # fill each row with a left-to-right blend of the band colour just outside the text,
    # so the band's own gradient carries through
    for y in range(by0,by1+1):
        L=a[y,max(bx0-8,0):bx0].astype(float).mean(axis=0); R=a[y,bx1+1:bx1+9].astype(float).mean(axis=0)
        t=np.linspace(0,1,bx1-bx0+1)[:,None]
        a[y,bx0:bx1+1]=(L*(1-t)+R*t).astype(np.uint8)
    out=Image.fromarray(a)
    # soften the patch slightly so it blends
    patch=out.crop((bx0,by0,bx1+1,by1+1)).filter(ImageFilter.GaussianBlur(2))
    out.paste(patch,(bx0,by0))
    return out, box

def square(im, slug, pad=None):
    w,h=im.size; s=int(max(w,h)*(pad or 1)); c=Image.new('RGB',(s,s),(255,255,255)); c.paste(im,((s-w)//2,(s-h)//2))
    c.resize((1200,1200),Image.LANCZOS).save(OUT+slug+'.webp','WEBP',quality=88)

def single(n, slug):
    im=Image.open(f'{D}{n}.webp').convert('RGB'); w,h=im.size
    if w>h:  # landscape originals (mango, banana)
        win=(int(w*.40),int(w*.60),int(h*.895),int(h*.945))
    else:
        win=(int(w*.38),int(w*.62),int(h*.885),int(h*.94))
    im,box=erase(im,*win); square(im,slug); return box

if __name__=='__main__':
    for n,slug in SRC.items(): print(slug, single(n,slug))
    im=Image.open(D+'24.webp').convert('RGB')
    for (a,b),slug in zip([(0,518),(518,1026),(1026,1536)],['dried-oyster-mushrooms','dried-button-mushroom-slices','dried-milky-mushrooms']):
        part=im.crop((a,0,b,1024)); w,h=part.size
        part,box=erase(part,int(w*.32),int(w*.70),int(h*.855),int(h*.895)); print(slug,box)
        p=part.crop(ImageOps.invert(part.convert('L').point(lambda v:255 if v>242 else 0)).getbbox())
        pw,ph=p.size; s=int(ph*1.06); c=Image.new('RGB',(s,s),(255,255,255)); c.paste(p,((s-pw)//2,(s-ph)//2))
        c.resize((1200,1200),Image.LANCZOS).save(OUT+slug+'.webp','WEBP',quality=88)
