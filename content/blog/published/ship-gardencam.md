---
title: "Ship Note: I built a way to watch the watch party"
slug: ship-gardencam
archetype: ship-note
date: 2026-06-08
project: gardencam
version: v1 / 2026
status: published
tags: [vibe-coding, public-data, traffic-cameras, nyc-dot, knicks, build-in-public, static-site, civic-tech]
summary: The Knicks are up 2-0 in the Finals and the Game 3 watch party got scattered across three parks. So in one evening I built a way to watch the watch party, using New York's public traffic cameras as a stand-in live feed.
---

# Ship Note: I built a way to watch the watch party

By Russ. Ship Note, 2026.

---

Last night I built something kind of dumb and kind of delightful.

The Knicks are up 2-0 in the Finals. Game 3 is at the Garden tonight. But with the President in the building, the city moved the outdoor watch party out of MSG and spread it across Bryant Park, Wollman Rink, and Brooklyn Bowl. So I built a way to watch the watch party.

Here is the trick. New York DOT publishes around 957 traffic cameras to the public. No API key, no login, just a still image at a URL that refreshes about once a second. Loop that image every two seconds and you have a passable live feed of any street corner in the city.

Credit where it is due: I saw wttdotm's GardenCam pull this off for MSG and wanted my own. Then I pushed it one step further. Instead of hardcoding a handful of cameras, I pulled the full list and ran a quick distance calculation against each watch-party venue. Then I let the app find the nearest cameras to wherever the crowd actually is. Bryant Park. Brooklyn Bowl. Wherever the party moves next.

Total build time was one evening.

I keep coming back to this. The gap between "I have an idea" and "it is live" has basically collapsed. Public data, an AI coding tool, and one quiet evening is the whole stack now.

You do not need permission or a budget to build something people enjoy. You just need to be curious enough to lop the /image off a URL and see what is underneath.

Let's go Knicks.

---

If you want the version with the wiring exposed (how the app finds the right cameras, why a two-second reload reads as live, and the things that broke along the way), I wrote it up in [the companion field note](field-traffic-cam-live-feed.html).

---

Russ
