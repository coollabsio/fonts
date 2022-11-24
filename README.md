# A privacy-friendly drop-in replacement for Google Fonts

I wrote it in an hour, so please report bugs [here](https://github.com/coollabsio/fonts/issues/new).
Several improvements could be made here and there, so do not hesitate to [contact me](https://docs.coollabs.io/contact). if you have any suggestions.

[Latency test](https://latency.apex.sh/?url=https%3A%2F%2Fapi.fonts.coollabs.io%2Fcss2%3Ffamily%3DRoboto%26display%3Dswap&compare=https%3A%2F%2Ffonts.googleapis.com%2Fcss2%3Ffamily%3DRoboto%26display%3Dswap)

(The colorful is my API, the grey is Google's API)

## Why?

There have been several GDPR issues popping up lately with Google & Google CDN. We don't know what they are doing with user details, such as IP address, browser agent, etc.

So I decided to create a similar service just without logging ANYTHING.

## How to use?

### Fonts
Change the domain name from `fonts.googleapis.com` to `api.fonts.coollabs.io` in your `<head>` tag; that's it!

Example:

Original `<head>` content:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
```

Replaced `<head>` content:
```html
<link rel="preconnect" href="https://api.fonts.coollabs.io" crossorigin>
<link href="https://api.fonts.coollabs.io/css2?family=Roboto&display=swap" rel="stylesheet">
```

Or with `@import`:

From:
```css
<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');
</style>
```

To: 
```css
<style>
@import url('https://api.fonts.coollabs.io/css2?family=Roboto&display=swap');
</style>
```

Supports css2 [API endpoint](https://developers.google.com/fonts/docs/css2) and css [API endpoint](https://developers.google.com/fonts/docs/getting_started) as well.

### Icons

Currently, [Material Icons](https://fonts.google.com/icons) is supported.

Original `<head>` content:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

Replaced `<head>` content:
```html
<link rel="preconnect" href="https://api.fonts.coollabs.io" crossorigin>
<link href="https://api.fonts.coollabs.io/icon?family=Material+Icons" rel="stylesheet">
```

## Stack
- The API is a simple HTTP server (written in Node.js/[Fastify](https://fastify.io)), that is open-sourced and does not log anything, hosted with a [coolify](https://coolify.io) instance on a [Hetzner](https://hetzner.com) server.
- Fonts are served from [BunnyCDN](https://bunny.net), which has an option to disable logging on their side completely.
