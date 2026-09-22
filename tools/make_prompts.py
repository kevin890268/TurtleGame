"""產生各品種的 GPT 姿勢圖提示詞，輸出到 assets/prompts/PROMPTS_<英文名>.md。

  python tools/make_prompts.py

版面規格（洋紅色背景、每格 512×512、姿勢順序）跟 tools/slice_poses.py 的 sheets_in() 對應，
所以生出來的圖放進 reference/sheets/<品種資料夾>/ 就能直接切。
外觀描述依據見 docs/species_traits.md 與 docs/species.md。

撰寫標準（每個動作都照這個寫，寫進每份 md 的開頭給使用者看）：
  1. 描述看得到的畫面：不寫「左腳／右腳」，寫「靠近觀眾的腳／遠離觀眾的腳」「往觀眾這邊／遠離觀眾」
  2. 講清楚哪些部位固定不動（循環動畫），切圖對齊後播放才不會晃
  3. 用熟悉的畫面比喻，讓 GPT 抓到感覺
  4. 放大這個動作的關鍵特徵（例如曬背時後腿伸直、腳底朝天）
  5. 動作要符合真實（烏龜走路是對角的兩隻腳一起動）
  6. 每格附中文說明，方便核對生出來的圖
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'prompts'

STANDARDS_ZH = """## 提示詞的撰寫標準

1. **描述看得到的畫面**：不寫「左腳／右腳」，改寫「靠近觀眾的腳／遠離觀眾的腳」「往觀眾這邊／遠離觀眾」。烏龜面向右時，牠的右側朝向觀眾，只寫左右 GPT 很容易搞混。
2. **講清楚哪些部位固定不動**：循環動畫都會指定固定的部位，切圖對齊後播放才不會整隻晃。
3. **用熟悉的畫面比喻**：例如「像落葉一樣漂浮」「像突然定格」，讓 GPT 抓到感覺。
4. **放大關鍵特徵**：例如曬背時後腿往後伸直、腳底朝天；伸長脖子時要伸到極限。
5. **動作符合真實**：烏龜走路是對角的兩隻腳一起動（靠近觀眾的前腳配遠離觀眾的後腳）。
6. **每格附中文說明**：方便你核對 GPT 生出來的圖有沒有畫對。"""

# ---------------- 共用的動作 ----------------
# 每格是 (中文說明, 英文提示)；品種可以在 cells 裡覆寫

DEFAULT_CELLS = {
    'sheet_a': [
        ('散步', 'WALKING mid-stride: the near front leg and the far hind leg step forward together (turtles '
                'move diagonal legs as a pair) while the other two push back; the shell is lifted clear of the '
                'ground, head forward and level, calm focused eyes'),
        ('慢慢爬', 'CRAWLING low and slow: the belly almost touching the ground, all four legs bent and splayed '
                 'wide, the far front leg reaching forward, head low and forward, a patient determined look'),
        ('張望', 'LOOKING AROUND: standing still on straight legs, neck raised at about 45 degrees, head turned '
               'slightly toward the viewer, eyes wide and alert'),
        ('伸長脖子', 'NECK STRETCHED TO THE MAX: the neck points almost straight up and is as long as it can '
                  'possibly be, showing its full length and markings, chin up, amazed curious eyes; the front '
                  'legs are straight, lifting the front of the body'),
        ('抬頭觀察', 'WATCHING SOMETHING FAR AWAY: neck extended forward and slightly up, head level, eyes '
                  'focused into the distance, body leaning a little forward, one front foot lifted mid-step as '
                  'if it froze'),
        ('低頭聞聞', 'SNIFFING THE GROUND: head lowered all the way down, nose touching the ground just in front '
                  'of the front feet, neck curved downward, the back end a little higher than the front, eyes '
                  'looking down'),
    ],
    'sheet_b': [
        ('曬背', 'BASKING in warm light: belly flat on the ground, neck stretched forward and upward toward the '
               'light, eyes closed in bliss, front legs spread out to the sides, and BOTH HIND LEGS STRETCHED '
               'STRAIGHT BACKWARDS behind the shell with the soles of the hind feet turned up toward the sky'),
        ('睡覺', 'SLEEPING: lying flat, head pulled halfway into the shell so only the face shows at the '
               'opening, eyes closed, a peaceful expression, legs tucked in close'),
        ('打哈欠', 'BIG YAWN: head tilted back and up, mouth opened as wide as possible showing the pink inside, '
                'eyes squeezed shut, front legs pushing the body up a little'),
        ('伸懶腰', 'LAZY FULL-BODY STRETCH: front legs pushed far forward, neck stretched out long and low, hind '
                'legs pushed straight back, the whole body as long as it can be, eyes closed, a satisfied look'),
        ('縮進殼裡', 'HIDING IN THE SHELL: head and all four legs pulled completely inside; only the tip of the '
                  'snout and two closed eyes peek out of the front opening; the shell rests flat on the ground'),
        ('趴著休息', 'RESTING: lying flat with the chin resting on the ground, legs relaxed and loosely spread, '
                  'half-closed sleepy eyes'),
    ],
    'sheet_c': [
        ('開心', 'HAPPY: head raised toward the viewer, mouth open in a big smile, eyes sparkling, the front of '
               'the body lifted a little as if bouncing'),
        ('驚嚇', 'STARTLED: neck shot straight up in surprise, eyes as wide and round as possible, the body '
               'leaning back onto the hind legs, front feet lifted slightly off the ground'),
        ('生氣', 'GRUMPY: frowning eyebrows, head pulled back a little into the shell, mouth pressed into a pout, '
               'eyes glancing sideways at the viewer'),
        ('滿足', 'CONTENT: settled comfortably, eyes closed into happy curves, a gentle closed-mouth smile, '
               'cheeks slightly rosy'),
        ('思考', 'THINKING: head tilted to one side, eyes looking up and away, mouth slightly open, as if '
               'pondering a question'),
        ('放鬆', 'RELAXED: standing calmly on all four legs, neck at a gentle easy angle, eyes closed, a '
               'peaceful smile'),
    ],
    'sheet_d': [
        ('游泳', 'SWIMMING: body level, neck stretched forward, the near front leg in the middle of a strong '
               'stroke sweeping backward, the far front leg reaching forward, hind legs kicking; a streamlined, '
               'purposeful pose'),
        ('下潛', 'DIVING DOWN: the whole body tilted nose-down about 40 degrees, neck stretched toward the bottom, '
               'front legs pulling back, hind legs kicking up behind'),
        ('上浮', 'RISING TO THE SURFACE: the whole body tilted nose-up about 40 degrees, neck stretched up toward '
               'the surface, nostrils leading, front legs sweeping down'),
        ('漂浮', 'FLOATING LAZILY: body level and relaxed, all four legs spread wide and limp, neck loose, eyes '
               'half closed, drifting like a leaf on the water'),
        ('淺水換氣', 'BREATHING IN SHALLOW WATER: standing on the bottom with the body level, only the neck '
                  'stretched straight up, nose pointing up as if poking the nostrils out of the water surface, '
                  'calm eyes'),
        ('咬食物', 'EATING: neck extended forward, mouth closed on a small brown food pellet, cheeks puffed, '
                 'happy eyes'),
    ],
}

SHEETS = [
    ('sheet_a', '姿勢表 A：日常', 'NO text, NO numbers, NO labels, NO sound effects, NO symbols, NO sparkles', True),
    ('sheet_b', '姿勢表 B：休息', 'NO text, NO numbers, NO labels, NO "zzz", NO sun, NO music notes, NO symbols', True),
    ('sheet_c', '姿勢表 C：心情反應', 'NO text, NO numbers, NO labels, NO symbols, NO speech bubbles, NO hearts, NO lines', True),
    ('sheet_d', '姿勢表 D：水中動作', 'NO water, NO bubbles, NO ripples, NO text, NO numbers, NO symbols', False),
]

# 循環幀：(檔名, 標題, 固定不動的部分, 這個動作, [(中文, 英文) × 4])
LOOPS = {
    'loop_swim': (
        '循環幀 E：游泳 4 幀',
        'body level and horizontal, neck extended forward; the shell and head stay in EXACTLY the same '
        'place in all four cells, only the legs move',
        'A looping SWIM cycle, smooth and rhythmic like a paddle stroke:',
        [
            ('前腳往前伸到最長', 'the near front leg reaches forward at full extension while the near hind leg is pulled in'),
            ('前腳往下往後划（出力）', 'the near front leg sweeps down and back in a strong power stroke, the hind legs kick backward'),
            ('前腳貼著殼往後收', 'the near front leg lies flat back along the side of the shell, the hind legs fully extended behind'),
            ('四肢放鬆往前滑回', 'all legs glide forward again, relaxed, halfway back to frame 1'),
        ],
    ),
    'loop_walk': (
        '循環幀 F：爬行 4 幀',
        'all feet on the same ground line at 75% of the cell height; the head stays level and the shell '
        'stays in the same place, only the legs and a tiny body bob change',
        'A looping slow WALK cycle. Turtles move DIAGONAL legs as a pair:',
        [
            ('近前腳＋遠後腳往前', 'the near front leg and the far hind leg step forward together, the other two push back'),
            ('四隻腳都在身體下面，殼抬到最高', 'all four feet under the body, the shell at its highest point'),
            ('遠前腳＋近後腳往前', 'the far front leg and the near hind leg step forward together, the other two push back'),
            ('四隻腳又回到下面，殼微微沉下', 'all four feet under the body again, the shell dips slightly lower and the head bobs down a little'),
        ],
    ),
    'loop_wag': (
        '循環幀 G：搖尾巴 4 幀',
        'standing on all four legs with a happy face looking up at the viewer; the head, shell and legs stay '
        'in EXACTLY the same place in all four cells, only the short tail moves',
        'A looping happy TAIL-WAG cycle, quick and cheerful like a puppy:',
        [
            ('尾巴甩向觀眾', 'the short tail swung up and TOWARD THE VIEWER'),
            ('尾巴回到中間', 'the tail in the middle, pointing straight back'),
            ('尾巴甩到遠側（被殼擋住一半）', 'the tail swung AWAY FROM THE VIEWER, half hidden behind the shell'),
            ('尾巴回到中間、往上一翹', 'the tail back in the middle with a little upward flick'),
        ],
    ),
}

# 搖屁屁：動作比較複雜，另外寫
SHAKE_TABLE = """| 格 | 動作 | 看得到什麼 |
|---|---|---|
| 1 左上 | 正中間：屁股翹最高，後腿幾乎伸直，尾巴朝上 | 背甲側面 |
| 2 右上 | 屁股往**觀眾這邊**甩，後半個殼跟著翻過來 | **看得到米黃色的腹甲邊緣**和近側後腿內側 |
| 3 左下 | 回到中間、往下輕輕彈一下，後腿微彎 | 背甲側面 |
| 4 右下 | 屁股往**遠離觀眾**的方向甩，殼翻過去 | **腹甲被藏住**，看到更多背甲的圓頂 |

頭和前腳在 4 格裡都固定不動，只有後半身在動。"""


def shake_prompt(character):
    return f"""2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

{character}

THE ACTION: a joyful BUTT WIGGLE, the turtle shaking its bottom like an excited puppy
that wants to play.
- The FRONT END is planted and does NOT move between frames: the head, neck and both
  front legs stay in exactly the same position and size in all four cells. The head is
  low and pushed forward, the front legs are bent with elbows out and the chin is close
  to the ground, like a playful "play bow".
- The BACK END is lifted HIGH: both hind legs are pushed out almost STRAIGHT, raising the
  rear edge of the shell well above the front, so the whole shell tilts nose-down about
  20 degrees. The rear rim of the shell is clearly higher than the head.
- The short tail sticks up and flicks with every wiggle.
- Face: squinting happy eyes and a wide open-mouth smile, having the time of its life.

Every cell: the same turtle at the same size, three-quarter side view, body facing RIGHT,
all feet standing on the same ground line at 78% of the cell height.
Background perfectly flat solid magenta #FF00FF. NO motion lines, NO sweat drops,
NO sparkles, NO text, NO ground, NO shadow.

A looping 4-frame wiggle. Only the raised back end moves, swinging and ROLLING from side
to side like a pendulum, so the shell turns a little with every swing:
Frame 1 (top-left): CENTER. The rear is lifted to its highest point straight behind,
  hind legs nearly straight, tail pointing up.
Frame 2 (top-right): the rear swings TOWARD THE VIEWER. The back half of the shell rolls
  toward us, so we can clearly see its underside: the cream-yellow edge of the plastron
  and the soft inner side of the near hind leg are showing. The near hind leg is fully
  straight, the far hind leg bends. The tail flicks toward the viewer.
Frame 3 (bottom-left): CENTER again with a little bounce: the rear dips slightly lower
  than in frame 1, hind legs a little bent, tail curling.
Frame 4 (bottom-right): the rear swings AWAY FROM THE VIEWER. The back half of the shell
  rolls away from us, so the underside is completely hidden and we see more of the domed
  top of the carapace. The near hind leg is bent and tucked in, the far hind leg is
  straight and partly hidden behind the shell. The tail flicks away."""


# ---------------- 各品種 ----------------
# folder：原始圖放在哪個資料夾（reference/sheets/<品種>/）
# ref_done：定裝照已經有了（斑龜用 proto_36.png 和正式版姿勢表，麝香龜已有 musk_ref.png）
# cells：覆寫某幾格 {(姿勢表, 第幾格): (中文, 英文)}；loops：覆寫循環幀的說明

SPECIES = [
    {
        'file': 'PROMPTS_STRIPE_NECKED_TURTLE.md',
        'id': 'bangui', 'folder': 'reference/sheets/bangui', 'ref_done': True,
        'zh': '斑龜', 'en': 'Chinese stripe-necked turtle', 'latin': 'Mauremys sinensis',
        'look_zh': [
            '背甲深橄欖褐色，盾片之間有細細的金色接縫和小斑點',
            '腹甲米黃色',
            '**頭、脖子、四肢和尾巴有很多細細的黃綠色縱紋**（斑龜最明顯的特徵）',
            '眼睛圓而深色，**眼後沒有紅斑**（不是巴西龜）',
        ],
        'behavior_zh': ['台灣原生，游泳和曬背都很平均', '溫馴，適應環境快；四肢伸得長長的表示有安全感'],
        'character': (
            'the same young Chinese stripe-necked turtle (Mauremys sinensis) as the attached reference: dark '
            'olive-brown carapace with thin golden seams and small speckles, cream-yellow plastron, olive-green '
            'skin with MANY thin yellow-green stripes running along the head, neck, legs and tail, round dark eyes'
        ),
        'not': 'NO red patch behind the eye (this is NOT a red-eared slider)',
        'cells': {},
        'loops': {},
        'note_zh': ('斑龜的定裝照、姿勢表 A～D 和游泳、爬行、搖尾巴循環都已經有了。'
                    '**目前只缺新版的搖屁屁**；其他段落是照新標準改寫的版本，想重生更好的圖時可以用。'),
    },
    {
        'file': 'PROMPTS_MUSK_TURTLE.md',
        'id': 'musk', 'folder': 'reference/sheets/musk', 'ref_done': True,
        'zh': '麝香龜（蛋龜）', 'en': 'common musk turtle', 'latin': 'Sternotherus odoratus',
        'look_zh': [
            '**小型、背甲高高拱起**，平滑橢圓形，深橄欖褐到接近黑色',
            '**腹甲很小**，淺米黃色，腹甲和背甲之間看得到皮膚',
            '皮膚深灰橄欖色，**四肢和脖子沒有黃色條紋**',
            '**頭兩側各有兩條淺黃色細線**（一條經過眼睛上方、一條在眼睛下方），下巴和喉嚨有**小肉鬚**',
            '吻部尖、脖子相對長、腳短短胖胖',
        ],
        'behavior_zh': ['**很少游泳、大多在水底走路**，游泳時笨笨的', '**很少上岸曬背**',
                        '常常站在水底、把脖子伸得長長的到水面換氣，像呼吸管', '受驚時會放出臭味、會張嘴想咬人'],
        'character': (
            'the same young common musk turtle (Sternotherus odoratus) as musk_ref.png: a small, HIGH-DOMED, '
            'smooth oval carapace, dark olive-brown to almost black; a very SMALL cream plastron with dark skin '
            'showing between plastron and shell; dark grey-olive skin with NO stripes on the legs or neck; TWO '
            'thin pale yellow stripes on each side of the head (one above the eye, one below it along the jaw); '
            'small fleshy barbels on the chin; a pointed snout and short stubby legs'
        ),
        'not': 'NOT a Chinese stripe-necked turtle, NOT a red-eared slider',
        'cells': {
            ('sheet_a', 0): ('在水底散步', 'WALKING ALONG THE BOTTOM: head held low and pushed forward like a little '
                           'bulldozer, the near front leg and the far hind leg stepping forward together, the shell '
                           'close to the ground'),
            ('sheet_b', 0): ('趴著取暖（很少曬背）', 'WARMING UP LAZILY: lying flat, legs loosely spread out, neck '
                           'relaxed forward, eyes half closed, content (musk turtles rarely bask, so this is a '
                           'low, lazy pose, not a stretched-out one)'),
            ('sheet_c', 2): ('防衛、想咬人', 'DEFENSIVE AND GRUMPY: neck stretched forward, mouth open as if about to '
                           'snap, frowning eyes; cute, not scary'),
            ('sheet_d', 0): ('笨笨地游泳', 'SWIMMING CLUMSILY: paddling hard with all four stubby legs at once, neck '
                           'forward, a determined but slightly flustered look'),
            ('sheet_d', 4): ('呼吸管換氣', 'SNORKELING: standing on the bottom with the body level and the neck '
                           'stretched STRAIGHT UP as far as it goes, nostrils at the very top as if breathing at the '
                           'surface, calm eyes'),
        },
        'loops': {
            'loop_swim': 'A looping, slightly CLUMSY swim cycle; the short legs paddle a bit unevenly, cute and determined:',
        },
        'note_zh': '麝香龜的定裝照、姿勢表 A～D 和 4 組循環幀都已經有了。這份是照新標準改寫的版本，想重生更好的圖時可以用。',
    },
    {
        'file': 'PROMPTS_MAP_TURTLE.md',
        'id': 'map', 'folder': 'reference/sheets/map',
        'zh': '密西西比地圖龜', 'en': 'Mississippi map turtle', 'latin': 'Graptemys pseudogeographica kohnii',
        'look_zh': [
            '背甲橄欖色到褐色，每片盾片有**黃色的網狀／橢圓形花紋（像地圖）**，側盾有深色斑塊',
            '**背甲中線有一排突起的稜**（小時候特別明顯，像一排小尖角），**後緣呈鋸齒狀**',
            '頭、脖子和四肢是橄欖褐色，有很多細黃線',
            '**每隻眼睛後方有一個黃色的新月形斑**',
            '腹甲淡黃色',
        ],
        'behavior_zh': ['非常會游泳', '**非常愛曬背**，連小龜也一樣，常常整天趴在曬台上', '膽子小、容易緊張', '對水質很敏感'],
        'character': (
            'a young Mississippi map turtle (Graptemys pseudogeographica kohnii): an olive-brown carapace with '
            'fine yellow net-like "map" lines on every scute and a dark blotch on each side scute; a raised '
            'central keel with a row of small dark-tipped KNOBS along the spine like a tiny mountain ridge; a '
            'SERRATED rear edge of the shell; a pale yellow plastron; olive-brown skin with many thin yellow '
            'stripes; and a distinctive yellow CRESCENT-shaped mark behind each eye'
        ),
        'not': 'NOT a red-eared slider (no red patch), NOT a Chinese stripe-necked turtle',
        'cells': {
            ('sheet_b', 0): ('曬背（最愛）', 'BASKING, its favourite thing in the world: belly flat on the ground, '
                           'neck stretched far forward and up toward the light, eyes closed in pure bliss, front legs '
                           'spread wide to the sides, and BOTH HIND LEGS STRETCHED STRAIGHT BACKWARDS with the soles '
                           'turned up toward the sky'),
            ('sheet_c', 1): ('嚇到縮頭（膽小）', 'STARTLED AND SHY: the head yanked halfway back into the shell, eyes '
                           'wide open and worried, the body leaning back, front feet lifted slightly'),
        },
        'loops': {},
    },
    {
        'file': 'PROMPTS_RED_EARED_SLIDER.md',
        'id': 'slider', 'folder': 'reference/sheets/slider',
        'zh': '巴西龜（紅耳龜）', 'en': 'red-eared slider', 'latin': 'Trachemys scripta elegans',
        'look_zh': [
            '小時候背甲是**鮮綠色**，有黃綠色的線條和漩渦紋，中線有低低的稜',
            '腹甲黃色，每片上有深色圓斑',
            '皮膚綠色，有黃色條紋',
            '**每隻眼睛後方有一條寬寬的紅色斑**（「紅耳」的由來）',
        ],
        'behavior_zh': ['游泳能力好', '愛曬背', '食量大、什麼都吃、很親人', '遊戲裡是「被棄養的收容龜」，表情可以帶一點委屈但很快變開心'],
        'character': (
            'a young red-eared slider (Trachemys scripta elegans): a bright green carapace with yellow-green lines '
            'and swirls and a low keel, a yellow plastron with a dark round spot on each scute, green skin with '
            'yellow stripes, and a wide bright RED stripe behind each eye'
        ),
        'not': 'NOT a map turtle, NOT a Chinese stripe-necked turtle',
        'cells': {
            ('sheet_c', 0): ('開心討食', 'HAPPY AND HUNGRY: head raised toward the viewer, mouth open in a big begging '
                           'smile, eyes sparkling, front feet paddling in the air with excitement'),
        },
        'loops': {},
    },
    {
        'file': 'PROMPTS_PAINTED_TURTLE.md',
        'id': 'painted', 'folder': 'reference/sheets/painted',
        'zh': '錦龜', 'en': 'eastern painted turtle', 'latin': 'Chrysemys picta picta',
        'look_zh': [
            '背甲**平滑、偏扁、沒有稜**，深橄欖色到黑色，盾片之間的接縫有淡黃色的邊',
            '**背甲邊緣（緣盾）有紅色和黑色的條紋**',
            '頭是深色、有黃色條紋，眼睛後方有黃色小斑點',
            '**脖子和四肢有紅色條紋**',
            '腹甲黃色',
        ],
        'behavior_zh': ['游泳能力好', '愛曬背', '個性活潑'],
        'character': (
            'a young eastern painted turtle (Chrysemys picta picta): a smooth, slightly flattened dark olive-black '
            'carapace with NO keel, the seams between scutes edged in pale yellow, RED and black bars along the rim '
            'of the shell, a dark head with yellow stripes and small yellow spots behind the eyes, RED stripes on '
            'the neck and legs, and a plain yellow plastron'
        ),
        'not': 'NOT a red-eared slider (no red patch behind the eye)',
        'cells': {},
        'loops': {},
    },
    {
        'file': 'PROMPTS_RAZORBACK_MUSK_TURTLE.md',
        'id': 'razorback', 'folder': 'reference/sheets/razorback',
        'zh': '剃刀龜', 'en': 'razor-backed musk turtle', 'latin': 'Sternotherus carinatus',
        'look_zh': [
            '**背甲中線像屋頂一樣尖尖地隆起**（剃刀背），兩側是陡坡',
            '背甲淺褐色到棕褐色，布滿**黑色小斑點**，盾片邊緣較深',
            '腹甲小',
            '皮膚灰褐色，頭上有深色小斑點；吻部尖長，腳短',
        ],
        'behavior_zh': ['跟麝香龜是近親，也常在水底走路', '比麝香龜稍微大一點'],
        'character': (
            'a young razor-backed musk turtle (Sternotherus carinatus): a steep, ROOF-SHAPED carapace with a sharp '
            'central ridge like the edge of a razor, light tan to brown with many small black spots and darker '
            'scute edges, a small plastron, grey-brown skin with small dark spots on the head, a long pointed '
            'snout and short stubby legs'
        ),
        'not': 'NOT a common musk turtle (the shell is steep and roof-like, not a smooth dome)',
        'cells': {
            ('sheet_a', 0): ('在水底散步', 'WALKING ALONG THE BOTTOM: head held low and forward, the near front leg '
                           'and the far hind leg stepping forward together, the tall roof-shaped shell proudly up'),
            ('sheet_d', 0): ('有點笨拙地游泳', 'SWIMMING a little clumsily: paddling with all four legs at once, neck forward'),
            ('sheet_d', 4): ('呼吸管換氣', 'SNORKELING: standing on the bottom with the neck stretched STRAIGHT UP, '
                           'nostrils at the very top as if breathing at the surface'),
        },
        'loops': {},
    },
    {
        'file': 'PROMPTS_STRIPED_MUD_TURTLE.md',
        'id': 'stripedmud', 'folder': 'reference/sheets/stripedmud',
        'zh': '條紋動胸龜', 'en': 'striped mud turtle', 'latin': 'Kinosternon baurii',
        'look_zh': [
            '**背甲沿長軸有三條淺黃色縱紋**（最明顯的特徵，其中一條在正中央），底色橄欖褐色，平滑的低矮橢圓形',
            '**腹甲前後各有一片活動的鉸鏈，可以像蓋子一樣闔起來、幾乎完全封住**（跟麝香龜／剃刀龜只有一小片固定腹甲不一樣）',
            '頭兩側各有兩條淺黃色細線，一條經過眼睛上方、一條在下方沿著嘴邊',
            '皮膚深橄欖色，吻部尖，腳短短的',
        ],
        'behavior_zh': ['跟麝香龜是近親，很少游泳，大多在水底走路', '很少上岸曬背',
                        '受到威脅時可以把頭尾和四肢完全收進殼裡、再闔起雙鉸鏈腹甲保護自己（麝香龜做不到這件事）'],
        'character': (
            'a young striped mud turtle (Kinosternon baurii): a smooth, low oval olive-brown carapace with THREE '
            'pale yellow stripes running lengthwise down the back (one right along the center); a small tan '
            'plastron with TWO well-developed hinges, front and back, that can close up almost completely like a '
            'lid; dark olive skin with two thin pale yellow stripes on each side of the head (one above the eye, '
            'one below it along the jaw); a pointed snout and short stubby legs'
        ),
        'not': 'NOT a common musk turtle (this one has three pale stripes down the shell and a double-hinged plastron that closes almost shut)',
        'cells': {
            ('sheet_a', 0): ('在水底散步', 'WALKING ALONG THE BOTTOM: head held low and forward like a little '
                           'bulldozer, the near front leg and the far hind leg stepping forward together, the low '
                           'oval shell close to the ground'),
            ('sheet_b', 4): ('闔起雙鉸鏈腹甲躲起來', 'CLOSING UP TIGHT: head, tail and all four legs pulled fully '
                           'inside, and the FRONT AND BACK OF THE PLASTRON HINGE UPWARD AND CLOSE like a box lid, '
                           'almost completely sealing the shell shut'),
            ('sheet_d', 0): ('有點笨拙地游泳', 'SWIMMING a little clumsily: paddling with all four short legs at '
                           'once, neck forward, a determined but slightly flustered look'),
            ('sheet_d', 4): ('呼吸管換氣', 'SNORKELING: standing on the bottom with the body level and the neck '
                           'stretched STRAIGHT UP as far as it goes, nostrils at the very top as if breathing at '
                           'the surface, calm eyes'),
        },
        'loops': {
            'loop_swim': 'A looping, slightly CLUMSY swim cycle; the short legs paddle a bit unevenly, cute and determined:',
        },
    },
    {
        'file': 'PROMPTS_EUROPEAN_POND_TURTLE.md',
        'id': 'european', 'folder': 'reference/sheets/european',
        'zh': '歐洲澤龜', 'en': 'European pond turtle', 'latin': 'Emys orbicularis',
        'look_zh': [
            '背甲深褐色到黑色，橢圓形、稍微扁平',
            '**背甲和皮膚上布滿黃色小點**，背甲上的黃點會呈放射狀排列',
            '腹甲偏黃，有深色斑塊',
        ],
        'behavior_zh': ['典型的澤龜：游泳和曬背都很平均', '個性比較怕生'],
        'character': (
            'a young European pond turtle (Emys orbicularis): a dark brown to black oval, slightly flattened '
            'carapace sprinkled with many small yellow dots in radiating lines like tiny stars, dark skin also '
            'covered with small yellow dots, and a yellowish plastron with dark patches'
        ),
        'not': 'NOT a Chinese stripe-necked turtle (dots, not stripes)',
        'cells': {},
        'loops': {},
    },
    {
        'file': 'PROMPTS_EASTERN_LONG_NECKED_TURTLE.md',
        'id': 'longneck', 'folder': 'reference/sheets/longneck',
        'zh': '東部長頸龜', 'en': 'eastern long-necked turtle', 'latin': 'Chelodina longicollis',
        'look_zh': [
            '**側頸龜**：脖子又細又長，**幾乎跟殼一樣長**',
            '休息或受驚時，**脖子是往側邊折起來、把頭塞到殼的邊緣底下**，不是往後縮進殼裡',
            '背甲寬扁的橢圓形，褐色',
            '腹甲米色，接縫是深色的；頭小、眼睛圓',
        ],
        'behavior_zh': ['游泳能力好', '會曬背', '造型特別，動作表情可以誇張一點'],
        'character': (
            'a young eastern long-necked turtle (Chelodina longicollis), a SIDE-NECKED turtle: a very long, thin '
            'neck almost as long as the shell, a broad flat oval brown carapace, a cream plastron with dark seams, '
            'a small head with round eyes, and webbed clawed feet. When it hides, it folds the neck SIDEWAYS and '
            'tucks the head under the front rim of the shell (it can NOT pull the head straight back)'
        ),
        'not': 'NOT a normal pond turtle: the neck is extremely long',
        'cells': {
            ('sheet_a', 3): ('脖子伸到最長', 'NECK STRETCHED TO ITS FULL AMAZING LENGTH: the long thin neck rises '
                           'straight up like a periscope, almost as tall as the shell is long, curious eyes'),
            ('sheet_b', 1): ('睡覺（脖子側折）', 'SLEEPING: the long neck folded SIDEWAYS along the front of the shell, '
                           'the head resting under the shell rim, eyes closed'),
            ('sheet_b', 4): ('躲起來（脖子側折）', 'HIDING: the long neck folded SIDEWAYS, head tucked under the front '
                           'rim of the shell, legs pulled in'),
        },
        'loops': {},
    },
]

# ---------------- 產生 ----------------


def attachments(sp):
    if sp['id'] == 'bangui':
        return ('Attached image: the finished pose sheet of this turtle; use it as the EXACT character design '
                'and art style.')
    return (f'Attached images: (1) {sp["id"]}_ref.png is the EXACT character design; (2) the other image is '
            'the ART STYLE and layout reference only (do not copy that turtle\'s species).')


def character_rules(sp):
    return (f'{attachments(sp)}\n\n'
            f'Character: {sp["character"]}.\n'
            f'{sp["not"]}. Soft hand-painted storybook watercolor style with clean dark brown outlines.')


def cells_for(sp, key):
    cells = list(DEFAULT_CELLS[key])
    for (sheet, i), cell in sp['cells'].items():
        if sheet == key:
            cells[i] = cell
    return cells


def sheet_prompt(sp, key, forbid, landlike):
    placement = ('shell centered horizontally slightly left of center, leave room for the head'
                 if landlike else 'the shell centered in the cell')
    ground = ('\n- land poses: all feet on the same ground line at 75% of the cell height' if landlike else '')
    lines = '\n'.join(f'{i + 1}. {en}' for i, (_, en) in enumerate(cells_for(sp, key)))
    return f'''2D game character pose sheet, 1536x1024 image, a grid of 3 columns x 2 rows = six
512x512 cells, no grid lines, no borders.

{character_rules(sp)}

Rules for EVERY cell:
- exactly one turtle, full body, three-quarter side view, body facing RIGHT
  (so the turtle's right side faces the viewer: "near" legs are closest to us)
- the same turtle size in every cell: shell length about 45% of the cell width
- {placement}{ground}
- background: perfectly flat solid magenta #FF00FF, no gradient, no shadow, no ground
- {forbid}

Cells (left to right, top row then bottom row):
{lines}'''


def loop_prompt(sp, key):
    _, fixed, intro, frames = LOOPS[key]
    intro = sp['loops'].get(key, intro)
    names = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    lines = '\n'.join(f'Frame {i + 1} ({names[i]}): {en}.' for i, (_, en) in enumerate(frames))
    return f'''2D game animation frames, 1024x1024 image, a 2x2 grid of four 512x512 cells,
no grid lines.

{character_rules(sp)}

Every cell: the same turtle at exactly the same size (shell length about 45% of the cell
width), three-quarter side view, facing RIGHT, {fixed}.
Background perfectly flat solid magenta #FF00FF. No water, no ground, no motion lines, no text.

{intro}
{lines}'''


def ref_prompt(sp):
    return f'''Character design reference for a 2D game. Match the ART STYLE of the attached reference
image exactly (soft hand-painted storybook watercolor coloring, clean dark brown outlines,
cute proportions), but draw a DIFFERENT species described below.

Character: {sp["character"]}.
{sp["not"]}.

Pose: standing calmly, three-quarter side view, body facing RIGHT, neck relaxed, all four
legs visible. One single turtle, centered, full body.
Background: perfectly flat solid magenta #FF00FF, no ground, no scenery, no text, no shadow.
Square image 1024x1024, the shell length is about 45% of the image width.'''


def zh_table(rows, header='格'):
    names = ['1 左上', '2 中上', '3 右上', '4 左下', '5 中下', '6 右下'] if len(rows) == 6 else \
            ['1 左上', '2 右上', '3 左下', '4 右下']
    body = '\n'.join(f'| {names[i]} | {zh} |' for i, zh in enumerate(rows))
    return f'| {header} | 動作 |\n|---|---|\n{body}'


def build(sp):
    folder = sp['folder']
    look = '\n'.join(f'- {x}' for x in sp['look_zh'])
    behavior = '\n'.join(f'- {x}' for x in sp['behavior_zh'])
    if sp['id'] == 'bangui':
        steps = f'''1. 每張都在**新的對話**裡生成，上傳 `reference/sheets/bangui/sheet_a.png`（斑龜正式版姿勢表）當角色和畫風參考
2. 直接複製下面的完整提示詞
3. 存到 `{folder}/`，檔名照各段標示的名稱，再執行 `python tools/slice_poses.py bangui`'''
    else:
        steps = f'''1. **先做定裝照（第 0 步）**：上傳 `reference/sheets/bangui/sheet_a.png`（斑龜的姿勢表）當畫風參考，滿意後存成 `{folder}/{sp["id"]}_ref.png`
2. 之後每張都在**新的對話**裡生成，上傳兩張圖：
   - `{sp["id"]}_ref.png`：角色參考
   - `reference/sheets/bangui/sheet_a.png`：畫風參考（斑龜的姿勢表，讓各品種畫風和大小一致）
3. 直接複製下面的完整提示詞
4. 存到 `{folder}/`，檔名照各段標示的名稱，再執行 `python tools/slice_poses.py {sp["id"]}`'''
    note = f'\n> {sp["note_zh"]}\n' if sp.get('note_zh') else ''
    registered = '' if sp['id'] in ('bangui', 'musk', 'map', 'slider', 'painted') else \
        '\n> 這個品種還沒登記進 `js/species.js` 和 `tools/slice_poses.py`，生好圖之後要先登記，遊戲和切圖工具才認得它。\n'

    parts = [f'''# {sp["zh"]}姿勢圖：GPT 產圖提示詞

品種：**{sp["zh"]}**（{sp["en"]}）*{sp["latin"]}*。品種資料見 [docs/species.md](../../docs/species.md)、[docs/species_traits.md](../../docs/species_traits.md)。

> 這份檔案由 `tools/make_prompts.py` 產生，要修改請改那支程式再重新執行。
{note}{registered}
## 外觀重點

{look}

## 行為特色

{behavior}

{STANDARDS_ZH}

---

## 使用步驟

{steps}

背景一律是**純洋紅色 #FF00FF**。GPT 的「透明背景」其實是半透明加雜訊，切圖工具處理洋紅色最乾淨。

---
''']
    if not sp.get('ref_done'):
        parts.append(f'## 第 0 步：定裝照｜`{sp["id"]}_ref.png`\n\n```\n{ref_prompt(sp)}\n```\n\n---\n')
    for key, title, forbid, landlike in SHEETS:
        table = zh_table([zh for zh, _ in cells_for(sp, key)])
        parts.append(f'## {title}｜`{key}.png`\n\n{table}\n\n```\n{sheet_prompt(sp, key, forbid, landlike)}\n```\n')
    for key, (title, *_rest) in LOOPS.items():
        table = zh_table([zh for zh, _ in LOOPS[key][3]])
        parts.append(f'## {title}｜`{key}.png`\n\n{table}\n\n```\n{loop_prompt(sp, key)}\n```\n')
    parts.append(f'## 循環幀 H：搖屁屁 4 幀｜`loop_shake.png`\n\n{SHAKE_TABLE}\n\n```\n{shake_prompt(character_rules(sp))}\n```\n')
    parts.append(f'''---

## 生成後的檢查清單

- [ ] 是{sp["zh"]}：{"；".join(x.replace("**", "") for x in sp["look_zh"][:2])}
- [ ] 每一格都照上面的中文說明畫對了（特別注意哪隻腳在前、身體往哪邊斜）
- [ ] 背景是純洋紅色，沒有文字、泡泡、動態線、符號
- [ ] 每格烏龜大小大致相同，全部面向右邊
- [ ] 循環動畫裡固定的部位真的沒有動
- [ ] 烏龜沒有超出格子邊界
''')
    return '\n'.join(parts)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for sp in SPECIES:
        (OUT / sp['file']).write_text(build(sp), encoding='utf-8')
        print(f'{sp["file"]}  ← {sp["zh"]}')


if __name__ == '__main__':
    main()
