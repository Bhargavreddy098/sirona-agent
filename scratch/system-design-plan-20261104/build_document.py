from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree
from copy import deepcopy
import hashlib, json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path.cwd()
TASK = ROOT / 'scratch/system-design-plan-20261104'
REF = Path('C:/Users/bharg/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-system-design/assets/reference.docx')
OUT = ROOT / 'docs/engineering/SIRONA-SYSTEM-DESIGN-REVIEW.docx'
NS = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{'+NS['w']+'}'
with ZipFile(REF) as z:
    parts = {n:z.read(n) for n in z.namelist()}
doc = etree.fromstring(parts['word/document.xml'])
paras = doc.xpath('//w:p', namespaces=NS)
reference_hash = hashlib.sha256(REF.read_bytes()).hexdigest()
inventory = {n: {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in parts.items()}
(TASK/'reference-parts.json').write_text(json.dumps(inventory,indent=2))
(TASK/'slot-map.json').write_text(json.dumps([{'index':i,'path':doc.getroottree().getpath(p),'text':''.join(p.xpath('.//w:t/text()',namespaces=NS))} for i,p in enumerate(paras)],indent=2))

# All replacements target reference paragraph locations, preserving properties,
# tables, numbering, section geometry and all unused package parts.
text = {
8:'Sirona',9:'Documentation Plan',21:'Proposed',24:'Sirona product owner',27:'November 4, 2026',
30:'Prepared with Codex',32:'Owner and engineering reviewers',34:'Detailed Markdown plan in docs/engineering',
36:'Feature specifications and implementation handoffs for the local creation platform',
38:'Extend Sirona into a governed creation platform through connected, source-backed specifications. The orchestrator owns goals, plans, permissions and completion. Providers and coding workers remain replaceable. Start with an approved plan and a verified local application.',
39:'This review proposes the documentation architecture. The companion Markdown contains the full folder tree, 24 feature cards, build order, risks and coverage map. No product code, data migration, paid inference or deployment is authorized by this document.',
44:'One clear reading path from AGENTS to implementation evidence',45:'A backend rewrite or new competing architecture',
46:'Four complete documents for each in-scope feature',47:'Empty folders and placeholder implementations',
48:'Source-backed contracts, dependencies and acceptance tests',49:'Unqualified provider, worker or sandbox promises',
50:'Preserve working code, user data, UI and approval history',51:'Cloud operations or enterprise SaaS in the local MVP',
54:'Nine feature bundles already exist, but source paths and status claims need reconciliation. The roadmap labels P5/P6 complete while active gates remain. Database documents disagree. The intent requirements service is a stub; the CLI currently offers read-only diagnostics.',
55:'Keep the monorepo and existing owners. Root instructions route agents to governance, package instructions and the feature index. Each feature links requirements to contracts, source files, tests and evidence. Documentation quality does not establish runtime readiness.',
59:'Figure 1. Proposed documentation reading and evidence path.',
67:'Governance',68:'Own current decisions, scope and approval gates.',69:'docs/governance',70:'Conflicts block affected implementation.',
71:'Architecture',72:'Define shared boundaries and system invariants.',73:'docs/architecture',74:'No feature may invent a competing owner.',
75:'Feature bundles',76:'Specify behavior, contracts, build steps and proof.',77:'docs/features',78:'Missing prerequisites remain explicit.',
79:'Execution ledger',80:'Track tasks, dependencies and evidence references.',81:'docs/engineering',82:'Unverified work cannot become complete.',
83:'Reference and proof',84:'Catalog actual interfaces and sanitized results.',85:'docs/reference and evidence',86:'Stale evidence is not current qualification.',
90:'Start with the current user task, root instructions and active gates.',
91:'Read package ownership and the relevant feature SPEC; confirm scope.',
92:'Load contracts and direct prerequisite evidence, not every archive.',
93:'Prepare a bounded task with exact source owners, changes and tests.',
94:'Obtain any required approval before migrations or protected effects.',
95:'Implement the complete slice; enforce budgets, cancellation and recovery.',
96:'Run real acceptance, record limitations and update the owning docs.',
99:'Proposed feature documentation metadata',
105:'featureId',106:'String',107:'Yes',108:'Stable identity used by tasks, criteria and evidence.',
109:'designStatus',110:'Enum',111:'Yes',112:'Proposed, approved or superseded; never inferred from tests.',
113:'requirements',114:'ID list',115:'Yes',116:'Measurable behavior, boundaries and acceptance criteria.',
117:'sourceOwners',118:'Path list',119:'Yes',120:'Editable files and symbols responsible for the workflow.',
121:'dependencies',122:'ID list',123:'Yes',124:'Feature prerequisites and active approval gates.',
125:'verification',126:'Records',127:'Yes',128:'Criterion, command, source revision, target and result.',
129:'activation',130:'Record',131:'Yes',132:'Separate production enablement and owner approval state.',
136:'An approved design is not proof that a feature is implemented.',
137:'Implementation progress, verification and activation are separate states.',
138:'Evidence names the source revision, environment, criterion and limitations.',
139:'Generated catalogs describe interfaces; they cannot grant authority.',
140:'Canonical wire types stay in packages/contracts; feature prose links to them.',
141:'See the companion plan sections 6, 9, 10 and 13 for the full contract rules.',
145:'Preserve one durable owner per responsibility. Runs pin approved revisions; effects keep stable identities across attempts. Reconcile uncertain outcomes before retrying. The chosen database must prove these semantics; common parameter syntax is not sufficient.',
149:'Repeated action',150:'Return or reconcile the recorded effect result.',151:'Avoid duplicate writes and external operations.',
152:'Required write fails',153:'Stop dispatch and report a safe explicit error.',154:'Do not execute an effect without durable authority.',
155:'Unknown tool outcome',156:'Reconcile first; retry only the approved class.',157:'A timeout does not prove the action never happened.',
158:'Contract changes',159:'Keep the run pinned; propose a new revision.',160:'Old approval cannot authorize changed scope.',
164:'Enforce local identity, workspace scope and exact action approval in trusted code.',
165:'Treat repository, browser, memory and worker content as untrusted input.',
166:'Resolve secret references through the credential broker; exclude keys from evidence.',
167:'Retain data, image and paid-inference gates. A timeout is not an OS sandbox.',
168:'Define retention, correction and deletion; preserve provenance without private payloads.',
176:'Requirement coverage',177:'All in-scope requirements have criteria and owners.',178:'Feature owner',179:'Required',
180:'Documentation links',181:'Active links, source paths and anchors resolve.',182:'Docs owner',183:'Required',
184:'Qualification gaps',185:'No unknown criterion represented as passed.',186:'Verifier',187:'Required',
188:'Authority drift',189:'Database, phase and approval conflicts reconciled.',190:'Product owner',191:'Required',
192:'User workflow',193:'Real UI or CLI journey and recovery evidence.',194:'Feature owner',195:'Required',
196:'Rollout constraint: documentation completion permits review of a bounded task. Product activation still requires qualified dependencies, real acceptance and the applicable owner gates.',
204:'One giant master prompt',205:'Easy to write and share initially.',206:'Hard to maintain; hides ownership and conflicts.',
207:'Copy another product',208:'Established documentation patterns.',209:'Its architecture and permissions do not define Sirona.',
210:'Many small services',211:'Apparent domain independence.',212:'Adds operational complexity before demonstrated need.',
213:'Folders without contracts',214:'Fast visible scaffolding.',215:'Agents still guess behavior, failures and acceptance.',
218:'Reconcile the recorded SQLite-only versus dual-engine architecture decision.',
219:'Approve an exact provider, model and spend ceiling before live inference.',
220:'Review the exact tools image before guest qualification and activation.',
221:'Choose one supported worker and deployment target for later releases.',
224:'Adopt the documentation plan as a proposal, then start with the source and authority audit. Prove the format on providers, transport and CLI before expanding the remaining features. Follow the existing product gates; do not treat this plan as implementation approval.',
229:'D01-D03 audit, navigation and four-file templates',230:'Conflicts explicit; source owners and status rules clear.',
232:'D04 pilot provider, gateway and CLI bundles',233:'Complete journeys, contracts and verification paths.',
235:'D05-D07 remaining features and coverage',236:'Every product requirement has a release and owner.',
238:'D08-D09 validation and cold handoff',239:'An agent can prepare a bounded task without guessing.',
}

def replace_paragraph(p, value):
    nodes=p.xpath('.//w:t',namespaces=NS)
    if not nodes: raise RuntimeError('Expected text slot')
    nodes[0].text=value
    nodes[0].set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    for t in nodes[1:]: t.text=''

# Record complete template contract before the document is authored.
(TASK/'artifact.md').write_text(f'''# Template execution contract
Reference: {REF}
SHA256: {reference_hash}
Rendered reference: reference-render/reference.pdf and seven PNG pages; all reviewed.
Renderer: packaged LibreOffice path unavailable. Isolated hidden Microsoft Word exported a read-only PDF; bundled pdf2image rasterized it. No save to reference.
One portrait Letter section, 8.5 by 11 inches. Margins left/right/top 0.7 inches; bottom 0.62. Header/footer distances 0.5 inches. Different first page enabled; page numbering starts 1.
Preserve all paragraph/run properties, source fonts (Helvetica Neue family), blue/slate colors, heading hierarchy, list numbering, table grids/shading/borders/cell margins, header/footer spacing, page breaks and footnote linkage. Detailed exact properties remain in retained XML and template-styles.json; structural slot-map.json records stable paragraph indices and paths.
Source patterns: cover with metadata tables; body with numbered headings, lettered lists, comparison tables, footnote, recurring footer; one raster architecture diagram.
Editable slots: the body text paragraphs listed in builder mapping; figure caption and media image1.png; footer organization name; instructional footnote. Existing template section headings and table schemas retained. No optional controls found. Page fields preserved.
Preserve-only: every package part except document.xml, footer1.xml/footer2.xml organization text, footnotes.xml instructional text, media/image1.png and settings.xml update-fields flag. All relationships, fonts, styles, numbering and geometry remain byte-identical.
Source content capacity: replace placeholder paragraphs with comparable or shorter text; tables use compact values. The detailed plan stays in the companion Markdown rather than shrinking template text or squeezing many pages into a slot.
Fidelity gates: compare preserve-only hashes, section XML, no remaining placeholder brackets, inspect every rendered page, retained reference hash unchanged. Template palette intentionally overrides generic new-document defaults.
''')

for i,value in text.items(): replace_paragraph(paras[i],value)
leftovers = [ ''.join(p.xpath('.//w:t/text()',namespaces=NS)) for p in paras if '[' in ''.join(p.xpath('.//w:t/text()',namespaces=NS)) ]
if leftovers: raise RuntimeError(str(leftovers))
parts['word/document.xml']=etree.tostring(doc,xml_declaration=True,encoding='UTF-8',standalone=True)
for name in ['word/footer1.xml','word/footer2.xml']:
    r=etree.fromstring(parts[name])
    for p in r.xpath('//w:p',namespaces=NS):
        value=''.join(p.xpath('.//w:t/text()',namespaces=NS))
        if '[Organization Name]' in value:
            replace_paragraph(p,value.replace('[Organization Name]','Sirona'))
    parts[name]=etree.tostring(r,xml_declaration=True,encoding='UTF-8',standalone=True)
r=etree.fromstring(parts['word/footnotes.xml'])
for p in r.xpath('//w:p',namespaces=NS):
    if p.xpath('.//w:t',namespaces=NS):
        replace_paragraph(p,'Source inspection establishes code presence only. No fresh product acceptance is claimed in this review.')
parts['word/footnotes.xml']=etree.tostring(r,xml_declaration=True,encoding='UTF-8',standalone=True)
r=etree.fromstring(parts['word/settings.xml'])
update=r.find(W+'updateFields')
if update is None: update=etree.SubElement(r,W+'updateFields')
update.set(W+'val','true')
parts['word/settings.xml']=etree.tostring(r,xml_declaration=True,encoding='UTF-8',standalone=True)

# New diagram uses the reference's seven-box geometry and navy/blue palette.
# It does not alter the retained template raster or its original package.
im=Image.new('RGB',(1500,770),'#f5f9fd');d=ImageDraw.Draw(im)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
d.rectangle((0,0,1500,110),fill='#0b2c48')
d.text((55,30),'Sirona documentation and implementation path',font=font,fill='white')
boxes=[(55,180,295,310,'AGENTS and gates','Current authority'),(425,180,685,310,'Feature SPEC','Scope and criteria'),(820,180,1100,310,'Contracts and guide','Owners and build order'),(1210,180,1460,310,'Verification','Real evidence'),(425,440,685,570,'Approved decisions','Versioned boundaries'),(820,440,1100,570,'Source and ledger','Durable implementation'),(1210,440,1460,570,'Handoff','Next bounded task')]
for x1,y1,x2,y2,title,sub in boxes:
    d.rounded_rectangle((x1,y1,x2,y2),radius=8,fill='white' if y1<400 else '#e5f0f8',outline='#426784',width=2)
    d.text((x1+15,y1+28),title,font=small,fill='#153958')
    d.text((x1+15,y1+72),sub,font=small,fill='#526d82')
for x1,y1,x2,y2 in [(295,245,425,245),(685,245,820,245),(1100,245,1210,245),(555,310,555,440),(960,310,960,440),(1335,310,1335,440),(1100,505,1210,505)]:
    d.line((x1,y1,x2,y2),fill='#346b94',width=4)
    if x1==x2:d.polygon([(x2-10,y2-16),(x2+10,y2-16),(x2,y2)],fill='#346b94')
    else:d.polygon([(x2-16,y2-10),(x2-16,y2+10),(x2,y2)],fill='#346b94')
d.rectangle((0,725,1500,770),fill='#dae8f4');d.text((40,736),'One owner per responsibility   |   Proposed design is not activation approval',font=small,fill='#526d82')
diagram=TASK/'documentation-path.png';im.save(diagram)
parts['word/media/image1.png']=diagram.read_bytes()
with ZipFile(OUT,'w',ZIP_DEFLATED) as z:
    for name,data in parts.items(): z.writestr(name,data)
changed=[n for n,b in parts.items() if hashlib.sha256(b).hexdigest()!=inventory[n]['sha256']]
allowed={'word/document.xml','word/footer1.xml','word/footer2.xml','word/footnotes.xml','word/media/image1.png','word/settings.xml'}
assert set(changed)<=allowed
assert hashlib.sha256(REF.read_bytes()).hexdigest()==reference_hash
with ZipFile(REF) as z:
    original=etree.fromstring(z.read('word/document.xml'))
    assert etree.tostring(original.find('.//'+W+'sectPr'))==etree.tostring(doc.find('.//'+W+'sectPr'))
(TASK/'package-verification.json').write_text(json.dumps({'referenceSha256':reference_hash,'changedParts':changed,'preserveOnlyPartsUnchanged':True,'sectionGeometryUnchanged':True,'output':str(OUT)},indent=2))
print(OUT)
