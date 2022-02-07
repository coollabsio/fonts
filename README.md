# Privacy-focused Google Fonts CDN alternative

I written it in a hour, so please report bugs [here](https://github.com/coollabsio/fonts/issues/new).

Currently it only supports the css2 [API endpoint](https://developers.google.com/fonts/docs/css2).

## How to use?

Just change the domain name from `fonts.googleapis.com` to `api.fonts.coollabs.io` in your <head> tag, that's it!

Example:

Original <head> content:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
```

Replaced <head> content:
```html
<link rel="preconnect" href="https://fontsapi.coollabs.io" crossorigin>
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

## Why?

There was several GDPR issues popping up lately with Google & Google CDN. We don't know what they are doing with user details, such as IP address, browser agent, etc.

So I decided to create a similar service just without logging ANYTHING.

## Components
- The API is a simple http server (written in Node.js/Fastify), that is open sourced and does not log anything.
- Fonts are served from [BunnyCDN](https://bunny.net), that has an option to completely disable logging on their side.

There are several improvements could be done. If you have suggestions, do not hesitate to contact me.