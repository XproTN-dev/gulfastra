"""Deterministic, conservative reporting-quality and freshness rules.
Published headlines are NOT independently confirmed events or safety alerts.
No ML, private feeds, API keys, or external runtime dependencies.
"""
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import re

RETROSPECTIVE = re.compile(
    r"\b(last year|years ago|anniversary|on this day|in retrospect|historical|history of|"
    r"previously|last week|in 20(?:0\d|1\d|2[0-5])|analysis|opinion|explainer|"
    r"what we know|timeline of|how did|could have|war game|simulation|military exercise|"
    r"training drill)\b|(?:العام الماضي|سنوات مضت|ذكرى|سابقا|الأسبوع الماضي|تحليل|"
    r"تدريبات|مناورات|محاكاة|تاريخ|في عام 20(?:0\d|1\d|2[0-5]))",
    re.I)
SPECULATIVE = re.compile(
    r"\b(could|might|may|possibly|potentially|fears|fear of|risks?|"
    r"threatens?|would|if|plans? to|prepares? to|expected to|"
    r"prediction|unconfirmed rumor|rumou?r|scenario)\b|"
    r"(قد يحدث|احتمال|محتمل|ربما|يخشى|تخوف|سيناريو|شائعة|تهدد|قد تشهد|"
    r"يتوقع|احتمالية)", re.I)
# Explicitly real-world, potentially serious harm/disruption phrases, not generic
# words like 'war', 'security', 'military', 'Iran', 'missile' or 'warning'.
CRITICAL = re.compile(
    r"\b(?:killed|deaths?|dead|fatalities|injured|casualties|explosion|exploded|"
    r"struck|strikes? (?:hit|on|at)|attacked|under attack|hit by|"
    r"airspace (?:closed|shut)|airport (?:closed|shut)|"
    r"port (?:closed|shut)|flights? (?:suspended|grounded|cancelled)|"
    r"evacuation (?:ordered|underway)|emergency (?:declared|alert issued)|"
    r"vessel (?:hit|sunk|attacked)|tanker (?:hit|sunk|attacked)|"
    r"ship (?:hit|sunk|attacked)|missile (?:hit|struck)|"
    r"drone (?:hit|struck)|internet (?:blackout|shutdown))\b|"
    r"(?:قتلى|مقتل|قتل|قتيل|ضحايا|إصابات|مصابين|انفجار|انفجارات|"
    r"استهدف|ضربت|تعرضت لهجوم|تعرض لهجوم|"
    r"إغلاق (?:المجال الجوي|المطار|الموانئ|ميناء)|"
    r"اغلاق (?:المجال الجوي|المطار|الموانئ|ميناء)|"
    r"تعليق (?:الرحلات|الملاحة الجوية|حركة الطيران)|"
    r"إجلاء|اجلاء|حالة الطوارئ|سقوط صاروخ|سقوط مسيرة|"
    r"غرق سفينة|انقطاع الانترنت|انقطاع الإنترنت)", re.I)
# Specific incident reports which may be relevant, but not automatically critical.
ELEVATED = re.compile(
    r"\b(intercepted?|missile launch|air defence|air defense|drone attack|"
    r"security incident|maritime advisory|naval incident|"
    r"airspace restriction|flight diversion|disruption|ceasefire violation)\b|"
    r"(?:اعتراض|دفاع جوي|هجوم بمسيرة|حادث أمني|تحذير ملاحي|"
    r"تعطل|اضطراب|تحويل مسار الرحلات|خرق وقف إطلاق النار)", re.I)
TRACKERS = ("utm_", "fbclid", "gclid", "mc_cid", "mc_eid", "oc")

def when(value):
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None

def canonical_url(value):
    """For deduplication only; preserve the original report URL for evidence."""
    p = urlsplit(str(value or ""))
    if p.scheme != "https" or not p.netloc:
        return ""
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if not k.lower().startswith("utm_") and k.lower() not in TRACKERS]
    return urlunsplit(("https", p.netloc.lower().removeprefix("www."),
                       p.path.rstrip("/") or "/", urlencode(sorted(query)), ""))

def normalized_title(text):
    text = str(text or "").casefold()
    text = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)
    text = text.translate(str.maketrans({"أ":"ا","إ":"ا","آ":"ا","ى":"ي","ة":"ه"}))
    # Google News commonly appends the outlet after a separator.
    text = re.sub(r"\s+[-–—|]\s+[^-–—|]{2,65}$", "", text)
    return " ".join(re.findall(r"[\w\u0600-\u06ff]+", text, flags=re.UNICODE))

def freshness(published_at, now=None):
    """Article publication recency, NEVER a conclusion that an incident is active."""
    now = now or datetime.now(timezone.utc)
    date = when(published_at)
    if not date:
        return "date-unknown"
    age = now - date
    if age < -timedelta(minutes=10):
        return "future-or-invalid"
    if age < timedelta(hours=2):
        return "new-reporting"
    if age < timedelta(hours=24):
        return "recent-reporting"
    if age < timedelta(days=7):
        return "older-reporting"
    return "archive"

def assess(title, published_at, now=None):
    """Conservative candidate severity; cannot establish event occurrence or truth."""
    now = now or datetime.now(timezone.utc)
    age = freshness(published_at, now)
    old_context = bool(RETROSPECTIVE.search(title or ""))
    hypothetical = bool(SPECULATIVE.search(title or ""))
    has_critical = bool(CRITICAL.search(title or ""))
    has_elevated = bool(ELEVATED.search(title or ""))
    # Never turn old/explainer/hypothetical headlines into urgent alerts.
    urgent = age == "new-reporting" and not old_context and not hypothetical and has_critical
    return {
        "freshness": age,
        "context": "retrospective" if old_context else "speculative" if hypothetical else "reporting",
        "severity": "critical-candidate" if urgent else (
            "elevated-reporting" if has_critical or has_elevated else "routine-reporting"),
        "critical_candidate": urgent,
        "alert_eligible": urgent,
        "assessment_note": "Keyword-screened public reporting; incident unverified and not necessarily ongoing.",
    }
