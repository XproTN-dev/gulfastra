"""Arabic Gulf-news metadata extraction for Gulfastra.
Public headlines only. This is not incident verification/geolocation.
"""
import re
from unicodedata import normalize

_ARABIC = re.compile(r"[\u0600-\u06ff]")
_DIACRITICS = re.compile(r"[\u064b-\u065f\u0670\u0640]")
COUNTRY_TOKENS = {
    "Iran": ("ايران", "طهران", "اصفهان", "شيراز", "بوشهر"),
    "Saudi": ("السعوديه", "السعودية", "الرياض", "جده", "جدة", "الدمام", "الشرقيه", "الشرقية", "خميس مشيط"),
    "Qatar": ("قطر", "الدوحه", "الدوحة"),
    "UAE": ("الامارات", "دبي", "ابوظبي", "ابو ظبي", "الشارقه", "الشارقة"),
    "Bahrain": ("البحرين", "المنامه", "المنامة"),
    "Kuwait": ("الكويت",),
    "Iraq": ("العراق", "بغداد", "البصره", "البصرة", "اربيل"),
    "Oman": ("عمان", "مسقط", "سلطنه عمان", "سلطنة عمان"),
    "Yemen": ("اليمن", "الحوثي", "الحوثيين", "صنعاء", "الحديده", "الحديدة"),
    "Israel": ("اسرائيل", "تل ابيب", "الاحتلال الاسرائيلي"),
}
SECURITY = ("صاروخ", "صواريخ", "مسير", "مسيّر", "طائره مسيره", "طائرة مسيرة", "قصف",
            "هجوم", "اعتراض", "اسقاط", "دفاع جوي", "غاره", "غارة", "انفجار",
            "استهداف", "ضربات", "تهديد امني", "هجمات", "اطلاق", "تصعيد عسكري",
            "الحرس الثوري", "عمليه عسكريه", "الجيش", "القوات المسلحه")
TRANSPORT = ("مطار", "مطارات", "الاجواء", "اجواء", "المجال الجوي", "الرحلات",
             "رحله جويه", "طيران", "الطيران", "ملاحه", "مضيق هرمز", "السفن",
             "ناقله", "ناقلات", "موانئ", "ميناء", "التجاريه", "النفط")
DIPLOMACY = ("مفاوضات", "مباحثات", "عقوبات", "التهدئه", "هدنه", "وقف اطلاق النار",
             "اتفاق", "التصريحات", "بيان", "وزير الخارجيه", "الدبلوماسيه", "محادثات", "واشنطن")
REGIONAL = ("الخليج", "هرمز", "الشرق الاوسط", "الشرق الأوسط", "القوات الامريكيه", "امريكا", "الولايات المتحده")
EXCLUDE = ("كره القدم", "الدوري", "مباراه", "اهداف", "الفنان", "الممثل", "الاغاني", "المسلسل", "الفريق الرياضي")
EN_COUNTRIES = {
"Iran":("iran", "tehran", "isfahan", "shiraz"), "Saudi":("saudi","riyadh","jeddah","aramco"),
"Qatar":("qatar","doha"), "UAE":("uae","united arab emirates","dubai","abu dhabi"),
"Bahrain":("bahrain","manama"), "Kuwait":("kuwait",), "Iraq":("iraq","baghdad","basra"),
"Oman":("oman","muscat"), "Yemen":("yemen","houthi","sanaa"),
"Israel":("israel","tel aviv")
}

def normalize_title(value):
    s = _DIACRITICS.sub("", normalize("NFKC",value or "").lower())
    return s.translate(str.maketrans({"أ":"ا","إ":"ا","آ":"ا","ٱ":"ا","ى":"ي","ة":"ه"}))

def is_arabic(value):
    return bool(_ARABIC.search(value or ""))

def hits(value, terms):
    return any(term in value for term in terms)

def country_mentions(value):
    value = normalize_title(value)
    result = []
    for country, arabic in COUNTRY_TOKENS.items():
        if hits(value, tuple(normalize_title(t) for t in arabic)) or any(re.search(r"(?<![a-z])"+re.escape(t)+r"(?![a-z])",value) for t in EN_COUNTRIES[country]):
            result.append(country)
    return result

def category_for_arabic(title):
    s=normalize_title(title)
    if not is_arabic(title) or hits(s,tuple(normalize_title(t) for t in EXCLUDE)):
        return None
    if not country_mentions(title) and not hits(s,tuple(normalize_title(t) for t in REGIONAL)):
        return None
    if hits(s,tuple(normalize_title(t) for t in SECURITY)):
        return "security"
    if hits(s,tuple(normalize_title(t) for t in TRANSPORT)):
        return "transport"
    if hits(s,tuple(normalize_title(t) for t in DIPLOMACY)):
        return "diplomacy"
    return None

def arabic_tag(title, category):
    s=normalize_title(title)
    if hits(s,("اعتراض", "اسقاط", "دفاع جوي")):
        return "خبر اعتراض / دفاع جوي"
    if hits(s,("صاروخ", "صواريخ")):
        return "تقرير عن صواريخ"
    if hits(s,("مسير", "طائره مسيره")):
        return "تقرير عن مسيرات"
    if hits(s,("مضيق هرمز", "السفن", "ناقلات")):
        return "ملاحه بحريه"
    return {"security":"تقرير امني","transport":"اضطراب نقل","diplomacy":"تطور دبلوماسي"}.get(category,"خبر اقليمي")
