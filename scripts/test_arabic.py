#!/usr/bin/env python3
"""Safeguard tests for Arabic extraction, region detection and public-news classification."""
from arabic_sources import is_arabic, category_for_arabic, country_mentions, arabic_tag

examples=[
 ("إيران تعلن إسقاط مسيرة أمريكية في الخليج","security",["Iran"]),
 ("اعتراض صواريخ في السعودية بعد هجوم إيراني","security",["Iran","Saudi"]),
 ("تعليق الملاحة في مضيق هرمز بسبب التوتر","transport",[]),
 ("الكويت تدعو إلى مفاوضات لوقف التصعيد","diplomacy",["Kuwait"]),
 ("شرطة دبي تحتفل بالبطولة الرياضية",None,["UAE"]),
]
for title,expected,mentions in examples:
    actual=category_for_arabic(title)
    assert actual==expected,(title,actual,expected)
    found=country_mentions(title)
    assert set(found)==set(mentions),(title,found,mentions)
    assert is_arabic(title)
assert arabic_tag("الدفاعات الجوية تعترض صاروخا فوق السعودية","security").startswith("خبر اعتراض")
print("Arabic classification:",len(examples),"examples passed")
