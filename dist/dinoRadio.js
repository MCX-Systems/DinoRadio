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

		/*
			The "Plugin" constructor, builds a new instance of the plugin for the
			DOM node(s) that the plugin is called on. For example,
			"$('h1').pluginName();" creates a new instance of pluginName for
			all h1's.
		*/

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
			/***************************************************************************/
			this.dinoAudio = [];
			this.dinoAudio = new Audio();
			this.dinoAudio.id = this._uId;
			this.dinoAudio.loop = false;
			// Playlist Variables
			this._dinoCurrentUrl = '';
			this._dinoCurrentRow = 0;
			this._dinoCurrentIndex = 0;
			this._nowPlayingIntervalId = 0;
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

				createRadioWidget: function ()
				{
					return '<article id="dinoRadio-' + this._uId + '" class="dinoRadio">' +

						'<div id="dinoRadioHolder-' + this._uId + '" class="dinoRadioHolder">' +

						'<section id="dinoRadioPosterHolder-' + this._uId + '" class="dinoRadioPosterHolder">' +

						'<img id="dinoRadioPoster-' + this._uId + '" class="dinoRadioPoster" alt="Radio Station" />' +

						'<div id="dinoRadioInfo-' + this._uId + '" class="dinoRadioInfo"></div>' +

						'<div id="dinoRadioPlayPause-' + this._uId + '" class="dinoRadioPlayPause">' +

						'<i class="dinoIcon dino-icon-play-circled-1"></i>' +

						'</div>' +

						'<div id="dinoRadioError-' + this._uId + '" class="dinoBlinking"></div>' +

						'</section>' +

						'<img id="dinoRadioLogo-' + this._uId + '" src="data:image/png;base64,' + this.getImage(0) + '" class="dinoRadioLogo" alt="Radio Logo" />' +

						'<section id="dinoRadioPlaylist-' + this._uId + '" class="dinoRadioPlaylist">' +

						'<div id="dinoRadioLoader-' + this._uId + '" class="dinoLoaderOverlay">' +

						'<div class="dinoCubeGrid">' +

						'<div class="dinoCube dinoCube1"></div>' +

						'<div class="dinoCube dinoCube2"></div>' +

						'<div class="dinoCube dinoCube3"></div>' +

						'<div class="dinoCube dinoCube4"></div>' +

						'<div class="dinoCube dinoCube5"></div>' +

						'<div class="dinoCube dinoCube6"></div>' +

						'<div class="dinoCube dinoCube7"></div>' +

						'<div class="dinoCube dinoCube8"></div>' +

						'<div class="dinoCube dinoCube9"></div>' +

						'</div>' +

						'</div>' +

						'<ul id="dinoRadioPlaylistList-' + this._uId + '" class="dinoRadioPlaylistList"></ul>' +

						'<div class="dinoRadioPlaylistBottom">' +

						'<label for="dinoRadioSearchTerm-' + this._uId + '"></label>' +

						'<input id="dinoRadioSearchTerm-' + this._uId + '" class="dinoRadioSearchTerm" type="text" onfocus="this.value=\'\'" onblur="this.value=\'Input Search Term ...\'" value="Input Search Term ..." />' +

						'<i id="dinoRadioGithub-' + this._uId + '" class="dinoIcon dino-icon-github-squared"></i>' +

						'<i id="dinoRadioLinkedin-' + this._uId + '" class="dinoIcon dino-icon-linkedin-squared"></i>' +

						'<i id="dinoRadioFacebook-' + this._uId + '" class="dinoIcon dino-icon-facebook-squared"></i>' +

						'</div>' +

						'</ul>' +

						"</section>" +

						'<section id="dinoRadioData-' + this._uId + '" class="dinoRadioData">' +

						'<div id="dinoRadioStation-' + this._uId + '" class="dinoRadioStation"></div>' +

						'<div class="dinoMarquee">' +

						'<div class="dinoMarqueeInner">' +

						'<span>Title:&nbsp;</span>' +

						'<span id="dinoRadioSongTitle-' + this._uId + '" class="dinoRadioSongTitle"></span>' +

						'<span>&nbsp;&nbsp;****&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;****&nbsp;&nbsp;</span>' +

						'<span>Artist:&nbsp;</span>' +

						'<span id="dinoRadioSongArtist-' + this._uId + '" class="dinoRadioSongArtist"></span>' +

						'</div>' +

						'</div>' +

						'<div id="dinoRadioEqualiser-' + this._uId + '" class="dinoRadioEqualiser">' +

						'<ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul>' +

						'<ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul>' +

						'<ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul>' +

						'<ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul>' +

						'<ul class="dinoRadioEqualiserColumn"><li class="dinoRadioEqualiserColourBar"></li></ul>' +

						'</div>' +

						"</section>" +

						'<nav id="dinoRadioControls-' + this._uId + '" class="dinoRadioControls">' +

						'<a href="#" id="dinoRadioPlay-' + this._uId + '" class="dinoRadioPlay" title="Play/Pause"><i class="dinoIcon dino-icon-play-3"></i></a>' +

						'<a href="#" id="dinoRadioPrev-' + this._uId + '" class="dinoRadioPrev" title="Previous"><i class="dinoIcon dino-icon-step-backward"></i></a>' +

						'<a href="#" id="dinoRadioNext-' + this._uId + '" class="dinoRadioNext" title="Next"><i class="dinoIcon dino-icon-step-forward"></i></a>' +

						'<a href="#" id="dinoRadioVolumeButton-' + this._uId + '" class="dinoRadioVolumeButton" title="Mute/Unmute"><i class="dinoIcon dino-icon-volume"></i></a>' +

						'<a href="#" id="dinoRadioShowHidePlaylist-' + this._uId + '" class="dinoRadioShowHidePlaylist" title="Show/Hide Playlist"><i class="dinoIcon dino-icon-indent-left-1"></i></a>' +

						'</nav>' +

						'<svg id="dinoBlurFilterSvg-' + this._uId + '" xmlns="http://www.w3.org/2000/svg" style="display: none;">' +

						'<defs>' +

						'<filter id="dinoBlurFilter-' + this._uId + '">' +

						'<feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />' +

						'<feColorMatrix in="blur" values="1 1 0 0 0  1 1 0 0 0  1 1 0 0 0  1 1 0 20 -6" result="flt" />' +

						'<feBlend in2="flt" in="SourceGraphic" result="mix" />' +

						'</filter>' +

						'</defs>' +

						'</svg>' +

						'</div>' +

						'</article>';
				},

				initRadio: function()
				{
					let widget = this;

					// Set default widget colors
					widget.$element.find(`#dinoRadioPosterHolder-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioPlaylist-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioData-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioControls-${widget._uId}`).css({
						'background-color': widget.options.bgColor
					});

					widget.$element.find(`#dinoRadioSearch-${widget._uId}`).css({
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
						.attr('src', `data:image/png;base64,${widget.getImage(1)}`);
					widget.$element.find(`#dinoRadioStation-${widget._uId}`)
						.text(widget.checkStrLength(widget.escapeRegExp(widget.options.station), 20));
					widget.$element.find(`#dinoRadioSongTitle-${widget._uId}`)
						.text(widget.checkStrLength(widget.escapeRegExp(widget.options.title), 30));
					widget.$element.find(`#dinoRadioSongArtist-${widget._uId}`)
						.text(widget.checkStrLength(widget.escapeRegExp(widget.options.artist), 30));

					/*---------------------------------------------------------------*/

					if (!widget.options.stationPlaylist.length)
					{
						window.console.info(
							window.atob('R2V0IGRlZmF1bHQgcmFkaW8gcGxheWxpc3QgZnJvbSBNQ1gtU3lzdGVtcyE='));
						// Get default radio playlist from MCX-Systems because playlist array is empty!
						$.getJSON({
							url: window.atob('aHR0cHM6Ly9tY3gtc3lzdGVtcy5uZXQvcmFkaW9TdGF0aW9uUGxheWxpc3QucGhw'),
							success: function(data)
							{
								widget.options.stationPlaylist = data;
								window.console.log(widget.options.stationPlaylist);
							},
							error: function()
							{
								window.console.log('Error getting default playlist!');
							}
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
									'<li><span class="dinoRadioStationError">No Playlist Found!!!</span></li>';
								widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`).append(template);
								window.console.error('No Playlist Found!!! Please set a playlist first!');
							}

							/*---------------------------------------------------------------*/

							// Set Current Radio Station
							let stationNameCurrent;
							let stationUrlCurrent;

							if (widget.options.stationPlaylist.length)
							{
								// Create initial Playlist and populate with data
								$.each(widget.options.stationPlaylist,
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
											hoverA = ' class="active"';
											stationNameCurrent = value.station;
											stationUrlCurrent = value.url;
											active = '<span class="dinoRadioActive"></span>';
											widget.$element.find(`#dinoRadioStation-${widget._uId}`)
												.text(widget.checkStrLength(widget.escapeRegExp(stationNameCurrent),
													20));
										}

										if (widget.options.grabStationRds)
										{
											$.getJSON({
												url: widget.options.pathToAjaxFiles +
													window.atob('cmFkaW9TdGF0aW9uSW5mby5waHA/dGhlX3N0cmVhbT0=') +
													value.url,
												success: function(data)
												{
													template =
														`<li id="dinoRadioItem-${i}-${widget._uId}" data-position="${i
														}"${
														hoverA}>${num}${active}<span class="dinoRadioStation">${widget
														.checkStrLength(widget.escapeRegExp(data.streamTitle), 14)
														}</span><i class="dinoIcon dino-icon-signal"></i></li>`;
													widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`)
														.append(template);

													if (i === 0)
													{
														widget.$element.find(`#dinoRadioStation-${widget._uId}`)
															.text(widget.checkStrLength(
																widget.escapeRegExp(data.streamTitle),
																20));
													}
												},
												error: function()
												{
													window.console.log(
														'Error: Something went wrong with loading the Current Radio song!');
													template =
														`<li id="dinoRadioItem-${i}-${widget._uId}" data-position="${i
														}"${
														hoverA}>${num}${active}<span class="dinoRadioStation">${widget
														.checkStrLength(widget.escapeRegExp(value.station), 14)
														}</span><i class="dinoIcon dino-icon-signal"></i></li>`;
													widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`)
														.append(template);
												}
											});
										}
										else
										{
											template =
												`<li id="dinoRadioItem-${i}-${widget._uId}" data-position="${i}"${hoverA
												}>${
												num}${active}<span class="dinoRadioStation">${widget.checkStrLength(
													widget.escapeRegExp(value.station),
													14)
												}</span><i class="dinoIcon dino-icon-signal"></i></li>`;
											widget.$element.find(`#dinoRadioPlaylistList-${widget._uId}`)
												.append(template);
										}
									});

								widget.changeRadioSong(stationUrlCurrent);
							}

							/*---------------------------------------------------------------*/

							if (widget.options.showPlaylistOnInit)
							{
								widget.$element.find(`#dinoRadioPlaylist-${widget._uId}`).css({
									'visibility': 'visible',
									'opacity': 1
								});
							}

							widget.dinoAudio.src = stationUrlCurrent;
							widget.$element.attr('data-trackId', widget._uId);

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

								widget.dinoAudio.play().then(r =>
								{
								});
							}

							window.setTimeout(function()
								{
									// Hide Loader
									widget.hideLoader();
									widget.$element.find(`#dinoRadioPlaylistList-${widget._uId} > li`)
										.sort(widget.sortPlaylist)
										.appendTo(`#dinoRadioPlaylistList-${widget._uId}`);
								},
								2000);
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
						`#dinoRadioPlayPause-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.playRadio();
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioPlay-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							plugin.playRadio();
						});

					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioShowHidePlaylist-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							if (plugin.$element.find(`#dinoRadioShowHidePlaylist-${plugin._uId} i`)
								.hasClass('dino-icon-indent-left-1'))
							{
								plugin.$element.find(`#dinoRadioPlaylist-${plugin._uId}`).css({
									'visibility': 'visible',
									'opacity': 1
								});
							}
							else
							{
								plugin.$element.find(`#dinoRadioPlaylist-${plugin._uId}`).css({
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

							const radioItemId = $(this).prop('id');
							const index = radioItemId.split('-');

							plugin.$element.find(`#dinoRadioStation-${plugin._uId}`).text(
								plugin.checkStrLength(plugin.escapeRegExp($(this).find('.dinoRadioStation').text()),
									20));
							plugin.playRadioPlaylist(index[1]);
						});

					/*-----------------------------------------------------------------*/
					/*-----------------------------------------------------------------*/

					plugin.$element.on(`input.${plugin._name}`,
						`#dinoRadioSearchTerm-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// TODO Generate search
							//generatePlaylistByTerm();
							//alert('input Search Change!!');
						});

					/*-----------------------------------------------------------------*/
					/*-----------------------------------------------------------------*/

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioGithub-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// TODO Implement Git link
							//alert('Git Click');
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioLinkedin-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// TODO Implement Linkedin link
							//alert('Linkedin Click');
						});

					plugin.$element.on(`click touchstart.${plugin._name}`,
						`#dinoRadioFacebook-${plugin._uId}`,
						function(e)
						{
							e.preventDefault();

							// TODO Implement Facebook link
							//alert('Facebook Click');
						});
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
						});
				},

				/***************************************************************************/

				// Unbind events that trigger methods
				unbindEvents: function()
				{
					/*
						Unbind all events in our plugin's namespace that are attached
						to "this.$element".
					*/
					this.$element.off(`.${this._name}`);
					this.$dinoAudio.off(`.${this._name}`);
				},

				/***************************************************************************/
				/*  Audio Player with Playlist                                             */
				/***************************************************************************/

				playRadio: function()
				{
					const objAudio = this.dinoAudio;

					if (objAudio.paused)
					{
						objAudio.play().then(() =>
						{
						});
					}
					else
					{
						objAudio.pause();
					}
				},

				/***************************************************************************/

				playRadioPlaylist(indexValue)
				{
					const objAudio = this.dinoAudio;

					const stationArray = this.options.stationPlaylist[indexValue];
					const currentUrl = stationArray.url;
					const currentIndex = indexValue;
					const oldRowIndex = this._dinoCurrentRow;

					this._dinoCurrentStation = currentUrl;
					this._dinoCurrentIndex = currentIndex;
					this._dinoCurrentRow = currentIndex;

					objAudio.pause();
					objAudio.src = this._dinoCurrentStation;
					objAudio.play().then(() =>
					{
					});

					this.changePlaylistAppearance(this._dinoCurrentRow, oldRowIndex);
					this.changeRadioSong(this._dinoCurrentStation);
				},

				/***************************************************************************/

				playPreviousStation: function()
				{
					const objAudio = this.dinoAudio;
					const playlistArray = this.options.stationPlaylist;

					let currentUrl;
					let currentIndex = this._dinoCurrentIndex;
					const oldRowIndex = this._dinoCurrentRow;

					if (currentIndex <= 0)
					{
						currentUrl = playlistArray[playlistArray.length - 1].url;
						currentIndex = playlistArray.length - 1;
						this._dinoCurrentRow = currentIndex;
					}
					else
					{
						currentUrl = playlistArray[currentIndex - 1].url;
						currentIndex = currentIndex - 1;
						this._dinoCurrentRow = currentIndex;
					}

					this._dinoCurrentUrl = currentUrl;
					this._dinoCurrentIndex = currentIndex;

					objAudio.src = this._dinoCurrentUrl;
					objAudio.play().then(() =>
					{
					});

					this.changePlaylistAppearance(this._dinoCurrentRow, oldRowIndex);
					this.changeRadioSong(this._dinoCurrentUrl);

					const row = this.$element.find(
						`#dinoRadioItem-${this._dinoCurrentRow}-${this._uId} .dinoRadioStation`);
					this.$element.find(`#dinoRadioStation-${this._uId}`)
						.text(this.checkStrLength(this.escapeRegExp(row.text()), 20));
				},

				/***************************************************************************/

				playNextStation: function()
				{
					const objAudio = this.dinoAudio;
					const playlistArray = this.options.stationPlaylist;

					let currentUrl;
					let currentIndex = this._dinoCurrentIndex;
					const oldRowIndex = this._dinoCurrentRow;

					if (playlistArray.length <= currentIndex + 1)
					{
						currentUrl = playlistArray[0].url;
						currentIndex = 0;
						this._dinoCurrentRow = currentIndex;
					}
					else
					{
						currentUrl = playlistArray[currentIndex + 1].url;
						currentIndex = currentIndex + 1;
						this._dinoCurrentRow = currentIndex;
					}

					this._dinoCurrentUrl = currentUrl;
					this._dinoCurrentIndex = currentIndex;

					objAudio.src = this._dinoCurrentUrl;
					objAudio.play().then(() =>
					{
					});

					this.changePlaylistAppearance(this._dinoCurrentRow, oldRowIndex);
					this.changeRadioSong(this._dinoCurrentUrl);

					const row = this.$element.find(
						`#dinoRadioItem-${this._dinoCurrentRow}-${this._uId} .dinoRadioStation`);
					this.$element.find(`#dinoRadioStation-${this._uId}`)
						.text(this.checkStrLength(this.escapeRegExp(row.text()), 20));
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

					// now_playing interval call
					window.clearInterval(widget._nowPlayingIntervalId);

					if (widget.options.grabSongRds)
					{
						$.getJSON({
							url: widget.options.pathToAjaxFiles +
								window.atob('cmFkaW9Ob3dQbGF5aW5nLnBocD90aGVfc3RyZWFtPQ==') +
								stationUrl,
							success: function(data)
							{
								widget.changeCurrentSongTitle(data.songTitle, data.songArtist);

								if (widget.options.grabLastFmPhoto)
								{
									widget.getLastFmRadioInfo(data.songArtist);
								}
							},
							error: function()
							{
								window.console.log('Error: Something went wrong with loading the Current Radio song!');
							}
						});

						window.setTimeout(function()
							{
								widget._nowPlayingIntervalId = window.setInterval(function()
									{
										$.getJSON({
											url: widget.options.pathToAjaxFiles +
												window.atob('cmFkaW9Ob3dQbGF5aW5nLnBocD90aGVfc3RyZWFtPQ==') +
												stationUrl,
											success: function(data)
											{
												widget.changeCurrentSongTitle(data.songTitle, data.songArtist);

												if (widget.options.grabLastFmPhoto)
												{
													widget.getLastFmRadioInfo(data.songArtist);
												}
											},
											error: function()
											{
												window.console.log(
													'Error: Something went wrong with loading the Current Radio song!');
											}
										});
									},
									widget.options.nowPlayingInterval * 1000);
							},
							3000);
					}
				},

				changeCurrentSongTitle: function(title, artist)
				{
					$(`#dinoRadioSongTitle-${this._uId}`).text(this.checkStrLength(this.escapeRegExp(title), 30));
					$(`#dinoRadioSongArtist-${this._uId}`).text(this.checkStrLength(this.escapeRegExp(artist), 30));
				},

				getLastFmRadioInfo: function(artist)
				{
					const widget = this;
					let photoPath;

					$.ajax({
						url: `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${
							encodeURI($.trim(artist))}&api_key=${widget.options.lastFMApiKey}&format=json`,
						success: function(result)
						{
							if (result.artist.image.length)
							{
								if (result.artist.image[3]['#text'].trim() !== '')
								{
									photoPath = result.artist.image[3]['#text'];
									const index = photoPath.lastIndexOf('.') < 0
										? photoPath.length
										: photoPath.lastIndexOf('.');
									widget.$element.find(`#dinoRadioPoster-${widget._uId}`).attr('src',
										`${photoPath.substring(0, index) + '.png'}`);

									return;
								}

								if (result.artist.image[2]['#text'].trim() !== '')
								{
									photoPath = result.artist.image[2]['#text'];
									const index = photoPath.lastIndexOf('.') < 0
										? photoPath.length
										: photoPath.lastIndexOf('.');
									widget.$element.find(`#dinoRadioPoster-${widget._uId}`).attr('src',
										`${photoPath.substring(0, index) + '.png'}`);

									return;
								}

								if (result.artist.image[1]['#text'].trim() !== '')
								{
									photoPath = result.artist.image[1]['#text'];
									const index = photoPath.lastIndexOf('.') < 0
										? photoPath.length
										: photoPath.lastIndexOf('.');
									widget.$element.find(`#dinoRadioPoster-${widget._uId}`).attr('src',
										`${photoPath.substring(0, index) + '.png'}`);

									return;
								}
							}

							widget.$element.find(`#dinoRadioPoster-${widget._uId}`)
								.attr('src', `data:image/png;base64,${widget.getImage(1)}`);
						},
						error: function()
						{
							window.console.log('Error: Something went wrong with loading the LastFM Data!');
						}
					});
				},

				changePlaylistAppearance: function(newRowIndex, oldRowIndex)
				{
					const active = '<span class="dinoRadioActive"></span>';
					this.$element.find(`#dinoRadioItem-${newRowIndex}-${this._uId}`).addClass('active').append(active);
					this.$element.find(`#dinoRadioItem-${oldRowIndex}-${this._uId}`).removeClass('active');
					this.$element.find(`#dinoRadioItem-${oldRowIndex}-${this._uId} .dinoRadioActive`).remove()
						.removeClass('active');
				},

				sortPlaylist: function(a, b)
				{
					return ($(b).data('position')) < ($(a).data('position')) ? 1 : -1;
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

				escapeRegExp: function(str)
				{
					return str.replace(/[\-\[\]\/{}()*+?.\\^$|]/g, '\\$&');
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
							'plugin_desc': 'Jquery plugin for listening to web radio.'
						},
						'sl':
						{
							'plugin_title': 'DinoRadio',
							'plugin_desc': 'Jquery plugin for listening to web radio.'
						},
						'de':
						{
							'plugin_title': 'DinoRadio',
							'plugin_desc': 'Jquery plugin for listening to web radio.'
						}
					};

					if (typeof i18N[lang] !== 'undefined' && typeof i18N[lang][key] !== 'undefined')
					{
						return i18N[lang][key];
					}

					return key;
				},

				/***************************************************************************/

				/*
				*  Array for Radio Images base64 encoded strings
				*  usage in html elements (img src="")
				*/
				getImage: function(key = 0)
				{
					const dinoRadioImages = [
						'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',
						''
					];

					return dinoRadioImages[key];
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
		$.fn.dinoRadio.version = '1.3.2021';

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
			// Radio Playlist Array - contains station end point urls.
			stationPlaylist: [],
			/*---------------------------------------------*/
			autoPlay: false,
			/*---------------------------------------------*/
			showPlaylistOnInit: false,
			/*---------------------------------------------*/
			showEqOnPlay: false,
			/*---------------------------------------------*/
			showPlaylistNumber: true,
			/*---------------------------------------------*/
			station: 'Unknown Station!',
			title: 'Unknown Title!',
			artist: 'Unknown Artist!',
			/*---------------------------------------------*/
			nowPlayingInterval: 15,
			/*---------------------------------------------*/
			grabSongRds: true,
			grabStationRds: true,
			grabLastFmPhoto: true,
			/*---------------------------------------------*/
			lastFMApiKey: '97887400daac2e1b21c964263d201ff5',
			lastFMSecret: '2f26deaeb415635d4b6d4ec542330e40',
			pathToAjaxFiles: 'https://mcx-systems.net/',
			/*---------------------------------------------*/
			// Plugin language automatic
			// detection at runtime from browser
			language: null,
			// Enable plugin debug
			debug: false,
			/*---------------------------------------------*/
			// Event on timer and button click
			onStatus: null,
			// Event on plugin error's
			onError: null
		};
	}));