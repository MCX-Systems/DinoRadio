# DinoRadio
Jquery plugin for listening to web radio with playlist support.

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/MCX-Systems/DinoRadio/graphs/commit-activity)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fmcx-systems.net%2FDinoRadio)
![GitHub last commit](https://img.shields.io/github/last-commit/MCX-Systems/DinoRadio)
![GitHub issues](https://img.shields.io/github/issues-raw/MCX-Systems/DinoRadio)
![GitHub pull requests](https://img.shields.io/github/issues-pr/MCX-Systems/DinoRadio)

![CRAN/METACRAN](https://img.shields.io/cran/l/devtools)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/MCX-Systems/DinoRadio)
![npm bundle size (version)](https://img.shields.io/bundlephobia/min/dino-knob/2.07.2021)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/MCX-Systems/DinoRadio)
![GitHub forks](https://img.shields.io/github/forks/MCX-Systems/DinoRadio?style=social)

## Example Page
Live example page: [http://mcx-systems.net/DinoRadio](http://mcx-systems.net/DinoRadio/)

## Preview Page Screenshot
![Screenshot](screenshot.jpeg)

## Supported Browser
![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![IE](https://raw.github.com/alrra/browser-logos/master/src/archive/internet-explorer_9-11/internet-explorer_9-11_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png)
--- | --- | --- | --- | --- |
Latest ✔ | Latest ✔ | 9+ ✔ | Latest ✔ | 8.0+ ✔ |

Tested in latest Edge, Chrome, Firefox, Opera, Safari and Mobile Safari \

## Install
You can install through [npm](https://npmjs.com) and use [browserify](https://browserify.org) to make it run on the browser.
```bash
npm install --save dinoradio

or

$ yarn add dinoradio
```

Or just download the minified version
[here](https://raw.githubusercontent.com/MCX-Systems/DinoRadio/master/dist/dinoRadio.min.js).

## Functions

- Poster style can be square or circle
- If playlist is empty, default playlist is loaded from API
- RDS Radio for getting current playing song and artist
- Latest Artist images Thumbnail and Banner
- Current playing song lyrics lookup, if found \
  icon feather shows up and starts to blink.
  Click on it to open Lyrics Overlay.
- If you click on right side banner, if found Artist biography is shown \
  in biography overlay
  
Example for dinoRadio player
------------------------

```js
$(document).ready(function()
{
	$('#RadioExample1').dinoRadio({
		autoPlay: false,
		showEqOnPlay: true,
		showPlaylistNumber: false,
		posterStyle: 'circle',
		stationPlaylist: [{
			url: '',
			station: 'Station Name'
		    },
			{
				url: '',
				station: 'Station Name'
			},
			{
				url: '',
				station: 'Station Name'
			},
			{
				url: '',
				station: 'Station Name'
			},
			{
				url: '',
				station: 'Station Name'
			},
			{
				url: '',
				station: 'Station Name'
			},
			{
				url: '',
				station: 'Station Name'
			}],
		// Enable plugin debug
		debug: true
	});
});
```