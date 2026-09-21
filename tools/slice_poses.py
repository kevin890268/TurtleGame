"""把 GPT 生成的斑龜姿勢表切成單張圖，放到 assets/poses/。

  python tools/slice_poses.py            # 在 Turtle 資料夾執行

每一格會做這些事：
  1. 去背：洋紅色背景，或 GPT 那種「半透明加雜訊」的假透明背景都能處理
  2. 只保留最大的那塊圖案（烏龜），文字、zzz、泡泡這些分離的小東西會被丟掉
  3. 找出背甲的位置和寬度，把每張縮放到背甲一樣寬，並對齊到同一個基準點
遊戲裡以背甲中心當烏龜的座標，所以所有姿勢換來換去都不會跳動。

先處理 reference/active2.png（原型用），如果 reference/sheets/ 裡有正式版姿勢表，
同名的姿勢會被正式版覆蓋。
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'poses'

OUT_SIZE = 560            # 輸出每張的尺寸
SHELL_W = 200             # 背甲在輸出圖裡的寬度 (px)
ANCHOR = (250, 300)       # 背甲中心在輸出圖裡的位置

# 原型：active2.png 是 6×6，順序對應下面這些姿勢
PROTO = {
    'file': 'reference/active2.png', 'cols': 6, 'rows': 6, 'bg': 'alpha',
    'poses': [
        ('walk_a', '悠閒散步'), ('look', '停下張望'), ('neck_up', '伸長脖子'),
        ('head_in', '縮頭'), ('observe', '抬頭觀察'), ('swim', '泡水游泳'),
        ('dive', '潛水下沉'), ('rise', '浮出水面'), ('float', '水中伸展'),
        ('exhale', '吐氣'), ('nibble', '啃食水草'), ('drink', '喝水'),
        ('bask', '曬太陽'), ('sleep', '睡覺'), ('yawn', '打哈欠'),
        ('stretch', '伸懶腰'), ('flip', '翻身'), ('hide', '縮進殼裡'),
        ('alert', '警戒觀察'), ('sniff', '低頭聞聞'), ('walk_b', '慢慢爬動'),
        ('run', '快速爬'), ('side', '側身'), ('turn', '轉方向'),
        ('jump', '跳躍'), ('land', '落地'), ('spin', '轉圈'),
        ('dig', '挖土'), ('lay_eggs', '產卵'), ('startled', '發現驚嚇'),
        ('angry', '生氣'), ('happy', '開心'), ('purr', '呼嚕'),
        ('think', '思考'), ('relax', '放鬆'), ('rest', '趴著休息'),
    ],
}

# 正式版：assets/PROMPTS_ACTIONS.md 裡的姿勢表
SHEETS = [
    {'file': 'reference/sheets/sheet_a.png', 'cols': 3, 'rows': 2, 'bg': 'magenta',
     'poses': [('walk_a', '散步'), ('walk_b', '慢慢爬'), ('look', '張望'),
               ('neck_up', '伸長脖子'), ('observe', '抬頭觀察'), ('sniff', '低頭聞聞')]},
    {'file': 'reference/sheets/sheet_b.png', 'cols': 3, 'rows': 2, 'bg': 'magenta',
     'poses': [('bask', '曬太陽'), ('sleep', '睡覺'), ('yawn', '打哈欠'),
               ('stretch', '伸懶腰'), ('hide', '縮進殼裡'), ('rest', '趴著休息')]},
    {'file': 'reference/sheets/sheet_c.png', 'cols': 3, 'rows': 2, 'bg': 'magenta',
     'poses': [('happy', '開心'), ('startled', '驚嚇'), ('angry', '生氣'),
               ('purr', '滿足'), ('think', '思考'), ('relax', '放鬆')]},
    {'file': 'reference/sheets/sheet_d.png', 'cols': 3, 'rows': 2, 'bg': 'magenta',
     'poses': [('swim', '游泳'), ('dive', '下潛'), ('rise', '上浮'),
               ('float', '漂浮'), ('drink', '淺水換氣'), ('nibble', '啃水草')]},
    {'file': 'reference/sheets/loop_swim.png', 'cols': 2, 'rows': 2, 'bg': 'magenta',
     'poses': [('swim_1', '游泳1'), ('swim_2', '游泳2'), ('swim_3', '游泳3'), ('swim_4', '游泳4')]},
    {'file': 'reference/sheets/loop_walk.png', 'cols': 2, 'rows': 2, 'bg': 'magenta',
     'poses': [('walk_1', '爬行1'), ('walk_2', '爬行2'), ('walk_3', '爬行3'), ('walk_4', '爬行4')]},
    {'file': 'reference/sheets/loop_wag.png', 'cols': 2, 'rows': 2, 'bg': 'magenta',
     'poses': [('wag_1', '搖尾巴1'), ('wag_2', '搖尾巴2'), ('wag_3', '搖尾巴3'), ('wag_4', '搖尾巴4')]},
]


def clean_alpha(cell: np.ndarray, bg: str) -> np.ndarray:
    """回傳 0~1 的不透明度。"""
    rgb = cell[..., :3].astype(np.float32)
    if bg == 'magenta':
        # 離洋紅色越遠越不透明
        d = np.sqrt(((rgb - [255, 0, 255]) ** 2).sum(-1))
        return np.clip((d - 60) / 90, 0, 1)
    a = cell[..., 3].astype(np.float32)
    return np.clip((a - 60) / 150, 0, 1)


def keep_main_blob(alpha: np.ndarray) -> np.ndarray:
    """只留下最大的一塊（烏龜本體），加上面積夠大、可能是身體一部分的區塊。"""
    solid = alpha > 0.5
    labels, n = ndimage.label(solid)
    if n == 0:
        return np.zeros_like(alpha)
    sizes = ndimage.sum(solid, labels, range(1, n + 1))
    keep_ids = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.25]
    mask = np.isin(labels, keep_ids)
    # 往外擴 2px，把反鋸齒的邊緣留住
    mask = ndimage.binary_dilation(mask, iterations=2)
    return alpha * mask


def find_shell(rgb: np.ndarray, alpha: np.ndarray):
    """背甲是偏暗、低飽和度的灰褐色（皮膚是飽和的橄欖綠、腹甲是亮米黃）。
    回傳 (中心x, 中心y, 寬度)；找不到回傳 None。"""
    c = rgb[..., :3].astype(np.float32)
    r, g = c[..., 0], c[..., 1]
    mx, mn = c.max(-1), c.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    lum = c @ [0.299, 0.587, 0.114]
    # 背甲偏紅褐（紅 ≥ 綠）、皮膚偏綠（綠 ≥ 紅）；背甲上的金色斑點靠後面的 closing 補起來
    m = (alpha > 0.8) & (lum < 150) & (r - g >= 2) & ((sat < 0.35) | (r - g > 20))
    k = max(3, round(alpha.shape[1] / 70))  # 格子越大，形態處理越強
    # 先把被盾片紋路切開的碎塊合起來，再去掉細長的腳
    core = ndimage.binary_closing(m, iterations=k)
    core = ndimage.binary_fill_holes(core)
    core = ndimage.binary_opening(core, iterations=k + 2)
    labels, n = ndimage.label(core)
    if n == 0:
        return None
    sizes = ndimage.sum(core, labels, range(1, n + 1))
    biggest = labels == (int(np.argmax(sizes)) + 1)
    # 背甲至少要佔整隻烏龜的 30%（翻身露出腹甲時會抓不到）
    if sizes.max() < (alpha > 0.5).sum() * 0.3:
        return None
    ys, xs = np.nonzero(biggest)
    x0, x1 = xs.min() - 3, xs.max() + 3
    return (x0 + x1) / 2, (ys.min() + ys.max()) / 2, x1 - x0


def process_sheet(spec, results, report):
    path = ROOT / spec['file']
    if not path.exists():
        return
    img = np.array(Image.open(path).convert('RGBA'))
    h, w = img.shape[:2]
    cw, ch = w / spec['cols'], h / spec['rows']
    # 第一輪：每格去背、找背甲
    cells = []
    for idx, (key, name) in enumerate(spec['poses']):
        r, c = divmod(idx, spec['cols'])
        cell = img[round(r * ch):round((r + 1) * ch), round(c * cw):round((c + 1) * cw)]
        alpha = keep_main_blob(clean_alpha(cell, spec['bg']))
        if alpha.max() == 0:
            report.append(f'  ✗ {key:9} {name}：這格是空的')
            continue
        cells.append((key, name, cell, alpha, find_shell(cell, alpha)))

    # 同一張表裡 GPT 畫的烏龜一樣大，用背甲寬的中位數決定縮放，避免個別格子偵測誤差造成忽大忽小
    widths = [sh[2] for *_, sh in cells if sh]
    if not widths:
        return
    scale = SHELL_W / float(np.median(widths))

    # 第二輪：縮放、以背甲中心對齊、輸出
    for key, name, cell, alpha, shell in cells:
        if shell:
            cx, cy = shell[0], shell[1]
        else:
            ys, xs = np.nonzero(alpha > 0.5)
            cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2

        rgba = cell.copy()
        if spec['bg'] == 'magenta':
            # 半透明的邊緣混到了洋紅色背景，把它扣掉，不然會有一圈粉紅邊
            a = np.maximum(alpha, 1e-3)[..., None]
            rgb = (cell[..., :3].astype(np.float32) - (1 - a) * [255, 0, 255]) / a
            rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        rgba[..., 3] = (alpha * 255).astype(np.uint8)
        rgba[alpha == 0] = 0
        src = Image.fromarray(rgba)
        src = src.resize((max(1, round(src.width * scale)), max(1, round(src.height * scale))), Image.LANCZOS)
        out = Image.new('RGBA', (OUT_SIZE, OUT_SIZE))
        ox, oy = round(ANCHOR[0] - cx * scale), round(ANCHOR[1] - cy * scale)
        out.alpha_composite(src, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))

        # 檢查有沒有被裁到
        bbox = src.getbbox()
        clipped = bbox and (ox + bbox[0] < 0 or oy + bbox[1] < 0 or
                            ox + bbox[2] > OUT_SIZE or oy + bbox[3] > OUT_SIZE)

        out.save(OUT / f'{key}.png', optimize=True)
        # 腳底（最低的不透明像素）在背甲中心下方多遠，以背甲寬為單位；遊戲用它讓烏龜貼地
        rows = np.nonzero(np.array(out)[..., 3].max(1) > 128)[0]
        bottom = (rows.max() - ANCHOR[1]) / SHELL_W if len(rows) else 0.4
        results[key] = {'file': f'{key}.png', 'name': name, 'source': spec['file'],
                        'shellFound': bool(shell), 'bottom': round(float(bottom), 3)}
        note = [] if shell else ['找不到背甲，改用整體範圍對齊']
        if clipped:
            note.append('超出邊界被裁切')
        if scale > (2.2 if spec is PROTO else 1.3):
            note.append(f'放大 {scale:.1f} 倍，會有點糊')
        report.append(f'  {"⚠" if note else "✓"} {key:9} {name} {"、".join(note)}')


def contact_sheet(results, path):
    keys = list(results)
    cols = 8
    size = 150
    rows = (len(keys) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * size, rows * size), (30, 60, 70))
    for i, key in enumerate(keys):
        im = Image.open(OUT / results[key]['file']).resize((size, size), Image.LANCZOS)
        r, c = divmod(i, cols)
        tile = Image.new('RGB', (size, size), (40, 80, 95) if (r + c) % 2 else (55, 95, 105))
        tile.paste(im, (0, 0), im)
        # 標出基準點
        ax, ay = ANCHOR[0] * size // OUT_SIZE, ANCHOR[1] * size // OUT_SIZE
        for d in range(-3, 4):
            tile.putpixel((ax + d, ay), (255, 80, 80))
            tile.putpixel((ax, ay + d), (255, 80, 80))
        sheet.paste(tile, (c * size, r * size))
    sheet.save(path)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results, report = {}, []
    for spec in [PROTO, *SHEETS]:
        if (ROOT / spec['file']).exists():
            report.append(spec['file'])
            process_sheet(spec, results, report)
    if not results:
        sys.exit('找不到任何姿勢表。')
    meta = {'size': OUT_SIZE, 'anchor': ANCHOR, 'shellWidth': SHELL_W, 'poses': results}
    (OUT / 'poses.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    preview = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT.parent.parent / 'reference' / 'poses_preview.png'
    contact_sheet(results, preview)
    print('\n'.join(report))
    print(f'\n共 {len(results)} 個姿勢 → {OUT}\n預覽圖 → {preview}')


if __name__ == '__main__':
    main()
