#!/usr/bin/env python3
"""gen.py = the source of index.html and bd/<slug>.html. Content lives in CONTENT below, images in assets/manifest.json.
Run: python3 gen.py   (then ./OUVRIR.command)"""
import json, pathlib, html
ROOT = pathlib.Path(__file__).parent
M = json.load(open(ROOT / "assets/manifest.json"))

# ---- content (French, spoken) ----
NAME = "Elise Pansier"
MAIL = "elise.pansier@gmail.com"
INSTA = "https://www.instagram.com/pain_.au_chocolat/"
LINKEDIN = "https://www.linkedin.com/in/elise-pansier-31a0bb278/"
TAGLINE = "Bande dessinée, dessin, encre."
CITY = "Paris"
ABOUT_BIG = "Pas encore une artiste"          # her Instagram bio, verbatim
ABOUT = []
# plate = background of the full-screen block on the home; dark = light text + no multiply
STRIPS = [
    dict(id="dieu-s-en-tappe", title="Dieu s'en tappe !", sub="Une histoire courte. Encre et feutre.", plate="#ff48b0", dark=False, year="2026"),
    dict(id="hymen", title="Hymen", sub="Est-ce toi, Mirage ? Rouge sur blanc.", plate="#f3efe6", dark=False, year="2026", cover="plan-de-travail-6"),
    dict(id="poisson-pas-ne", title="Poisson pas‑né", sub="Bleu stylo sur papier.", plate="#0078bf", dark=True, year="2026", cover="plan-de-travail-7"),
    dict(id="drunker", title="Drunker", sub="La plus longue. À descendre lentement.", plate="#141414", dark=True, year="2026", cover="bunker-irl"),   # TODO confirm: Bunker I.R.L = cover of Drunker?
]
SERIES = [  # illustration series: viewer page like a bande, listed under Dessins, not in the BD count
    dict(id="invasion", title="Invasion", sub="Aquarelle, 25 × 35 cm. Onze pages.", plate="#0078bf", dark=True, year="2025"),
]
DRAWINGS = [
    dict(id="saltimbanques", title="Saltimbanques", plate="#f3efe6"),
    dict(id="sans-titre-19-septembre-2026-00-10", title="Sans titre, 19 septembre 2026", plate="#f3efe6"),
    dict(id="dr-m", title="DR.M", plate="#ffd3ea"),
    dict(id="pansier-elise-scan-sujet-invasion", title="Sujet invasion", plate="#f3efe6"),
]
HERO = "bunker-irl"
WORDS = "|".join(s["title"] for s in STRIPS)

for s in STRIPS + SERIES:   # plate + dark come from the title's ink (assets/prep.py); the values in STRIPS above are only fallbacks
    d = M["strips"][s["id"]]; s.update(tiles=d["tiles"], first=d["tiles"][0], url=f"bd/{s['id']}.html", bg=d.get("bg", "#f3efe6"), plate=d.get("accent", s["plate"]), dark=d.get("dark", s["dark"]))
e = html.escape

def head(title, base=""):
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(NAME)}. {e(TAGLINE)}">
<meta name="theme-color" content="#f3efe6">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(NAME)}. {e(TAGLINE)}">
<meta property="og:image" content="https://raouf-hamouda.github.io/elise-pansier/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="{base}favicon-32.png">
<link rel="icon" type="image/png" sizes="256x256" href="{base}favicon.png">
<link rel="apple-touch-icon" href="{base}apple-touch-icon.png">
<link rel="preload" href="{base}fonts/sharpie/Sharpie-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{base}fonts/apfel-grotezk/ApfelGrotezk-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{base}fonts/rock-salt/RockSalt-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{base}site.css">
</head>
<body>
<div class="sheet" data-words="{e(WORDS)}"><div class="sheet__words"></div></div>
<canvas class="pencil" aria-hidden="true"></canvas>
<header class="nav">
  <a class="nav__name boil--hover" href="{base}index.html">{e(NAME)}</a>
  <div class="nav__right">
    <ul class="nav__links">
      <li><a href="{base}bandes.html">BD</a></li>
      <li><a href="{base}index.html#dessins">Dessins</a></li>
      <li><a href="{base}index.html#apropos">À propos</a></li>
    </ul>
    <button class="menu-btn" data-module="menu-btn" aria-expanded="false" aria-label="Menu"><span class="menu-btn__bg"></span><span class="menu-btn__lines"></span></button>
  </div>
</header>
<nav class="menu">
  <ul class="menu__links">
    <li><a href="{base}index.html">Accueil</a></li>
    <li><a href="{base}bandes.html">Bandes dessinées</a></li>
    <li><a href="{base}index.html#dessins">Dessins</a></li>
    <li><a href="{base}index.html#apropos">À propos</a></li>
  </ul>
  <div class="menu__contact">
    <a href="{INSTA}" target="_blank" rel="noopener"><span>Instagram</span><i>↗</i></a>
    <a href="{LINKEDIN}" target="_blank" rel="noopener"><span>LinkedIn</span><i>↗</i></a>
    <a href="mailto:{MAIL}"><span>{MAIL}</span><i>→</i></a>
  </div>
  <div class="menu__foot"><span>{e(NAME)}</span><span>{e(TAGLINE)}</span><span>{e(CITY)}</span></div>
</nav>
<button class="totop" data-module="totop" aria-label="Remonter"><span>↑</span></button>
<div class="cursor"><div class="cursor__dot"></div><div class="cursor__ring"><span class="cursor__text"></span></div></div>
"""

def foot(base=""):
    return f"""<footer class="foot">
  <span class="hand">{e(NAME)}</span>
  <div class="foot__links"><a href="{INSTA}" target="_blank" rel="noopener">Instagram</a><a href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a><a href="mailto:{MAIL}">Email</a></div>
  <span class="foot__note">Tout est dessiné à la main.</span>
</footer>
<script src="{base}js/kit-type.js"></script>
<script src="{base}js/kit-bd.js"></script>
<script src="{base}js/kit-web.js"></script>
<script src="{base}js/site.js"></script>
</body>
</html>
"""

def home():
    hero = M["images"][HERO]
    blocks = "".join(f"""
  <article class="block{' block--dark' if s['dark'] else ''}" id="{s['id']}" data-module="theme" data-plate="{s['plate']}" data-dark="{int(s['dark'])}">
    <a class="block__plate" href="{s['url']}" data-cursor="lire">
      <img src="{M['images'][s['cover']]['src'] if s.get('cover') else s['first']['src']}" alt="{e(s['title'])}, couverture" loading="lazy">
    </a>
    <div class="block__text" data-module="reveal" data-reveal>
      <p class="eyebrow">Bande dessinée · {e(s['year'])}</p>
      <h2 class="block__title hand">{e(s['title'])}</h2>
      <a class="link" href="{s['url']}">Lire la bande <i>›</i></a>
    </div>
  </article>""" for s in STRIPS)
    series_cards = "".join(f"""
    <a class="card card--serie" href="{x['url']}" data-cursor="voir">
      <img src="{x['first']['src']}" alt="{e(x['title'])}, première page" loading="lazy" width="{x['first']['w']}" height="{x['first']['h']}">
      <figcaption>{e(x['title'])} · série, {len(x['tiles'])} pages</figcaption>
    </a>""" for x in SERIES)
    cards = series_cards + "".join(f"""
    <a class="card{' card--dark' if d.get('dark') else ''}" href="{M['images'][d['id']]['src2x']}" data-full="{M['images'][d['id']]['src2x']}" style="--plate:{d['plate']}" data-cursor="voir">
      <img src="{M['images'][d['id']]['src']}" srcset="{M['images'][d['id']]['src']} 1200w, {M['images'][d['id']]['src2x']} 2400w" sizes="(min-width:760px) 33vw, 50vw" alt="{e(d['title'])}" loading="lazy">
      <figcaption>{e(d['title'])}</figcaption>
    </a>""" for d in DRAWINGS)
    covers = "".join(f"""
      <a class="cover" href="{s['url']}" data-cursor="lire"><img src="{M['images'][s['cover']]['src2x']}" alt="{e(s['title'])}, couverture" width="{M['images'][s['cover']]['w']}" height="{M['images'][s['cover']]['h']}" fetchpriority="high"></a>""" for s in STRIPS if s.get("cover"))
    deck = "".join(f"""
      <img src="{v['src']}" alt="" loading="lazy" width="{v['w']}" height="{v['h']}">""" for k, v in sorted(M["images"].items()) if k.startswith("about-"))
    return head(f"{NAME} — {TAGLINE}") + f"""
<main data-page="home">
  <section class="hero" data-module="theme" data-plate="#f3efe6" data-dark="0">
    <div class="hero__covers" data-module="covers">{covers}
    </div>
    <div class="hero__text">
      <h1 class="hero__title hand">{e(NAME)}</h1>
      <p class="sub">{e(TAGLINE)} {e(CITY)}.</p>
      <a class="link" href="bandes.html">Lire les bandes <i>›</i></a>
    </div>
  </section>

  <section id="bd">{blocks}
  </section>

  <section id="dessins" class="section container" data-module="theme" data-plate="#f3efe6" data-dark="0">
    <div class="head" data-module="reveal" data-reveal>
      <h2 class="hand">Dessins</h2>
      <p class="sub">Carnets, affiches, essais.</p>
    </div>
    <div class="grid cascade" data-module="cascade">{cards}
    </div>
  </section>

  <section id="apropos" class="about section container" data-module="theme" data-plate="#ffffff" data-dark="0">
    <div class="deck" data-module="deck" aria-hidden="true">{deck}
    </div>
    <div class="head" data-module="reveal" data-reveal>
      <h2 class="hand">{e(ABOUT_BIG)}</h2>
      {''.join(f'<p class="sub">{e(p)}</p>' for p in ABOUT)}
    </div>
    <ul class="contact" data-module="reveal" data-reveal>
      <li><span class="eyebrow">Email</span><a class="crayon" href="mailto:{MAIL}">{MAIL}</a></li>
      <li><span class="eyebrow">Instagram</span><a href="{INSTA}" target="_blank" rel="noopener">Instagram ↗</a></li>
      <li><span class="eyebrow">LinkedIn</span><a href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn ↗</a></li>
      <li><span class="eyebrow">Ville</span><span>{e(CITY)}</span></li>
    </ul>
  </section>
</main>
""" + foot()

def reader(i, s, serie=False):
    prev_, next_ = STRIPS[i-1], STRIPS[(i+1) % len(STRIPS)]
    kind = "Série · aquarelle" if serie else f"Bande {i+1} sur {len(STRIPS)}"
    tiles = "".join(f"""
      <figure class="bd-planche"><img data-src="../{t['src']}" width="{t['w']}" height="{t['h']}" alt=""></figure>""" for t in s["tiles"])
    return head(f"{s['title']} — {NAME}", base="../") + f"""
<main data-page="bd" data-module="theme" data-plate="{s['plate']}" data-dark="{int(s['dark'])}">
  <header class="reader-top">
    <a class="pill" href="{prev_['id']}.html">‹ Précédente</a>
    <div class="reader-top__mid"><b>{e(s['title'])}</b><a href="{'../index.html#dessins' if serie else '../bandes.html'}">{kind}</a></div>
    <a class="pill" href="{next_['id']}.html">Suivante ›</a>
  </header>
  <section class="strip" data-module="reader" data-strip="{s['id']}" aria-label="{e(s['title'])}">
    <div class="strip__progress"><i></i></div>
    <div class="bd-planches">{tiles}
      <div class="fin"><p class="hand fin__word">Fin.</p><p class="fin__meta">{e(s['title'])} · {e(NAME)} · {e(s['year'])}</p></div>
    </div>
  </section>
  <section class="reader-end">
    <nav class="chapters">
      <a class="chapters__card" href="{prev_['id']}.html"><span class="eyebrow">‹ Précédente</span><b class="hand">{e(prev_['title'])}</b></a>
      <a class="chapters__card" href="{next_['id']}.html"><span class="eyebrow">Suivante ›</span><b class="hand">{e(next_['title'])}</b></a>
    </nav>
    <a class="pill pill--wide" href="{'../index.html#dessins' if serie else '../bandes.html'}">{'Tous les dessins' if serie else 'Toutes les bandes'} ›</a>
  </section>
</main>
""" + foot(base="../")

def bandes():
    cards = "".join(f"""
    <a class="bcard" href="{s['url']}" data-cursor="lire" data-module="reveal" data-reveal>
      <span class="bcard__paper"><img src="{M['images'][s['cover']]['src'] if s.get('cover') else s['first']['src']}" alt="{e(s['title'])}, couverture" loading="lazy"></span>
      <span class="bcard__text"><b class="hand">{e(s['title'])}</b><span class="eyebrow">Bande dessinée · {e(s['year'])}</span></span>
    </a>""" for s in STRIPS)
    return head(f"Bandes dessinées — {NAME}") + f"""
<main data-page="bandes" data-module="theme" data-plate="#f3efe6" data-dark="0">
  <section class="bandes container">
    <div class="head"><h1 class="hand">Bandes dessinées</h1><p class="sub">{len(STRIPS)} bandes à lire en faisant défiler.</p></div>
    <div class="bgrid">{cards}
    </div>
  </section>
</main>
""" + foot()

(ROOT / "bandes.html").write_text(bandes())
(ROOT / "index.html").write_text(home())
for i, s in enumerate(STRIPS):
    (ROOT / "bd" / f"{s['id']}.html").write_text(reader(i, s))
for x in SERIES:
    (ROOT / "bd" / f"{x['id']}.html").write_text(reader(0, x, serie=True))
print("ok:", "index.html +", len(STRIPS), "readers")
