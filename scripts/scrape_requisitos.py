#!/usr/bin/env python3
"""
Descarga los PDF de cada convocatoria del portal Mérito Construyendo Excelencia
(Procuraduría 2026) y extrae los campos que el API público no expone:
denominación, ubicaciones, dependencias, estudio, experiencia, decreto 2247.

Uso:
  python3 -m venv .venv && .venv/bin/pip install pypdf
  .venv/bin/python scripts/scrape_requisitos.py [--cache DIR] [--out src/data/requisitos.json]
"""
import argparse, json, os, re, sys, concurrent.futures as cf
from urllib.request import urlopen, Request
from urllib.parse import quote

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("Falta pypdf: pip install pypdf")

BASE = "https://meritoconstruyendoexcelencia.com.co"
API = BASE + "/inscripciones/publico-c"


def get_json(url):
    with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
        return json.load(r)


def listar(extra=""):
    out, page = [], 0
    while True:
        d = get_json(f"{API}/convocatorias?soloActivas=false&size=100&page={page}{extra}")
        out += d["convocatorias"]
        if len(out) >= d["totalElementos"] or not d["convocatorias"]:
            return out
        page += 1


def descargar(codigo, cache):
    path = os.path.join(cache, f"{codigo}.pdf")
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        url = f"{BASE}/statics/convocatorias/{quote(codigo)}/view.pdf"
        with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=120) as r, open(path, "wb") as f:
            f.write(r.read())
    return path


HEADER_RE = re.compile(
    r"FORMATO:\s*CONVOCATORIA.*?(?:Página\s*)?\d+\s*de\s*\d+\s*", re.S | re.I
)


def limpiar(s):
    s = s.replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\s*\n\s*", "\n", s)
    return s.strip(" \n:")


def entre(texto, ini, fin):
    m = re.search(ini + r"(.*?)" + fin, texto, re.S | re.I)
    return limpiar(m.group(1)) if m else ""


HEADER_LINE_RE = re.compile(
    r"FORMATO:|PROCESO: TALENTO|www\.|Carrera 5 #|P[aá]gina \d+ de|^\s*\d+ de \d+\s*$|^\s*Versi[oó]n\s+\d|^\s*Fecha\s+\d|^\s*C[oó]digo\s+TH-",
    re.I,
)


def requisitos_layout(reader):
    """Separa Estudio / Experiencia usando el modo layout (columnas por posición x)."""
    tl = "\n".join(p.extract_text(extraction_mode="layout") or "" for p in reader.pages)
    m = re.search(r"REQUISITOS M[IÍ]NIMOS DEL EMPLEO(.*?)Equivalencias\s+entre", tl, re.S | re.I)
    if not m:
        return "", ""
    lines = [l for l in m.group(1).split("\n") if l.strip() and not HEADER_LINE_RE.search(l)]
    col = None
    for ln in lines:
        k = ln.find("Experiencia")
        if k >= 0:
            col = k
            break
    est, exp = [], []
    for ln in lines:
        if col is not None and len(ln) > col:
            left, right = ln[:col], ln[col:]
        else:
            left, right = ln, ""
        est.append(left)
        exp.append(right)
    est = " ".join(" ".join(est).split())
    exp = " ".join(" ".join(exp).split())
    est = re.sub(r"^\s*Estudio:?\s*", "", est, flags=re.I)
    exp = re.sub(r"^\s*Experiencia:?\s*", "", exp, flags=re.I)
    return est.strip(), exp.strip()


def parsear(path):
    reader = PdfReader(path)
    texto = "\n".join(p.extract_text() or "" for p in reader.pages)
    texto = HEADER_RE.sub("\n", texto)

    denominacion = entre(texto, r"Denominaci[oó]n del empleo:", r"C[oó]digo y Grado")
    ubic = entre(texto, r"Ubicaci[oó]n(?:\(es\))? inicial(?:\(es\))? del cargo:", r"N[uú]mero\s*de\s*cargos")
    dependencias = entre(texto, r"Dependencia(?:\(s\))? inicial(?:\(es\))?(?: del cargo)?:", r"Procesos?:")
    proceso = entre(texto, r"Procesos?:", r"2\.\s*REQUISITOS")
    estudio, experiencia = requisitos_layout(reader)
    if not estudio:
        estudio = entre(texto, r"Estudio:", r"Experiencia:?")
        experiencia = entre(texto, r"Experiencia:?", r"Equivalencias entre")
    version = entre(texto, r"Versi[oó]n No\.?", r"\n")
    fijacion = entre(texto, r"Fecha de fijaci[oó]n:", r"\n")

    planta_global = bool(re.search(r"PLANTA\s+GLOBAL", ubic, re.I))
    ubic_limpia = re.sub(r"PLANTA\s+GLOBAL", "", ubic, flags=re.I)
    ubic_limpia = re.sub(r"O donde se ubique el cargo", "", ubic_limpia, flags=re.I)
    # "Bogotá (2)" -> lista de ciudades con cantidad
    ciudades = []
    for m in re.finditer(r"([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ .,\-']+?)\s*-?\s*\((\d+)\)", ubic_limpia):
        ciudades.append({"ciudad": m.group(1).strip(" -"), "cargos": int(m.group(2))})

    return {
        "denominacion": " ".join(denominacion.split()),
        "ubicacionTexto": " | ".join(l.strip() for l in ubic_limpia.split("\n") if re.search(r"[A-Za-z]", l)),
        "ubicaciones": ciudades,
        "plantaGlobal": planta_global,
        "dependencias": " ".join(dependencias.split()),
        "proceso": " ".join(proceso.split()),
        "estudio": " ".join(estudio.split()),
        "experiencia": " ".join(experiencia.split()),
        "decreto2247": bool(re.search(r"2247", texto)),
        "versionPdf": version,
        "fechaFijacion": fijacion,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=".cache/pdfs")
    ap.add_argument("--out", default="src/data/requisitos.json")
    ap.add_argument("--workers", type=int, default=12)
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)

    todas = listar()
    reservadas = {c["codigoConvocatoria"] for c in listar("&idCondicion=SOLO_DISCAPACITADOS")}
    print(f"{len(todas)} convocatorias, {len(reservadas)} reservadas discapacidad", file=sys.stderr)

    def trabajo(c):
        cod = c["codigoConvocatoria"]
        try:
            info = parsear(descargar(cod, a.cache))
            info["ok"] = True
        except Exception as e:  # noqa
            info = {"ok": False, "error": str(e)}
        info["codigo"] = cod
        info["reservadaDiscapacidad"] = cod in reservadas
        info["pdf"] = f"{BASE}/statics/convocatorias/{cod}/view.pdf"
        return cod, info

    res = {}
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for i, (cod, info) in enumerate(ex.map(trabajo, todas), 1):
            res[cod] = info
            if i % 50 == 0:
                print(f"  {i}/{len(todas)}", file=sys.stderr)

    malos = [c for c, v in res.items() if not v["ok"] or not v.get("estudio")]
    print(f"listo. sin estudio/errores: {len(malos)} {malos[:20]}", file=sys.stderr)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"generadoEn": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
                   "convocatorias": res}, f, ensure_ascii=False, indent=1)
    print(f"escrito {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
