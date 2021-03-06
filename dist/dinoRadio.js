/*
 * DinoRadio
 * Requires: jQuery v3.0+
 *
 * Jquery plugin for listening to web radio.
 * Created by 2007 - 2021 MCX-Systems
 */
(function(root, factory)
{
	if (typeof window.define === 'function' && window.define.amd)
	{
		window.define(['jquery'], factory);
	}
	else if (typeof exports === 'object')
	{
		module.exports = factory(require('jquery'));
	}
	else
	{
		root.dinoRadio = factory(root.jquery);
	}
}(this,
	function()
	{
		'use strict';

		/*
			Store the name of the plugin in the "pluginName" variable. This
			variable is used in the "Plugin" constructor below, as well as the
			plugin wrapper to construct the key for the "$.data" method.
	
			More: http://api.jquery.com/jquery.data/
		*/
		const pluginName = 'dinoRadio';
		// Holds all instances of created audio objects
		const dinoRadioPlayers = [];

		// Google Analytics
		window.dataLayer = window.dataLayer || [];

		// Create the plugin constructor
		function Plugin(element, options)
		{
			/*
				Provide local access to the DOM node(s) that called the plugin,
				as well local access to the plugin name and default options.
			*/
			this.element = element;
			/***************************************************************************/
			this._flag = false;
			this._name = pluginName;
			this._uId = this.createUniqId(8);
			this._language = this.getUserLanguage();
			this._prefix = ('https:' === window.location.protocol ? 'https://' : 'http://');
			/***************************************************************************/
			$(this.element).attr('data-radioId', this._uId);
			this.dinoAudio = new window.Audio();
			this.dinoAudio.id = this._uId;
			this.dinoAudio.loop = false;
			this.dinoAudio.autoplay = false;
			this.dinoAudio.preload = 'metadata';
			dinoRadioPlayers.push(this.dinoAudio);
			/***************************************************************************/
			// Playlist Variables
			this._dinoStationsArr = [];
			this._dinoArt = '';
			this._filterText = '';
			this._dinoCurrentImage = '';
			this._dinoCurrentSong = '';
			this._dinoCurrentArtist = '';
			this._dinoCurrentUrl = '';
			this._dinoCurrentRow = 0;
			this._dinoCurrentIndex = 0;
			this._nowPlayingIntervalId = null;
			/***************************************************************************/
			this._defaults = $.fn.dinoRadio.defaults;

			/*
				The "$.extend" method merges the contents of two or more objects,
				and stores the result in the first object. The first object is
				empty so that we don't alter the default options for future
				instances of the plugin.
	
				More: http://api.jquery.com/jquery.extend/
			*/
			this.options = $.extend({}, this._defaults, options);

			/*
			 * Process and add data-attrs to settings as well for ease of use. Also, if
			 * data-dinoRadio is an object then use it as extra settings and if it's not
			 * then use it as a title.
			 */
			if (typeof($(this.element).data('dinoRadio')) === 'object')
			{
				$.extend(this.options, $(this.element).data('dinoRadio'));
			}

			const dataKeys = Object.keys($(this.element).data());
			const dataAttrs = {};

			for (let i = 0; i < dataKeys.length; i++)
			{
				let key = dataKeys[i].replace(pluginName, '');
				if (key === '')
				{
					continue;
				}

				// Lowercase first letter
				key = key.charAt(0).toLowerCase() + key.slice(1);
				dataAttrs[key] = $(this.element).data(dataKeys[i]);

				// We cannot use extend for data_attrs because they are automatically
				// lower cased. We need to do this manually and extend this.options with
				// data_attrs
				for (let settingsKey in this.options)
				{
					if (this.options.hasOwnProperty(settingsKey))
					{
						if (settingsKey.toLowerCase() === key)
						{
							this.options[settingsKey] = dataAttrs[key];
						}
					}
				}
			}

			/*
				The "init" method is the starting point for all plugin logic.
				Calling the init method here in the "Plugin" constructor function
				allows us to store all methods (including the init method) in the
				plugin prototype. Storing methods required by the plugin in its
				prototype lowers the memory footprint, as each instance of the
				plugin does not need to duplicate all of the same methods. Rather,
				each instance can inherit the methods from the constructor
				function's prototype.
			*/
			let widget = this;

			/***************************************************************************/

			if (!widget.options.language)
			{
				widget.options.language = widget._language;
			}

			if (widget.options.enableFacebookShare)
			{
				(function(d, s, id)
				{
					const fjs = d.getElementsByTagName(s)[0];
					if (d.getElementById(id))
					{
						return;
					}
					const js = d.createElement(s);
					js.id = id;
					js.async = true;
					js.src = widget._prefix + 'connect.facebook.com/en_US/sdk.js';
					fjs.parentNode.insertBefore(js, fjs);
				}(window.document, 'script', 'facebook-jssdk'));

				window.fbAsyncInit = function()
				{
					if (window.FB)
					{
						window.FB.init({
							appId: widget.options.facebookAppID,
							version: 'v10.0',
							status: true,
							cookie: true,
							xfbml: true
						});
					}
				};
			}

			if (widget.options.enableTwitterShare)
			{
				(function(d, s, id)
				{
					const fjs = d.getElementsByTagName(s)[0];
					if (d.getElementById(id))
					{
						return;
					}
					const js = d.createElement(s);
					js.id = id;
					js.async = true;
					js.src = widget._prefix + 'platform.twitter.com/widgets.js';
					fjs.parentNode.insertBefore(js, fjs);
				}(window.document, 'script', 'twitter-wjs'));
			}

			if (widget.options.enableGoogleAnalytics)
			{
				(function(d, s, id)
				{
					const fjs = d.getElementsByTagName(s)[0];
					if (d.getElementById(id))
					{
						return;
					}
					const js = d.createElement(s);
					js.id = id;
					js.async = true;
					js.src = widget._prefix +
						'www.googletagmanager.com/gtag/js?id=' +
						widget.options.enableGoogleAnalyticsTag;
					fjs.parentNode.insertBefore(js, fjs);
				}(window.document, 'script', 'dino_gtag'));

				dino_gtag('js', new Date());
				dino_gtag('config', widget.options.enableGoogleAnalyticsTag,
				{
					'allow_google_signals': true,
					'app_id': widget._uId,
					'app_name': widget.capitalizeFirstLetter(widget._name),
					'app_version': $.fn.dinoRadio.version,
					'page_title' : window.document.title,
					'page_path': window.location.pathname
				});
			}

			if (!widget._flag)
			{
				widget.init();
				widget._flag = true;
			}

			/***************************************************************************/
		}

		// Avoid Plugin.prototype conflicts
		$.extend(Plugin.prototype,
			{
				// Initialization logic
				init: function()
				{
					const widget = this;
					/*
						Create additional methods below and call them via
						"this.myFunction(arg1, arg2)", ie: "this.buildCache();".
	
						Note, you can access the DOM node(s), plugin name, default
						plugin options and custom plugin options for a each instance
						of the plugin by using the variables "this.element",
						"this._name", "this._defaults" and "this.options" created in
						the "Plugin" constructor function (as shown in the buildCache
						method below).
					*/
					this.buildCache();
					this.bindEvents();
					this.bindPlayerEvents();

					if (widget.options.debug)
					{
						window.console.info('--------------------------------------------');
						window.console.info('--------------------------------------------');
						window.console.info(widget.capitalizeFirstLetter(widget._name) +
							' ' +
							$.fn.dinoRadio.version +
							' successfully initialized and is ready.');
						window.console.info(`Language is set to: ${widget.options.language}`);
						window.console.info(
							`Plugin Description: ${widget.getI18n('plugin_desc', widget.options.language)}`);
						window.console.info(`Uniq ID generated: ${widget._uId}`);
						window.console.info(`Current dateTime is: ${widget.formatTime($.now(), 0)}`);
						window.console.info(`Current date is: ${widget.formatTime($.now(), 2)}`);
						window.console.info(`Current time is: ${widget.formatTime($.now())}`);
						window.console.info('--------------------------------------------');
						window.console.info('--------------------------------------------');
					}

					widget.$element.append(this.createRadioWidget());

					widget.initRadio();
				},

				createRadioWidget: function()
				{
					return `<article id="dinoRadio-${this._uId}" class="dinoRadio"><div id="dinoRadioHolder-${this._uId
						}" class="dinoRadioHolder"><section id="dinoRadioPosterHolder-${this._uId
						}" class="dinoRadioPosterHolder"><div id="dinoRadioLyricsOverlay-${this._uId
						}" class="dinoRadioLyricsOverlay"></div><img id="dinoRadioPoster-${this._uId
						}" class="dinoRadioPoster" alt="${this.getI18n('plugin_ra_station', this.options.language)
						}" /><div id="dinoRadioInfo-${this._uId
						}" class="dinoRadioInfo"></div><div id="dinoRadioPlayPause-${this._uId
						}" class="dinoRadioPlayPause"><i class="dinoIcon dino-icon-play-circled-1"></i></div><div id="dinoRadioError-${
						this._uId
						}" class="dinoBlinking"></div></section><img id="dinoRadioLogo-${this._uId
						}" src="data:image/png;base64,${this.getImage(0)
						}" class="dinoRadioLogo" alt="${this.getI18n('plugin_ra_logo', this.options.language)
						}" /><div id="dinoRadioBanner-${this._uId}" class="dinoRadioBanner"><img id="dinoArtistBanner-${
						this._uId
						}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="Banner" /></div><div id="dinoArtistBio-${
						this._uId}" class="dinoRadioArtistBio"></div><section id="dinoRadioPlaylist-${this._uId
						}" class="dinoRadioPlaylist"><div id="dinoRadioLoader-${this._uId
						}" class="dinoLoaderOverlay"><div class="dinoCubeGrid"><div class="dinoCube dinoCube1"></div><div class="dinoCube dinoCube2"></div><div class="dinoCube dinoCube3"></div><div class="dinoCube dinoCube4"></div><div class="dinoCube dinoCube5"></div><div class="dinoCube dinoCube6"></div><div class="dinoCube dinoCube7"></div><div class="dinoCube dinoCube8"></div><div class="dinoCube dinoCube9"></div></div></div><ul id="dinoRadioPlaylistList-${
						this._uId
						}" class="dinoRadioPlaylistList"></ul><div class="dinoRadioPlaylistBottom"><label for="dinoRadioSearchTerm-${
						this._uId
						}"></label><input id="dinoRadioSearchTerm-${this._uId
						}" class="dinoRadioSearchTerm" type="text" placeholder="${this.getI18n(
							'plugin_ra_search',
							this.options.language)}" value="" /><i id="dinoRadioSort-${this._uId
						}" class="dinoIcon dino-icon-sort-number-up dinoRadioSort"></i><i id="dinoRadioMail-${
						this._uId}" class="dinoIcon dino-icon-mail-squared"></i><i id="dinoRadioTwitter-${this._uId
						}" class="dinoIcon dino-icon-twitter-squared"></i><i id="dinoRadioFacebook-${this._uId
						}" class="dinoIcon dino-icon-facebook-squared"></i></div></ul></section><section id="dinoRadioData-${
						this._uId
						}" class="dinoRadioData"><i id="dinoRadioLyrics-${this._uId
						}" class="dinoIcon dino-icon-feather dinoRadioLyrics"></i><div id="dinoRadioStation-${this._uId
						}" class="dinoRadioStation"></div><div class="dinoMarquee"><div class="dinoMarqueeInner"><span>${
						this.getI18n('plugin_ra_title', this.options.language)
						}&nbsp;</span><span id="dinoRadioSongTitle-${this._uId
						}" class="dinoRadioSongTitle"></span><span>&nbsp;&nbsp;****&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;****&nbsp;&nbsp;</span><span>${
						this.getI18n('plugin_ra_artist', this.options.language)
						}&nbsp;</span><span id="dinoRadioSongArtist-${
						this._uId}" class="dinoRadioSongArtist"></span></div></div><div id="dinoRadioEqualiser-${this
						._uId
						}" class="dinoRadioEqualiser"><ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul><ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul><ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul><ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul><ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul></div></section><nav id="dinoRadioControls-${
						this._uId}" class="dinoRadioControls"><a href="#" id="dinoRadioPlay-${this._uId
						}" class="dinoRadioPlay" title="${this.getI18n('plugin_ra_play', this.options.language)
						}" data-toggle="tooltip"><i class="dinoIcon dino-icon-play-3"></i></a><a href="#" id="dinoRadioPrev-${
						this._uId
						}" class="dinoRadioPrev" title="${this.getI18n('plugin_ra_prev', this.options.language)
						}" data-toggle="tooltip"><i class="dinoIcon dino-icon-step-backward"></i></a><a href="#" id="dinoRadioNext-${
						this._uId
						}" class="dinoRadioNext" title="${this.getI18n('plugin_ra_next', this.options.language)
						}" data-toggle="tooltip"><i class="dinoIcon dino-icon-step-forward"></i></a><a href="#" id="dinoRadioVolumeButton-${
						this._uId
						}" class="dinoRadioVolumeButton" title="${this.getI18n('plugin_ra_mute', this.options.language)
						}" data-toggle="tooltip"><i class="dinoIcon dino-icon-volume"></i></a><a href="#" id="dinoRadioShowHidePlaylist-${
						this._uId
						}" class="dinoRadioShowHidePlaylist" title="${this.getI18n('plugin_ra_playlist',
							this.options.language)
						}" data-toggle="tooltip"><i class="dinoIcon dino-icon-indent-left-1"></i></a></nav><svg id="dinoBlurFilterSvg-${
						this._uId
						}" xmlns="http://www.w3.org/2000/svg" style="display: none;"><defs><filter id="dinoBlurFilter-${
						this._uId
						}"><feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" /><feColorMatrix in="blur" values="1 1 0 0 0  1 1 0 0 0  1 1 0 0 0  1 1 0 20 -6" result="flt" /><feBlend in2="flt" in="SourceGraphic" result="mix" /></filter></defs></svg></div></article>`;
				},

				initRadio: function()
				{
					const widget = this;

					if (widget.options.posterStyle === 'circle')
					{
						widget.$element.find(`#dinoRadioPosterHolder-${widget._uId}`).css({
							'border-radius': '50%'
						});

						widget.$element.find(`#dinoRadioInfo-${widget._uId}`).css({
							'border-radius': '50%'
						});

						widget.$element.find(`#dinoRadioPlayPause-${widget._uId}`).css({
							'border-radius': '50%'
						});

						widget.$element.find(`#dinoRadioPoster-${widget._uId}`).css({
							'border-radius': '50%'
						});
					}
					else
					{
						widget.$element.find(`#dinoRadioPosterHolder-${widget._uId}`).css({
							'border-radius': '14px'
						});

						widget.$element.find(`#dinoRadioInfo-${widget._uId}`).css({
							'border-radius': '14px'
						});

						widget.$element.find(`#dinoRadioPlayPause-${widget._uId}`).css({
							'border-radius': '14px'
						});

						widget.$element.find(`#dinoRadioPoster-${widget._uId}`).css({
							'border-radius': '12px'
						});
					}

					// Set default widget colors
					widget.$element.find(`#dinoRadioPosterHolder-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioPlaylist-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioControls-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioSearch-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioBanner-${widget._uId} img`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoArtistBio-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					if (window.navigator.userAgent.indexOf('Firefox') === -1)
					{
						widget.$element.find(`#dinoRadio-${widget._uId}`).css({
							'-webkit-filter': `url("#dinoBlurFilter-${widget._uId}")`,
							'filter': `url("#dinoBlurFilter-${widget._uId}")`
						});
					}
					else
					{
						widget.$element.find(`#dinoRadio-${widget._uId}`).css({
							'-webkit-filter':
								`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='dinoBlurFilter-${
									widget._uId
									}'><feGaussianBlur in='SourceGraphic' result='blur' stdDeviation='10' /><feColorMatrix in='blur' values='1 1 0 0 0  1 1 0 0 0  1 1 0 0 0  1 1 0 20 -6' result='flt' /><feBlend in2='flt' in='SourceGraphic' result='mix' /></filter></svg>#dinoBlurFilter-${
									widget._uId}")`,
							'filter':
								`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='dinoBlurFilter-${
									widget._uId
									}'><feGaussianBlur in='SourceGraphic' result='blur' stdDeviation='10' /><feColorMatrix in='blur' values='1 1 0 0 0  1 1 0 0 0  1 1 0 0 0  1 1 0 20 -6' result='flt' /><feBlend in2='flt' in='SourceGraphic' result='mix' /></filter></svg>#dinoBlurFilter-${
									widget._uId}")`
						});
					}

					widget.$element.find(`#dinoRadioPoster-${widget._uId}`)
						.attr('src', `data:image/png;base64,${widget.getImage(0)}`);
					widget.$element.find(`#dinoRadioStation-${widget._uId}`)
						.text(widget.checkStrLength(widget.getI18n('plugin_no_station', widget.options.language), 20));
					widget.$element.find(`#dinoRadioSongTitle-${widget._uId}`)
						.text(widget.getI18n('plugin_no_title', widget.options.language));
					widget.$element.find(`#dinoRadioSongArtist-${widget._uId}`)
						.text(widget.getI18n('plugin_no_artist', widget.options.language));

					/*---------------------------------------------------------------*/

					if (!widget.options.stationPlaylist.length)
					{
						window.console.info(
							window.atob('R2V0IGRlZmF1bHQgcmFkaW8gcGxheWxpc3QgZnJvbSBNQ1gtU3lzdGVtcyE='));
						// Get default radio playlist from MCX-Systems because playlist array is empty!
						$.getJSON(widget._prefix +
								widget.options.pathToAjaxFiles +
								'/' +
								window.atob('cmFkaW9TdGF0aW9uUGxheWxpc3QucGhw'),
								function(data)
								{
									widget.options.stationPlaylist = data;
									if (widget.options.debug)
									{
										window.console.log(widget.options.stationPlaylist);
									}
								})
							.fail(function(jqxhr, textStatus, error)
							{
								if (widget.options.enableGoogleAnalytics)
								{
									let err = textStatus + ', ' + error;
									dino_gtag('event', 'dino_exception_playlist', {
										'description': err,
										'fatal': false // set to true if the error is fatal
									});
								}

								window.console.error('Error getting default playlist!');
							});
					}

					window.setTimeout(function()
						{
							if (!widget.options.stationPlaylist.length)
							{
								widget.$element.find(`#dinoRadioError-${widget._uId}`).css({
									'visibility': 'visible',
									'opacity': 1
								});

								const template =
									`<li><span class="dinoRadioStationError">${this.getI18n('plugin_no_playlist',
										this.options.language)}</span></li>`;
								widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`).append(template);
								window.console.error('No Playlist Found!!! Please set a playlist first!');
							}

							/*---------------------------------------------------------------*/

							if (widget.options.stationPlaylist.length)
							{
								// Create initial Playlist and populate with data
								$(widget.options.stationPlaylist).each(
									function(i, value)
									{
										let num = '';
										let active = '';
										let hoverA = '';
										let template = '';

										if (widget.options.showPlaylistNumber)
										{
											num = `<span class="dinoRadioStationNumbers">${i + 1}</span>`;
										}

										if (i === 0)
										{
											hoverA = 'class="active"';
											active = '<span class="dinoRadioActive"></span>';
											widget.$element.find(`#dinoRadioStation-${widget._uId}`)
												.text(widget.checkStrLength(value.station,
													20));
											widget.dinoAudio.src = value.url;
											widget.changeRadioSong(value.url);
											widget.updateTag(value.station);
										}

										if (widget.options.grabStationRds)
										{
											const url = widget._prefix +
												widget.options.pathToAjaxFiles +
												'/' +
												window.atob('cmFkaW9TdGF0aW9uSW5mby5waHA/dGhlX3N0cmVhbT0=') +
												value.url;
											$.getJSON(url,
													function(data)
													{
														template =
															`<li id="dinoRadioItem-${i}-${widget._uId
															}" data-position="${i
															}" ${
															hoverA}>${num}${active}<span class="dinoRadioStation">${
															widget
															.checkStrLength(data.streamTitle, 14)
															}</span><i class="dinoIcon dino-icon-signal"></i></li>`;
														widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`)
															.append(template);

														widget._dinoStationsArr[i] =
															widget.checkStrLength(data.streamTitle, 20);

														if (i === 0)
														{
															widget.$element.find(`#dinoRadioStation-${widget._uId}`)
																.text(widget.checkStrLength(
																	data.streamTitle,
																	20));
														}
													})
												.fail(function(jqxhr, textStatus, error)
												{
													if (widget.options.enableGoogleAnalytics)
													{
														let err = textStatus + ', ' + error;
														dino_gtag('event', 'dino_exception_stations', {
															'description': err,
															'fatal': false // set to true if the error is fatal
														});
													}

													if (widget.options.debug)
													{
														window.console.log(
															'Error: Something went wrong with loading the Current Radio song!');
													}

													template =
														`<li id="dinoRadioItem-${i}-${widget._uId}" data-position="${i
														}" ${
														hoverA}>${num}${active}<span class="dinoRadioStation">${widget
														.checkStrLength(value.station, 14)
														}</span><i class="dinoIcon dino-icon-signal"></i></li>`;
													widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`)
														.append(template);

													widget._dinoStationsArr[i] =
														widget.checkStrLength(value.station, 20);
												});
										}
										else
										{
											template =
												`<li id="dinoRadioItem-${i}-${widget._uId}" data-position="${i}" ${
												hoverA
												}>${
												num}${active}<span class="dinoRadioStation">${widget.checkStrLength(
													value.station,
													14)
												}</span><i class="dinoIcon dino-icon-signal"></i></li>`;
											widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`)
												.append(template);

											widget._dinoStationsArr[i] = widget.checkStrLength(value.station, 20);
										}
									});
							}

							/*---------------------------------------------------------------*/

							if (widget.options.showPlaylistOnInit)
							{
								widget.$element.find(`#dinoRadioPlaylist-${widget._uId}`).css({
									'visibility': 'visible',
									'opacity': 1
								});

								widget.$element.find(`#dinoRadioBanner-${widget._uId}`).css({
									'right': '-280px'
								});

								widget.$element.find(`#dinoRadioShowHidePlaylist-${widget._uId} i`)
									.toggleClass('dino-icon-indent-left-1 dino-icon-indent-right-1');
							}

							if (widget.options.autoPlay)
							{
								if (widget.$element.find(`#dinoRadioPlayPause-${widget._uId}`)
									.prop('visibility', 'collapse'))
								{
									widget.$element.find(`#dinoRadioPlayPause-${widget._uId}`)
										.css('visibility', 'visible')
										.css('opacity', 1);
									if (widget.options.showEqOnPlay)
									{
										widget.$element.find(`#dinoRadioEqualiser-${widget._uId}`)
											.css('visibility', 'collapse').css('opacity', 0);
									}
								}

								widget.$element.find(`#dinoRadioPlay-${widget._uId} i`)
									.toggleClass('dino-icon-play-3 dino-icon-stop-3');

								if (widget.$element.find(`#dinoRadioPlay-${widget._uId} i`)
									.hasClass('dino-icon-stop-3'))
								{
									widget.$element.find(`#dinoRadioPlayPause-${widget._uId}`)
										.css('visibility', 'collapse')
										.css('opacity', 0);
									if (widget.options.showEqOnPlay)
									{
										widget.$element.find(`#dinoRadioEqualiser-${widget._uId}`)
											.css('visibility', 'visible').css('opacity', 1);
									}
								}

								widget.playPauseRadioPlaylist(0);
							}

							window.setTimeout(function()
								{
									// Hide Loader
									widget.hideLoader();
									widget.$element.find(`#dinoRadioPlaylistList-${widget._uId} > li`)
										.sort(widget.sortPlaylistUp)
										.appendTo(`#dinoRadioPlaylistList-${widget._uId}`);
								},
								3000);
						},
						3000);
				},

				// Remove plugin instance completely
				destroy: function()
				{
					/*
						The destroy method unbinds all events for the specific instance
						of the plugin, then removes all plugin data that was stored in
						the plugin instance using jQuery's .removeData method.
	
						Since we store data for each instance of the plugin in its
						instantiating element using the $.data method (as explained
						in the plugin wrapper below), we can call methods directly on
						the instance outside of the plugin initialization, ie:
						$('selector').data('plugin_myPluginName').someOtherFunction();
	
						Consequently, the destroy method can be called using:
						$('selector').data('plugin_myPluginName').destroy();
					*/
					this.unbindEvents();
					this.$element.removeData();
					this.$dinoAudio.removeData();
				},

				// Cache DOM nodes for performance
				buildCache: function()
				{
					/*
						Create variable(s) that can be accessed by other plugin
						functions. For example, "this.$element = $(this.element);"
						will cache a jQuery reference to the element that initialized
						the plugin. Cached variables can then be used in other methods.
					*/
					this.$element = $(this.element);
					this.$dinoAudio = $(this.dinoAudio);
				},

				// Bind events that trigger methods
				bindEvents: function()
				{
					const plugin = this;

					// Require X clicks in Y seconds to trigger secret action
					const secondsForClicks = 1;
					const numClicksRequired = 5;
					const clickTimestamps = [numClicksRequired];

					let oldestIndex = 0;
					let nextIndex = 0;

					/*
						Bind event(s) to handlers that trigger other functions, ie:
						"plugin.$element.on('click', function() {});". Note the use of
						the cached variable we created in the buildCache method.
	
						All events are namespaced, ie:
						".on('click'+'.'+this._name', function() {});".
						This allows us to unbind plugin-specific events using the
						unbindEvents method below.
					*/
					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioInfo-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.$element.find(`#dinoRadioInfo-${plugin._uId}`).css({
								'opacity': '0',
								'visibility': 'collapse'
							}).html('');
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioLogo-${this._uId}`,
						function()
						{
							// Use the "call" method so that inside of the method being
							// called, ie: "someOtherFunction", the "this" keyword refers
							// to the plugin instance, not the event handler.
							// More: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
							const timeMillis = (new Date()).getTime();

							// If we have at least the min number of clicks on record
							if (nextIndex === numClicksRequired - 1 || oldestIndex > 0)
							{
								// Check that all required clicks were in required time
								const diff = timeMillis - clickTimestamps[oldestIndex];
								if (diff < secondsForClicks * 1000)
								{
									plugin.$element.find(`#dinoRadioInfo-${plugin._uId}`).css({
										'opacity': '1',
										'visibility': 'visible'
									}).html(plugin.createCreatedBy());
								}

								oldestIndex++;
							}

							// If not done, record click time, and bump indices
							clickTimestamps[nextIndex] = timeMillis;
							nextIndex++;

							if (nextIndex === numClicksRequired)
							{
								nextIndex = 0;
							}

							if (oldestIndex === numClicksRequired)
							{
								oldestIndex = 0;
							}
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoArtistBio-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.$element.find(`#dinoArtistBio-${plugin._uId}`).css({
								'visibility': 'collapse',
								'opacity': 0
							});
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoArtistBanner-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.$element.find(`#dinoArtistBio-${plugin._uId}`).css({
								'visibility': 'visible',
								'opacity': 1
							});

							if (plugin.$element.find(`#dinoRadioShowHidePlaylist-${plugin._uId} i`)
								.hasClass('dino-icon-indent-left-1')) // is Closed
							{
								plugin.$element.find(`#dinoRadioPlaylist-${plugin._uId}`).css({
									'visibility': 'visible',
									'opacity': 1
								});

								plugin.$element.find(`#dinoRadioBanner-${plugin._uId}`).css({
									'right': '-280px'
								});

								plugin.$element.find(`#dinoRadioShowHidePlaylist-${plugin._uId} i`)
									.toggleClass('dino-icon-indent-left-1 dino-icon-indent-right-1');
							}
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioPlayPause-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							const radioItemId = plugin.$element.find(`#dinoRadioPlaylistList-${plugin._uId} li.active`)
								.data('position');
							plugin.playPauseRadioPlaylist(radioItemId);
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioPlay-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							const radioItemId = plugin.$element.find(`#dinoRadioPlaylistList-${plugin._uId} li.active`)
								.data('position');
							plugin.playPauseRadioPlaylist(radioItemId);
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioShowHidePlaylist-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							if (plugin.$element.find(`#dinoRadioShowHidePlaylist-${plugin._uId} i`)
								.hasClass('dino-icon-indent-left-1')) // is Closed
							{
								plugin.$element.find(`#dinoRadioPlaylist-${plugin._uId}`).css({
									'visibility': 'visible',
									'opacity': 1
								});

								plugin.$element.find(`#dinoRadioBanner-${plugin._uId}`).css({
									'right': '-280px'
								});
							}
							else
							{
								plugin.$element.find(`#dinoRadioPlaylist-${plugin._uId}`).css({
									'visibility': 'collapse',
									'opacity': 0
								});

								plugin.$element.find(`#dinoRadioBanner-${plugin._uId}`).css({
									'right': '-90px'
								});

								plugin.$element.find(`#dinoArtistBio-${plugin._uId}`).css({
									'visibility': 'collapse',
									'opacity': 0
								});
							}

							plugin.$element.find(`#dinoRadioShowHidePlaylist-${plugin._uId} i`)
								.toggleClass('dino-icon-indent-left-1 dino-icon-indent-right-1');
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioVolumeButton-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.$element.find(`#dinoRadioVolumeButton-${plugin._uId} i`)
								.toggleClass('dino-icon-volume dino-icon-volume-off-1');
							plugin.muteSound();
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioPrev-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.playPreviousStation();
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioNext-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.playNextStation();
						});

					/*-----------------------------------------------------------------*/
					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioPlaylistList-${plugin._uId} li`,
						function(e)
						{
							e.preventDefault();

							const radioItemId = $(this).data('position');

							plugin.updateTag($(this).find('.dinoRadioStation').text());
							plugin.$element.find(`#dinoRadioStation-${plugin._uId}`).text(
								plugin.checkStrLength($(this).find('.dinoRadioStation').text(),
									20));

							plugin.playRadioPlaylist(radioItemId);
						});

					/*-----------------------------------------------------------------*/
					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioLyricsOverlay-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							if (plugin.options.grabSongLyrics)
							{
								if (plugin.$element.find(`#dinoRadioLyricsOverlay-${plugin._uId}`)
									.attr('visibility', 'visible'))
								{
									plugin.$element.find(`#dinoRadioLyricsOverlay-${plugin._uId}`).css({
										'visibility': 'collapse',
										'opacity': 0
									});
								}
							}
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioLyrics-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// Google Analytics
							if (plugin.options.enableGoogleAnalytics)
							{
								dino_gtag('event', 'dino_show_lyrics', {
									'event_label': plugin._dinoCurrentSong,
									'event_category': 'dino_radio',
									'non_interaction': true
								});
							}

							if (plugin.options.grabSongLyrics)
							{
								if (plugin.$element.find(`#dinoRadioLyricsOverlay-${plugin._uId}`)
									.attr('visibility', 'collapse'))
								{
									plugin.$element.find(`#dinoRadioLyricsOverlay-${plugin._uId}`).css({
										'visibility': 'visible',
										'opacity': 1
									});
								}
							}
						});

					/*-----------------------------------------------------------------*/
					/*-----------------------------------------------------------------*/

					plugin.$element.on(`keyup.${plugin._name}`,
						`#dinoRadioSearchTerm-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.generatePlaylistByTerm($(this).val());
							plugin._filterText = $(this).val();
						});

					plugin.$element.on(`focus.${plugin._name}`,
						`#dinoRadioSearchTerm-${plugin._uId}`,
						function()
						{
							$(this).val(plugin._filterText);
						});

					plugin.$element.on(`blur.${plugin._name}`,
						`#dinoRadioSearchTerm-${plugin._uId}`,
						function()
						{
							$(this).val(plugin._filterText);
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioSort-${plugin._uId}`,
						function()
						{
							if (plugin.$element.find(`#dinoRadioSort-${plugin._uId}`)
								.hasClass('dino-icon-sort-number-up'))
							{
								// Default 10...1
								plugin.$element.find(`#dinoRadioPlaylistList-${plugin._uId} > li`)
									.sort(plugin.sortPlaylistDown)
									.appendTo(`#dinoRadioPlaylistList-${plugin._uId}`);
							}
							else
							{
								// Default 1...10
								plugin.$element.find(`#dinoRadioPlaylistList-${plugin._uId} > li`)
									.sort(plugin.sortPlaylistUp)
									.appendTo(`#dinoRadioPlaylistList-${plugin._uId}`);
							}

							plugin.$element.find(`#dinoRadioSort-${plugin._uId}`)
								.toggleClass('dino-icon-sort-number-up dino-icon-sort-number-down');
						});

					/*-----------------------------------------------------------------*/
					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioMail-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// Google Analytics
							if (plugin.options.enableGoogleAnalytics)
							{
								dino_gtag('event', 'dino_share_mail', {
									'event_label': 'Click',
									'event_category': 'dino_radio',
									'non_interaction': true
								});
							}

							const uri = window.location.href;
							const p = window.atob('TUNYLVN5c3RlbXM=');
							const i = plugin.capitalizeFirstLetter(plugin._name);
							const t = plugin.getI18n('plugin_ra_mail', plugin.options.language);
							const o = plugin.getI18n('plugin_ra_mail_on', plugin.options.language);
							const f = plugin.getI18n('plugin_ra_mail_from', plugin.options.language);
							const s = i + f + p;
							const n = `${t}${i}${f}${p}${o}${uri}`;

							window.location = `mailto:?subject=${s}&body=${n}`;
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioTwitter-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// Google Analytics
							if (plugin.options.enableGoogleAnalytics)
							{
								dino_gtag('event', 'dino_share_twitter', {
									'event_label': 'Click',
									'event_category': 'dino_radio',
									'non_interaction': true
								});
							}

							const w = 440;
							const h = 550;
							const y = window.top.outerHeight / 2 + window.top.screenY - (h / 2);
							const x = window.top.outerWidth / 2 + window.top.screenX - (w / 2);

							const twit = plugin.getI18n('plugin_ra_twitter', plugin.options.language) + plugin._dinoCurrentStation + plugin.getI18n('plugin_ra_twitter_curr', plugin.options.language) + plugin._dinoCurrentArtist + '-' + plugin._dinoCurrentSong;
							const url = `${plugin._prefix}twitter.com/intent/tweet?url=${window.location.href}&text=${twit}`;
							const text = plugin.capitalizeFirstLetter(plugin._name);

							window.open(url,
								text,
								`toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${
								w
								}, height=${h}, top=${y}, left=${x}`);
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioFacebook-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// Google Analytics
							if (plugin.options.enableGoogleAnalytics)
							{
								dino_gtag('event', 'dino_share_facebook', {
									'event_label': 'Click',
									'event_category': 'dino_radio',
									'non_interaction': true
								});
							}

							if (plugin.options.enableFacebookShare)
							{
								if (window.FB)
								{
									window.FB.ui({
											method: 'share',
											name: window.document.title,
											href: window.location.href,
											link: window.location.href
										},
										function(response)
										{
											if (plugin.options.debug)
											{
												window.console.log(response);
											}
										});
								}
							}
						}
					);
				},

				/***************************************************************************/
				/*  Audio Player Events                                                    */
				/***************************************************************************/

				bindPlayerEvents: function()
				{
					const plugin = this;

					plugin.$dinoAudio.on(`play.${plugin._name}`,
						function()
						{
							if (plugin.$element.find(`#dinoRadioPlayPause-${plugin._uId}`)
								.prop('visibility', 'visible'))
							{
								plugin.$element.find(`#dinoRadioPlayPause-${plugin._uId}`).css('visibility', 'collapse')
									.css('opacity', 0);
							}

							if (plugin.$element.find(`#dinoRadioPlay-${plugin._uId} i`).hasClass('dino-icon-play-3'))
							{
								plugin.$element.find(`#dinoRadioPlay-${plugin._uId} i`)
									.toggleClass('dino-icon-play-3 dino-icon-stop-3');
								if (plugin.options.showEqOnPlay)
								{
									plugin.$element.find(`#dinoRadioEqualiser-${plugin._uId}`)
										.css('visibility', 'visible').css('opacity', 1);
								}
							}
						});

					plugin.$dinoAudio.on(`playing.${plugin._name}`,
						function()
						{
						});

					plugin.$dinoAudio.on(`timeupdate.${plugin._name}`,
						function()
						{
						});

					plugin.$dinoAudio.on(`pause.${plugin._name}`,
						function()
						{
							if (plugin.$element.find(`#dinoRadioPlayPause-${plugin._uId}`)
								.prop('visibility', 'collapse'))
							{
								plugin.$element.find(`#dinoRadioPlayPause-${plugin._uId}`).css('visibility', 'visible')
									.css('opacity', 1);
							}

							if (plugin.$element.find(`#dinoRadioPlay-${plugin._uId} i`).hasClass('dino-icon-stop-3'))
							{
								plugin.$element.find(`#dinoRadioPlay-${plugin._uId} i`)
									.toggleClass('dino-icon-play-3 dino-icon-stop-3');
								if (plugin.options.showEqOnPlay)
								{
									plugin.$element.find(`#dinoRadioEqualiser-${plugin._uId}`)
										.css('visibility', 'collapse').css('opacity', 0);
								}
							}
						});

					plugin.$dinoAudio.on(`ended.${plugin._name}`,
						function()
						{
							if (plugin.options.debug)
							{
								window.console.log('Media playback ended.');
							}
						});

					plugin.$dinoAudio.on(`loadedmetadata.${plugin._name}`,
						function()
						{
							if (plugin.options.debug)
							{
								window.console.log(`Playtime: ${plugin.dinoAudio.duration}`);
							}
						});

					plugin.$dinoAudio.on(`error.${plugin._name}`,
						function failed(e)
						{
							// audio playback failed - show a message saying why
							// to get the source of the audio element use $(this).src
							switch (e.target.error.code)
							{
								case e.target.error.MEDIA_ERR_ABORTED:
									// Google Analytics
									if (plugin.options.enableGoogleAnalytics)
									{
										dino_gtag('event', 'dino_exception_media', {
											'description': 'You aborted the video playback.',
											'fatal': false // set to true if the error is fatal
										});
									}

									if (plugin.options.debug)
									{
										window.console.error('You aborted the video playback.');
									}
									break;

								case e.target.error.MEDIA_ERR_NETWORK:
									// Google Analytics
									if (plugin.options.enableGoogleAnalytics)
									{
										dino_gtag('event', 'dino_exception_media', {
											'description': 'A network error caused the audio download to fail.',
											'fatal': false // set to true if the error is fatal
										});
									}

									if (plugin.options.debug)
									{
										window.console.error('A network error caused the audio download to fail.');
									}
									break;

								case e.target.error.MEDIA_ERR_DECODE:
									// Google Analytics
									if (plugin.options.enableGoogleAnalytics)
									{
										dino_gtag('event', 'dino_exception_media', {
											'description': 'The audio playback was aborted due to a corruption problem or because the video used features your browser did not support.',
											'fatal': false // set to true if the error is fatal
										});
									}

									if (plugin.options.debug)
									{
										window.console.error(
											'The audio playback was aborted due to a corruption problem or because the video used features your browser did not support.');
									}
									break;

								case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
									// Google Analytics
									if (plugin.options.enableGoogleAnalytics)
									{
										dino_gtag('event', 'dino_exception_media', {
											'description': 'The video audio not be loaded, either because the server or network failed or because the format is not supported.',
											'fatal': false // set to true if the error is fatal
										});
									}

									if (plugin.options.debug)
									{
										window.console.error(
											'The video audio not be loaded, either because the server or network failed or because the format is not supported.');
									}
									break;

								default:
									// Google Analytics
									if (plugin.options.enableGoogleAnalytics)
									{
										dino_gtag('event', 'dino_exception_media', {
											'description': 'An unknown error occurred.',
											'fatal': false // set to true if the error is fatal
										});
									}

									if (plugin.options.debug)
									{
										window.console.error('An unknown error occurred.');
									}
									break;
							}
						});
				},

				/***************************************************************************/

				// Unbind events that trigger methods
				unbindEvents: function()
				{
					/*
						Unbind all events in our plugin namespace that are attached
						to "this.$element".
					*/
					this.$element.off(`.${this._name}`);
					this.$dinoAudio.off(`.${this._name}`);
				},

				/***************************************************************************/
				/*  Audio Player with Playlist                                             */
				/***************************************************************************/

				stopOtherPlayers: function()
				{
					// Determine which player the event is coming from
					if (dinoRadioPlayers.length > 0)
					{
						// Loop through the array of players
						$.each(dinoRadioPlayers,
							function(key, value)
							{
								// Get the player(s) that did not trigger the play event
								if (value.id !== this._uId)
								{
									// Pause the other player(s)
									dinoRadioPlayers[key].pause();
								}
							});
					}
				},

				playRadioPlaylist: function(indexValue)
				{
					const widget = this;
					const objAudio = widget.dinoAudio;
					const stationArray = widget.options.stationPlaylist[indexValue];
					const currentUrl = stationArray.url;
					const currentIndex = indexValue;
					const oldRowIndex = widget._dinoCurrentRow;

					widget.stopOtherPlayers();

					widget._dinoCurrentStation = currentUrl;
					widget._dinoCurrentIndex = currentIndex;
					widget._dinoCurrentRow = currentIndex;

					objAudio.pause();
					objAudio.src = widget._dinoCurrentStation;
					objAudio.play().then(function()
					{
						if (widget.options.debug)
						{
							window.console.log('The play() Promise fulfilled!');
						}
					}).catch(function(error)
					{
						if (widget.options.debug)
						{
							window.console.log('The play() Promise rejected!');
							window.console.log(error);
						}
					});

					widget.changePlaylistAppearance(widget._dinoCurrentRow, oldRowIndex);
					widget.changeRadioSong(widget._dinoCurrentStation);
				},

				/***************************************************************************/

				playPauseRadioPlaylist: function(indexValue)
				{
					const widget = this;
					const objAudio = widget.dinoAudio;

					if (objAudio.paused)
					{
						const stationArray = widget.options.stationPlaylist[indexValue];
						const currentUrl = stationArray.url;
						const currentIndex = indexValue;
						const oldRowIndex = widget._dinoCurrentRow;

						widget._dinoCurrentStation = currentUrl;
						widget._dinoCurrentIndex = currentIndex;
						widget._dinoCurrentRow = currentIndex;

						widget.stopOtherPlayers();

						objAudio.src = widget._dinoCurrentStation;
						objAudio.play().then(function()
						{
							if (widget.options.debug)
							{
								window.console.log('The play() Promise fulfilled!');
							}
						}).catch(function(error)
						{
							if (widget.options.debug)
							{
								window.console.log('The play() Promise rejected!');
								window.console.log(error);
							}
						});

						widget.changePlaylistAppearance(widget._dinoCurrentRow, oldRowIndex);
						widget.changeRadioSong(widget._dinoCurrentStation);
					}
					else
					{
						objAudio.pause();
					}
				},

				/***************************************************************************/

				playPreviousStation: function()
				{
					const widget = this;
					const objAudio = widget.dinoAudio;
					const playlistArray = widget.options.stationPlaylist;

					let currentUrl;
					let currentIndex = widget._dinoCurrentIndex;
					const oldRowIndex = widget._dinoCurrentRow;

					widget.stopOtherPlayers();

					if (currentIndex <= 0)
					{
						currentUrl = playlistArray[playlistArray.length - 1].url;
						currentIndex = playlistArray.length - 1;
						widget._dinoCurrentRow = currentIndex;
					}
					else
					{
						currentUrl = playlistArray[currentIndex - 1].url;
						currentIndex = currentIndex - 1;
						widget._dinoCurrentRow = currentIndex;
					}

					widget._dinoCurrentUrl = currentUrl;
					widget._dinoCurrentIndex = currentIndex;

					objAudio.pause();
					objAudio.src = widget._dinoCurrentUrl;
					objAudio.play().then(function()
					{
						if (widget.options.debug)
						{
							window.console.log('The play() Promise fulfilled!');
						}
					}).catch(function(error)
					{
						if (widget.options.debug)
						{
							window.console.log('The play() Promise rejected!');
							window.console.log(error);
						}
					});

					widget.changePlaylistAppearance(widget._dinoCurrentRow, oldRowIndex);
					widget.changeRadioSong(widget._dinoCurrentUrl);

					const row = widget.$element.find(
						`#dinoRadioItem-${widget._dinoCurrentRow}-${widget._uId} .dinoRadioStation`);
					widget.$element.find(`#dinoRadioStation-${widget._uId}`)
						.text(widget.checkStrLength(row.text(), 20));
					widget.updateTag(row.text());
				},

				/***************************************************************************/

				playNextStation: function()
				{
					const widget = this;
					const objAudio = widget.dinoAudio;
					const playlistArray = widget.options.stationPlaylist;

					let currentUrl;
					let currentIndex = widget._dinoCurrentIndex;
					const oldRowIndex = widget._dinoCurrentRow;

					widget.stopOtherPlayers();

					if (playlistArray.length <= currentIndex + 1)
					{
						currentUrl = playlistArray[0].url;
						currentIndex = 0;
						widget._dinoCurrentRow = currentIndex;
					}
					else
					{
						currentUrl = playlistArray[currentIndex + 1].url;
						currentIndex = currentIndex + 1;
						widget._dinoCurrentRow = currentIndex;
					}

					widget._dinoCurrentUrl = currentUrl;
					widget._dinoCurrentIndex = currentIndex;

					objAudio.pause();
					objAudio.src = widget._dinoCurrentUrl;
					objAudio.play().then(function()
					{
						if (widget.options.debug)
						{
							window.console.log('The play() Promise fulfilled!');
						}
					}).catch(function(error)
					{
						if (widget.options.debug)
						{
							window.console.log('The play() Promise rejected!');
							window.console.log(error);
						}
					});

					widget.changePlaylistAppearance(widget._dinoCurrentRow, oldRowIndex);
					widget.changeRadioSong(widget._dinoCurrentUrl);

					const row = widget.$element.find(
						`#dinoRadioItem-${widget._dinoCurrentRow}-${widget._uId} .dinoRadioStation`);
					widget.$element.find(`#dinoRadioStation-${widget._uId}`)
						.text(widget.checkStrLength(row.text(), 20));
					widget.updateTag(row.text());
				},

				/***************************************************************************/

				muteSound: function()
				{
					const objAudio = this.dinoAudio;
					objAudio.muted = !objAudio.muted;
				},

				/***************************************************************************/
				/***************************************************************************/

				changeRadioSong: function(stationUrl)
				{
					const widget = this;

					if (widget.options.grabSongRds)
					{
						// now_playing interval call
						window.clearInterval(widget._nowPlayingIntervalId);
						const url = widget._prefix +
							widget.options.pathToAjaxFiles +
							'/' +
							window.atob('cmFkaW9Ob3dQbGF5aW5nLnBocD90aGVfc3RyZWFtPQ==') +
							stationUrl;

						$.getJSON(url,
								function(data)
								{
									if (widget._dinoCurrentArtist !== data.songArtist)
									{
										widget.$element.find(`#dinoRadioLyrics-${widget._uId}`).css({
											'visibility': 'collapse',
											'opacity': 0
										});

										widget.changeCurrentSongTitle(data.songTitle, data.songArtist);

										if (widget.options.grabArtistInfo)
										{
											widget.getArtistInfo(data.songArtist);
										}
									}

									widget._dinoCurrentSong = data.songTitle;
									widget._dinoCurrentArtist = data.songArtist;
								})
							.done(function(data)
							{
								if (widget.options.grabSongLyrics)
								{
									widget.getSongLyricsInfo(data.songArtist, data.songTitle);
								}
							})
							.fail(function(jqxhr, textStatus, error)
							{
								if (widget.options.enableGoogleAnalytics)
								{
									let err = textStatus + ', ' + error;
									dino_gtag('event', 'dino_exception_change_song', {
										'description': err,
										'fatal': false // set to true if the error is fatal
									});
								}

								if (widget.options.debug)
								{
									window.console.log(
										'Error: Something went wrong with loading the Current Radio song!');
								}
							});

						window.setTimeout(function()
							{
								widget._nowPlayingIntervalId = window.setInterval(function()
									{
										$.getJSON(url,
												function(data)
												{
													if (widget._dinoCurrentArtist !== data.songArtist)
													{
														widget.$element.find(`#dinoRadioLyrics-${widget._uId}`).css({
															'visibility': 'collapse',
															'opacity': 0
														});

														widget.changeCurrentSongTitle(data.songTitle, data.songArtist);

														if (widget.options.grabSongLyrics)
														{
															widget.getSongLyricsInfo(data.songArtist, data.songTitle);
														}

														if (widget.options.grabArtistInfo)
														{
															widget.getArtistInfo(data.songArtist);
														}
													}

													widget._dinoCurrentSong = data.songTitle;
													widget._dinoCurrentArtist = data.songArtist;
												})
											.done(function(data)
											{
												if (widget.options.grabSongLyrics)
												{
													widget.getSongLyricsInfo(data.songArtist, data.songTitle);
												}
											})
											.fail(function(jqxhr, textStatus, error)
											{
												if (widget.options.enableGoogleAnalytics)
												{
													let err = textStatus + ', ' + error;
													dino_gtag('event', 'dino_exception_change_song', {
														'description': err,
														'fatal': false // set to true if the error is fatal
													});
												}

												if (widget.options.debug)
												{
													window.console.log(
														'Error: Something went wrong with loading the Current Radio song!');
												}
											});
									},
									widget.options.nowPlayingInterval * 1000);
							},
							1000);
					}
				},

				changeCurrentSongTitle: function(title, artist)
				{
					$(`#dinoRadioSongTitle-${this._uId}`).html(title);
					$(`#dinoRadioSongArtist-${this._uId}`).html(artist);

					this._dinoCurrentArtist = artist;
					this._dinoCurrentSong = title;
				},

				getArtistInfo: function(artist)
				{
					const widget = this;

					if (widget._dinoArt === artist)
					{
						return;
					}

					const url = widget._prefix +
						widget.options.pathToAjaxFiles +
						'/' +
						window.atob('cmFkaW9BcnRpc3QucGhwP3RoZV9hcnRpc3Q9') +
						encodeURI($.trim(artist));
					const imageArtist = widget.$element.find(`#dinoRadioPoster-${widget._uId}`);
					const imageBanner = widget.$element.find(`#dinoArtistBanner-${widget._uId}`);

					$.getJSON(url,
							function(result)
							{
								if (result[0] !== undefined && result[0] !== null)
								{
									if (result[0].artistThumb !== '')
									{
										imageArtist.fadeOut(2000,
											function()
											{
												widget._dinoCurrentImage = result[0].artistThumb;
												let p = widget._prefix + widget.options.pathToAjaxFiles + '/radio/artists';
												imageArtist.attr('src', p + '/' + widget._dinoCurrentImage);
												imageArtist.fadeIn(2000);
											});
                                    }
									else
									{
										imageArtist.fadeOut(2000,
											function()
											{
												imageArtist.attr('src',
													`data:image/png;base64,${widget.getImage(0)}`);
												imageArtist.fadeIn(2000);
											});
									}

									if (result[0].artistBanner !== '')
					                {
						                imageBanner.fadeOut(2000,
							                function()
							                {
								                let v = widget._prefix + widget.options.pathToAjaxFiles + '/radio/artists';
								                imageBanner.attr('src', v + '/' + result[0].artistBanner);
								                imageBanner.fadeIn(2000);
							                });

									}
									else
									{
										imageBanner.fadeOut(2000,
											function()
											{
												imageBanner.attr('src',
													'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
												imageBanner.fadeIn(2000);
											});
									}

									let bio = result[0].biographyEN;
									if (widget.options.language === 'de' && result[0].biographyDE !== null && result[0].biographyDE !== undefined && result[0].biographyDE !== '')
									{
										bio = result[0].biographyDE;
									}

									if (bio === undefined)
									{
										bio = '';
									}

									const post = window.document.createElement('span');
									post.innerHTML = bio;
									post.innerHTML = post.innerHTML.replace(/\n/g, '<br />');
									post.innerHTML = `<strong>${result[0].artist}</strong><hr />${post.innerHTML}`;

									widget.$element.find(`#dinoArtistBio-${widget._uId}`).empty().append(post).text();
									widget._dinoArt = artist;
								}
								else
								{
									const post = window.document.createElement('span');
									post.innerHTML = `<strong>${widget._dinoCurrentArtist}</strong><hr />`;

									widget.$element.find(`#dinoArtistBio-${widget._uId}`).empty().append(post);
									widget._dinoArt = artist;

									imageArtist.fadeOut(2000,
										function()
										{
											imageArtist.attr('src', `data:image/png;base64,${widget.getImage(0)}`);
											imageArtist.fadeIn(2000);
										});

									imageBanner.fadeOut(2000,
										function()
										{
											imageBanner.attr('src',
												'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
											imageBanner.fadeIn(2000);
										});
								}
							})
						.fail(function(jqxhr, textStatus, error)
						{
							if (widget.options.enableGoogleAnalytics)
							{
								let err = textStatus + ', ' + error;
								dino_gtag('event', 'dino_exception_get_artist', {
									'description': err,
									'fatal': false // set to true if the error is fatal
								});
							}

							widget._dinoArt = artist;

							imageArtist.fadeOut(2000,
								function()
								{
									imageArtist.attr('src', `data:image/png;base64,${widget.getImage(0)}`);
									imageArtist.fadeIn(2000);
								});

							imageBanner.fadeOut(2000,
								function()
								{
									imageBanner.attr('src',
										'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
									imageBanner.fadeIn(2000);
								});

							if (widget.options.debug)
							{
								window.console.log('Error: Something went wrong with loading the LastFM Data!');
							}
						});
				},

				getSongLyricsInfo: function(artist, song)
				{
					const widget = this;

					const url = widget._prefix +
						widget.options.pathToAjaxFiles +
						'/' +
						window.atob('cmFkaW9QbGF5aW5nTHlyaWNzLnBocA==') +
						'?the_artist=' +
						artist +
						'&the_song=' +
						song;

					$.getJSON(url,
							function(data)
							{
								if (data[0] && data[0].lyric)
								{
									const post = window.document.createElement('p');
									post.textContent = data[0].lyric;
									post.innerHTML = post.innerHTML.replace(/\n\n/g, '<br />');
									post.innerHTML =
										`<strong>${data[0].artist}<br /><span>${data[0].song}</span></strong><hr />${
										post.innerHTML}`;

									widget.$element.find(`#dinoRadioLyricsOverlay-${widget._uId}`).empty().append(post);
									widget.$element.find(`#dinoRadioLyrics-${widget._uId}`).css({
										'visibility': 'visible',
										'opacity': 1
									});
								}
							})
						.fail(function(jqxhr, textStatus, error)
						{
							if (widget.options.enableGoogleAnalytics)
							{
								let err = textStatus + ', ' + error;
								dino_gtag('event', 'dino_exception_get_lyrics', {
									'description': err,
									'fatal': false // set to true if the error is fatal
								});
							}

							widget.$element.find(`#dinoRadioLyrics-${widget._uId}`).css({
								'visibility': 'collapse',
								'opacity': 0
							});

							if (widget.options.debug)
							{
								window.console.log('Error: Something went wrong with grabbing the lyrics!');
							}
						});
				},

				generatePlaylistByTerm: function(searchStr)
				{
					const widget = this;

					if (widget._dinoStationsArr.length === 0)
					{
						return;
					}

					let title;
					const filter =
						widget._dinoStationsArr.filter(RegExp.prototype.test.bind(new RegExp(searchStr, 'i')));

					for (let i = 0; i < widget._dinoStationsArr.length; i++)
					{
						title = widget._dinoStationsArr[i];
						if ($.inArray(title, filter) > -1)
						{
							if (widget.options.debug)
							{
								window.console.log('Match!!!');
							}
							widget.$element.find(`#dinoRadioItem-${i}-${widget._uId}`).show();
						}
						else
						{
							if (widget.options.debug)
							{
								window.console.log('NO Match!!!');
							}
							widget.$element.find(`#dinoRadioItem-${i}-${widget._uId}`).hide();
						}
					}
				},

				changePlaylistAppearance: function(newRowIndex, oldRowIndex)
				{
					const active = '<span class="dinoRadioActive"></span>';
					this.$element.find(`#dinoRadioItem-${oldRowIndex}-${this._uId}`).removeClass('active');
					this.$element.find(`#dinoRadioItem-${oldRowIndex}-${this._uId} .dinoRadioActive`).remove()
						.removeClass('active');
					this.$element.find(`#dinoRadioItem-${newRowIndex}-${this._uId}`).addClass('active').append(active);
				},

				sortPlaylistUp: function(a, b)
				{
					return ($(b).data('position')) < ($(a).data('position')) ? 1 : -1;
				},

				sortPlaylistDown: function(a, b)
				{
					return ($(b).data('position')) > ($(a).data('position')) ? 1 : -1;
				},

				updateTag: function (data)
				{
					this.$element.attr("data-radioTag", data);
				},

				getTag: function ()
				{
					return this.$element.attr("data-radioTag");
				},

				/***************************************************************************/
				/***************************************************************************/

				/* Show loader before content is actual loaded into the main window */
				showLoader: function()
				{
					// Show Loader
					this.$element.find(`#dinoRadioLoader-${this._uId}`).css({
						'opacity': 1,
						'visibility': 'visible'
					});
				},

				/* All content, was loaded into the main window now hide the loader */
				hideLoader: function()
				{
					// Hide Loader
					this.$element.find(`#dinoRadioLoader-${this._uId}`).css({
						'opacity': 0,
						'visibility': 'collapse'
					});
				},

				/***************************************************************************/
				/***************************************************************************/

				createUniqId: function(idLength)
				{
					const charsToFormId = '_0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
					if (!idLength)
					{
						idLength = Math.floor(Math.random() * charsToFormId.length);
					}

					let uniqId = '';
					for (let i = 0; i < idLength; i++)
					{
						uniqId += charsToFormId[Math.floor(Math.random() * charsToFormId.length)];
					}

					return uniqId;
				},

				/***************************************************************************/

				// Try to find a language we should use. Look for URL parameter or system settings.
				// Restricts to supported languages ('en', 'sl' and some others).
				getUserLanguage: function()
				{
					let lang = '';

					// 1. try to read URL parameter 'lang'
					let qs = window.location.search;
					if (qs)
					{
						if (qs.substring(0, 1) === '?')
						{
							qs = qs.substring(1);
						}

						const params = qs.split('&');
						for (let i = 0; i < params.length; i++)
						{
							const keyValue = params[i].split('=');
							if (keyValue[0] === 'lang')
							{
								lang = keyValue[1];
								break;
							}
						}
					}

					// 2. try to get browser or system language
					if (!lang)
					{
						const lan = window.navigator.language || window.navigator;
						const part = lan.split('-');
						lang = part[0];
					}

					// Use only supported languages, defaults to 'en'
					if (lang !== 'en' && lang !== 'sl')
					{
						lang = 'en';
					}

					return lang;
				},

				/***************************************************************************/

				formatTime: function(unixTimestamp, fullDate, unix = false)
				{
					let formattedDate;
					let timestamp;
					if (unix)
					{
						timestamp = unixTimestamp * 1000;
					}
					else
					{
						timestamp = unixTimestamp;
					}

					const updateDate = new Date(timestamp);
					const day = (updateDate.getDate() < 10 ? '0' : '') + updateDate.getDate();
					const month = (updateDate.getMonth() < 9 ? '0' : '') + (updateDate.getMonth() + 1);
					const year = updateDate.getFullYear();

					let hours = updateDate.getHours();
					let minutes = updateDate.getMinutes();

					if (minutes < 10)
					{
						minutes = `0${minutes}`;
					}

					if (hours < 10)
					{
						hours = `0${hours}`;
					}

					switch (fullDate)
					{
						case 0:
							formattedDate = hours + ':' + minutes + ' - ' + day + '-' + month + '-' + year;
							break;
						case 1:
							formattedDate = month + '/' + day + '/' + year;
							break;
						case 2:
							formattedDate = day + '-' + month + '-' + year;
							break;
						default:
							formattedDate = hours + ':' + minutes;
							break;
					}

					return formattedDate;
				},

				/***************************************************************************/

				randomNumberFromRange: function(min, max)
				{
					return Math.floor(Math.random() * (max - min + 1) + min);
				},

				/***************************************************************************/

				isBlank: function(str)
				{
					return (!str || /^\s*$/.test(str));
				},

				checkStrLength: function(str, length)
				{
					const val = str.length;
					if (val > length)
					{
						return str.substring(0, length - 3) + ' ...';
					}
					else
					{
						return str;
					}
				},

				/***************************************************************************/

				capitalizeFirstLetter: function(string)
				{
					return string.replace(/^(.)/g, string[0].toUpperCase());
				},

				/***************************************************************************/

				deCapitalizeFirstLetter: function(string)
				{
					return string.replace(/^(.)/g, string[0].toLowerCase());
				},

				/***************************************************************************/

				statusLocalStorage: function(name)
				{
					const date = new Date();
					const current = Math.round(+date / 1000);

					// Get Schedule
					let storedTime = window.localStorage.getItem(name + '_time');

					if (storedTime === undefined || storedTime === null)
					{
						storedTime = 0;
					}

					// Expired
					if (storedTime < current)
					{
						// Remove
						this.removeLocalStorage(name);

						return 0;
					}
					else
					{
						return 1;
					}
				},

				/***************************************************************************/

				setLocalStorage: function(name, value, expires)
				{
					if (expires === undefined || expires === null)
					{
						// Default: 1h
						expires = 3600;
					}

					const date = new Date();
					const schedule = Math.round(date.setSeconds(date.getSeconds() + expires) / 1000);

					window.localStorage.setItem(name, value);
					window.localStorage.setItem(name + '_time', schedule.toString());
				},

				/***************************************************************************/

				removeLocalStorage: function(name)
				{
					window.localStorage.removeItem(name);
					window.localStorage.removeItem(name + '_time');
				},

				/***************************************************************************/

				/*
				 * Internationalization of some texts used by the dinoKnob.
				 * @return String the localized text item or the id if there's no translation found
				 * @param key
				 * @param lang
				 */
				getI18n: function(key, lang)
				{
					const i18N = {
						'en':
						{
							'plugin_title': 'DinoRadio',
							'plugin_desc': 'Jquery plugin for listening to web radio.',
							'plugin_no_station': 'Unknown Station',
							'plugin_no_artist': 'Unknown Artist',
							'plugin_no_title': 'Unknown Title',
							'plugin_no_playlist': 'No Playlist Found!!!',

							'plugin_ra_station': 'Radio Station',
							'plugin_ra_logo': 'Radio Logo',
							'plugin_ra_search': 'Input Search Term ...',
							'plugin_ra_title': 'Title:',
							'plugin_ra_artist': 'Artist:',
							'plugin_ra_play': 'Play/Pause',

							'plugin_ra_prev': 'Previous',
							'plugin_ra_next': 'Next',
							'plugin_ra_mute': 'Mute/UnMute',
							'plugin_ra_playlist': 'Open/Close Playlist',

							'plugin_ra_mail_on': ' on ',
							'plugin_ra_mail_from': ' from ',
							'plugin_ra_mail': 'Check out this online radio listener ',
							'plugin_ra_twitter': 'I\'m listening to this radio station:',
							'plugin_ra_twitter_curr': ' currently playing: '
						},
						'sl':
						{
							'plugin_title': 'DinoRadio',
							'plugin_desc': 'Vtičnik Jquery za poslušanje spletnega radia.',
							'plugin_no_station': 'Neznana Postaja',
							'plugin_no_artist': 'Neznani Izvajalec',
							'plugin_no_title': 'Neznan Naslov',
							'plugin_no_playlist': 'Seznam predvajanja ni najden!!!',

							'plugin_ra_station': 'Radijska Postaja',
							'plugin_ra_logo': 'Radio Logo',
							'plugin_ra_search': 'Vnesite iskalni izraz ...',
							'plugin_ra_title': 'Naslov:',
							'plugin_ra_artist': 'Izvajalec:',
							'plugin_ra_play': 'Predvajanje/Premor',

							'plugin_ra_prev': 'Prejšnji',
							'plugin_ra_next': 'Naslednji',
							'plugin_ra_mute': 'Vklop/Izklop Zvoka',
							'plugin_ra_playlist': 'Odpri/Zapri Seznam Predvajanja',

							'plugin_ra_mail_on': ' na ',
							'plugin_ra_mail_from': ' iz ',
							'plugin_ra_mail': 'Oglejte si to spletno radijsko poslušalko ',
							'plugin_ra_twitter': 'Poslušam to radijsko postajo:',
							'plugin_ra_twitter_curr': ' trenutno se predvaja: '
						},
						'de':
						{
							'plugin_title': 'DinoRadio',
							'plugin_desc': 'JQuery-Plugin zum Hören von Webradio. ',
							'plugin_no_station': 'Unbekannte Station',
							'plugin_no_artist': 'Unbekannter Künstler',
							'plugin_no_title': 'Unbekannter Titel',
							'plugin_no_playlist': 'Keine Wiedergabeliste gefunden!!!',

							'plugin_ra_station': 'Radiosender',
							'plugin_ra_logo': 'Radio Logo',
							'plugin_ra_search': 'Suchbegriff eingeben ...',
							'plugin_ra_title': 'Titel:',
							'plugin_ra_artist': 'Künstler:',
							'plugin_ra_play': 'Spiel/Pause',

							'plugin_ra_prev': 'Bisherige',
							'plugin_ra_next': 'Nächster',
							'plugin_ra_mute': 'Stumm/Stummschaltung Aufheben',
							'plugin_ra_playlist': 'Wiedergabeliste öffnen/schließen',

							'plugin_ra_mail_on': ' auf ',
							'plugin_ra_mail_from': ' von ',
							'plugin_ra_mail': 'Schauen Sie sich diesen Online-Radiohörer an ',
							'plugin_ra_twitter': 'Ich höre diesen Radiosender:',
							'plugin_ra_twitter_curr': ' spielt gerade: '
						}
					};

					if (typeof i18N[lang] !== 'undefined' && typeof i18N[lang][key] !== 'undefined')
					{
						return i18N[lang][key];
					}

					return i18N['en'][key];
				},

				/***************************************************************************/

				/*
				*  Array for Radio Images base64 encoded strings
				*  usage in html elements (img src="")
				*/
				getImage: function(key = 0)
				{
					const noImageAvailable = [
						'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAA2FBMVEUAAAAzMzMzMzMzMzPxbQDvbQAzMzMzMzPvbQDvbQDvbQAzMzPvbQAzMzMzMzPvbQDvbQAzMzPzbQAzMzMzMzMzMzMzMzMzMzPvbQDvbQDvbQCeVRjvbQDvbQDvbQC5WxEzMzPvbQAoMDUhLTjubAEcLDn/dQAXKjq8XRD4bwE9NTHiagbqbQVFOS9dPyjMYwzZZwj8cQDGYA7UZAvzbQF2RyIRKDtANzC1WxP/cQBVPSt+SiCVURoEI0CpWRVNOyylVhZtRSRmRCeuWhT/ewCITR6NTRxqRSX9WHNjAAAAIHRSTlMA7rtEEcwR3SLdmTPuiCK7qmYzmVWqd8wziFX9ZndE7oPDn2EAAAdXSURBVHja7NpdT9swFAZgOwYbSBNhJU4KA3aStO5KoVNHO2CagE3a9v//0fpF0pSOBCl1OZOfC264ent8fGy3xLIsy7Isy7Isy7Isy7Isy7Isy7Ks/5TvCRG4BDvuCZgSHieocQeWYp9gFkBOEcRcCoWQ4CVhhUfQ4gEA+rXFXRkIwB5kGiKmsCYiuPih5wh4SWDafzmLHJGXIg6YRFgQ7koVwzPqRIzP9q1lLIojx6yzV0LEgXTJElOCUqEYef9mTUFXSuExXv4/Y++/PeZNATkxLQXC06ErlSiVAsEnv46vrSehMJbCZ6shgMZeiK8UvhspAQWhIgwb0oZJQaEQBxhLEQbLEMXEQ9cVPG+KYuL52FLM1pOAUik8dKXgbhjEsCpWEt3Ljh8GDgXkXcHZ+p0C4cTjLJqfPJBOPO4y5nKeb7I54USISuF7MZ01gVMOQbFNvHDjHRtfb0tYwH74YFBGUXVFgSsoUfhKseBCmUOQklBGsVYkWg8iWcOMdJwfxbCGNk6oaMtl5p4AA7b+JSITYI5gZFskmCXJHPoc20riUjCNuqR53AHzHE4aF8IuhKRxCnZBkaa5AnZBNN4lHuyGRxoWw7o0zbIshS2LScMolKUZDCeTP9dZBm9EhQoiKUMZeYEjoAIlDYOyLJvc9LW+v3q67UItxaOdX37Vq8iy3SBZeqf1OEmSkR4M6yehASMv8FDtLEjavdP9zoK+us7qxnDJZkztKMjXyTRHMtdJ7j/VC+Iw8k9cil0EybLPOsn1x9+6UK3ifuE7OwjSfeyMOnmQ8eh3D6qIkOT22qfnJzPnpwek4JkP0vs5mq6s3P1T7w0Dun2y30qeHR6fFVki80GG/dFqkA9VQYpfLF0ct5Kyw6M8ijS+tG4HemVp9Se9mteKvZNW0josayWHZ8XqMhsk7d0Vzd7pX11m8Kqw6I6DDdpt8kyZDQK9x7HudBY5xvp7t7Fzny9MBSkGiU46M339MU3hNYKT+kLDQaD3Y6D1aKS1foC0yUueMhwEupe/vgwGNw/DqpO8Q+YOjo5fd148cRgNAlmWXt5O/9a8dR8lVU7JXGAsSCFNa7+DXCSV9vfIDDMapL5ose/+Zedsm9MEgjg+SLWxttXUJibRtuutJyfPgooKPmv6/b9RQekcSY3QTrziTP4vIObdb/b2lt3bvWo7XYfFVWrkEiSOhQ/tj+mqHkzyKZcg8cq6+v4lXXfx2solSCIYZg+KokEIIjlDGbpUEL39gmEA0pMs0r+UPOtCQRQvcPWONv6JJD0PefiQTVfc20WBUF/vTvr9SXfyA0gKCI+G2WLirUAQZded/P5odICkZVTVjCAt0SCKOejzKkqTplmkllMQQlmyiqIbmALSKhczqFy8E+wj1NAnySqKr8ALkuQ4NcymeNfKY/Eh33EkBOklLMJBXieyN0QurScFup2Sepr5FytLlsQ5OzpJZ+8saGpELFdTVawdSG5FFrF/JorY3Q1N/di6KrfTdc9dRFxAbMbHCiGHDST9WLaVzlG+4km7MBBCg/6kF/lH1zp9PCLJWVPEb7zaKA4ECJpjrdcbWD4gnFQ9LvoWy6ejYS3es/5DFUWdmgtCScZ+ktQtixskj4kV34Ezd+7ktIryl9G9ADkGkSqZq/GfIM8g/GaQq2r5iD7e8xK2CJDYK5DEFcb4RQhB8jybRzzuJu++/RkZiw+/HV2WRIGAZxiGB+ohBKqwl2oYQCEh3yfB7inbTUgSo7SqH5NRsPY92fopBgSBtTVN34BlexRwqAcIQOa6pmtDBIgNQ6nt4rJJ4IlZCom+jbvWh1ox0of75LHuVwlEgahty1yvFp6+fVQIcbdzCkAszTTZdk0p8QhGtMgcpAjRD3rsfJpHled9VOJAOsEslOEOLBiZHW0Z2cFhsxlsg9na1u31KDSQpY1xvqTAdM1PkEgnOwYqBRAJotmPQaCq9lIbzuZsPI4swrThkNkqZUuPadTf+mt9jLYzGnfMoL9SgKtxXXpx0kkCoSD2wLEsAzrDzYbYK3YA6bl2b44IK59pKrNw5DB0N6DvRsR2FAIJFY6ifL7lXi5qaS1HiGj0/Km7dMHagzgOKsPuCpkbOLZnMWXEIhB1MByhZcUg3CrPbhWIxua4NcQ5+5wSQGPSnDnbR2ofQEIbeN3VdGvOxjqZt4FoIQijtkWn3WAEXHyi/VqWK5WK/PWaj2EKA3m/B9kgAHr9+WzXW6DN9iAuQWPQJJbmuG0VdN3RQxAr3AzsDnsp54pGKyQpU5vpKzLwYpO5gMMLYQow3f+aTqOHiepwrZqeYvimsYj+iYa/4hz/rPprg8gSQPLbhPBPlMODIAmf8evwF0I2pSeYSV1ia/zxZObihi7OMHjBj/YEKP1qqgscV3jh5O7i2uPPdJ1eqQ5iVT/b4NutBCIk4KowWcAmzPudz6mSXG+c3yxSoy5gxr8kf7opnFM3l3chzJve9KZf7cEBCQAAAICg/6/7ESoAAAAAAAAAAAAzAZCz+ky5W3MnAAAAAElFTkSuQmCC'
					];

					return noImageAvailable[key];
				},

				/***************************************************************************/

				createCreatedBy: function()
				{
					return `<address><b>${this.capitalizeFirstLetter(this._name)}</b><br /><span><b>${
						$.fn.dinoRadio.version}</b></span><hr /><span>${window.atob('Q3JlYXRlZCBCeTog')}<br /><b>${
						window.atob(
							'PGEgaHJlZj0iaHR0cHM6Ly9tY3gtc3lzdGVtcy5uZXQiIHRhcmdldD0iYmxhbmsiPk1DWC1TeXN0ZW1zJnJlZzwvYT4=')
						}</b></span></address>`;
				}

				/***************************************************************************/
			});

		// Google Analytics
		function dino_gtag()
		{
			dataLayer.push(arguments);
		}

		/*
			Create a lightweight plugin wrapper around the "Plugin" constructor,
			preventing against multiple instantiations.
	
			More: http://learn.jquery.com/plugins/basic-plugin-creation/
		*/
		$.fn.dinoRadio = function(options)
		{
			this.each(function()
			{
				if (!$.data(this, `plugin_${pluginName}`))
				{
					/*
						Use "$.data" to save each instance of the plugin in case
						the user wants to modify it. Using "$.data" in this way
						ensures the data is removed when the DOM element(s) are
						removed via jQuery methods, as well as when the user leaves
						the page. It's a smart way to prevent memory leaks.
	
						More: http://api.jquery.com/jquery.data/
					*/
					$.data(this, `plugin_${pluginName}`, new Plugin(this, options));
				}
			});

			/*
				"return this;" returns the original jQuery object. This allows
				additional jQuery methods to be chained.
			*/
			return this;
		};

		/* Return current version */
		$.fn.dinoRadio.version = '2.3.2021';

		/*
			Attach the default plugin options directly to the plugin object. This
			allows users to override default plugin options globally, instead of
			passing the same option(s) every time the plugin is initialized.
	
			For example, the user could set the "property" value once for all
			instances of the plugin with
			"$.fn.pluginName.defaults.property = 'myValue';". Then, every time
			plugin is initialized, "property" will be set to "myValue".
	
			More: http://learn.jquery.com/plugins/advanced-plugin-concepts/
		*/
		$.fn.dinoRadio.defaults = {
			// Widget background color
			bgColor: 'rgb(6, 101, 191)',
			/*---------------------------------------------*/
			// Artist poster style. Can be: circle or square
			posterStyle: 'circle',
			/*---------------------------------------------*/
			// Radio Playlist Array - contains station end point urls.
			stationPlaylist: [],
			/*---------------------------------------------*/
			// Autoplay radio station after page load
			autoPlay: false,
			/*---------------------------------------------*/
			// Show playlist after widget has been loaded
			showPlaylistOnInit: false,
			/*---------------------------------------------*/
			// Show Equalizer on Play Radio Stream
			showEqOnPlay: false,
			/*---------------------------------------------*/
			// Show station id numbers in playlist
			showPlaylistNumber: true,
			/*---------------------------------------------*/
			// Radio interval for updating current playing song
			nowPlayingInterval: 30,
			/*---------------------------------------------*/
			// get current song ID3 TAG
			grabId3Tag: true,
			// Enable info on current playing song
			grabSongRds: true,
			// Enable current playing song: lyrics show grab
			grabSongLyrics: true,
			// Get current Station name
			// and category from the stream
			grabStationRds: true,
			// Get current playing Artist  info
			grabArtistInfo: true,
			/*---------------------------------------------*/
			// Share Station to twitter
			enableTwitterShare: true,
			/*---------------------------------------------*/
			// Share web radio page with facebook
			// You need a facebook appID
			enableFacebookShare: true,
			facebookAppID: '513778246690715',
			/*---------------------------------------------*/
			enableGoogleAnalytics: true,
			enableGoogleAnalyticsTag: 'G-92Z320V70M',
			// Path to radio API data files:
			//
			// radioPlaylist.php     -> Default playlist if none specified
			// radioInfo.php         -> Radio Station Info
			// radioPlaying.php      -> Radio current playing song
			// radioLyrics.php       -> Radio current playing song lyrics
			// radioArtist.php       -> Radio current playing Artist Info
			pathToAjaxFiles: 'mcx-systems.net',
			/*---------------------------------------------*/
			// Plugin language automatic
			// detection at runtime from browser
			language: null,
			// Enable plugin debug
			debug: false
		};
	}));