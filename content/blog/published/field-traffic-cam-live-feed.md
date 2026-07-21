---
title: "Field Note: turning NYC's public traffic cameras into a live feed"
slug: field-traffic-cam-live-feed
archetype: field-note
date: 2026-06-08
project: null
version: null
status: published
tags: [traffic-cameras, nyc-dot, public-data, haversine, cors, javascript, static-site, civic-tech]
summary: New York DOT puts roughly 957 traffic cameras online as still images with no key and no login. Refresh one on a timer and a still becomes a feed. This is how I found the right cameras for each location, faked "live" without the page jumping, and handled the cameras that quietly die.
---

# Field Note: turning NYC's public traffic cameras into a live feed

By Russ. Field Note, 2026.

---

## The whole idea in one line

New York DOT runs a public traffic-camera site. Every camera has a still image at a stable URL. Refresh that image on a timer and a still becomes a feed. That is the entire trick. Everything below is just the detail that makes it hold up.

## The image URL

Each camera's picture lives at a predictable address:

```
https://webcams.nyctmc.org/api/cameras/{id}/image
```

It returns a JPEG. No key, no login, nothing to sign up for. The only real snag is caching: browsers hold onto an image URL, so a plain reload shows you the same frame over and over. The fix is a throwaway query string that changes every time:

```
https://webcams.nyctmc.org/api/cameras/{id}/image?cacheAvoidance=1717800000000
```

Stick the current timestamp on the end and every request is a new URL, so the browser actually goes and fetches a fresh frame. Reload every two seconds and it reads as live. I picked two seconds on purpose. The cameras themselves only refresh about once a second, so there is no point hammering faster. And two seconds stays honest about what the source actually is instead of pretending to be full-motion video.

## Finding the right cameras

The site also exposes a list of every camera:

```
https://webcams.nyctmc.org/api/cameras
```

That comes back as an array of roughly 957 entries, each with an id, a human name like "6 Ave @ 42 St", a latitude and longitude, and an online flag. I did not want to hand-pick cameras for every location, so I let geography do it. For each venue I have a coordinate. I run a haversine distance against every online camera, sort by distance, and keep the nearest handful.

```js
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

The nice side effect is that the whole thing is re-targetable. Change a venue's latitude and longitude and the camera set follows it. Move the watch party from Bryant Park to Brooklyn Bowl and the app just points at the cameras near the new spot.

## Faking "live" without the page jumping

Each camera is its own image element sitting in a fixed aspect-ratio box with object-fit cover. That part matters more than it sounds: because the box never changes size, a new frame swapping in causes zero layout shift. The page sits perfectly still while the pictures underneath it update.

One shared timer ticks every two seconds, walks every tile, and swaps each image source to a fresh cache-busted URL. The loads happen independently, so a slow camera or a dead one only affects its own tile. Nothing waits on anything else.

## The CORS wall, and why I ship a hardcoded list

Here is the one place the browser fights you. The image URL works cross-origin from an image tag with no trouble at all. The list URL does not send the headers a browser needs to read a cross-origin fetch. So calling the list from client-side JavaScript gets blocked.

There are two honest ways around that. Stand up a small proxy, or ship a hardcoded list of camera IDs with the app. For something I want to be a single static page that runs by opening a file, I went with the hardcoded list. The app tries the live list first. When the fetch is blocked, it quietly falls back to a vetted list of camera IDs per location. In practice the browser uses the fallback every time, and the live list is a bonus for environments that allow it.

## Cameras die, so plan for it

Camera IDs go stale. A retired camera answers its image URL with a 404, and an image element pointed at a 404 just fires an error event. So every tile listens for that error, swaps itself to a RECONNECTING state, and tries again on the next tick. One dead camera should never freeze the rest of the wall.

Two small things bit me here:

1. Several IDs from an older public list had already been retired, so I re-pulled the full list and kept only the ones whose image actually came back as a real JPEG.
2. The online flag in the list is the string "true" or "false", not a real boolean. A plain truthy check treats the string "false" as true, which silently keeps offline cameras in the mix.

## The bug that actually cost me time

The one worth writing down: the RECONNECTING overlay was a div with display:flex in the stylesheet, and I was toggling the hidden attribute on it from JavaScript. The problem is that display:flex wins over the hidden attribute. So the overlay sat on top of every tile permanently, covering feeds that were loading perfectly well underneath.

For a while the data was completely live and the screen looked dead. The JavaScript was telling the truth and the CSS was lying. The fix was one line that lets the attribute win:

```css
.overlay[hidden] { display: none; }
```

The lesson I am keeping: when a piece of state lives in both an HTML attribute and a stylesheet, make sure the stylesheet actually respects the attribute. Otherwise you will spend an hour debugging a network layer that was fine the whole time.

## Closing

None of this is hard. A still image, a timer, a distance calc, and some care around the cameras that drop out. The interesting part is not the code, it is that the raw material was sitting in public the entire time. For the short version and the reason I built it on a Finals night, see [the ship note](ship-gardencam.html).

---

Russ
