import re,json,html,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
notes=root/'research_notes/SBase usability review'
items=[]
for fn in ['daily-modules.md','platform.md','professional-modules.md']:
 text=(notes/fn).read_text()
 matches=list(re.finditer(r'^(?:\d+\. )?\*\*((?:D|PL|PM)\d{2}) — (.+?)\*\*(.*)$',text,re.M))
 for i,m in enumerate(matches):
  end=matches[i+1].start() if i+1<len(matches) else len(text)
  body=m.group(3)+text[m.end():end]
  body=re.split(r'\n(?:### |## |# |- \*\*Workouts:)',body)[0].strip()
  title=m.group(2).split('. ')[0].rstrip('.')
  metadata=m.group(2)+' '+body[:150]
  priority=re.search(r'P[0-3]',metadata)
  effort=re.search(r'(?:/|; |effort )([SML](?:[–/−-][SML])?)(?:[.; /]|$)',metadata)
  items.append(dict(id=m.group(1),title=title,body=body,priority=priority.group() if priority else 'P2',effort=effort.group(1) if effort else 'M',evidence='Opportunity' if 'Opportunity' in metadata or 'product opportunity' in metadata else 'Source verified'))
modules={
'D01':['Recipes'],'D02':['Recipes'],'D03':['Recipes','Wines'],'D04':['Measurements'],'D05':['Measurements'],'D06':['Measurements'],'D07':['Workouts'],'D08':['Workouts'],'D09':['Shared UX','Recipes','Wines','Measurements'],'D10':['Wines','Recipes'],'D11':['Recipes'],'D12':['Recipes'],'D13':['Wines'],'D14':['Measurements'],
'PL01':['Shared UX'],'PL02':['Shared UX'],'PL03':['Shared UX'],'PL04':['Shared UX'],'PL05':['Backend'],'PL06':['Pulse'],'PL07':['Minecraft'],'PL08':['Minecraft'],'PL09':['Minecraft'],'PL10':['Pulse'],'PL11':['Pulse','Minecraft'],'PL12':['Minecraft'],
'PM01':['Backend','Cashflow','Minor'],'PM02':['Cashflow','Minor'],'PM03':['Cashflow'],'PM04':['Cashflow'],'PM05':['Backend','Cashflow'],'PM06':['Minor'],'PM07':['Minor'],'PM08':['Minor'],'PM09':['Resume'],'PM10':['Resume','Cashflow'],'PM11':['Resume','Minor','Cashflow'],'PM12':['Resume']}
options={
'D01':['Nullable PATCH fields (recommended)','Shared validated edit schema'], 'D02':['Validate then transact (recommended)','Shared schemas + transactional service'], 'D03':['Pending state + inline retry (recommended)','Shared optimistic rollback primitive'], 'D04':['Correct raw series and dates (recommended)','Correct series + range/trend/table'], 'D05':['Explicit edit mode + dirty guard (recommended)','Strict create with collision link'], 'D06':['Preview + confirmation','Delayed deletion + Undo (recommended)'], 'D07':['Revision-aware sync coordinator (recommended)','Coordinator + server conflict detection'], 'D08':['Verify storage + recovery export (recommended)','Transactional IndexedDB queue'], 'D09':['44px targets + semantic controls (recommended)','Compact visuals with expanded hit regions'], 'D10':['Explicit shared library + roles','Private ownership + explicit sharing'], 'D11':['Checklist + step focus (recommended)','Scaling + timers + cooking mode'], 'D12':['Reviewable paste/import (recommended)','Meal planner + grocery aggregation'], 'D13':['Tasting notebook + repeat tastings (recommended)','Cellar quantities + consumption history'], 'D14':['Date ranges + accurate raw summary (recommended)','Optional transparent trend + photo comparison'],
'PL01':['Remove misleading fallback; scope or hide search (recommended)','Permission-aware command palette'], 'PL02':['Accessible menu primitive (recommended)','Simple disclosure with ordinary links'], 'PL03':['44px mobile hit regions (recommended)','Compact/comfortable density setting'], 'PL04':['Typed auth recovery + returnTo (recommended)','Session-expired dialog + resume'], 'PL05':['Consistent ISO comparison (recommended)','Numeric epoch migration'], 'PL06':['Last-admin invariant + transaction (recommended)','Forbid self-revocation and self-pause'], 'PL07':['Explicit capability matrix (recommended)','Monitor/operator/admin roles'], 'PL08':['Stale status + safe polling (recommended)','SSE/WebSocket with polling fallback'], 'PL09':['Confirmed operation + durable phases (recommended)','Separate explicit force-stop policy'], 'PL10':['Durable jobs + reconnect verification','Deep-link OS maintenance to Cockpit'], 'PL11':['Persistent inline actionable errors (recommended)','Admin notification center + inline errors'], 'PL12':['Integrate existing backup infrastructure first','Build scheduled backup + verified restore'],
'PM01':['Owner-aware service queries (recommended)','Central authorization repository'], 'PM02':['Inline errors + retry (recommended)','Shared notification + inline validation'], 'PM03':['User-scoped draft + dirty defaults (recommended)','Server draft autosave','Navigation warning + explicit defaults'], 'PM04':['Lifecycle + send history first (recommended)','Outbox + automatic reminders','Integrate dedicated invoicing service'], 'PM05':['Server validation/calculation + transaction (recommended)','Shared calculation package + transaction'], 'PM06':['Dirty draft/server snapshot separation (recommended)','Versioned section autosave'], 'PM07':['Explicit publish + snapshot preview (recommended)','Labelled auto-publish + status + opt-out'], 'PM08':['Shared submission preflight (recommended)','Asynchronous export jobs'], 'PM09':['Serialized atomic autosave + recovery (recommended)','Explicit Save + dirty guard'], 'PM10':['Always available reorder buttons (recommended)','Full keyboard drag interaction'], 'PM11':['Archive/restore + impact preview (recommended)','Hard delete + explicit impact + snapshots'], 'PM12':['Layout/language/output preflight (recommended)','Word export/import','Keep scope; quality checks only']}
for x in items:
 x.setdefault('modules',modules[x['id']]);x['options']=options[x['id']]
 x['title']=re.sub(r' \(P[0-3].*?\)$','',x['title'])
 if x['id'] in ['PL02','PL05']:x['effort']='S'
 if x['id']=='PL12':x['effort']='L'
 if x['id'] in ['PL09','PL10']:x['effort']='M–L'
 x['kind']='Add / expand' if x['evidence']=='Opportunity' or x['id']=='PL12' else ('Product decision' if x['id']=='D10' else 'Improve / fix')
 if x['id']=='PL04':x['evidence']='Runtime checked + source'
 if x['id']=='PL05':x['evidence']='Isolated check + source'
 x['daily']=any(m in ['Recipes','Workouts','Measurements','Wines'] for m in x['modules'])
items.sort(key=lambda x:(int(x['priority'][1]),not x['daily'],x['id']))
(root/'reports/review-data.json').write_text(json.dumps(items,indent=2))
print(len(items),[(x['id'],x['priority'],x['effort']) for x in items])

shell=(root/'reports/review-shell.html').read_text()
data=(root/'reports/review-data.json').read_text()
(root/'reports/sbase-usability-review.html').write_text(shell.replace('__DATA__',data.replace('</','<\\/')))
