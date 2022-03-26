// Dyatlov map maker
// Copyright 2017, 2018, 2020 Pierre Ynard
// Licensed under GPLv3+
//
// As a special exception to the GPL, you may convey this software
// or a work based on it, combined with data collections used as
// input for it, or combined with the publicly available reference
// implementation of the Google Maps API, without licensing under
// the GPL the parts of the whole work corresponding to said data
// collections or implementation. You must still license under the GPL
// the remainder of the whole work and all its other parts.

// Helper variable for inline class declaration
var C;

// Dyatlov map maker class: creates a world map using the given toolkit
// and lists receiver objects to place as markers on it
var Dyatlov = function(element_id, toolkit, config) {
	var map_module;
	if (toolkit)
		map_module = this.maps[toolkit];
	if (map_module == null)
		map_module = this.detect_toolkit();

	this.map = new map_module(element_id, config);
	this.grid = {};

	var filters = [];
	if (window.location.hash != '#all') {
		filters.push(function(rx) {
			return rx.wideband(); // && rx.shortwave();
		});
	}
	if (window.location.hash == '#gps') {
		filters.push(function(rx) {
			return rx.gps();
		});
	}
	if (window.location.hash == '#62') {
		filters.push(function(rx) {
			return rx.parsed.bandwidth > 60000000;
		});
	}

	this.rxs = this.receivers();
	filters.forEach(function(f) {
		this.rxs = this.rxs.filter(f);
	}, this);
	this.rxs.forEach(this.add_marker, this);
	//this.receivers().forEach(this.add_marker, this);
};

Dyatlov.prototype = {
	// RX class for receivers placed on the map
	RX: (
		C = function(data) {
			this.raw = data;
			this.parsed = {
				bandwidth: this.bandwidth(),
				gps_fpm: this.parse_number(this.raw.fixes_min),
				snr: this.parse_snr(),
				updated: this.parse_date(this.raw.updated),
				users: {
					current: this.parse_number(this.raw.users),
					max: this.parse_number(this.raw.users_max),
				},
			};

			// TODO: recover metrics from definitive data source
			//if (window.location.hash == '#snr' || window.location.hash == '#snrhf')
				this.snr = this.parsed.snr;
			if (this.snr == null)
				this.snr = (typeof snr == "object" && snr && snr[this.raw.id] != null) ? Number(snr[this.raw.id]) : null;
			this.blocked = (typeof blocked == "object" && blocked && blocked[this.raw.id] != null) ? Number(blocked[this.raw.id]) : null;

			this.age = this.liveness_age();

			if (! this.validate())
				return {};

			this.title = this.marker_title();
		},
		C.prototype = {
			xml_escape: function(text) {
				var xml_entities = {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&apos;',
				};
				return text.replace(/[&<>"']/g, function(c) {
					return xml_entities[c];
				});
			},
			printf_02X: function(n) {
				var x = Number(n).toString(16).toUpperCase();
				return x.length < 2 ? '0' + x : x;
			},
			parse_number: function(val) {
				if (val == null || val == '')
					return null;
				var num = Number(val);
				return Number.isNaN(num) ? null : num;
			},
			parse_date: function(val) {
				if (! val)
					return null;
				var time = Date.parse(val.replace(/-/g, ' '));
				return Number.isNaN(time) ? null : time;
			},
			// Scale unbounded positive metric down to 0..1 range
			scale: function(val, con) {
				if (val < 0)
					return 0;
				return 1 - Math.exp(-1 * val / con);
				//return 1 - 1 / (1 + Math.pow(val / 15, 2))
			},
			// Parse and return bandwidth of accessible spectrum
			bandwidth: function() {
				if (! this.raw.bands)
					return null;

				var result = this.raw.bands.match(/(\d+)-(\d+)/);
				if (result == null)
					return null;
				var min = Number(result[1]);
				var max = Number(result[2]);

				return max - min;
			},
			// 
			parse_snr: function() {
				var scores = String(this.raw.snr).split(',');
				var snr = Number.parseInt(scores[1], 10);
				if (/* window.location.hash == '#snrhf' && */ !(Number.isNaN(snr) || snr == 0))
					return snr;
				snr = Number.parseInt(scores[0], 10);
				if (!(Number.isNaN(snr) || snr == 0))
					return snr;
				return null;
			},
			// Parse and return GPS coordinates
			coords: function() {
				var coords = this.raw.gps ?
					this.raw.gps.match(/([\d\.-]+).*?[, ].*?([\d\.-]+)/)
					: null;

				return coords != null ? {
					lat: Number(coords[1]),
					lng: Number(coords[2]),
				} : {
					// Place unlocated receivers around
					// (0, 0), there is not much else
					// there to conflict with
					lat: Math.random(),
					lng: Math.random(),
				};
			},
			// Age of last liveness indication
			liveness_age: function() {
				// Lack of update information means
				// it's considered as always valid
				if (this.parsed.updated == null)
					return 0;

				return Date.now() - this.parsed.updated;
			},
			// Check that receiver is wideband (more than 5 MHz).
			// More than 50% of blocked spectrum is considered
			// as not wideband continuous spectrum anymore.
			wideband: function() {
				return (this.parsed.bandwidth >= 5000000 && !(this.blocked && this.blocked > 0.5));
			},
			// Check if receiver covers shortwave
			shortwave: function() {
				return (Number.parseInt(this.raw.bands, 10) < 30000000);
			},
			// Check if GPS clock is available
			gps: function() {
				return (this.parsed.gps_fpm > 0);
				//return (this.raw.sdr_hw && this.raw.sdr_hw.indexOf(' GPS ') > -1);
			},
			// Check if live recently and still relevant
			// (less than 10 days of downtime)
			recent: function() {
				return (this.age < 864000000);
			},
			// Check if receiver is currently down,
			// after missing latest status probes
			downtime: function() {
				// KiwiSDR.com updates receivers every
				// 30 minutes, consider temporarily down
				// after one hour
				return (this.age > 3900000);
			},
			// Check if receiver is offline, down or unavailable
			offline: function() {
				return (this.raw.offline == 'yes' ||
				        this.raw.status == 'offline' ||
				        this.raw.status == 'inactive' ||
				        this.downtime());
			},
			// Availability of user slots, if applicable
			availability: function() {
				var users = this.parsed.users;
				if (users.current == null || users.max == null)
					return null;

				return (users.current < users.max);
			},
			// Reception quality score,
			// from 0 (lowest) to 1 (highest)
			quality: function() {
				if (this.snr == null)
					return null;

				return this.scale(this.snr, 20);
			},
			// Precedence score among other receivers,
			// from 0 (bottom) to 1 (top)
			precedence: function() {
				var precedence = 15;
				if (this.snr != null)
					precedence = this.snr;
				else if (this.availability() == null)
					// Rate custom setups by bandwidth
					precedence += this.parsed.bandwidth / 1000000;

				// Penalty equal to the fraction of
				// blocked spectrum
				if (this.blocked)
					precedence *= 1 - this.blocked;

				// GPS clock bonus
				if (this.gps())
					precedence += 2 + Math.min(this.parsed.gps_fpm, 30) / 15;

				// Put offline receivers at the bottom
				if (this.offline())
					precedence /= 100;

				// TODO: take availability into account
				// once it is more reliable

				return this.scale(precedence, 20);
/*

				var precedence = this.quality();
				if (precedence == null &&
				    this.parsed.users.max > 8)
					// Rate custom setups by bandwidth
					precedence = 0.5 + Math.min(0.5, this.parsed.bandwidth * 0.5 / 30000000);
				if (precedence == null)
					precedence = 0.5;

				// GPS clock bonus
				if (this.gps()) {
					var mod = 30 + Math.min(this.parsed.gps_fpm, 30);
					precedence = Math.pow(precedence, 1 - mod / 300);
				}

				// Put offline receivers at the bottom
				if (this.offline())
					return 0.1 * precedence;

				return precedence;
*/
			},
			// Validate data and receiver for display
			validate: function() {
				return (
					this.raw.name &&
					this.raw.url &&
					this.recent()
				);
			},
			// Content of title-attribute marker tooltip
			marker_title: function() {
				var lines = [];
				lines.push(this.raw.name);
				if (this.raw.sdr_hw)
					lines.push('Setup: ' + this.raw.sdr_hw);
				if (this.raw.antenna)
					lines.push('Antenna: ' + this.raw.antenna);

				if (! this.offline()) {
					var users = this.parsed.users;
					if (users.current != null || users.max != null) {
						var current = users.current != null ? users.current : '???';
						var max = users.max != null ? users.max : '???';
						lines.push('Users: ' + current + '/' + max);
					}
				} else if (this.downtime()) {
					// Print using Moment.js API if available, fallback otherwise
					var ago = typeof moment == 'function' ?
						moment(this.parsed.updated).fromNow() :
						Number(this.age / 86400000).toFixed(1) + ' days ago';
					lines.push('Last online: ' + ago);
				} else
					lines.push('Currently offline (check receiver for details)');

				if (this.snr != null)
					lines.push('S/N score: ' + this.snr.toFixed(0) + ' dB');
				if (this.gps())
					lines.push('GPS clock available: ' + this.parsed.gps_fpm + ' fixes/min');
				if (this.blocked)
					lines.push('Blocked spectrum: ' + Number(this.blocked * 100).toFixed(1) + '%');

				return lines.join('\n');
			},
			// Helper for color-coded marker icon URL
			marker_color: function() {
				if (this.offline())
					return '9067FD'; // Purple

				var avail = this.availability();
				if (avail != null && ! avail)
					return 'FFFF6E'; // Yellow

				if (window.location.hash == '#all' && ((! this.wideband()) || (! this.shortwave())))
					return '0080FF'; // TBD

				if (avail == null)
					return '00E74C'; // Green

				var q = this.quality();
				if (q == null)
					return '807567'; // Gray

				// Shades of red - brightness and
				// vividness scale with quality
				var r = this.printf_02X(Math.round(255 * q) + 0);
				var g = this.printf_02X(Math.round(64 * q) + 53);
				var b = this.printf_02X(Math.round(48 * q) + 55);
				return (r + g + b);
			},
			// Color-coded icon URL to use as marker on the map
			marker_icon: function() {
				return 'data:image/svg+xml,' + encodeURIComponent('<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" width="21" height="34"><path d="M 19.5,9.5469494 C 19.5,12.03223 18.097139,13.965539 16.863961,15.91091 8.422781,29.22709 12.109244,35.147897 10.6875,33.109449 10.077219,32.234449 12.639719,27.66459 4.136039,15.91091 2.785922,14.044796 1.5,12.03223 1.5,9.5469494 c 0,-4.9705629 4.029437,-9.00000031 9,-9.00000031 4.970563,-1e-7 9,4.02943731 9,9.00000031 z" style="fill:#' + this.marker_color() + ';stroke:#000000;stroke-width:1.3;" /><circle r="1.5" cy="10" cx="10.5" style="fill:#000000;" /></svg>');
			},
			// Size of marker icon, for positioning purposes
			marker_icon_size: function() {
				return {
					width: 21,
					height: 34,
				};
			},
			// HTML content of marker info bubble
			bubble_HTML: function() {
				return '<a href="' + this.xml_escape(this.raw.url) + '" style="color:teal;font-weight:bold;text-decoration:none" title="' + this.xml_escape(this.title) + '">' + this.xml_escape(this.raw.name) + '</a>';
			},
		},
	C),
	// Modular classes implementing a map component interface through
	// alternative supported map library APIs. Implementations can
	// make optional use of a specific configuration argument, and
	// should provide an add_marker() interface to place receivers
	// on the map.
	maps: {
		// Google Maps API - documented at
		// https://developers.google.com/maps/documentation/javascript/tutorial
		GoogleMaps: (
			// Create and set up Google API map object
			C = function(element_id, config) {
				this.map = new google.maps.Map(document.getElementById(element_id), {
					mapTypeId: 'hybrid',
					scaleControl: true,
				});
				// Arbitrary area of interest,
				// should suffice and work well
				this.map.fitBounds({
					north: 70,
					south: -60,
					west: -180,
					east: 180,
				});

				// Overlay day/night separation on the map,
				// if an implementation was loaded.
				// DayNightOverlay API implementation available
				// at https://github.com/marmat/google-maps-api-addons
				if (typeof DayNightOverlay == 'function') {
					new DayNightOverlay({
						map: this.map,
					});
				}
				// nite API implementation available at
				// https://github.com/rossengeorgiev/nite-overlay
				else if (typeof nite == 'object' && nite &&
				         typeof nite.init == 'function') {
					nite.init(this.map);
				}

				this.bubbles = [];
			},
			C.prototype = {
				// Add receiver as marker onto map
				add_marker: function(rx, coords) {

					var marker = new google.maps.Marker({
						title: rx.title, // XML-encoded by Marker code
						position: new google.maps.LatLng(coords),
						zIndex: google.maps.Marker.MAX_ZINDEX +
						        Math.round(65536 * rx.precedence()),
						icon: rx.marker_icon(),
					});

					var bubble = new google.maps.InfoWindow({
						content: rx.bubble_HTML(),
					});
					this.bubbles.push(bubble);

					var t = this; // For closure below
					marker.addListener('click', function() {
						t.bubbles.forEach(function(bub) {
							bub.close();
						});
						bubble.open(t.map, marker);
					});

					marker.setMap(this.map);
				},
			},
		C),
		// Leaflet interactive map library API
		// Implementation available at https://leafletjs.com/
		// An optional list of tilesets with hosting provider
		// configuration is accepted
		Leaflet: (
			// Create and set up Leaflet map object
			C = function(element_id, config) {
				this.map = L.map(element_id, {
					worldCopyJump: true,
				});
				// Arbitrary area of interest,
				// should suffice and work well
				this.map.fitBounds([
					[ 70, -180 ],
					[ -60, 180 ],
				]);
				L.control.scale().addTo(this.map);

				// Overlay day/night separation on the map,
				// if an implementation was loaded.
				// L.terminator API implementation available at
				// https://github.com/joergdietrich/Leaflet.Terminator
				if (typeof L.terminator == 'function') {
					var terminator = L.terminator({
						// Disable "clickable" pointer
						// mouse cursor over overlay
						interactive: false,
					});
					var interactions = [
						'viewreset',
						'zoomstart',
						'movestart',
						'popupopen',
						'popupclose',
						'baselayerchange',
					];
					this.map.addEventListener(interactions.join(' '), function(e) {
						terminator.setTime();
					});
					terminator.addTo(this.map);
				}

				var tilesets = config;
				if (tilesets == null) {
					// Default tile provider is
					// OpenStreetMap
					tilesets = [
						{
							label: 'Map',
							url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
							attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
						},
					];
				}

				var tslayers = tilesets.map(function(tileset) {
					return {
						label: tileset.label,
						layer: L.tileLayer(tileset.url, {
							attribution: tileset.attribution,
						}),
					};
				});
				if (tslayers.length > 0)
					tslayers[0].layer.addTo(this.map);

				// If several tilesets are configured, add
				// a control switch onto the map to toggle
				// between them; Leaflet's switch will
				// require the images/layers[-2x].png icons.
				if (tslayers.length > 1) {
					var control = L.control.layers({}, {});
					tslayers.forEach(function(tileset) {
						this.addBaseLayer(tileset.layer, tileset.label);
					}, control);
					control.addTo(this.map);
				}
			},
			C.prototype = {
				// Add receiver as marker onto map
				add_marker: function(rx, coords) {
					var size = rx.marker_icon_size();
					var icon = L.icon({
						iconUrl: rx.marker_icon(),
						iconSize: [
							size.width,
							size.height,
						],
						iconAnchor: [ // Center bottom
							Math.round(size.width / 2) - 1,
							size.height,
						],
						popupAnchor: [ // Center top
							0,
							- (size.height + 1),
						],
					});

					var marker = L.marker(coords, {
						title: rx.title, // XML-encoded by marker code
						zIndexOffset: Math.round(65536 * rx.precedence()),
						icon: icon,
					});

					marker.bindPopup(rx.bubble_HTML());

					marker.addTo(this.map);
				},
			},
		C),
		// Built-in stub implementation, requiring no separate
		// library or setup. This doesn't actually provide any map,
		// but lists available receivers as a fallback.
		Builtin: (
			// Set up HTML to list receivers
			C = function(element_id, config) {
				this.ul = document.createElement('ul');
				var el = document.getElementById(element_id);
				el.innerHTML = '<p>Welcome to this wideband shortwave radio receiver map! If you are seeing this, the necessary map resources have not been fully set up by the administrator of this website, or your browser could not access them.</p><p>You can still browse below a list of receivers that would normally be displayed as markers on an interactive world map.</p>';
				el.appendChild(this.ul);
			},
			C.prototype = {
				// Add receiver to HTML list
				add_marker: function(rx, coords) {
					var li = document.createElement('li');
					li.setAttribute('style', "list-style-image: url('" + rx.marker_icon() + "');");
					li.innerHTML = rx.bubble_HTML();
					this.ul.appendChild(li);
				},
			},
		C),
	},
	// Select map service implementation based on which toolkit API
	// is loaded and available
	detect_toolkit: function(element_id) {
		// Give precedence to Leaflet because, coupled with
		// OpenStreetMap, it is free and registration-free
		if (typeof L == 'object' && L &&
		    typeof L.map == 'function') {
			return this.maps.Leaflet;
		} else if (typeof google == 'object' && google &&
		           typeof google.maps == 'object' && google.maps &&
		           typeof google.maps.Map == 'function') {
			return this.maps.GoogleMaps;
		} else
			return this.maps.Builtin;
	},
	// Shift coordinates to ensure marker is sufficiently distinct
	// from others to be distinctly seen and used
	distinct_marker: function(coords) {
		var gran = 0.1; // Granularity, in degrees

		for (var tries = 10; ; tries--) { // Give up eventually
			// Enforce proper bounds: make sure it will work
			// fine with both the grid and the marker API
			if (coords.lat > 90)
				coords.lat = 90;
			else if (coords.lat < -90)
				coords.lat = -90;
			coords.lng = ((coords.lng + 540) % 360) - 180;

			var key = Math.round(coords.lat / gran) + ','
				+ Math.round(coords.lng / gran);
			if ((! this.grid[key]) || tries <= 0) {
				this.grid[key] = true;
				break;
			}

			// Pick a random direction and move one grid cell
			// length over
			var theta = Math.random() * 2 * Math.PI;
			coords.lat += gran * Math.sin(theta);
			coords.lng += gran * Math.cos(theta);
		}
	},
	// Merge and list valid receivers from available data sources
	receivers: function() {
		return [].concat(
			// Each data source is optional and may or may not
			// have been loaded
			(typeof static_rx == "object" && static_rx) ? static_rx : [],
			(typeof kiwisdr_com == "object" && kiwisdr_com) ? kiwisdr_com : []
		).map(function(rx) {
			return new this.RX(rx);
			// If this receiver data is rejected, an empty object
			// is returned instead, so filter these afterwards
		}, this).filter(function(rx) {
			return (rx.bubble_HTML != null);
		});
	},
	// Add receiver as marker onto map
	add_marker: function(rx) {
		var coords = rx.coords();
		this.distinct_marker(coords);
		this.map.add_marker(rx, coords);
	},
};

