#!/usr/bin/env python3
"""Offline FIRMS input/provenance gate; no NASA key required."""
import sys
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parent))
from firms import read_csv
fixed_now=datetime(2026,10,20,19,0,tzinfo=timezone.utc)
day=fixed_now.strftime("%Y-%m-%d")
input_data=("latitude,longitude,acq_date,acq_time,frp,satellite\n"
            f"25.34,51.56,{day},1230,4.8,N21\n"
            f"95.0,51.56,{day},1230,2.0,N21\n"
            f"25.34,151.56,{day},1230,2.0,N21\n")
records=read_csv(input_data,fixed_now)
assert len(records)==1,records
first=records[0]
assert first["source"].startswith("NASA FIRMS")
assert first["kind"]=="thermal-detection"
assert first["classification"]=="remote-sensing-thermal-anomaly-unverified"
assert first["coordinates_quality"]=="satellite-estimated-detection"
assert "attack" not in first["classification"]
print("FIRMS thermal provenance, UTC timestamp and bounds PASS")
