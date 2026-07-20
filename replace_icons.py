import os
import re

replacements = {
    "🔭": '<i data-lucide="telescope"></i>',
    "📡": '<i data-lucide="radio"></i>',
    "📊": '<i data-lucide="bar-chart-2"></i>',
    "🌀": '<i data-lucide="activity"></i>',
    "🚢": '<i data-lucide="ship"></i>',
    "🛢️": '<i data-lucide="database"></i>',
    "🛢": '<i data-lucide="database"></i>',
    "🛳️": '<i data-lucide="ship"></i>',
    "🛳": '<i data-lucide="ship"></i>',
    "🏭": '<i data-lucide="factory"></i>',
    "⚠️": '<i data-lucide="alert-triangle"></i>',
    "⚠": '<i data-lucide="alert-triangle"></i>',
    "🔴": '<i data-lucide="alert-circle"></i>',
    "🌊": '<i data-lucide="waves"></i>',
    "🌍": '<i data-lucide="globe"></i>',
    "🇮🇳": '<i data-lucide="map-pin"></i>',
    "⚔️": '<i data-lucide="swords"></i>',
    "⚔": '<i data-lucide="swords"></i>',
    "💥": '<i data-lucide="zap"></i>',
    "🏜️": '<i data-lucide="sun"></i>',
    "🏜": '<i data-lucide="sun"></i>',
    "🌏": '<i data-lucide="globe"></i>',
    "🎯": '<i data-lucide="target"></i>',
    "🤖": '<i data-lucide="bot"></i>',
    "📈": '<i data-lucide="trending-up"></i>',
    "📉": '<i data-lucide="trending-down"></i>',
    "🚨": '<i data-lucide="siren"></i>',
    "⚙️": '<i data-lucide="settings"></i>',
    "⚙": '<i data-lucide="settings"></i>',
    "📌": '<i data-lucide="pin"></i>',
    "🏗️": '<i data-lucide="hard-hat"></i>',
    "🏗": '<i data-lucide="hard-hat"></i>',
    "🛤️": '<i data-lucide="route"></i>',
    "🛤": '<i data-lucide="route"></i>',
    "📋": '<i data-lucide="clipboard-list"></i>',
    "📅": '<i data-lucide="calendar"></i>',
    "⚡️": '<i data-lucide="zap"></i>',
    "⚡": '<i data-lucide="zap"></i>',
    "🚫": '<i data-lucide="ban"></i>'
}

files_to_check = [
    "index.html",
    "js/app.js",
    "js/agents/agent-coordinator.js",
    "js/agents/reserve-optimizer.js",
    "js/agents/risk-intelligence.js",
    "js/agents/scenario-modeller.js",
    "js/visualization/charts.js",
    "js/visualization/map-engine.js"
]

for filepath in files_to_check:
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    for emoji, tag in replacements.items():
        if emoji in content:
            # Special case for JS template literals vs standard HTML
            # Just do direct replacement first. If it's a string, it will be fine unless it requires different quotes
            content = content.replace(emoji, tag)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
        
