#!/usr/bin/env python3
"""Gulfastra FUSION: reproducible, non-LLM public-report correlation.

Never confuses publication with observation, multi-source reporting with proof,
or country reference points with conflict-incident coordinates.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from hashlib import sha256
from pathlib import Path
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get("GULFASTRA_DATA_DIR", str(ROOT / "data")))
CATEGORIES = ("security", "transport", "diplomacy", "other")
COUNTRIES = ("Iran", "Saudi", "Qatar", "UAE", "Bahrain", "Kuwait", "Iraq", "Oman", "Yemen", "Israel")
TOPICS = {
    "interception": ("intercept","air defense","air defence","shot down","اعتراض","تعترض","دفاع جوي","اسقاط","اسقط"),
    "missile": ("missile","rocket","ballistic","صاروخ","صواريخ","بالستي"),
    "drone": ("drone","uav","unmanned","مسير","طائرة مسيرة","مسيرة","طائره مسيره"),
    "maritime": ("hormuz","tanker","vessel","maritime","shipping","strait","هرمز","ناقلة","ناقلات","سفن","ملاحة","السفن"),
    "aviation": ("airspace","flight","airport","airline","المجال الجوي","الرحلات","الاجواء","مطار","الطيران"),
    "sanctions": ("sanction","عقوبات"),
    "diplomacy": ("negotiat","talks","summit","ceasefire","مفاوضات","مباحثات","وقف اطلاق النار","هدنه"),
}
STOP = set("""the a an and to of for on in at by from or with over under after amid as us says say war news
iran saudi arabia gulf qatar uae bahrain iraq kuwait oman yemen israel latest live update report reports
في من عن على إلى الى ضد بعد بسبب مع حول خلال إيران ايران السعودية السعوديه قطر الخليج الاخبار أخبار عاجل
""".split())
# Semantic identifiers that may support *candidate* bilingual links when also aligned
# by country, topic, and time. A generic shared country/topic NEVER suffices.
IDENTIFIER = re.compile(r"\b(?:mq[\s-]?9|f[\s-]?35|f[\s-]?16|b[\s-]?2|boeing|airbus|centcom|aramco|الدوحة|الدمام|بوشهر|البصرة|manama|riyadh|doha|basra|bushehr)\b", re.I)


def when(text):
    try:
        return datetime.fromisoformat(str(text).replace("Z", "+00:00")).astimezone(timezone.utc)
    except (TypeError, ValueError):
        return datetime.fromtimestamp(0, timezone.utc)


def normalize(text):
    t = str(text or "").lower()
    t = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", t)
    t = t.translate(str.maketrans({"أ":"ا","إ":"ا","آ":"ا","ى":"ي","ة":"ه"}))
    t = re.sub(r"\s[-—]\s[^-—]{2,55}$", "", t)
    return " ".join(re.findall(r"[a-z0-9\u0600-\u06ff]+", t))


def words(text):
    return {x for x in normalize(text).split() if len(x) > 2 and x not in STOP}


def topic(text):
    n = normalize(text)
    for name, triggers in TOPICS.items():
        if any(t in n for t in triggers):
            return name
    return "regional"


def publisher(report):
    """Normalize outlet byline; this is NOT a test of editorial independence."""
    val = (report.get("source") or report.get("provider") or "unknown").lower()
    val = re.sub(r"www\.|https?://", "", val)
    val = re.sub(r"[\W_]+", " ", val).strip()
    # One newsroom's language editions are not two independent publishers.
    if "france 24" in val or "france24" in val or "فرانس 24" in val:
        return "france24"
    if "un news" in val or "أخبار الأمم المتحدة" in val or "اخبار الامم المتحده" in val:
        return "un-news"
    if "al jazeera" in val or "الجزيرة" in val:
        return "al-jazeera"
    if "the guardian" in val or "guardian" in val:
        return "guardian"
    if "bbc" in val:
        return "bbc"
    return val[:90] or "unknown"


def locs(report):
    result = report.get("countries")
    if not isinstance(result, list):
        result = [report.get("country")] if report.get("country") else []
    return tuple(sorted(c for c in result if c in COUNTRIES))


def match_score(a, b):
    if a["category"] != b["category"]:
        return 0.
    if a["topic"] != b["topic"]:
        return 0.
    a_loc, b_loc = set(a["countries"]), set(b["countries"])
    if not a_loc or not b_loc or not (a_loc & b_loc):
        return 0.
    delta = abs((when(a["published_at"]) - when(b["published_at"])).total_seconds()) / 3600
    if delta > 18:
        return 0.
    aa, bb = set(a["tokens"]), set(b["tokens"])
    overlap = len(aa & bb) / max(1, len(aa | bb))
    phrase = SequenceMatcher(None, a["normalized"], b["normalized"]).ratio() if a["language"] == b["language"] else 0
    if a["language"] == b["language"]:
        return max(overlap, phrase) if overlap >= .57 or phrase >= .82 else 0.
    # Cross-lingual grouping requires a rare common identifier in both headlines,
    # not just shared category or actor. Label such links as candidate-only.
    keys_a, keys_b = set(IDENTIFIER.findall(a["normalized"])),set(IDENTIFIER.findall(b["normalized"]))
    return .71 if delta <= 5 and (keys_a & keys_b) and a["topic"] not in ("regional","diplomacy") else 0.


def prepare(report):
    title = report.get("title", "")
    return {
        "id": report.get("id", ""),
        "title": title,
        "url": report.get("url", ""),
        "published_at": report.get("published_at"),
        "collected_at": report.get("collected_at"),
        "source": report.get("source", "Unknown"),
        "publisher_key": publisher(report),
        "provider": report.get("provider", ""),
        "category": report.get("category", "other"),
        "topic": topic(title),
        "country": report.get("country") or "",
        "countries": list(locs(report)),
        "language": report.get("language", "ar" if re.search(r"[\u0600-\u06ff]",title) else "en"),
        "tag": report.get("tag",""),
        "normalized": normalize(title),
        "tokens": sorted(words(title)),
    }


def merge(articles):
    """Bounded deterministic grouping, never a declaration of verified incidents."""
    groups = []
    indices = defaultdict(list)
    for r in sorted(articles, key=lambda x: x["published_at"] or "", reverse=True):
        if not r["id"] or not r["url"] or not r["published_at"]:
            continue
        if not r["countries"] or r["topic"] == "regional":
            groups.append({"head":r,"items":[r], "cross_language":False})
            continue
        candidates = set()
        for country in r["countries"]:
            candidates.update(indices[(r["category"],r["topic"],country)][:110])
        chosen = None
        for index in sorted(candidates, reverse=True):
            group = groups[index]
            if len(group["items"]) >= 24:
                continue
            compare = group["items"][:4]
            if any(match_score(r,x)>=.70 for x in compare):
                chosen = index
                break
        if chosen is None:
            chosen = len(groups)
            groups.append({"head":r,"items":[r],"cross_language":False})
        else:
            group=groups[chosen]
            group["cross_language"] = group["cross_language"] or (group["head"]["language"]!=r["language"])
            group["items"].append(r)
        for country in r["countries"]:
            bucket=indices[(r["category"],r["topic"],country)]
            if chosen not in bucket:
                bucket.insert(0, chosen)
                del bucket[200:]
    return groups


def wording_flags(reports):
    """Surface possible disagreement cues without interpreting truth or event identity."""
    denial=("denies","denied","debunk","false claim","not true","نفى","ينفي","مزاعم كاذب","غير صحيح","مزيف")
    affirmation=("confirms","confirmed","says","claims","announces","اعلن","أكد","يؤكد","صرح")
    neg=[r["id"] for r in reports if any(w in normalize(r["title"]) for w in denial)]
    pos=[r["id"] for r in reports if any(w in normalize(r["title"]) for w in affirmation)]
    if neg and pos:
        return {"potentially_divergent_wording":True,"review_required":True,
                "note":"Automated opposing wording cues detected. Check original claims, context and timestamps; disagreement is NOT verified.",
                "denial_cue_source_ids":neg[:10],"affirmation_cue_source_ids":pos[:10]}
    return {"potentially_divergent_wording":False,"review_required":False,
            "note":"No obvious opposing wording cues detected; absence is not corroboration."}


def output_event(group):
    reports=group["items"]
    anchor=min(reports,key=lambda x:(x["published_at"],x["id"]))
    event_id="GF-"+sha256(anchor["id"].encode()).hexdigest()[:14].upper()
    publishers=sorted(set(x["publisher_key"] for x in reports))
    languages=sorted(set(x["language"] for x in reports))
    countries=sorted(set(c for r in reports for c in r["countries"]))
    first=min(x["published_at"] for x in reports)
    latest=max(x["published_at"] for x in reports)
    if len(reports)==1:
        corroboration="single-source"
    elif len(publishers)==1:
        corroboration="repeated-publication"
    else:
        corroboration="multi-publisher-unverified"
    # Multiple outlets may still syndicate the same originating report.
    return {
        "id":event_id,"title":group["head"]["title"],"category":group["head"]["category"],
        "topic":group["head"]["topic"],"countries":countries,"location_quality":"country-mention",
        "confidence":None,"claim_status":"not-independently-verified",
        "corroboration":corroboration,"cross_language_candidate":group["cross_language"],
        "wording_review":wording_flags(reports),
        "languages":languages,"publisher_count":len(publishers),"report_count":len(reports),
        "first_published":first,"last_published":latest,
        "event_occurred_at":None, "verification_notes":"Related published headlines; editorial independence and underlying events not confirmed.",
        "sources":[{k:r.get(k) for k in ("id","title","url","source","provider","published_at","collected_at","language","country")} for r in reports]
    }


def digest_event(event):
    meaningful={k:v for k,v in event.items() if k not in ("revision","updated_at")}
    return sha256(json.dumps(meaningful,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:20]


def build(reports, previous=None):
    previous=previous or {}
    prior={x["id"]:x for x in previous.get("events",[]) if x.get("id")}
    groups=merge([prepare(x) for x in reports if x.get("category") in CATEGORIES])
    events=[]
    revisions=[]
    now=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    for g in groups:
        event=output_event(g)
        old=prior.get(event["id"])
        d=digest_event(event)
        old_hash=old.get("digest") if old else None
        event["digest"]=d
        event["revision"]=1 if not old else int(old.get("revision",1))+(1 if old_hash!=d else 0)
        event["updated_at"]=(now if not old or old_hash!=d else old.get("updated_at",now))
        if old and old_hash!=d:
            revisions.append({"id":event["id"],"revision":event["revision"],"at":now,"change":"published-source-set-updated",
                              "previous_source_count":old.get("report_count"),"new_source_count":event["report_count"]})
        events.append(event)
    events.sort(key=lambda x:x["last_published"],reverse=True)
    country_stats={}
    for country in COUNTRIES:
        attached=[e for e in events if country in e["countries"]]
        country_stats[country]={
            "events":len(attached),"reports":sum(e["report_count"] for e in attached),
            "security_coverage":sum(e["category"]=="security" for e in attached),
            "transport_coverage":sum(e["category"]=="transport" for e in attached),
            "sources":len({p["source"] for e in attached for p in e["sources"]}),
        }
    daily=Counter(x["first_published"][:10] for x in events)
    return {
        "schema":5,"generated_at":now,"model":"deterministic-source-correlation-v1",
        "disclaimer":"Clusters are related PUBLIC REPORTS, not confirmed incidents. Source counts are not proof. Country names are mentions, not incident locations.",
        "events":events[:2400],"country_stats":country_stats,
        "daily_coverage":dict(sorted(daily.items())),"revisions":revisions
    }


def render_brief(result, hours=24, language="en"):
    end=datetime.now(timezone.utc)
    start=end-timedelta(hours=hours)
    events=[e for e in result.get("events",[]) if when(e.get("last_published"))>=start]
    events=sorted(events,key=lambda e:e["last_published"],reverse=True)
    by_category=Counter(e["category"] for e in events)
    sources=sum(e["report_count"] for e in events)
    if language=="ar":
        lines=["# موجز جلفاسترا للمصادر العلنية",f"الفترة: آخر {hours} ساعة (حسب وقت نشر التقارير)","",
               f"مجموعات التغطية: {len(events)} | عناوين مرتبطة: {sources}",
               "هذه تقارير صحفية وليست أحداثا مؤكدة، ولا تعتبر توجيهات سلامة رسمية.",""]
    else:
        lines=["# Gulfastra | Open-source situation report",f"Window: last {hours} hours (publication-based)",
               f"Coverage groups: {len(events)} | linked headlines: {sources}",
               "IMPORTANT: Unverified published reporting; not confirmed attacks or official safety advice.",""]
    for category in ("security","transport","diplomacy","other"):
        subset=[e for e in events if e["category"]==category][:14]
        if not subset:
            continue
        lines.append("## "+category.title()+f" ({by_category[category]} coverage groups)")
        for e in subset:
            lines.append(f"- {e['title']} ({e['report_count']} headlines; {e['corroboration']})")
            for src in e["sources"][:2]:
                lines.append(f"  - {src['source']}: {src['url']}")
        lines.append("")
    return "\n".join(lines)


def main():
    DATA.mkdir(exist_ok=True)
    try:
        reports=json.loads((DATA/"reports.json").read_text(encoding="utf-8")).get("reports",[])
    except (OSError,ValueError):
        reports=[]
    try:
        old=json.loads((DATA/"events.json").read_text(encoding="utf-8"))
    except (OSError,ValueError):
        old={}
    result=build(reports,old)
    (DATA/"events.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    try:
        history=json.loads((DATA/"revisions.json").read_text(encoding="utf-8"))
    except (OSError,ValueError):
        history={"schema":1,"history":[]}
    history["history"]=(history.get("history",[])+result["revisions"])[-2500:]
    (DATA/"revisions.json").write_text(json.dumps(history,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (DATA/"sitrep.md").write_text(render_brief(result),encoding="utf-8")
    (DATA/"sitrep-ar.md").write_text(render_brief(result,language="ar"),encoding="utf-8")
    print("Fusion result",len(result["events"]),"coverage groups,",sum(e["report_count"] for e in result["events"]),"linked reports,",len(result["revisions"]),"revisions")

if __name__=="__main__":
    main()
