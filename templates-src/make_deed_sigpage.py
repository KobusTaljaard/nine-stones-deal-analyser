"""Replace the signature page (last page) of the Deed of Sale master with the
addenda-style layout (coloured SELLER(S)/BUYER(S) bands, own place/date per party,
signatory + witness rows), keep header and intro paragraph verbatim, and bump the
footer version on every page.  usage: make_deed_sigpage.py in.pdf out.pdf OLDVER NEWVER"""
import sys, io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, ArrayObject, DecodedStreamObject
import make_addenda as M

src, dst, OLD, NEW = sys.argv[1:5]
W, H = A4
LM, RIGHT = 44, 551.2756
M.CW = RIGHT - LM          # SignBlock spans the deed's text width

reader = PdfReader(src)
n = len(reader.pages)

buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=A4)
# header — same as v1.03
c.setFillColor(Color(0, 0, 0)); c.setFont("Helvetica-Bold", 12.6)
c.drawString(LM, 801.8898, "15.  SIGNATURES")
c.setStrokeColor(Color(.066667, .066667, .066667)); c.setLineWidth(1.1); c.line(LM, 793.8898, RIGHT, 793.8898)
para = Paragraph("This agreement is signed by hand in black ink. Each signatory signs in the presence of a witness, "
                 "who signs alongside. Where a seller is married in community of property, the spouse must also sign.",
                 ParagraphStyle("p", fontName="Helvetica", fontSize=8.6, leading=10.32, alignment=TA_JUSTIFY))
pw, ph = para.wrap(M.CW, 100)
para.drawOn(c, LM, 773.8898 + 10.32 - ph - 1.9)
y = 773.8898 - ph - 18

for header, prefix, role in (("SELLER(S)", "seller", "seller"), ("BUYER(S)", "buyer", "buyer")):
    rows = [((f"{role.title()} {i}", f"{prefix}{i}_name"), (f"Witness to {role} {i}", f"{prefix}{i}_witness"))
            for i in (1, 2)]
    blk = M.SignBlock(header, prefix, rows, PLACE=48, LABEL=34, SIG=56, NAME=28, ROWGAP=36)
    _, bh = blk.wrap(M.CW, H)
    y -= bh
    blk.drawOn(c, LM, y)
    y -= 30

# footer — same as v1.03 apart from the version
grey = Color(.290196, .290196, .290196)
c.setFont("Helvetica", 6.9); c.setFillColor(grey)
c.drawString(LM, 26, "webuySAhomes.co.za/legal")
c.drawString(228.0306, 26, f"Deed of Sale — Residential Property  ·  {NEW}")
c.drawString(515.9821, 26, f"Page {n} of {n}")
c.setStrokeColor(Color(.8, .8, .8)); c.setLineWidth(.4); c.line(LM, 34, RIGHT, 34)
c.showPage(); c.save()
assert y > 40, f"signature page overflows (y={y})"

newpage = PdfReader(io.BytesIO(buf.getvalue())).pages[0]
w = PdfWriter(clone_from=reader)
# bump version in the footer of pages 1..n-1
for i in range(n - 1):
    pg = w.pages[i]
    data = pg.get_contents().get_data()
    assert OLD.encode() in data, f"version {OLD} not found on page {i+1}"
    st = DecodedStreamObject(); st.set_data(data.replace(OLD.encode(), NEW.encode()))
    pg[NameObject("/Contents")] = w._add_object(st)
# swap the last page
w.remove_page(n - 1)
added = w.add_page(newpage)
fields = w._root_object["/AcroForm"]["/Fields"]
for a in added["/Annots"]:
    fields.append(a)
tmp = dst + ".tmp"
with open(tmp, "wb") as f:
    w.write(f)
# qpdf rewrite: pypdf escapes "/" and "." inside /DA strings, which pdf-lib cannot read
import subprocess, os
subprocess.run(["qpdf", tmp, dst], check=True); os.remove(tmp)
print("ok, bottom y =", round(y + 30, 1))
