"""Generate Addendum A (Seller Finance) and Addendum B (Instalment Sale) v1.02.
Same layout for both; only the words differ. AcroForm field names are shared."""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color
from reportlab.lib.enums import TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer,
                                Flowable, KeepTogether)
from reportlab.pdfbase.pdfmetrics import stringWidth

VERSION = "v1.02"
W, H = A4
LM = RM = 45
CW = W - LM - RM              # 505.3
INK = Color(.13, .13, .13)
GREY = Color(.42, .42, .42)
RULE_LIGHT = Color(.72, .72, .72)
FILL = Color(.969, .941, .878)
BORDER = Color(.796, .725, .565)
BAND = Color(.93, .90, .83)

body = ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, leading=16, textColor=INK, alignment=TA_JUSTIFY)
plain = ParagraphStyle("plain", parent=body, alignment=0)
sub = ParagraphStyle("sub", fontName="Helvetica-Oblique", fontSize=10.5, leading=13, textColor=GREY)
title = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=INK, alignment=TA_RIGHT)
note = ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=GREY)
signnote = ParagraphStyle("signnote", fontName="Helvetica-Oblique", fontSize=9.5, leading=12, textColor=GREY)
clause = ParagraphStyle("clause", fontName="Helvetica", fontSize=10.3, leading=13.6, textColor=INK,
                        alignment=TA_JUSTIFY, leftIndent=24, bulletIndent=0, bulletFontName="Helvetica-Bold",
                        bulletFontSize=10.3, spaceAfter=5)


def field(canv, name, x, y, w, h, multiline=False, boxed=True, tip=""):
    """x, y are flowable-local; convert to absolute page coordinates."""
    ax, ay = canv.absolutePosition(x, y)
    kw = dict(name=name, tooltip=tip or name, x=ax, y=ay, width=w, height=h, fontName="Helvetica",
              fontSize=10, textColor=Color(.03, .13, .28), value="", maxlen=0)
    if boxed:
        kw.update(borderStyle="solid", borderWidth=0.6, borderColor=BORDER, fillColor=FILL, forceBorder=True)
    else:
        kw.update(borderWidth=0, borderColor=None, fillColor=None)
    if multiline:
        kw["fieldFlags"] = "multiline"
    canv.acroForm.textfield(**kw)


class Rule(Flowable):
    def __init__(self, lw=0.8, color=INK, space_before=3, space_after=0):
        super().__init__(); self.lw, self.color = lw, color
        self.sb, self.sa = space_before, space_after
    def wrap(self, aw, ah): return CW, self.sb + self.sa + self.lw
    def draw(self):
        c = self.canv; c.setStrokeColor(self.color); c.setLineWidth(self.lw)
        y = self.sa; c.line(0, y, CW, y)


class Heading(Flowable):
    def __init__(self, text): super().__init__(); self.text = text
    def wrap(self, aw, ah): return CW, 22
    def draw(self):
        c = self.canv; c.setFont("Helvetica-Bold", 11.5); c.setFillColor(INK)
        c.drawString(0, 7, self.text); c.setStrokeColor(INK); c.setLineWidth(0.8); c.line(0, 0, CW, 0)


class PartyRow(Flowable):
    """Full-width fill-in block with the role label on the right."""
    def __init__(self, name, label, lines=1):
        super().__init__(); self.name, self.label, self.lines = name, label, lines
        self.h = 18 if lines == 1 else 32
    def wrap(self, aw, ah): return CW, self.h + 4
    def draw(self):
        c = self.canv
        lw = stringWidth(self.label, "Helvetica", 10.5)
        fw = CW - 72  # same field width for every party row, label column on the right
        field(c, self.name, 0, 2, fw, self.h, multiline=self.lines > 1)
        c.setFont("Helvetica", 10.5); c.setFillColor(INK)
        c.drawString(fw + 8, 2 + self.h - 12.5, self.label)


class Word(Flowable):
    def __init__(self, text): super().__init__(); self.text = text
    def wrap(self, aw, ah): return CW, 14
    def draw(self):
        c = self.canv; c.setFont("Helvetica", 10.5); c.setFillColor(INK); c.drawString(0, 4, self.text)


class DateRight(Flowable):
    def __init__(self, name, label): super().__init__(); self.name, self.label = name, label
    def wrap(self, aw, ah): return CW, 26
    def draw(self):
        c = self.canv; fw = 120
        field(c, self.name, CW - fw, 2, fw, 18)
        c.setFont("Helvetica-Bold", 10.5); c.setFillColor(INK)
        c.drawRightString(CW - fw - 8, 7.5, self.label)


COL1 = 120
GAP = 14
COLN = (CW - COL1 - 2 * GAP) / 2
XS = [0, COL1 + GAP, COL1 + GAP + COLN + GAP]
WS = [COL1, COLN, COLN]


class FinGrid(Flowable):
    """Row 1: amount (col 1) + amount in words spanning cols 2-3. Rows 2-3: three columns."""
    ROW = 41
    def __init__(self, rows): super().__init__(); self.rows = rows
    def wrap(self, aw, ah): return CW, self.ROW * 3
    def draw(self):
        c = self.canv
        for r, row in enumerate(self.rows):
            ytop = self.ROW * (3 - r)
            fy = ytop - 22
            if r == 0:
                cells = [(XS[0], WS[0], row[0]), (XS[1], CW - XS[1], row[1])]
            else:
                cells = [(XS[i], WS[i], row[i]) for i in range(3)]
            for x, w, (name, label) in cells:
                field(c, name, x, fy, w, 18)
                c.setFont("Helvetica", 7.4); c.setFillColor(GREY); c.drawString(x + 1, fy - 9, label)


class SignBlock(Flowable):
    """One party section: coloured header band, the party's own place/date line, then
    rows of two signature columns. rows = [((label, field), (label, field)), ...]."""
    PLACE = 46      # band top -> place/date line
    LABEL = 32      # place/date line -> first row label
    SIG = 46        # row label -> signature line (room for a large signature)
    NAME = 28       # signature line -> full-name line
    ROWGAP = 30     # full-name line -> next row label
    def __init__(self, header, prefix, rows, **spacing):
        super().__init__(); self.header, self.prefix, self.rows = header, prefix, rows
        for k, v in spacing.items(): setattr(self, k, v)
        n = len(rows)
        self.h = self.PLACE + self.LABEL + n * (self.SIG + self.NAME) + (n - 1) * self.ROWGAP + 12
    def wrap(self, aw, ah): return CW, self.h
    def draw(self):
        c = self.canv; top = self.h
        c.setFillColor(BAND); c.rect(0, top - 20, CW, 20, stroke=0, fill=1)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 10.5); c.drawString(8, top - 14, self.header)
        y = top - self.PLACE
        c.setStrokeColor(INK); c.setLineWidth(0.7)
        pw, dx, dw = 300, 320, CW - 320
        c.line(0, y, pw, y); c.line(dx, y, dx + dw, y)
        field(c, f"{self.prefix}_sign_place", 0, y + 1, pw, 16, boxed=False)
        field(c, f"{self.prefix}_sign_date", dx, y + 1, dw, 16, boxed=False)
        c.setFont("Helvetica", 7.4); c.setFillColor(GREY)
        c.drawString(0, y - 9, "Signed at (place)"); c.drawString(dx, y - 9, "On (date)")
        colw = (CW - 30) / 2
        cur = y - self.LABEL
        for row in self.rows:
            ys = cur - self.SIG; yn = ys - self.NAME
            for i, (label, fname) in enumerate(row):
                x = i * (colw + 30)
                c.setFillColor(INK); c.setFont("Helvetica-Bold", 9); c.drawString(x, cur, label)
                c.setStrokeColor(INK); c.setLineWidth(0.7)
                c.line(x, ys, x + colw, ys); c.line(x, yn, x + colw, yn)
                field(c, fname, x, yn + 1, colw, 14, boxed=False)
                c.setFont("Helvetica", 7.4); c.setFillColor(GREY)
                c.drawString(x, ys - 9, "Signature"); c.drawString(x, yn - 9, "Full name")
            cur = yn - self.ROWGAP


class Doc(BaseDocTemplate):
    def __init__(self, path, footer, total, **kw):
        super().__init__(path, pagesize=A4, leftMargin=LM, rightMargin=RM, topMargin=28, bottomMargin=84,
                         title=footer, author="Nine Stones Capital (Pty) Ltd", **kw)
        self.footer, self.total = footer, total
        frame = Frame(LM, 84, CW, H - 112, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=self.deco)])
    def deco(self, c, d):
        n = c.getPageNumber()
        c.saveState()
        if self.total is None or n < self.total:
            c.setFont("Helvetica", 8.5); c.setFillColor(INK)
            c.drawString(LM, 72, "Sellers initial: ______________")
            c.drawRightString(W - RM, 72, "Buyers initial: ______________")
        c.setStrokeColor(RULE_LIGHT); c.setLineWidth(0.5); c.line(LM, 50, W - RM, 50)
        c.setFont("Helvetica", 7.5); c.setFillColor(GREY)
        c.drawString(LM, 38, "webuySAhomes.co.za/legal")
        c.drawCentredString(W / 2, 38, f"{self.footer}  ·  {VERSION}")
        c.drawRightString(W - RM, 38, f"Page {n} of {self.total or '?'}")
        c.restoreState()


def story(spec):
    s = [Paragraph(spec["title"], title), Spacer(1, 4), Paragraph(spec["subtitle"], sub),
         Rule(1.1, INK, 3, 0), Spacer(1, 12),
         Paragraph(spec["intro"], plain), Spacer(1, 4),
         PartyRow("seller_name", "(the Seller)"),
         Word("and"),
         PartyRow("buyer_name", "(the Buyer)"),
         Word("for"),
         PartyRow("property_desc", "(the property),", lines=2),
         Spacer(1, 2),
         Paragraph(spec["rest"], body), Spacer(1, 6),
         DateRight("dos_date", "Deed of Sale signed on:"),
         Spacer(1, 8), Heading("1.  FINANCIAL DETAILS"), Spacer(1, 4),
         FinGrid(spec["grid"]), Spacer(1, 2), Paragraph(spec["fin_note"], note),
         Spacer(1, 12), Heading("2.  " + spec["s2"]), Spacer(1, 8)]
    for num, head, text in spec["clauses"]:
        s.append(Paragraph(f"<b>{head}</b> {text}", clause, bulletText=num))
    s += [Spacer(1, 2), KeepTogether([
        Heading("3.  SIGNATURES"), Spacer(1, 6),
        Paragraph("Signed by hand in black ink, as part of and together with the Deed of Sale.", signnote),
        Spacer(1, 6), SignBlock("SELLER(S)", "seller", [(("Seller 1", "seller1_name"), ("Seller 2", "seller2_name"))]),
        Spacer(1, 10), SignBlock("BUYER(S)", "buyer", [(("Buyer 1", "buyer1_name"), ("Buyer 2", "buyer2_name"))])])]
    return s


def build(spec, path):
    probe = Doc(path, spec["footer"], None); probe.build(story(spec))
    total = probe.page
    Doc(path, spec["footer"], total).build(story(spec))
    return total


GRID_LABELS = lambda first: [
    [("loan_amount", f"{first} (R)"), ("amount_words", "Amount in words")],
    [("interest_rate", "Interest rate (% per year, fixed)"), ("loan_period", None), ("instalment", "Monthly instalment (R)")],
    [("first_instal", "First instalment due (date)"), ("balloon_amt", "Balloon / final amount (R)"),
     ("balloon_date", "Balloon amount due (date)")],
]

A = dict(
    title="ADDENDUM A:  SELLER FINANCE", footer="Addendum A — Seller Finance",
    subtitle="Seller finance means the Seller lets the Buyer pay off the price over time, instead of all at once on transfer.",
    intro="This Addendum sets out the extra terms for the sale agreement between",
    rest="where the Seller finances the purchase on the terms below. The Deed of Sale (signed on the date below) "
         "records the purchase price in clause 1.3; that price, less any deposit or extra cash the Buyer pays on or "
         "before transfer, is the loan amount, which the Buyer binds itself to repay to the Seller on the terms in "
         "this Addendum. Where this Addendum and the Deed of Sale differ, this Addendum applies; and on transfer the "
         "mortgage bond in clause 2.2 (the kustingsbrief) is registered against the property in the Seller’s favour, "
         "together with the transfer.",
    fin_note="Loan amount = purchase price (clause 1.3), less the deposit (clause 1.4), less any further cash the Buyer pays on transfer.",
    s2="TERMS OF THE LOAN",
    clauses=[
        ("2.1", "The loan.", "The Seller lends the Buyer the loan amount in Section 1, being the part of the purchase price in clause 1.3 that the Buyer does not pay in cash on transfer. This replaces clause 1.5 and the cash-on-transfer requirement in clause 3.3, and the sale is not subject to any bank bond, so clause 5 of the Deed of Sale does not apply."),
        ("2.2", "Security — the kustingsbrief.", "On transfer the Buyer becomes the registered owner and, at the same moment, a first mortgage bond (the kustingsbrief) is registered over the property in the Seller’s favour for the loan amount plus interest. The attorneys in clause 1.4 register the transfer and this bond simultaneously, and the Buyer pays the cost of registering the bond in addition to the transfer costs in clause 4.2."),
        ("2.3", "Interest.", "Interest runs on the outstanding balance at the fixed yearly rate in Section 1, from the date of transfer until the loan is paid in full."),
        ("2.4", "Repayment.", "The Buyer pays the monthly instalment in Section 1 in advance, on the same day of each month, from the first-instalment date, and pays the balloon amount in full on the balloon date. Each payment is applied first to interest, then to the balance."),
        ("2.5", "Early settlement.", "The Buyer may pay in more than the instalment, or settle the whole balance, at any time without penalty. On full payment the Seller must cancel the bond at the Buyer’s cost."),
        ("2.6", "While the loan runs.", "Until the loan is paid in full the Buyer must keep the property insured for its full replacement value and keep the rates, taxes and levies up to date, as clause 7 already requires, and may not sell the property or register any further bond over it without first settling this loan or obtaining the Seller’s written consent."),
        ("2.7", "If the Buyer defaults.", "If the Buyer fails to pay on time and does not remedy it within 7 (seven) business days of written notice, the whole balance and interest fall due at once and the Seller may enforce this loan and call up the bond under clause 12 of the Deed of Sale, including a sale of the property."),
        ("2.8", "National Credit Act.", "The Buyer is a juristic person whose asset value and annual turnover each equal or exceed R1 000 000. This loan is therefore excluded from the National Credit Act 34 of 2005 by section 4(1)(a)(i) read with section 7(1) of that Act, and no registration as a credit provider is required."),
        ("2.9", "When the loan is paid.", "Once the Buyer has paid the loan, interest and costs in full, the Seller must sign everything needed to cancel the bond, at the Buyer’s cost, and neither party has any further claim under this Addendum."),
    ],
)
A["grid"] = GRID_LABELS("Loan amount"); A["grid"][1][1] = ("loan_period", "Loan period (months)")

B = dict(
    title="ADDENDUM B:  INSTALMENT SALE", footer="Addendum B — Instalment Sale",
    subtitle="An instalment sale means the Buyer pays the price off over time and owns the property once it is paid.",
    intro="This Addendum amends the sale agreement between",
    rest="converting it into a sale on instalments. The Deed of Sale (signed on the date below) records the purchase "
         "price in clause 1.3; that price, less any deposit or extra cash the Buyer pays on or before occupation, is "
         "the balance the Buyer binds itself to pay to the Seller by instalments, with interest, on the terms below. "
         "Where this Addendum and the Deed of Sale differ, this Addendum applies; and ownership passes to the Buyer "
         "only once the price and interest are paid in full, when transfer is registered and this recorded contract "
         "is cancelled.",
    fin_note="Balance financed = purchase price (clause 1.3), less the deposit (clause 1.4), less any further cash the Buyer pays.",
    s2="AMENDMENTS TO THE DEED OF SALE",
    clauses=[
        ("2.1", "Conversion and survival.", "This Addendum converts the sale into a sale on instalments under Chapter II of the Alienation of Land Act 68 of 1981. Except where expressly amended below, every provision of the Deed of Sale remains unchanged and in full force. Wherever the Deed of Sale assumes transfer against immediate payment, it is read consistently with the deferred transfer under this Addendum."),
        ("2.2", "Purchase price by instalments.", "Clause 1.5 and clause 5 do not apply, and the sale is not subject to any bank bond. Clause 3.3 is deleted and replaced: the Buyer pays the balance of the purchase price to the Seller by the instalments set out in Section 1."),
        ("2.3", "Deferred transfer and use.", "Clause 4.1 is amended so that transfer is registered only once the Buyer has paid the price and interest in full; the Seller stays the registered owner until then. Clause 7.4 is amended so that the Buyer, bearing risk and benefit from the occupation date, may occupy, use, maintain and improve the property, and on cancellation has no claim for improvements, subject to the Conventional Penalties Act 15 of 1962."),
        ("2.4", "Recording against the title deed.", "The Seller irrevocably instructs the attorneys in clause 1.4 to record this sale against the title deed under section 20 of the Act within 3 (three) months of signing, at the Buyer’s cost, and to sign everything reasonably required to do so. The recording secures the Buyer’s right to the property pending transfer."),
        ("2.5", "Interest and repayment.", "Clause 7.3 (occupational rent) is deleted. In its place, interest runs on the outstanding capital balance, reducing as instalments are paid, at the fixed yearly rate in Section 1, from the occupation date until the price is paid in full. The Buyer pays each instalment in advance on the same day of each month from the first-instalment date, and any balloon amount on the balloon date; each payment is applied first to interest, then to capital."),
        ("2.6", "Early settlement and section 27.", "The Buyer may settle the whole balance at any time without penalty. The Buyer’s right under section 27 of the Act to take transfer after paying half the purchase price is preserved."),
        ("2.7", "Insurance.", "Clause 7.5 is deleted and replaced: while the price is unpaid the Buyer must insure the property for its full replacement value in the Buyer’s name where an insurer will give such cover; failing which the Seller keeps the existing policy in place and the Buyer reimburses the premiums, including any increase caused by the Buyer’s occupation or use. The proceeds of any claim are applied to reinstating the property, and otherwise dealt with as the Act requires."),
        ("2.8", "If the Buyer defaults.", "If the Buyer fails to pay and does not remedy after the notice and within the period section 19 of the Act requires, the whole balance and interest fall due at once and the Seller may cancel this sale and enforce it under clause 12 of the Deed of Sale. Any forfeiture is subject to the Conventional Penalties Act 15 of 1962."),
        ("2.9", "National Credit Act, and completion.", "The Buyer is a juristic person whose asset value and annual turnover each equal or exceed R1 000 000, so this sale falls outside the National Credit Act 34 of 2005 (section 4(1)(a)(i) read with section 7(1)). Once the price, interest and costs are paid in full, the Seller signs everything needed to transfer the property and cancel the recording, at the Buyer’s cost, and neither party has any further claim under this Addendum."),
    ],
)
B["grid"] = GRID_LABELS("Balance financed"); B["grid"][1][1] = ("loan_period", "Repayment period (months)")

if __name__ == "__main__":
    out = sys.argv[1]
    print("A pages", build(A, f"{out}/Addendum A - Seller Finance {VERSION}.pdf"))
    print("B pages", build(B, f"{out}/Addendum B - Instalment Sale {VERSION}.pdf"))
