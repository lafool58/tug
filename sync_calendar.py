#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import urllib.request
import urllib.error
import urllib.parse
import sys
import json
import time

SYNC_BASE = "https://keyvalue.immanuel.co/api/KeyVal"
SYNC_TOKEN = "9cmvofbs"

MOVIES = {
    "colony": {
        "korean": "군체",
        "english": "colony",
        "key": "colony_alarm"
    },
    "disclosure": {
        "korean": "디스클로저",
        "english": "disclosure",
        "key": "disclosure_alarm"
    },
    "mandalorian": {
        "korean": "만달로리안",
        "english": "mandalorian",
        "key": "mandalorian_alarm"
    },
    "toystory": {
        "korean": "토이 스토리",
        "english": "toystory",
        "key": "toystory_alarm"
    }
}

# AppleScript to query calendar events
# 1. Search all events in the 'clara' calendar if it exists.
# 2. Search all calendars for events whose summary contains "[CineMag]" as a fallback/signature.
APPLESCRIPT_TEMPLATE = """
tell application "Calendar"
    try
        reload calendars
        delay 1
    end try
    set matchedEvents to {}
    
    # 1. Try to query the dedicated 'clara' calendar
    try
        set claraCal to (first calendar whose name is "clara")
        repeat with anEvent in (every event of claraCal)
            copy (summary of anEvent) to end of matchedEvents
        end repeat
    end try
    
    # 2. Query all other calendars for CineMag signed events
    repeat with aCal in every calendar
        try
            if name of aCal is not "clara" then
                set theEvents to (every event of aCal whose summary contains "[CineMag]")
                repeat with anEvent in theEvents
                    copy (summary of anEvent) to end of matchedEvents
                end repeat
            end if
        end try
    end repeat
    
    return matchedEvents
end tell
"""

def get_actual_calendar_events():
    """Runs the AppleScript via osascript and returns list of event summaries."""
    print("Querying macOS Apple Calendar database...")
    try:
        process = subprocess.Popen(
            ['osascript', '-e', APPLESCRIPT_TEMPLATE],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            print(f"⚠️ AppleScript Error: {stderr.strip()}", file=sys.stderr)
            return []
        
        if not stdout.strip():
            return []
            
        # AppleScript lists list items separated by comma
        # e.g., "[CineMag] 군체, [CineMag] 디스클로저 데이"
        # We will split them carefully, but checking the whole stdout for matches is also extremely safe.
        events = [e.strip() for e in stdout.strip().split(",")]
        print(f"Found {len(events)} relevant CineMag/clara calendar events in total.")
        for ev in events:
            print(f"  - {ev}")
        return events
    except Exception as e:
        print(f"⚠️ Failed to query calendar: {e}", file=sys.stderr)
        return []

def get_cloud_value(key):
    """Fetches the current value of key from KeyValue cloud with retries."""
    url = f"{SYNC_BASE}/GetValue/{SYNC_TOKEN}/{key}"
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                text = response.read().decode('utf-8').strip()
                if text and text != "null":
                    return text.replace('"', '').strip()
                return "false"
        except Exception as e:
            print(f"⚠️ Cloud sync pull attempt {attempt}/3 failed for {key}: {e}", file=sys.stderr)
            if attempt < 3:
                time.sleep(attempt * 0.5)
    return "false"

def update_cloud_value(key, val_str):
    """Updates key value in KeyValue cloud with retries."""
    url = f"{SYNC_BASE}/UpdateValue/{SYNC_TOKEN}/{key}/{val_str}"
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(url, data=b'0', headers={'User-Agent': 'Mozilla/5.0'}, method='POST')
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.getcode()
                if status == 200:
                    print(f"  Successfully updated cloud key '{key}' to '{val_str}'")
                    return True
        except Exception as e:
            print(f"⚠️ Cloud sync push attempt {attempt}/3 failed for {key} to {val_str}: {e}", file=sys.stderr)
            if attempt < 3:
                time.sleep(attempt * 0.5)
    return False

def main():
    print("==================================================")
    print("   TUG CineMag Apple Calendar Sync System v1.0")
    print("==================================================")
    
    # 1. Fetch actual events in user's Apple Calendar
    events = get_actual_calendar_events()
    events_str_lower = " | ".join(events).lower()
    
    # 2. Determine actual registration status for each movie
    print("\nEvaluating calendar registration status...")
    current_status = {}
    for movie_id, meta in MOVIES.items():
        korean_name = meta["korean"]
        english_name = meta["english"]
        
        # Check if the movie Korean name or English name appears in any of the registered events
        is_registered = (korean_name.lower() in events_str_lower) or (english_name.lower() in events_str_lower)
        status_str = "true" if is_registered else "false"
        current_status[movie_id] = status_str
        
        status_label = "⏰ 알람 켬 (REGISTERED)" if is_registered else "⏰ 알람 끔 (NOT FOUND)"
        print(f"  🎬 [{korean_name}] -> {status_label}")

    # 3. Synchronize with the KeyValue Cloud Database
    print("\nSynchronizing with CineMag KeyValue Cloud DB...")
    for movie_id, meta in MOVIES.items():
        key = meta["key"]
        local_determined_val = current_status[movie_id]
        
        # Fetch current cloud value to avoid unnecessary write requests
        cloud_val = get_cloud_value(key)
        
        if cloud_val != local_determined_val:
            print(f"  🔄 Cloud mismatch for '{key}': Cloud={cloud_val} vs Actual={local_determined_val}. Updating...")
            update_cloud_value(key, local_determined_val)
        else:
            print(f"  ✅ Cloud is already in sync for '{key}' ({cloud_val})")

    print("\nSync completed successfully.")
    print("==================================================")

if __name__ == "__main__":
    main()
