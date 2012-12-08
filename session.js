var IE = false;
var IE_VERSION = 0;

if(/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
	IE = true;
	IE_VERSION = new Number(RegExp.$1)
}

var NCOMBO_PORT = {{port}};
var NCOMBO_TIMEOUT = {{timeout}};
var NCOMBO_FRAMEWORK_URL = '{{frameworkURL}}';
var NCOMBO_FRAMEWORK_CLIENT_URL = '{{frameworkClientURL}}';
var NCOMBO_AUTO_SESSION = {{autoSession}};
var NCOMBO_IS_FRESH = null;
var NCOMBO_SOCKET = null;
var NCOMBO_SESSION_MANAGER = null;
var NCOMBO_IE = IE;
var NCOMBO_IE_VERSION = IE_VERSION;

(function() {
	var head = document.getElementsByTagName('head');
	if(head) {
		head = head[0];
	}

	var nComboStyle = document.createElement('link');
	nComboStyle.rel = 'stylesheet';
	nComboStyle.type = 'text/css';
	nComboStyle.href = smartCacheManager.setURLCacheVersion(NCOMBO_FRAMEWORK_CLIENT_URL + 'styles/ncombo.css');

	var ncOnScriptLoad = function(scriptTag, callback) {
		if(!NCOMBO_IE || NCOMBO_IE_VERSION > 8) {
			scriptTag.onload = function() {
				callback();
			}
		} else {
			scriptTag.onreadystatechange = function() {
				if(this.readyState == 'complete' || this.readyState == 'loaded') {
					callback();
				}
			}
		}
	}

	var ncScriptLoaded = false;

	var loadScript = document.createElement('script');
	loadScript.type = 'text/javascript';
	loadScript.src = smartCacheManager.setURLCacheVersion(NCOMBO_FRAMEWORK_URL + 'loader.js');
	
	ncOnScriptLoad(loadScript, function() {
		ncScriptLoaded = true;
	});

	head.appendChild(nComboStyle);
	head.appendChild(loadScript);

	var spinnerOpts = {
	  lines: 8,
	  length: 5,
	  width: 3,
	  radius: 7,
	  corners: 0,
	  rotate: 0,
	  color: '#666',
	  speed: 1,
	  trail: 60,
	  shadow: false,
	  hwaccel: false,
	  className: 'ncspinner',
	  zIndex: 2e9,
	  top: 'auto',
	  left: 'auto'
	};

	var spinnerDiv = document.createElement('div');

	spinnerDiv.id = 'ncspinner';
	spinnerDiv.style.width = spinnerOpts.radius * 2 + 'px';
	spinnerDiv.style.height = spinnerOpts.radius * 2 + 'px';
	spinnerDiv.style.position = 'absolute';
	spinnerDiv.style.left = '50%';
	spinnerDiv.style.top = '50%';

	var spinner = new Spinner(spinnerOpts).spin(spinnerDiv);

	var appendSpinner = function() {
		document.body.appendChild(spinnerDiv);
	}

	var bodyReadyInterval = setInterval(function() {
		if(document.body) {
			clearInterval(bodyReadyInterval);
			appendSpinner();
		}
	}, 20);

	function setCookie(name, value, expirySeconds) {
		var exdate = null;
		if(expirySeconds) {
			exdate = new Date();
			exdate.setTime(exdate.getTime() + Math.round(expirySeconds * 1000));
		}
		var value = escape(value) + '; path=/;' + ((exdate == null) ? "" : " expires=" + exdate.toUTCString() + ";");
		document.cookie = name + "=" + value;
	}

	function getCookie(name) {
	    var i, x, y, ARRcookies = document.cookie.split(";");
	    for(i = 0; i < ARRcookies.length; i++) {
		x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
		y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
		x = x.replace(/^\s+|\s+$/g, "");
		if(x == name) {
		    return unescape(y);
		}
	    }
	}

	var _getHTTPReqObject = function() {
		var xmlhttp = null;
		if(NCOMBO_IE) {
			try {
				xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
			} catch (exceptionA) {
				try {
					xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
				} catch (exceptionB) {
					xmlhttp = null;
				}
			}
		}
		if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
			try {
				xmlhttp = new XMLHttpRequest();
			} catch (e) {
				xmlhttp = null;
			}
		}
		if(!xmlhttp) {
			throw "Could not instantiate XMLHttpRequest";
		}
		return xmlhttp;
	}

	var ajax = function(settings) {
		var type;
		if(settings.type) {
			type = settings.type;
		} else {
			type = "GET";
		}

		var xmlhttp = _getHTTPReqObject();
		xmlhttp.open(type, settings.url, true);
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4) {
				if(xmlhttp.status == 200) {
					if(settings.success) {
						settings.success(xmlhttp.responseText);
					}
				} else {
					if(settings.error) {
						settings.error(xmlhttp.statusText);
					} else {
						throw "Failed to load resource: " + url;
					}
				}
			}
		}
		xmlhttp.send(null);
	}

	var ncCacheCookieName = 'nccached';
	var ncCacheCookie = getCookie(ncCacheCookieName);

	NCOMBO_IS_FRESH = (ncCacheCookie && ncCacheCookie > 0) ? false : true;
	setCookie(ncCacheCookieName, '1', 31536000);

	NCOMBO_SESSION_MANAGER = new (function() {
		var self = this;
		var timeout = NCOMBO_TIMEOUT;
		var sessionID = null;
	
		self._setCookies = function(soid) {
			var ssid = getCookie('ncssid');
			if(!ssid) {
				ssid = soid;
				setCookie('ncssid', ssid);
			}
			setCookie('ncsoid', soid);
			return ssid;
		}
		
		self.getTimeout = function(millis) {
			return timeout;
		}
		
		self.setAuthData = function(data) {
			setCookie('ncauth', io.JSON.stringify(data));
		}
		
		self.clearAuthData = function() {
			setCookie('ncauth', '');
		}
		
		self.getAuthData = function() {
			var authCookie = getCookie('ncauth');
			if(authCookie) {
				return io.JSON.parse(authCookie);
			}
			return null;
		}
		
		self.startSession = function() {
			var timeoutCallback = null;
			var data = null;
			var callback = null;
			if(arguments[0] instanceof Function) {
				callback = arguments[0];
			} else {
				data = arguments[0];
				callback = arguments[1];
			}
		      
			var url = '{{endpoint}}';
			
			var options = {'force new connection': true, 'sync disconnect on unload': true};
			
			if(NCOMBO_SOCKET && (NCOMBO_SOCKET.socket.connected || NCOMBO_SOCKET.socket.connecting)) {
				NCOMBO_SOCKET.removeAllListeners();
				NCOMBO_SOCKET.disconnect();
			}
			
			if(data) {
				options.query = 'data=' + io.JSON.stringify(data);
			}
			
			NCOMBO_SOCKET = io.connect(url, options);
		      
			if(callback) {
				var errorCallback = function(err) {
					if(err != 'client not handshaken') {
						clearTimeout(timeoutCallback);
						NCOMBO_SOCKET.removeListener('connect', connectCallback);
						NCOMBO_SOCKET.removeListener('error', errorCallback);
						callback(err);
					}
				}
				
				var connectCallback = function() {
					clearTimeout(timeoutCallback);
					self.setAuthData(data);
					NCOMBO_SOCKET.removeListener('connect', connectCallback);
					NCOMBO_SOCKET.removeListener('error', errorCallback);
					sessionID = self._setCookies(NCOMBO_SOCKET.socket.sessionid);
				
					callback(null, sessionID);
				}
			
				if(timeout > 0) {
					timeoutCallback = setTimeout(function() {
						NCOMBO_SOCKET.removeListener('connect', connectCallback);
						NCOMBO_SOCKET.removeListener('error', errorCallback);
						callback('Error - Session initiation attempt timed out')
					}, timeout);
				}
				
				NCOMBO_SOCKET.on('error', errorCallback);
				NCOMBO_SOCKET.on('connect', connectCallback);
			}
		}
		
		self.endSession = function(callback) {
			self.clearAuthData();
			var timeoutCallback = null;
			if(callback) {
				var disconnectCallback = function() {
					clearTimeout(timeoutCallback);
					callback(null);
				}
			
				if(timeout > 0) {
					timeoutCallback = setTimeout(function() {
						NCOMBO_SOCKET.removeListener('disconnect', disconnectCallback);
						callback('Error - Disconnection attempt timed out')
					}, timeout);
				}
			
				NCOMBO_SOCKET.on('disconnect', disconnectCallback);
			}
			NCOMBO_SOCKET.disconnect();
		}
	})();

	var globalEval = function(src) {
		if(window.execScript) {
			window.execScript(src);
		} else {
			(function() {
				window.eval.call(window, src);
			})();
		}
	}
	
	var ncBegin = function() {
		ajax({
			url: smartCacheManager.setURLCacheVersion('/~startscript'),
			success: function(loaderCode) {				
				var startLoader = function() {
					if(document.getElementById('ncspinner')) {
						document.body.removeChild(spinnerDiv);
						globalEval(loaderCode);
					} else {
						setTimeout(startLoader, 20);
					}
				}

				if(ncScriptLoaded) {
					startLoader();
				} else {
					ncOnScriptLoad(loadScript, function() {
						startLoader();
					});
				}
			}
		});
	}
	
	if(NCOMBO_AUTO_SESSION) {
		var handshakeErrorHandler = function(err) {
			if(err != 'client not handshaken') {
				NCOMBO_SOCKET.removeListener('error', handshakeErrorHandler);
				NCOMBO_SOCKET.removeListener('connect', connectHandler);
			
				var head = document.getElementsByTagName('head');
				if(head) {
					head = head[0];
				}
		
				var limitScript = document.createElement('script');
				limitScript.type = 'text/javascript';
				limitScript.src = smartCacheManager.setURLCacheVersion(NCOMBO_FRAMEWORK_CLIENT_URL + 'scripts/failedconnection.js');
				head.appendChild(limitScript);
			}
		}
	
		var connectHandler = function() {
			NCOMBO_SOCKET.removeListener('error', handshakeErrorHandler);
			NCOMBO_SOCKET.removeListener('connect', connectHandler);
			clearTimeout(timeoutCallback);	
			NCOMBO_SESSION_MANAGER._setCookies(NCOMBO_SOCKET.socket.sessionid);
			ncBegin();
		}
	
		var timeoutCallback = null;
	
		NCOMBO_SOCKET = io.connect('{{endpoint}}');
		
		if(NCOMBO_TIMEOUT > 0) {
			timeoutCallback = setTimeout(function() {
				handshakeErrorHandler('Error - Session initiation attempt timed out');
			}, NCOMBO_TIMEOUT);
		}
		
		NCOMBO_SOCKET.on('error', handshakeErrorHandler);
		NCOMBO_SOCKET.on('connect', connectHandler);
	} else {
		ncBegin();
	}
})();