// ==UserScript==
// @name         AcFun 小视频 - PC 站抖音式竖滑页
// @namespace    https://github.com/name-xxl/acfun-svfeed
// @version      0.9.74
// @description  在 www.acfun.cn 顶部导航加入「小视频」入口，打开全屏抖音式竖滑信息流；支持小视频(meow)与 APP 首页推荐(selection/feed)双内容源、弹幕、清晰度切换
// @author       name-xxl
// @homepageURL  https://github.com/name-xxl/acfun-svfeed
// @supportURL   https://github.com/name-xxl/acfun-svfeed/issues
// @updateURL    https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed.user.js
// @downloadURL  https://github.com/name-xxl/acfun-svfeed/releases/latest/download/acfun-svfeed.user.js
// @match        https://www.acfun.cn/*
// @match        https://message.acfun.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      m.acfun.cn
// @connect      www.acfun.cn
// @connect      api-new.app.acfun.cn
// @connect      upload.kuaishouzt.com
// @connect      message.acfun.cn
// @connect      id.app.acfun.cn
// @connect      static.yximgs.com
// @connect      registry.npmmirror.com
// @connect      cdn.jsdelivr.net
// @connect      github.com
// @run-at       document-end
// @noframes
// @license      MIT
// ==/UserScript==
// ==== vendored hls.js@1.5.20（构建时内嵌，勿手改；npm i hls.js 后重新构建） ====
!function e(t){var r,i;r=this,i=function(){"use strict";function r(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);t&&(i=i.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,i)}return r}function i(e){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?r(Object(i),!0).forEach((function(t){var r,a,s;r=e,a=t,s=i[t],(a=n(a))in r?Object.defineProperty(r,a,{value:s,enumerable:!0,configurable:!0,writable:!0}):r[a]=s})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(i)):r(Object(i)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(i,t))}))}return e}function n(e){var t=function(e,t){if("object"!=typeof e||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,t||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function a(e,t){for(var r=0;r<t.length;r++){var i=t[r];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,n(i.key),i)}}function s(e,t,r){return t&&a(e.prototype,t),r&&a(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function o(){return o=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(e[i]=r[i])}return e},o.apply(this,arguments)}function l(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,h(e,t)}function u(e){return u=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},u(e)}function h(e,t){return h=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},h(e,t)}function d(e,t,r){return d=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}()?Reflect.construct.bind():function(e,t,r){var i=[null];i.push.apply(i,t);var n=new(Function.bind.apply(e,i));return r&&h(n,r.prototype),n},d.apply(null,arguments)}function c(e){var t="function"==typeof Map?new Map:void 0;return c=function(e){if(null===e||!function(e){try{return-1!==Function.toString.call(e).indexOf("[native code]")}catch(t){return"function"==typeof e}}(e))return e;if("function"!=typeof e)throw new TypeError("Super expression must either be null or a function");if(void 0!==t){if(t.has(e))return t.get(e);t.set(e,r)}function r(){return d(e,arguments,u(this).constructor)}return r.prototype=Object.create(e.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),h(r,e)},c(e)}function f(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,i=new Array(t);r<t;r++)i[r]=e[r];return i}function g(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(r)return(r=r.call(e)).next.bind(r);if(Array.isArray(e)||(r=function(e,t){if(e){if("string"==typeof e)return f(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?f(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var i=0;return function(){return i>=e.length?{done:!0}:{done:!1,value:e[i++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function v(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var m={exports:{}};!function(e,t){var r,i,n,a,s;r=/^(?=((?:[a-zA-Z0-9+\-.]+:)?))\1(?=((?:\/\/[^\/?#]*)?))\2(?=((?:(?:[^?#\/]*\/)*[^;?#\/]*)?))\3((?:;[^?#]*)?)(\?[^#]*)?(#[^]*)?$/,i=/^(?=([^\/?#]*))\1([^]*)$/,n=/(?:\/|^)\.(?=\/)/g,a=/(?:\/|^)\.\.\/(?!\.\.\/)[^\/]*(?=\/)/g,s={buildAbsoluteURL:function(e,t,r){if(r=r||{},e=e.trim(),!(t=t.trim())){if(!r.alwaysNormalize)return e;var n=s.parseURL(e);if(!n)throw new Error("Error trying to parse base URL.");return n.path=s.normalizePath(n.path),s.buildURLFromParts(n)}var a=s.parseURL(t);if(!a)throw new Error("Error trying to parse relative URL.");if(a.scheme)return r.alwaysNormalize?(a.path=s.normalizePath(a.path),s.buildURLFromParts(a)):t;var o=s.parseURL(e);if(!o)throw new Error("Error trying to parse base URL.");if(!o.netLoc&&o.path&&"/"!==o.path[0]){var l=i.exec(o.path);o.netLoc=l[1],o.path=l[2]}o.netLoc&&!o.path&&(o.path="/");var u={scheme:o.scheme,netLoc:a.netLoc,path:null,params:a.params,query:a.query,fragment:a.fragment};if(!a.netLoc&&(u.netLoc=o.netLoc,"/"!==a.path[0]))if(a.path){var h=o.path,d=h.substring(0,h.lastIndexOf("/")+1)+a.path;u.path=s.normalizePath(d)}else u.path=o.path,a.params||(u.params=o.params,a.query||(u.query=o.query));return null===u.path&&(u.path=r.alwaysNormalize?s.normalizePath(a.path):a.path),s.buildURLFromParts(u)},parseURL:function(e){var t=r.exec(e);return t?{scheme:t[1]||"",netLoc:t[2]||"",path:t[3]||"",params:t[4]||"",query:t[5]||"",fragment:t[6]||""}:null},normalizePath:function(e){for(e=e.split("").reverse().join("").replace(n,"");e.length!==(e=e.replace(a,"")).length;);return e.split("").reverse().join("")},buildURLFromParts:function(e){return e.scheme+e.netLoc+e.path+e.params+e.query+e.fragment}},e.exports=s}(m);var p=m.exports,y=Number.isFinite||function(e){return"number"==typeof e&&isFinite(e)},E=Number.isSafeInteger||function(e){return"number"==typeof e&&Math.abs(e)<=T},T=Number.MAX_SAFE_INTEGER||9007199254740991,S=function(e){return e.MEDIA_ATTACHING="hlsMediaAttaching",e.MEDIA_ATTACHED="hlsMediaAttached",e.MEDIA_DETACHING="hlsMediaDetaching",e.MEDIA_DETACHED="hlsMediaDetached",e.BUFFER_RESET="hlsBufferReset",e.BUFFER_CODECS="hlsBufferCodecs",e.BUFFER_CREATED="hlsBufferCreated",e.BUFFER_APPENDING="hlsBufferAppending",e.BUFFER_APPENDED="hlsBufferAppended",e.BUFFER_EOS="hlsBufferEos",e.BUFFER_FLUSHING="hlsBufferFlushing",e.BUFFER_FLUSHED="hlsBufferFlushed",e.MANIFEST_LOADING="hlsManifestLoading",e.MANIFEST_LOADED="hlsManifestLoaded",e.MANIFEST_PARSED="hlsManifestParsed",e.LEVEL_SWITCHING="hlsLevelSwitching",e.LEVEL_SWITCHED="hlsLevelSwitched",e.LEVEL_LOADING="hlsLevelLoading",e.LEVEL_LOADED="hlsLevelLoaded",e.LEVEL_UPDATED="hlsLevelUpdated",e.LEVEL_PTS_UPDATED="hlsLevelPtsUpdated",e.LEVELS_UPDATED="hlsLevelsUpdated",e.AUDIO_TRACKS_UPDATED="hlsAudioTracksUpdated",e.AUDIO_TRACK_SWITCHING="hlsAudioTrackSwitching",e.AUDIO_TRACK_SWITCHED="hlsAudioTrackSwitched",e.AUDIO_TRACK_LOADING="hlsAudioTrackLoading",e.AUDIO_TRACK_LOADED="hlsAudioTrackLoaded",e.SUBTITLE_TRACKS_UPDATED="hlsSubtitleTracksUpdated",e.SUBTITLE_TRACKS_CLEARED="hlsSubtitleTracksCleared",e.SUBTITLE_TRACK_SWITCH="hlsSubtitleTrackSwitch",e.SUBTITLE_TRACK_LOADING="hlsSubtitleTrackLoading",e.SUBTITLE_TRACK_LOADED="hlsSubtitleTrackLoaded",e.SUBTITLE_FRAG_PROCESSED="hlsSubtitleFragProcessed",e.CUES_PARSED="hlsCuesParsed",e.NON_NATIVE_TEXT_TRACKS_FOUND="hlsNonNativeTextTracksFound",e.INIT_PTS_FOUND="hlsInitPtsFound",e.FRAG_LOADING="hlsFragLoading",e.FRAG_LOAD_EMERGENCY_ABORTED="hlsFragLoadEmergencyAborted",e.FRAG_LOADED="hlsFragLoaded",e.FRAG_DECRYPTED="hlsFragDecrypted",e.FRAG_PARSING_INIT_SEGMENT="hlsFragParsingInitSegment",e.FRAG_PARSING_USERDATA="hlsFragParsingUserdata",e.FRAG_PARSING_METADATA="hlsFragParsingMetadata",e.FRAG_PARSED="hlsFragParsed",e.FRAG_BUFFERED="hlsFragBuffered",e.FRAG_CHANGED="hlsFragChanged",e.FPS_DROP="hlsFpsDrop",e.FPS_DROP_LEVEL_CAPPING="hlsFpsDropLevelCapping",e.MAX_AUTO_LEVEL_UPDATED="hlsMaxAutoLevelUpdated",e.ERROR="hlsError",e.DESTROYING="hlsDestroying",e.KEY_LOADING="hlsKeyLoading",e.KEY_LOADED="hlsKeyLoaded",e.LIVE_BACK_BUFFER_REACHED="hlsLiveBackBufferReached",e.BACK_BUFFER_REACHED="hlsBackBufferReached",e.STEERING_MANIFEST_LOADED="hlsSteeringManifestLoaded",e}({}),L=function(e){return e.NETWORK_ERROR="networkError",e.MEDIA_ERROR="mediaError",e.KEY_SYSTEM_ERROR="keySystemError",e.MUX_ERROR="muxError",e.OTHER_ERROR="otherError",e}({}),A=function(e){return e.KEY_SYSTEM_NO_KEYS="keySystemNoKeys",e.KEY_SYSTEM_NO_ACCESS="keySystemNoAccess",e.KEY_SYSTEM_NO_SESSION="keySystemNoSession",e.KEY_SYSTEM_NO_CONFIGURED_LICENSE="keySystemNoConfiguredLicense",e.KEY_SYSTEM_LICENSE_REQUEST_FAILED="keySystemLicenseRequestFailed",e.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED="keySystemServerCertificateRequestFailed",e.KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED="keySystemServerCertificateUpdateFailed",e.KEY_SYSTEM_SESSION_UPDATE_FAILED="keySystemSessionUpdateFailed",e.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED="keySystemStatusOutputRestricted",e.KEY_SYSTEM_STATUS_INTERNAL_ERROR="keySystemStatusInternalError",e.MANIFEST_LOAD_ERROR="manifestLoadError",e.MANIFEST_LOAD_TIMEOUT="manifestLoadTimeOut",e.MANIFEST_PARSING_ERROR="manifestParsingError",e.MANIFEST_INCOMPATIBLE_CODECS_ERROR="manifestIncompatibleCodecsError",e.LEVEL_EMPTY_ERROR="levelEmptyError",e.LEVEL_LOAD_ERROR="levelLoadError",e.LEVEL_LOAD_TIMEOUT="levelLoadTimeOut",e.LEVEL_PARSING_ERROR="levelParsingError",e.LEVEL_SWITCH_ERROR="levelSwitchError",e.AUDIO_TRACK_LOAD_ERROR="audioTrackLoadError",e.AUDIO_TRACK_LOAD_TIMEOUT="audioTrackLoadTimeOut",e.SUBTITLE_LOAD_ERROR="subtitleTrackLoadError",e.SUBTITLE_TRACK_LOAD_TIMEOUT="subtitleTrackLoadTimeOut",e.FRAG_LOAD_ERROR="fragLoadError",e.FRAG_LOAD_TIMEOUT="fragLoadTimeOut",e.FRAG_DECRYPT_ERROR="fragDecryptError",e.FRAG_PARSING_ERROR="fragParsingError",e.FRAG_GAP="fragGap",e.REMUX_ALLOC_ERROR="remuxAllocError",e.KEY_LOAD_ERROR="keyLoadError",e.KEY_LOAD_TIMEOUT="keyLoadTimeOut",e.BUFFER_ADD_CODEC_ERROR="bufferAddCodecError",e.BUFFER_INCOMPATIBLE_CODECS_ERROR="bufferIncompatibleCodecsError",e.BUFFER_APPEND_ERROR="bufferAppendError",e.BUFFER_APPENDING_ERROR="bufferAppendingError",e.BUFFER_STALLED_ERROR="bufferStalledError",e.BUFFER_FULL_ERROR="bufferFullError",e.BUFFER_SEEK_OVER_HOLE="bufferSeekOverHole",e.BUFFER_NUDGE_ON_STALL="bufferNudgeOnStall",e.INTERNAL_EXCEPTION="internalException",e.INTERNAL_ABORTED="aborted",e.UNKNOWN="unknown",e}({}),R=function(){},k={trace:R,debug:R,log:R,warn:R,info:R,error:R},b=k;function D(e){for(var t=arguments.length,r=new Array(t>1?t-1:0),i=1;i<t;i++)r[i-1]=arguments[i];r.forEach((function(t){b[t]=e[t]?e[t].bind(e):function(e){var t=self.console[e];return t?t.bind(self.console,"["+e+"] >"):R}(t)}))}function I(e,t){if("object"==typeof console&&!0===e||"object"==typeof e){D(e,"debug","log","info","warn","error");try{b.log('Debug logs enabled for "'+t+'" in hls.js version 1.5.20')}catch(e){b=k}}else b=k}var w=b,C=/^(\d+)x(\d+)$/,_=/(.+?)=(".*?"|.*?)(?:,|$)/g,x=function(){function e(t){"string"==typeof t&&(t=e.parseAttrList(t)),o(this,t)}var t=e.prototype;return t.decimalInteger=function(e){var t=parseInt(this[e],10);return t>Number.MAX_SAFE_INTEGER?1/0:t},t.hexadecimalInteger=function(e){if(this[e]){var t=(this[e]||"0x").slice(2);t=(1&t.length?"0":"")+t;for(var r=new Uint8Array(t.length/2),i=0;i<t.length/2;i++)r[i]=parseInt(t.slice(2*i,2*i+2),16);return r}return null},t.hexadecimalIntegerAsNumber=function(e){var t=parseInt(this[e],16);return t>Number.MAX_SAFE_INTEGER?1/0:t},t.decimalFloatingPoint=function(e){return parseFloat(this[e])},t.optionalFloat=function(e,t){var r=this[e];return r?parseFloat(r):t},t.enumeratedString=function(e){return this[e]},t.bool=function(e){return"YES"===this[e]},t.decimalResolution=function(e){var t=C.exec(this[e]);if(null!==t)return{width:parseInt(t[1],10),height:parseInt(t[2],10)}},e.parseAttrList=function(e){var t,r={};for(_.lastIndex=0;null!==(t=_.exec(e));){var i=t[2];0===i.indexOf('"')&&i.lastIndexOf('"')===i.length-1&&(i=i.slice(1,-1)),r[t[1].trim()]=i}return r},s(e,[{key:"clientAttrs",get:function(){return Object.keys(this).filter((function(e){return"X-"===e.substring(0,2)}))}}]),e}();function P(e){return"SCTE35-OUT"===e||"SCTE35-IN"===e}var F=function(){function e(e,t){if(this.attr=void 0,this._startDate=void 0,this._endDate=void 0,this._badValueForSameId=void 0,t){var r=t.attr;for(var i in r)if(Object.prototype.hasOwnProperty.call(e,i)&&e[i]!==r[i]){w.warn('DATERANGE tag attribute: "'+i+'" does not match for tags with ID: "'+e.ID+'"'),this._badValueForSameId=i;break}e=o(new x({}),r,e)}if(this.attr=e,this._startDate=new Date(e["START-DATE"]),"END-DATE"in this.attr){var n=new Date(this.attr["END-DATE"]);y(n.getTime())&&(this._endDate=n)}}return s(e,[{key:"id",get:function(){return this.attr.ID}},{key:"class",get:function(){return this.attr.CLASS}},{key:"startDate",get:function(){return this._startDate}},{key:"endDate",get:function(){if(this._endDate)return this._endDate;var e=this.duration;return null!==e?new Date(this._startDate.getTime()+1e3*e):null}},{key:"duration",get:function(){if("DURATION"in this.attr){var e=this.attr.decimalFloatingPoint("DURATION");if(y(e))return e}else if(this._endDate)return(this._endDate.getTime()-this._startDate.getTime())/1e3;return null}},{key:"plannedDuration",get:function(){return"PLANNED-DURATION"in this.attr?this.attr.decimalFloatingPoint("PLANNED-DURATION"):null}},{key:"endOnNext",get:function(){return this.attr.bool("END-ON-NEXT")}},{key:"isValid",get:function(){return!!this.id&&!this._badValueForSameId&&y(this.startDate.getTime())&&(null===this.duration||this.duration>=0)&&(!this.endOnNext||!!this.class)}}]),e}(),M=function(){this.aborted=!1,this.loaded=0,this.retry=0,this.total=0,this.chunkCount=0,this.bwEstimate=0,this.loading={start:0,first:0,end:0},this.parsing={start:0,end:0},this.buffering={start:0,first:0,end:0}},O="audio",N="video",U="audiovideo",B=function(){function e(e){var t;this._byteRange=null,this._url=null,this.baseurl=void 0,this.relurl=void 0,this.elementaryStreams=((t={})[O]=null,t[N]=null,t[U]=null,t),this.baseurl=e}return e.prototype.setByteRange=function(e,t){var r,i=e.split("@",2);r=1===i.length?(null==t?void 0:t.byteRangeEndOffset)||0:parseInt(i[1]),this._byteRange=[r,parseInt(i[0])+r]},s(e,[{key:"byteRange",get:function(){return this._byteRange?this._byteRange:[]}},{key:"byteRangeStartOffset",get:function(){return this.byteRange[0]}},{key:"byteRangeEndOffset",get:function(){return this.byteRange[1]}},{key:"url",get:function(){return!this._url&&this.baseurl&&this.relurl&&(this._url=p.buildAbsoluteURL(this.baseurl,this.relurl,{alwaysNormalize:!0})),this._url||""},set:function(e){this._url=e}}]),e}(),G=function(e){function t(t,r){var i;return(i=e.call(this,r)||this)._decryptdata=null,i.rawProgramDateTime=null,i.programDateTime=null,i.tagList=[],i.duration=0,i.sn=0,i.levelkeys=void 0,i.type=void 0,i.loader=null,i.keyLoader=null,i.level=-1,i.cc=0,i.startPTS=void 0,i.endPTS=void 0,i.startDTS=void 0,i.endDTS=void 0,i.start=0,i.deltaPTS=void 0,i.maxStartPTS=void 0,i.minEndPTS=void 0,i.stats=new M,i.data=void 0,i.bitrateTest=!1,i.title=null,i.initSegment=null,i.endList=void 0,i.gap=void 0,i.urlId=0,i.type=t,i}l(t,e);var r=t.prototype;return r.setKeyFormat=function(e){if(this.levelkeys){var t=this.levelkeys[e];t&&!this._decryptdata&&(this._decryptdata=t.getDecryptData(this.sn))}},r.abortRequests=function(){var e,t;null==(e=this.loader)||e.abort(),null==(t=this.keyLoader)||t.abort()},r.setElementaryStreamInfo=function(e,t,r,i,n,a){void 0===a&&(a=!1);var s=this.elementaryStreams,o=s[e];o?(o.startPTS=Math.min(o.startPTS,t),o.endPTS=Math.max(o.endPTS,r),o.startDTS=Math.min(o.startDTS,i),o.endDTS=Math.max(o.endDTS,n)):s[e]={startPTS:t,endPTS:r,startDTS:i,endDTS:n,partial:a}},r.clearElementaryStreamInfo=function(){var e=this.elementaryStreams;e[O]=null,e[N]=null,e[U]=null},s(t,[{key:"decryptdata",get:function(){if(!this.levelkeys&&!this._decryptdata)return null;if(!this._decryptdata&&this.levelkeys&&!this.levelkeys.NONE){var e=this.levelkeys.identity;if(e)this._decryptdata=e.getDecryptData(this.sn);else{var t=Object.keys(this.levelkeys);if(1===t.length)return this._decryptdata=this.levelkeys[t[0]].getDecryptData(this.sn)}}return this._decryptdata}},{key:"end",get:function(){return this.start+this.duration}},{key:"endProgramDateTime",get:function(){if(null===this.programDateTime)return null;if(!y(this.programDateTime))return null;var e=y(this.duration)?this.duration:0;return this.programDateTime+1e3*e}},{key:"encrypted",get:function(){var e;if(null!=(e=this._decryptdata)&&e.encrypted)return!0;if(this.levelkeys){var t=Object.keys(this.levelkeys),r=t.length;if(r>1||1===r&&this.levelkeys[t[0]].encrypted)return!0}return!1}}]),t}(B),K=function(e){function t(t,r,i,n,a){var s;(s=e.call(this,i)||this).fragOffset=0,s.duration=0,s.gap=!1,s.independent=!1,s.relurl=void 0,s.fragment=void 0,s.index=void 0,s.stats=new M,s.duration=t.decimalFloatingPoint("DURATION"),s.gap=t.bool("GAP"),s.independent=t.bool("INDEPENDENT"),s.relurl=t.enumeratedString("URI"),s.fragment=r,s.index=n;var o=t.enumeratedString("BYTERANGE");return o&&s.setByteRange(o,a),a&&(s.fragOffset=a.fragOffset+a.duration),s}return l(t,e),s(t,[{key:"start",get:function(){return this.fragment.start+this.fragOffset}},{key:"end",get:function(){return this.start+this.duration}},{key:"loaded",get:function(){var e=this.elementaryStreams;return!!(e.audio||e.video||e.audiovideo)}}]),t}(B),H=function(){function e(e){this.PTSKnown=!1,this.alignedSliding=!1,this.averagetargetduration=void 0,this.endCC=0,this.endSN=0,this.fragments=void 0,this.fragmentHint=void 0,this.partList=null,this.dateRanges=void 0,this.live=!0,this.ageHeader=0,this.advancedDateTime=void 0,this.updated=!0,this.advanced=!0,this.availabilityDelay=void 0,this.misses=0,this.startCC=0,this.startSN=0,this.startTimeOffset=null,this.targetduration=0,this.totalduration=0,this.type=null,this.url=void 0,this.m3u8="",this.version=null,this.canBlockReload=!1,this.canSkipUntil=0,this.canSkipDateRanges=!1,this.skippedSegments=0,this.recentlyRemovedDateranges=void 0,this.partHoldBack=0,this.holdBack=0,this.partTarget=0,this.preloadHint=void 0,this.renditionReports=void 0,this.tuneInGoal=0,this.deltaUpdateFailed=void 0,this.driftStartTime=0,this.driftEndTime=0,this.driftStart=0,this.driftEnd=0,this.encryptedFragments=void 0,this.playlistParsingError=null,this.variableList=null,this.hasVariableRefs=!1,this.fragments=[],this.encryptedFragments=[],this.dateRanges={},this.url=e}return e.prototype.reloaded=function(e){if(!e)return this.advanced=!0,void(this.updated=!0);var t=this.lastPartSn-e.lastPartSn,r=this.lastPartIndex-e.lastPartIndex;this.updated=this.endSN!==e.endSN||!!r||!!t||!this.live,this.advanced=this.endSN>e.endSN||t>0||0===t&&r>0,this.updated||this.advanced?this.misses=Math.floor(.6*e.misses):this.misses=e.misses+1,this.availabilityDelay=e.availabilityDelay},s(e,[{key:"hasProgramDateTime",get:function(){return!!this.fragments.length&&y(this.fragments[this.fragments.length-1].programDateTime)}},{key:"levelTargetDuration",get:function(){return this.averagetargetduration||this.targetduration||10}},{key:"drift",get:function(){var e=this.driftEndTime-this.driftStartTime;return e>0?1e3*(this.driftEnd-this.driftStart)/e:1}},{key:"edge",get:function(){return this.partEnd||this.fragmentEnd}},{key:"partEnd",get:function(){var e;return null!=(e=this.partList)&&e.length?this.partList[this.partList.length-1].end:this.fragmentEnd}},{key:"fragmentEnd",get:function(){var e;return null!=(e=this.fragments)&&e.length?this.fragments[this.fragments.length-1].end:0}},{key:"age",get:function(){return this.advancedDateTime?Math.max(Date.now()-this.advancedDateTime,0)/1e3:0}},{key:"lastPartIndex",get:function(){var e;return null!=(e=this.partList)&&e.length?this.partList[this.partList.length-1].index:-1}},{key:"lastPartSn",get:function(){var e;return null!=(e=this.partList)&&e.length?this.partList[this.partList.length-1].fragment.sn:this.endSN}}]),e}();function V(e){return Uint8Array.from(atob(e),(function(e){return e.charCodeAt(0)}))}function Y(e){var t,r,i=e.split(":"),n=null;if("data"===i[0]&&2===i.length){var a=i[1].split(";"),s=a[a.length-1].split(",");if(2===s.length){var o="base64"===s[0],l=s[1];o?(a.splice(-1,1),n=V(l)):(t=W(l).subarray(0,16),(r=new Uint8Array(16)).set(t,16-t.length),n=r)}}return n}function W(e){return Uint8Array.from(unescape(encodeURIComponent(e)),(function(e){return e.charCodeAt(0)}))}var j="undefined"!=typeof self?self:void 0,q={CLEARKEY:"org.w3.clearkey",FAIRPLAY:"com.apple.fps",PLAYREADY:"com.microsoft.playready",WIDEVINE:"com.widevine.alpha"},X="org.w3.clearkey",z="com.apple.streamingkeydelivery",Q="com.microsoft.playready",J="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";function $(e){switch(e){case z:return q.FAIRPLAY;case Q:return q.PLAYREADY;case J:return q.WIDEVINE;case X:return q.CLEARKEY}}var Z="1077efecc0b24d02ace33c1e52e2fb4b",ee="e2719d58a985b3c9781ab030af78d30e",te="9a04f07998404286ab92e65be0885f95",re="edef8ba979d64acea3c827dcd51d21ed";function ie(e){return e===re?q.WIDEVINE:e===te?q.PLAYREADY:e===Z||e===ee?q.CLEARKEY:void 0}function ne(e){switch(e){case q.FAIRPLAY:return z;case q.PLAYREADY:return Q;case q.WIDEVINE:return J;case q.CLEARKEY:return X}}function ae(e){var t=e.drmSystems,r=e.widevineLicenseUrl,i=t?[q.FAIRPLAY,q.WIDEVINE,q.PLAYREADY,q.CLEARKEY].filter((function(e){return!!t[e]})):[];return!i[q.WIDEVINE]&&r&&i.push(q.WIDEVINE),i}var se,oe=null!=j&&null!=(se=j.navigator)&&se.requestMediaKeySystemAccess?self.navigator.requestMediaKeySystemAccess.bind(self.navigator):null;function le(e){var t=new Uint16Array(e.buffer,e.byteOffset,e.byteLength/2),r=String.fromCharCode.apply(null,Array.from(t)),i=r.substring(r.indexOf("<"),r.length),n=(new DOMParser).parseFromString(i,"text/xml").getElementsByTagName("KID")[0];if(n){var a=n.childNodes[0]?n.childNodes[0].nodeValue:n.getAttribute("VALUE");if(a){var s=V(a).subarray(0,16);return function(e){var t=function(e,t,r){var i=e[t];e[t]=e[r],e[r]=i};t(e,0,3),t(e,1,2),t(e,4,5),t(e,6,7)}(s),s}}return null}function ue(e,t,r){return Uint8Array.prototype.slice?e.slice(t,r):new Uint8Array(Array.prototype.slice.call(e,t,r))}var he,de=function(e,t){return t+10<=e.length&&73===e[t]&&68===e[t+1]&&51===e[t+2]&&e[t+3]<255&&e[t+4]<255&&e[t+6]<128&&e[t+7]<128&&e[t+8]<128&&e[t+9]<128},ce=function(e,t){return t+10<=e.length&&51===e[t]&&68===e[t+1]&&73===e[t+2]&&e[t+3]<255&&e[t+4]<255&&e[t+6]<128&&e[t+7]<128&&e[t+8]<128&&e[t+9]<128},fe=function(e,t){for(var r=t,i=0;de(e,t);)i+=10,i+=ge(e,t+6),ce(e,t+10)&&(i+=10),t+=i;if(i>0)return e.subarray(r,r+i)},ge=function(e,t){var r=0;return r=(127&e[t])<<21,r|=(127&e[t+1])<<14,r|=(127&e[t+2])<<7,r|=127&e[t+3]},ve=function(e,t){return de(e,t)&&ge(e,t+6)+10<=e.length-t},me=function(e){for(var t=Ee(e),r=0;r<t.length;r++){var i=t[r];if(pe(i))return Re(i)}},pe=function(e){return e&&"PRIV"===e.key&&"com.apple.streaming.transportStreamTimestamp"===e.info},ye=function(e){var t=String.fromCharCode(e[0],e[1],e[2],e[3]),r=ge(e,4);return{type:t,size:r,data:e.subarray(10,10+r)}},Ee=function(e){for(var t=0,r=[];de(e,t);){for(var i=ge(e,t+6),n=(t+=10)+i;t+8<n;){var a=ye(e.subarray(t)),s=Te(a);s&&r.push(s),t+=a.size+10}ce(e,t)&&(t+=10)}return r},Te=function(e){return"PRIV"===e.type?Se(e):"W"===e.type[0]?Ae(e):Le(e)},Se=function(e){if(!(e.size<2)){var t=ke(e.data,!0),r=new Uint8Array(e.data.subarray(t.length+1));return{key:e.type,info:t,data:r.buffer}}},Le=function(e){if(!(e.size<2)){if("TXXX"===e.type){var t=1,r=ke(e.data.subarray(t),!0);t+=r.length+1;var i=ke(e.data.subarray(t));return{key:e.type,info:r,data:i}}var n=ke(e.data.subarray(1));return{key:e.type,data:n}}},Ae=function(e){if("WXXX"===e.type){if(e.size<2)return;var t=1,r=ke(e.data.subarray(t),!0);t+=r.length+1;var i=ke(e.data.subarray(t));return{key:e.type,info:r,data:i}}var n=ke(e.data);return{key:e.type,data:n}},Re=function(e){if(8===e.data.byteLength){var t=new Uint8Array(e.data),r=1&t[3],i=(t[4]<<23)+(t[5]<<15)+(t[6]<<7)+t[7];return i/=45,r&&(i+=47721858.84),Math.round(i)}},ke=function(e,t){void 0===t&&(t=!1);var r=be();if(r){var i=r.decode(e);if(t){var n=i.indexOf("\0");return-1!==n?i.substring(0,n):i}return i.replace(/\0/g,"")}for(var a,s,o,l=e.length,u="",h=0;h<l;){if(0===(a=e[h++])&&t)return u;if(0!==a&&3!==a)switch(a>>4){case 0:case 1:case 2:case 3:case 4:case 5:case 6:case 7:u+=String.fromCharCode(a);break;case 12:case 13:s=e[h++],u+=String.fromCharCode((31&a)<<6|63&s);break;case 14:s=e[h++],o=e[h++],u+=String.fromCharCode((15&a)<<12|(63&s)<<6|(63&o)<<0)}}return u};function be(){if(!navigator.userAgent.includes("PlayStation 4"))return he||void 0===self.TextDecoder||(he=new self.TextDecoder("utf-8")),he}var De={hexDump:function(e){for(var t="",r=0;r<e.length;r++){var i=e[r].toString(16);i.length<2&&(i="0"+i),t+=i}return t}},Ie=Math.pow(2,32)-1,we=[].push,Ce={video:1,audio:2,id3:3,text:4};function _e(e){return String.fromCharCode.apply(null,e)}function xe(e,t){var r=e[t]<<8|e[t+1];return r<0?65536+r:r}function Pe(e,t){var r=Me(e,t);return r<0?4294967296+r:r}function Fe(e,t){var r=Pe(e,t);return r*=Math.pow(2,32),r+=Pe(e,t+4)}function Me(e,t){return e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3]}function Oe(e,t,r){e[t]=r>>24,e[t+1]=r>>16&255,e[t+2]=r>>8&255,e[t+3]=255&r}function Ne(e,t){var r=[];if(!t.length)return r;for(var i=e.byteLength,n=0;n<i;){var a=Pe(e,n),s=a>1?n+a:i;if(_e(e.subarray(n+4,n+8))===t[0])if(1===t.length)r.push(e.subarray(n+8,s));else{var o=Ne(e.subarray(n+8,s),t.slice(1));o.length&&we.apply(r,o)}n=s}return r}function Ue(e){var t=[],r=e[0],i=8,n=Pe(e,i);i+=4;var a=0,s=0;0===r?(a=Pe(e,i),s=Pe(e,i+4),i+=8):(a=Fe(e,i),s=Fe(e,i+8),i+=16),i+=2;var o=e.length+s,l=xe(e,i);i+=2;for(var u=0;u<l;u++){var h=i,d=Pe(e,h);h+=4;var c=2147483647&d;if(1==(2147483648&d)>>>31)return w.warn("SIDX has hierarchical references (not supported)"),null;var f=Pe(e,h);h+=4,t.push({referenceSize:c,subsegmentDuration:f,info:{duration:f/n,start:o,end:o+c-1}}),o+=c,i=h+=4}return{earliestPresentationTime:a,timescale:n,version:r,referencesCount:l,references:t}}function Be(e){for(var t=[],r=Ne(e,["moov","trak"]),n=0;n<r.length;n++){var a=r[n],s=Ne(a,["tkhd"])[0];if(s){var o=s[0],l=Pe(s,0===o?12:20),u=Ne(a,["mdia","mdhd"])[0];if(u){var h=Pe(u,0===(o=u[0])?12:20),d=Ne(a,["mdia","hdlr"])[0];if(d){var c=_e(d.subarray(8,12)),f={soun:O,vide:N}[c];if(f){var g=Ge(Ne(a,["mdia","minf","stbl","stsd"])[0]);t[l]={timescale:h,type:f},t[f]=i({timescale:h,id:l},g)}}}}}return Ne(e,["moov","mvex","trex"]).forEach((function(e){var r=Pe(e,4),i=t[r];i&&(i.default={duration:Pe(e,12),flags:Pe(e,20)})})),t}function Ge(e){var t=e.subarray(8),r=t.subarray(86),i=_e(t.subarray(4,8)),n=i,a="enca"===i||"encv"===i;if(a){var s=Ne(t,[i])[0];Ne(s.subarray("enca"===i?28:78),["sinf"]).forEach((function(e){var t=Ne(e,["schm"])[0];if(t){var r=_e(t.subarray(4,8));if("cbcs"===r||"cenc"===r){var i=Ne(e,["frma"])[0];i&&(n=_e(i))}}}))}switch(n){case"avc1":case"avc2":case"avc3":case"avc4":var o=Ne(r,["avcC"])[0];n+="."+He(o[1])+He(o[2])+He(o[3]);break;case"mp4a":var l=Ne(t,[i])[0],u=Ne(l.subarray(28),["esds"])[0];if(u&&u.length>12){var h=4;if(3!==u[h++])break;h=Ke(u,h),h+=2;var d=u[h++];if(128&d&&(h+=2),64&d&&(h+=u[h++]),4!==u[h++])break;h=Ke(u,h);var c=u[h++];if(64!==c)break;if(n+="."+He(c),h+=12,5!==u[h++])break;h=Ke(u,h);var f=u[h++],g=(248&f)>>3;31===g&&(g+=1+((7&f)<<3)+((224&u[h])>>5)),n+="."+g}break;case"hvc1":case"hev1":var v=Ne(r,["hvcC"])[0],m=v[1],p=["","A","B","C"][m>>6],y=31&m,E=Pe(v,2),T=(32&m)>>5?"H":"L",S=v[12],L=v.subarray(6,12);n+="."+p+y,n+="."+E.toString(16).toUpperCase(),n+="."+T+S;for(var A="",R=L.length;R--;){var k=L[R];(k||A)&&(A="."+k.toString(16).toUpperCase()+A)}n+=A;break;case"dvh1":case"dvhe":var b=Ne(r,["dvcC"])[0],D=b[2]>>1&127,I=b[2]<<5&32|b[3]>>3&31;n+="."+Ve(D)+"."+Ve(I);break;case"vp09":var w=Ne(r,["vpcC"])[0],C=w[4],_=w[5],x=w[6]>>4&15;n+="."+Ve(C)+"."+Ve(_)+"."+Ve(x);break;case"av01":var P=Ne(r,["av1C"])[0],F=P[1]>>>5,M=31&P[1],O=P[2]>>>7?"H":"M",N=(64&P[2])>>6,U=(32&P[2])>>5,B=2===F&&N?U?12:10:N?10:8,G=(16&P[2])>>4,K=(8&P[2])>>3,H=(4&P[2])>>2,V=3&P[2];n+="."+F+"."+Ve(M)+O+"."+Ve(B)+"."+G+"."+K+H+V+"."+Ve(1)+"."+Ve(1)+"."+Ve(1)+".0"}return{codec:n,encrypted:a}}function Ke(e,t){for(var r=t+5;128&e[t++]&&t<r;);return t}function He(e){return("0"+e.toString(16).toUpperCase()).slice(-2)}function Ve(e){return(e<10?"0":"")+e}function Ye(e){var t=Ne(e,["schm"])[0];if(t){var r=_e(t.subarray(4,8));if("cbcs"===r||"cenc"===r)return Ne(e,["schi","tenc"])[0]}return null}function We(e){var t=Pe(e,0),r=8;1&t&&(r+=4),4&t&&(r+=4);for(var i=0,n=Pe(e,4),a=0;a<n;a++)256&t&&(i+=Pe(e,r),r+=4),512&t&&(r+=4),1024&t&&(r+=4),2048&t&&(r+=4);return i}function je(e,t){var r=new Uint8Array(e.length+t.length);return r.set(e),r.set(t,e.length),r}function qe(e,t){var r=[],i=t.samples,n=t.timescale,a=t.id,s=!1;return Ne(i,["moof"]).map((function(o){var l=o.byteOffset-8;Ne(o,["traf"]).map((function(o){var u=Ne(o,["tfdt"]).map((function(e){var t=e[0],r=Pe(e,4);return 1===t&&(r*=Math.pow(2,32),r+=Pe(e,8)),r/n}))[0];return void 0!==u&&(e=u),Ne(o,["tfhd"]).map((function(u){var h=Pe(u,4),d=16777215&Pe(u,0),c=0,f=0!=(16&d),g=0,v=0!=(32&d),m=8;h===a&&(0!=(1&d)&&(m+=8),0!=(2&d)&&(m+=4),0!=(8&d)&&(c=Pe(u,m),m+=4),f&&(g=Pe(u,m),m+=4),v&&(m+=4),"video"===t.type&&(s=function(e){if(!e)return!1;var t=e.indexOf("."),r=t<0?e:e.substring(0,t);return"hvc1"===r||"hev1"===r||"dvh1"===r||"dvhe"===r}(t.codec)),Ne(o,["trun"]).map((function(a){var o=a[0],u=16777215&Pe(a,0),h=0!=(1&u),d=0,f=0!=(4&u),v=0!=(256&u),m=0,p=0!=(512&u),y=0,E=0!=(1024&u),T=0!=(2048&u),S=0,L=Pe(a,4),A=8;h&&(d=Pe(a,A),A+=4),f&&(A+=4);for(var R=d+l,k=0;k<L;k++){if(v?(m=Pe(a,A),A+=4):m=c,p?(y=Pe(a,A),A+=4):y=g,E&&(A+=4),T&&(S=0===o?Pe(a,A):Me(a,A),A+=4),t.type===N)for(var b=0;b<y;){var D=Pe(i,R);Xe(s,i[R+=4])&&ze(i.subarray(R,R+D),s?2:1,e+S/n,r),R+=D,b+=D+4}e+=m/n}})))}))}))})),r}function Xe(e,t){if(e){var r=t>>1&63;return 39===r||40===r}return 6==(31&t)}function ze(e,t,r,i){var n=Qe(e),a=0;a+=t;for(var s=0,o=0,l=0;a<n.length;){s=0;do{if(a>=n.length)break;s+=l=n[a++]}while(255===l);o=0;do{if(a>=n.length)break;o+=l=n[a++]}while(255===l);var u=n.length-a,h=a;if(o<u)a+=o;else if(o>u){w.error("Malformed SEI payload. "+o+" is too small, only "+u+" bytes left to parse.");break}if(4===s){if(181===n[h++]){var d=xe(n,h);if(h+=2,49===d){var c=Pe(n,h);if(h+=4,1195456820===c){var f=n[h++];if(3===f){var g=n[h++],v=64&g,m=v?2+3*(31&g):0,p=new Uint8Array(m);if(v){p[0]=g;for(var y=1;y<m;y++)p[y]=n[h++]}i.push({type:f,payloadType:s,pts:r,bytes:p})}}}}}else if(5===s&&o>16){for(var E=[],T=0;T<16;T++){var S=n[h++].toString(16);E.push(1==S.length?"0"+S:S),3!==T&&5!==T&&7!==T&&9!==T||E.push("-")}for(var L=o-16,A=new Uint8Array(L),R=0;R<L;R++)A[R]=n[h++];i.push({payloadType:s,pts:r,uuid:E.join(""),userData:ke(A),userDataBytes:A})}}}function Qe(e){for(var t=e.byteLength,r=[],i=1;i<t-2;)0===e[i]&&0===e[i+1]&&3===e[i+2]?(r.push(i+2),i+=2):i++;if(0===r.length)return e;var n=t-r.length,a=new Uint8Array(n),s=0;for(i=0;i<n;s++,i++)s===r[0]&&(s++,r.shift()),a[i]=e[s];return a}function Je(e,t,r){if(16!==e.byteLength)throw new RangeError("Invalid system id");var i,n,a;if(t){i=1,n=new Uint8Array(16*t.length);for(var s=0;s<t.length;s++){var o=t[s];if(16!==o.byteLength)throw new RangeError("Invalid key");n.set(o,16*s)}}else i=0,n=new Uint8Array;i>0?(a=new Uint8Array(4),t.length>0&&new DataView(a.buffer).setUint32(0,t.length,!1)):a=new Uint8Array;var l=new Uint8Array(4);return r&&r.byteLength>0&&new DataView(l.buffer).setUint32(0,r.byteLength,!1),function(e){for(var t=arguments.length,r=new Array(t>1?t-1:0),i=1;i<t;i++)r[i-1]=arguments[i];for(var n=r.length,a=8,s=n;s--;)a+=r[s].byteLength;var o=new Uint8Array(a);for(o[0]=a>>24&255,o[1]=a>>16&255,o[2]=a>>8&255,o[3]=255&a,o.set(e,4),s=0,a=8;s<n;s++)o.set(r[s],a),a+=r[s].byteLength;return o}([112,115,115,104],new Uint8Array([i,0,0,0]),e,a,n,l,r||new Uint8Array)}function $e(e){var t=e.getUint32(0),r=e.byteOffset,i=e.byteLength;if(i<t)return{offset:r,size:i};if(1886614376!==e.getUint32(4))return{offset:r,size:t};var n=e.getUint32(8)>>>24;if(0!==n&&1!==n)return{offset:r,size:t};var a=e.buffer,s=De.hexDump(new Uint8Array(a,r+12,16)),o=e.getUint32(28),l=null,u=null;if(0===n){if(t-32<o||o<22)return{offset:r,size:t};u=new Uint8Array(a,r+32,o)}else if(1===n){if(!o||i<r+32+16*o+16)return{offset:r,size:t};l=[];for(var h=0;h<o;h++)l.push(new Uint8Array(a,r+32+16*h,16))}return{version:n,systemId:s,kids:l,data:u,offset:r,size:t}}var Ze={},et=function(){function e(e,t,r,i,n){void 0===i&&(i=[1]),void 0===n&&(n=null),this.uri=void 0,this.method=void 0,this.keyFormat=void 0,this.keyFormatVersions=void 0,this.encrypted=void 0,this.isCommonEncryption=void 0,this.iv=null,this.key=null,this.keyId=null,this.pssh=null,this.method=e,this.uri=t,this.keyFormat=r,this.keyFormatVersions=i,this.iv=n,this.encrypted=!!e&&"NONE"!==e,this.isCommonEncryption=this.encrypted&&"AES-128"!==e}e.clearKeyUriToKeyIdMap=function(){Ze={}};var t=e.prototype;return t.isSupported=function(){if(this.method){if("AES-128"===this.method||"NONE"===this.method)return!0;if("identity"===this.keyFormat)return"SAMPLE-AES"===this.method;switch(this.keyFormat){case z:case J:case Q:case X:return-1!==["ISO-23001-7","SAMPLE-AES","SAMPLE-AES-CENC","SAMPLE-AES-CTR"].indexOf(this.method)}}return!1},t.getDecryptData=function(t){if(!this.encrypted||!this.uri)return null;if("AES-128"===this.method&&this.uri&&!this.iv){"number"!=typeof t&&("AES-128"!==this.method||this.iv||w.warn('missing IV for initialization segment with method="'+this.method+'" - compliance issue'),t=0);var r=function(e){for(var t=new Uint8Array(16),r=12;r<16;r++)t[r]=e>>8*(15-r)&255;return t}(t);return new e(this.method,this.uri,"identity",this.keyFormatVersions,r)}var i=Y(this.uri);if(i)switch(this.keyFormat){case J:this.pssh=i,i.length>=22&&(this.keyId=i.subarray(i.length-22,i.length-6));break;case Q:var n=new Uint8Array([154,4,240,121,152,64,66,134,171,146,230,91,224,136,95,149]);this.pssh=Je(n,null,i),this.keyId=le(i);break;default:var a=i.subarray(0,16);if(16!==a.length){var s=new Uint8Array(16);s.set(a,16-a.length),a=s}this.keyId=a}if(!this.keyId||16!==this.keyId.byteLength){var o=Ze[this.uri];if(!o){var l=Object.keys(Ze).length%Number.MAX_SAFE_INTEGER;o=new Uint8Array(16),new DataView(o.buffer,12,4).setUint32(0,l),Ze[this.uri]=o}this.keyId=o}return this},e}(),tt=/\{\$([a-zA-Z0-9-_]+)\}/g;function rt(e){return tt.test(e)}function it(e,t,r){if(null!==e.variableList||e.hasVariableRefs)for(var i=r.length;i--;){var n=r[i],a=t[n];a&&(t[n]=nt(e,a))}}function nt(e,t){if(null!==e.variableList||e.hasVariableRefs){var r=e.variableList;return t.replace(tt,(function(t){var i=t.substring(2,t.length-1),n=null==r?void 0:r[i];return void 0===n?(e.playlistParsingError||(e.playlistParsingError=new Error('Missing preceding EXT-X-DEFINE tag for Variable Reference: "'+i+'"')),t):n}))}return t}function at(e,t,r){var i,n,a=e.variableList;if(a||(e.variableList=a={}),"QUERYPARAM"in t){i=t.QUERYPARAM;try{var s=new self.URL(r).searchParams;if(!s.has(i))throw new Error('"'+i+'" does not match any query parameter in URI: "'+r+'"');n=s.get(i)}catch(t){e.playlistParsingError||(e.playlistParsingError=new Error("EXT-X-DEFINE QUERYPARAM: "+t.message))}}else i=t.NAME,n=t.VALUE;i in a?e.playlistParsingError||(e.playlistParsingError=new Error('EXT-X-DEFINE duplicate Variable Name declarations: "'+i+'"')):a[i]=n||""}function st(e,t,r){var i=t.IMPORT;if(r&&i in r){var n=e.variableList;n||(e.variableList=n={}),n[i]=r[i]}else e.playlistParsingError||(e.playlistParsingError=new Error('EXT-X-DEFINE IMPORT attribute not found in Multivariant Playlist: "'+i+'"'))}function ot(e){if(void 0===e&&(e=!0),"undefined"!=typeof self)return(e||!self.MediaSource)&&self.ManagedMediaSource||self.MediaSource||self.WebKitMediaSource}var lt={audio:{a3ds:1,"ac-3":.95,"ac-4":1,alac:.9,alaw:1,dra1:1,"dts+":1,"dts-":1,dtsc:1,dtse:1,dtsh:1,"ec-3":.9,enca:1,fLaC:.9,flac:.9,FLAC:.9,g719:1,g726:1,m4ae:1,mha1:1,mha2:1,mhm1:1,mhm2:1,mlpa:1,mp4a:1,"raw ":1,Opus:1,opus:1,samr:1,sawb:1,sawp:1,sevc:1,sqcp:1,ssmv:1,twos:1,ulaw:1},video:{avc1:1,avc2:1,avc3:1,avc4:1,avcp:1,av01:.8,drac:1,dva1:1,dvav:1,dvh1:.7,dvhe:.7,encv:1,hev1:.75,hvc1:.75,mjp2:1,mp4v:1,mvc1:1,mvc2:1,mvc3:1,mvc4:1,resv:1,rv60:1,s263:1,svc1:1,svc2:1,"vc-1":1,vp08:1,vp09:.9},text:{stpp:1,wvtt:1}};function ut(e,t,r){return void 0===r&&(r=!0),!e.split(",").some((function(e){return!ht(e,t,r)}))}function ht(e,t,r){var i;void 0===r&&(r=!0);var n=ot(r);return null!=(i=null==n?void 0:n.isTypeSupported(dt(e,t)))&&i}function dt(e,t){return t+'/mp4;codecs="'+e+'"'}function ct(e){if(e){var t=e.substring(0,4);return lt.video[t]}return 2}function ft(e){return e.split(",").reduce((function(e,t){var r=lt.video[t];return r?(2*r+e)/(e?3:2):(lt.audio[t]+e)/(e?2:1)}),0)}var gt={},vt=/flac|opus/i;function mt(e,t){return void 0===t&&(t=!0),e.replace(vt,(function(e){return function(e,t){if(void 0===t&&(t=!0),gt[e])return gt[e];for(var r={flac:["flac","fLaC","FLAC"],opus:["opus","Opus"]}[e],i=0;i<r.length;i++)if(ht(r[i],"audio",t))return gt[e]=r[i],r[i];return e}(e.toLowerCase(),t)}))}function pt(e,t){return e&&"mp4a"!==e?e:t?t.split(",")[0]:t}var yt=/#EXT-X-STREAM-INF:([^\r\n]*)(?:[\r\n](?:#[^\r\n]*)?)*([^\r\n]+)|#EXT-X-(SESSION-DATA|SESSION-KEY|DEFINE|CONTENT-STEERING|START):([^\r\n]*)[\r\n]+/g,Et=/#EXT-X-MEDIA:(.*)/g,Tt=/^#EXT(?:INF|-X-TARGETDURATION):/m,St=new RegExp([/#EXTINF:\s*(\d*(?:\.\d+)?)(?:,(.*)\s+)?/.source,/(?!#) *(\S[^\r\n]*)/.source,/#EXT-X-BYTERANGE:*(.+)/.source,/#EXT-X-PROGRAM-DATE-TIME:(.+)/.source,/#.*/.source].join("|"),"g"),Lt=new RegExp([/#(EXTM3U)/.source,/#EXT-X-(DATERANGE|DEFINE|KEY|MAP|PART|PART-INF|PLAYLIST-TYPE|PRELOAD-HINT|RENDITION-REPORT|SERVER-CONTROL|SKIP|START):(.+)/.source,/#EXT-X-(BITRATE|DISCONTINUITY-SEQUENCE|MEDIA-SEQUENCE|TARGETDURATION|VERSION): *(\d+)/.source,/#EXT-X-(DISCONTINUITY|ENDLIST|GAP|INDEPENDENT-SEGMENTS)/.source,/(#)([^:]*):(.*)/.source,/(#)(.*)(?:.*)\r?\n?/.source].join("|")),At=function(){function e(){}return e.findGroup=function(e,t){for(var r=0;r<e.length;r++){var i=e[r];if(i.id===t)return i}},e.resolve=function(e,t){return p.buildAbsoluteURL(t,e,{alwaysNormalize:!0})},e.isMediaPlaylist=function(e){return Tt.test(e)},e.parseMasterPlaylist=function(t,r){var i,n={contentSteering:null,levels:[],playlistParsingError:null,sessionData:null,sessionKeys:null,startTimeOffset:null,variableList:null,hasVariableRefs:rt(t)},a=[];for(yt.lastIndex=0;null!=(i=yt.exec(t));)if(i[1]){var s,o=new x(i[1]);it(n,o,["CODECS","SUPPLEMENTAL-CODECS","ALLOWED-CPC","PATHWAY-ID","STABLE-VARIANT-ID","AUDIO","VIDEO","SUBTITLES","CLOSED-CAPTIONS","NAME"]);var l=nt(n,i[2]),u={attrs:o,bitrate:o.decimalInteger("BANDWIDTH")||o.decimalInteger("AVERAGE-BANDWIDTH"),name:o.NAME,url:e.resolve(l,r)},h=o.decimalResolution("RESOLUTION");h&&(u.width=h.width,u.height=h.height),bt(o.CODECS,u),null!=(s=u.unknownCodecs)&&s.length||a.push(u),n.levels.push(u)}else if(i[3]){var d=i[3],c=i[4];switch(d){case"SESSION-DATA":var f=new x(c);it(n,f,["DATA-ID","LANGUAGE","VALUE","URI"]);var g=f["DATA-ID"];g&&(null===n.sessionData&&(n.sessionData={}),n.sessionData[g]=f);break;case"SESSION-KEY":var v=Rt(c,r,n);v.encrypted&&v.isSupported()?(null===n.sessionKeys&&(n.sessionKeys=[]),n.sessionKeys.push(v)):w.warn('[Keys] Ignoring invalid EXT-X-SESSION-KEY tag: "'+c+'"');break;case"DEFINE":var m=new x(c);it(n,m,["NAME","VALUE","QUERYPARAM"]),at(n,m,r);break;case"CONTENT-STEERING":var p=new x(c);it(n,p,["SERVER-URI","PATHWAY-ID"]),n.contentSteering={uri:e.resolve(p["SERVER-URI"],r),pathwayId:p["PATHWAY-ID"]||"."};break;case"START":n.startTimeOffset=kt(c)}}var y=a.length>0&&a.length<n.levels.length;return n.levels=y?a:n.levels,0===n.levels.length&&(n.playlistParsingError=new Error("no levels found in manifest")),n},e.parseMasterPlaylistMedia=function(t,r,i){var n,a={},s=i.levels,o={AUDIO:s.map((function(e){return{id:e.attrs.AUDIO,audioCodec:e.audioCodec}})),SUBTITLES:s.map((function(e){return{id:e.attrs.SUBTITLES,textCodec:e.textCodec}})),"CLOSED-CAPTIONS":[]},l=0;for(Et.lastIndex=0;null!==(n=Et.exec(t));){var u=new x(n[1]),h=u.TYPE;if(h){var d=o[h],c=a[h]||[];a[h]=c,it(i,u,["URI","GROUP-ID","LANGUAGE","ASSOC-LANGUAGE","STABLE-RENDITION-ID","NAME","INSTREAM-ID","CHARACTERISTICS","CHANNELS"]);var f=u.LANGUAGE,g=u["ASSOC-LANGUAGE"],v=u.CHANNELS,m=u.CHARACTERISTICS,p=u["INSTREAM-ID"],y={attrs:u,bitrate:0,id:l++,groupId:u["GROUP-ID"]||"",name:u.NAME||f||"",type:h,default:u.bool("DEFAULT"),autoselect:u.bool("AUTOSELECT"),forced:u.bool("FORCED"),lang:f,url:u.URI?e.resolve(u.URI,r):""};if(g&&(y.assocLang=g),v&&(y.channels=v),m&&(y.characteristics=m),p&&(y.instreamId=p),null!=d&&d.length){var E=e.findGroup(d,y.groupId)||d[0];Dt(y,E,"audioCodec"),Dt(y,E,"textCodec")}c.push(y)}}return a},e.parseLevelPlaylist=function(e,t,r,i,n,a){var s,l,u,h=new H(t),d=h.fragments,c=null,f=0,g=0,v=0,m=0,p=null,E=new G(i,t),T=-1,S=!1,L=null;for(St.lastIndex=0,h.m3u8=e,h.hasVariableRefs=rt(e);null!==(s=St.exec(e));){S&&(S=!1,(E=new G(i,t)).start=v,E.sn=f,E.cc=m,E.level=r,c&&(E.initSegment=c,E.rawProgramDateTime=c.rawProgramDateTime,c.rawProgramDateTime=null,L&&(E.setByteRange(L),L=null)));var A=s[1];if(A){E.duration=parseFloat(A);var R=(" "+s[2]).slice(1);E.title=R||null,E.tagList.push(R?["INF",A,R]:["INF",A])}else if(s[3]){if(y(E.duration)){E.start=v,u&&Ct(E,u,h),E.sn=f,E.level=r,E.cc=m,d.push(E);var k=(" "+s[3]).slice(1);E.relurl=nt(h,k),It(E,p),p=E,v+=E.duration,f++,g=0,S=!0}}else if(s[4]){var b=(" "+s[4]).slice(1);p?E.setByteRange(b,p):E.setByteRange(b)}else if(s[5])E.rawProgramDateTime=(" "+s[5]).slice(1),E.tagList.push(["PROGRAM-DATE-TIME",E.rawProgramDateTime]),-1===T&&(T=d.length);else{if(!(s=s[0].match(Lt))){w.warn("No matches on slow regex match for level playlist!");continue}for(l=1;l<s.length&&void 0===s[l];l++);var D=(" "+s[l]).slice(1),I=(" "+s[l+1]).slice(1),C=s[l+2]?(" "+s[l+2]).slice(1):"";switch(D){case"PLAYLIST-TYPE":h.type=I.toUpperCase();break;case"MEDIA-SEQUENCE":f=h.startSN=parseInt(I);break;case"SKIP":var _=new x(I);it(h,_,["RECENTLY-REMOVED-DATERANGES"]);var P=_.decimalInteger("SKIPPED-SEGMENTS");if(y(P)){h.skippedSegments=P;for(var M=P;M--;)d.unshift(null);f+=P}var O=_.enumeratedString("RECENTLY-REMOVED-DATERANGES");O&&(h.recentlyRemovedDateranges=O.split("\t"));break;case"TARGETDURATION":h.targetduration=Math.max(parseInt(I),1);break;case"VERSION":h.version=parseInt(I);break;case"INDEPENDENT-SEGMENTS":case"EXTM3U":break;case"ENDLIST":h.live=!1;break;case"#":(I||C)&&E.tagList.push(C?[I,C]:[I]);break;case"DISCONTINUITY":m++,E.tagList.push(["DIS"]);break;case"GAP":E.gap=!0,E.tagList.push([D]);break;case"BITRATE":E.tagList.push([D,I]);break;case"DATERANGE":var N=new x(I);it(h,N,["ID","CLASS","START-DATE","END-DATE","SCTE35-CMD","SCTE35-OUT","SCTE35-IN"]),it(h,N,N.clientAttrs);var U=new F(N,h.dateRanges[N.ID]);U.isValid||h.skippedSegments?h.dateRanges[U.id]=U:w.warn('Ignoring invalid DATERANGE tag: "'+I+'"'),E.tagList.push(["EXT-X-DATERANGE",I]);break;case"DEFINE":var B=new x(I);it(h,B,["NAME","VALUE","IMPORT","QUERYPARAM"]),"IMPORT"in B?st(h,B,a):at(h,B,t);break;case"DISCONTINUITY-SEQUENCE":m=parseInt(I);break;case"KEY":var V=Rt(I,t,h);if(V.isSupported()){if("NONE"===V.method){u=void 0;break}u||(u={}),u[V.keyFormat]&&(u=o({},u)),u[V.keyFormat]=V}else w.warn('[Keys] Ignoring invalid EXT-X-KEY tag: "'+I+'"');break;case"START":h.startTimeOffset=kt(I);break;case"MAP":var Y=new x(I);if(it(h,Y,["BYTERANGE","URI"]),E.duration){var W=new G(i,t);wt(W,Y,r,u),c=W,E.initSegment=c,c.rawProgramDateTime&&!E.rawProgramDateTime&&(E.rawProgramDateTime=c.rawProgramDateTime)}else{var j=E.byteRangeEndOffset;if(j){var q=E.byteRangeStartOffset;L=j-q+"@"+q}else L=null;wt(E,Y,r,u),c=E,S=!0}break;case"SERVER-CONTROL":var X=new x(I);h.canBlockReload=X.bool("CAN-BLOCK-RELOAD"),h.canSkipUntil=X.optionalFloat("CAN-SKIP-UNTIL",0),h.canSkipDateRanges=h.canSkipUntil>0&&X.bool("CAN-SKIP-DATERANGES"),h.partHoldBack=X.optionalFloat("PART-HOLD-BACK",0),h.holdBack=X.optionalFloat("HOLD-BACK",0);break;case"PART-INF":var z=new x(I);h.partTarget=z.decimalFloatingPoint("PART-TARGET");break;case"PART":var Q=h.partList;Q||(Q=h.partList=[]);var J=g>0?Q[Q.length-1]:void 0,$=g++,Z=new x(I);it(h,Z,["BYTERANGE","URI"]);var ee=new K(Z,E,t,$,J);Q.push(ee),E.duration+=ee.duration;break;case"PRELOAD-HINT":var te=new x(I);it(h,te,["URI"]),h.preloadHint=te;break;case"RENDITION-REPORT":var re=new x(I);it(h,re,["URI"]),h.renditionReports=h.renditionReports||[],h.renditionReports.push(re);break;default:w.warn("line parsed but not handled: "+s)}}}p&&!p.relurl?(d.pop(),v-=p.duration,h.partList&&(h.fragmentHint=p)):h.partList&&(It(E,p),E.cc=m,h.fragmentHint=E,u&&Ct(E,u,h));var ie=d.length,ne=d[0],ae=d[ie-1];if((v+=h.skippedSegments*h.targetduration)>0&&ie&&ae){h.averagetargetduration=v/ie;var se=ae.sn;h.endSN="initSegment"!==se?se:0,h.live||(ae.endList=!0),ne&&(h.startCC=ne.cc)}else h.endSN=0,h.startCC=0;return h.fragmentHint&&(v+=h.fragmentHint.duration),h.totalduration=v,h.endCC=m,T>0&&function(e,t){for(var r=e[t],i=t;i--;){var n=e[i];if(!n)return;n.programDateTime=r.programDateTime-1e3*n.duration,r=n}}(d,T),h},e}();function Rt(e,t,r){var i,n,a=new x(e);it(r,a,["KEYFORMAT","KEYFORMATVERSIONS","URI","IV","URI"]);var s=null!=(i=a.METHOD)?i:"",o=a.URI,l=a.hexadecimalInteger("IV"),u=a.KEYFORMATVERSIONS,h=null!=(n=a.KEYFORMAT)?n:"identity";o&&a.IV&&!l&&w.error("Invalid IV: "+a.IV);var d=o?At.resolve(o,t):"",c=(u||"1").split("/").map(Number).filter(Number.isFinite);return new et(s,d,h,c,l)}function kt(e){var t=new x(e).decimalFloatingPoint("TIME-OFFSET");return y(t)?t:null}function bt(e,t){var r=(e||"").split(/[ ,]+/).filter((function(e){return e}));["video","audio","text"].forEach((function(e){var i=r.filter((function(t){return function(e,t){var r=lt[t];return!!r&&!!r[e.slice(0,4)]}(t,e)}));i.length&&(t[e+"Codec"]=i.join(","),r=r.filter((function(e){return-1===i.indexOf(e)})))})),t.unknownCodecs=r}function Dt(e,t,r){var i=t[r];i&&(e[r]=i)}function It(e,t){e.rawProgramDateTime?e.programDateTime=Date.parse(e.rawProgramDateTime):null!=t&&t.programDateTime&&(e.programDateTime=t.endProgramDateTime),y(e.programDateTime)||(e.programDateTime=null,e.rawProgramDateTime=null)}function wt(e,t,r,i){e.relurl=t.URI,t.BYTERANGE&&e.setByteRange(t.BYTERANGE),e.level=r,e.sn="initSegment",i&&(e.levelkeys=i),e.initSegment=null}function Ct(e,t,r){e.levelkeys=t;var i=r.encryptedFragments;i.length&&i[i.length-1].levelkeys===t||!Object.keys(t).some((function(e){return t[e].isCommonEncryption}))||i.push(e)}var _t="manifest",xt="level",Pt="audioTrack",Ft="subtitleTrack",Mt="main",Ot="audio",Nt="subtitle";function Ut(e){switch(e.type){case Pt:return Ot;case Ft:return Nt;default:return Mt}}function Bt(e,t){var r=e.url;return void 0!==r&&0!==r.indexOf("data:")||(r=t.url),r}var Gt=function(){function e(e){this.hls=void 0,this.loaders=Object.create(null),this.variableList=null,this.hls=e,this.registerListeners()}var t=e.prototype;return t.startLoad=function(e){},t.stopLoad=function(){this.destroyInternalLoaders()},t.registerListeners=function(){var e=this.hls;e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.LEVEL_LOADING,this.onLevelLoading,this),e.on(S.AUDIO_TRACK_LOADING,this.onAudioTrackLoading,this),e.on(S.SUBTITLE_TRACK_LOADING,this.onSubtitleTrackLoading,this)},t.unregisterListeners=function(){var e=this.hls;e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.LEVEL_LOADING,this.onLevelLoading,this),e.off(S.AUDIO_TRACK_LOADING,this.onAudioTrackLoading,this),e.off(S.SUBTITLE_TRACK_LOADING,this.onSubtitleTrackLoading,this)},t.createInternalLoader=function(e){var t=this.hls.config,r=t.pLoader,i=t.loader,n=new(r||i)(t);return this.loaders[e.type]=n,n},t.getInternalLoader=function(e){return this.loaders[e.type]},t.resetInternalLoader=function(e){this.loaders[e]&&delete this.loaders[e]},t.destroyInternalLoaders=function(){for(var e in this.loaders){var t=this.loaders[e];t&&t.destroy(),this.resetInternalLoader(e)}},t.destroy=function(){this.variableList=null,this.unregisterListeners(),this.destroyInternalLoaders()},t.onManifestLoading=function(e,t){var r=t.url;this.variableList=null,this.load({id:null,level:0,responseType:"text",type:_t,url:r,deliveryDirectives:null})},t.onLevelLoading=function(e,t){var r=t.id,i=t.level,n=t.pathwayId,a=t.url,s=t.deliveryDirectives;this.load({id:r,level:i,pathwayId:n,responseType:"text",type:xt,url:a,deliveryDirectives:s})},t.onAudioTrackLoading=function(e,t){var r=t.id,i=t.groupId,n=t.url,a=t.deliveryDirectives;this.load({id:r,groupId:i,level:null,responseType:"text",type:Pt,url:n,deliveryDirectives:a})},t.onSubtitleTrackLoading=function(e,t){var r=t.id,i=t.groupId,n=t.url,a=t.deliveryDirectives;this.load({id:r,groupId:i,level:null,responseType:"text",type:Ft,url:n,deliveryDirectives:a})},t.load=function(e){var t,r,i,n=this,a=this.hls.config,s=this.getInternalLoader(e);if(s){var l=s.context;if(l&&l.url===e.url&&l.level===e.level)return void w.trace("[playlist-loader]: playlist request ongoing");w.log("[playlist-loader]: aborting previous loader for type: "+e.type),s.abort()}if(r=e.type===_t?a.manifestLoadPolicy.default:o({},a.playlistLoadPolicy.default,{timeoutRetry:null,errorRetry:null}),s=this.createInternalLoader(e),y(null==(t=e.deliveryDirectives)?void 0:t.part)&&(e.type===xt&&null!==e.level?i=this.hls.levels[e.level].details:e.type===Pt&&null!==e.id?i=this.hls.audioTracks[e.id].details:e.type===Ft&&null!==e.id&&(i=this.hls.subtitleTracks[e.id].details),i)){var u=i.partTarget,h=i.targetduration;if(u&&h){var d=1e3*Math.max(3*u,.8*h);r=o({},r,{maxTimeToFirstByteMs:Math.min(d,r.maxTimeToFirstByteMs),maxLoadTimeMs:Math.min(d,r.maxTimeToFirstByteMs)})}}var c=r.errorRetry||r.timeoutRetry||{},f={loadPolicy:r,timeout:r.maxLoadTimeMs,maxRetry:c.maxNumRetry||0,retryDelay:c.retryDelayMs||0,maxRetryDelay:c.maxRetryDelayMs||0},g={onSuccess:function(e,t,r,i){var a=n.getInternalLoader(r);n.resetInternalLoader(r.type);var s=e.data;0===s.indexOf("#EXTM3U")?(t.parsing.start=performance.now(),At.isMediaPlaylist(s)?n.handleTrackOrLevelPlaylist(e,t,r,i||null,a):n.handleMasterPlaylist(e,t,r,i)):n.handleManifestParsingError(e,r,new Error("no EXTM3U delimiter"),i||null,t)},onError:function(e,t,r,i){n.handleNetworkError(t,r,!1,e,i)},onTimeout:function(e,t,r){n.handleNetworkError(t,r,!0,void 0,e)}};s.load(e,f,g)},t.handleMasterPlaylist=function(e,t,r,i){var n=this.hls,a=e.data,s=Bt(e,r),o=At.parseMasterPlaylist(a,s);if(o.playlistParsingError)this.handleManifestParsingError(e,r,o.playlistParsingError,i,t);else{var l=o.contentSteering,u=o.levels,h=o.sessionData,d=o.sessionKeys,c=o.startTimeOffset,f=o.variableList;this.variableList=f;var g=At.parseMasterPlaylistMedia(a,s,o),v=g.AUDIO,m=void 0===v?[]:v,p=g.SUBTITLES,y=g["CLOSED-CAPTIONS"];m.length&&(m.some((function(e){return!e.url}))||!u[0].audioCodec||u[0].attrs.AUDIO||(w.log("[playlist-loader]: audio codec signaled in quality level, but no embedded audio track signaled, create one"),m.unshift({type:"main",name:"main",groupId:"main",default:!1,autoselect:!1,forced:!1,id:-1,attrs:new x({}),bitrate:0,url:""}))),n.trigger(S.MANIFEST_LOADED,{levels:u,audioTracks:m,subtitles:p,captions:y,contentSteering:l,url:s,stats:t,networkDetails:i,sessionData:h,sessionKeys:d,startTimeOffset:c,variableList:f})}},t.handleTrackOrLevelPlaylist=function(e,t,r,i,n){var a=this.hls,s=r.id,o=r.level,l=r.type,u=Bt(e,r),h=y(o)?o:y(s)?s:0,d=Ut(r),c=At.parseLevelPlaylist(e.data,u,h,d,0,this.variableList);if(l===_t){var f={attrs:new x({}),bitrate:0,details:c,name:"",url:u};a.trigger(S.MANIFEST_LOADED,{levels:[f],audioTracks:[],url:u,stats:t,networkDetails:i,sessionData:null,sessionKeys:null,contentSteering:null,startTimeOffset:null,variableList:null})}t.parsing.end=performance.now(),r.levelDetails=c,this.handlePlaylistLoaded(c,e,t,r,i,n)},t.handleManifestParsingError=function(e,t,r,i,n){this.hls.trigger(S.ERROR,{type:L.NETWORK_ERROR,details:A.MANIFEST_PARSING_ERROR,fatal:t.type===_t,url:e.url,err:r,error:r,reason:r.message,response:e,context:t,networkDetails:i,stats:n})},t.handleNetworkError=function(e,t,r,n,a){void 0===r&&(r=!1);var s="A network "+(r?"timeout":"error"+(n?" (status "+n.code+")":""))+" occurred while loading "+e.type;e.type===xt?s+=": "+e.level+" id: "+e.id:e.type!==Pt&&e.type!==Ft||(s+=" id: "+e.id+' group-id: "'+e.groupId+'"');var o=new Error(s);w.warn("[playlist-loader]: "+s);var l=A.UNKNOWN,u=!1,h=this.getInternalLoader(e);switch(e.type){case _t:l=r?A.MANIFEST_LOAD_TIMEOUT:A.MANIFEST_LOAD_ERROR,u=!0;break;case xt:l=r?A.LEVEL_LOAD_TIMEOUT:A.LEVEL_LOAD_ERROR,u=!1;break;case Pt:l=r?A.AUDIO_TRACK_LOAD_TIMEOUT:A.AUDIO_TRACK_LOAD_ERROR,u=!1;break;case Ft:l=r?A.SUBTITLE_TRACK_LOAD_TIMEOUT:A.SUBTITLE_LOAD_ERROR,u=!1}h&&this.resetInternalLoader(e.type);var d={type:L.NETWORK_ERROR,details:l,fatal:u,url:e.url,loader:h,context:e,error:o,networkDetails:t,stats:a};if(n){var c=(null==t?void 0:t.url)||e.url;d.response=i({url:c,data:void 0},n)}this.hls.trigger(S.ERROR,d)},t.handlePlaylistLoaded=function(e,t,r,i,n,a){var s=this.hls,o=i.type,l=i.level,u=i.id,h=i.groupId,d=i.deliveryDirectives,c=Bt(t,i),f=Ut(i),g="number"==typeof i.level&&f===Mt?l:void 0;if(e.fragments.length){e.targetduration||(e.playlistParsingError=new Error("Missing Target Duration"));var v=e.playlistParsingError;if(v)s.trigger(S.ERROR,{type:L.NETWORK_ERROR,details:A.LEVEL_PARSING_ERROR,fatal:!1,url:c,error:v,reason:v.message,response:t,context:i,level:g,parent:f,networkDetails:n,stats:r});else switch(e.live&&a&&(a.getCacheAge&&(e.ageHeader=a.getCacheAge()||0),a.getCacheAge&&!isNaN(e.ageHeader)||(e.ageHeader=0)),o){case _t:case xt:s.trigger(S.LEVEL_LOADED,{details:e,level:g||0,id:u||0,stats:r,networkDetails:n,deliveryDirectives:d});break;case Pt:s.trigger(S.AUDIO_TRACK_LOADED,{details:e,id:u||0,groupId:h||"",stats:r,networkDetails:n,deliveryDirectives:d});break;case Ft:s.trigger(S.SUBTITLE_TRACK_LOADED,{details:e,id:u||0,groupId:h||"",stats:r,networkDetails:n,deliveryDirectives:d})}}else{var m=new Error("No Segments found in Playlist");s.trigger(S.ERROR,{type:L.NETWORK_ERROR,details:A.LEVEL_EMPTY_ERROR,fatal:!1,url:c,error:m,reason:m.message,response:t,context:i,level:g,parent:f,networkDetails:n,stats:r})}},e}();function Kt(e,t){var r;try{r=new Event("addtrack")}catch(e){(r=document.createEvent("Event")).initEvent("addtrack",!1,!1)}r.track=e,t.dispatchEvent(r)}function Ht(e,t){var r=e.mode;if("disabled"===r&&(e.mode="hidden"),e.cues&&!e.cues.getCueById(t.id))try{if(e.addCue(t),!e.cues.getCueById(t.id))throw new Error("addCue is failed for: "+t)}catch(r){w.debug("[texttrack-utils]: "+r);try{var i=new self.TextTrackCue(t.startTime,t.endTime,t.text);i.id=t.id,e.addCue(i)}catch(e){w.debug("[texttrack-utils]: Legacy TextTrackCue fallback failed: "+e)}}"disabled"===r&&(e.mode=r)}function Vt(e){var t=e.mode;if("disabled"===t&&(e.mode="hidden"),e.cues)for(var r=e.cues.length;r--;)e.removeCue(e.cues[r]);"disabled"===t&&(e.mode=t)}function Yt(e,t,r,i){var n=e.mode;if("disabled"===n&&(e.mode="hidden"),e.cues&&e.cues.length>0)for(var a=function(e,t,r){var i=[],n=function(e,t){if(t<e[0].startTime)return 0;var r=e.length-1;if(t>e[r].endTime)return-1;for(var i=0,n=r;i<=n;){var a=Math.floor((n+i)/2);if(t<e[a].startTime)n=a-1;else{if(!(t>e[a].startTime&&i<r))return a;i=a+1}}return e[i].startTime-t<t-e[n].startTime?i:n}(e,t);if(n>-1)for(var a=n,s=e.length;a<s;a++){var o=e[a];if(o.startTime>=t&&o.endTime<=r)i.push(o);else if(o.startTime>r)return i}return i}(e.cues,t,r),s=0;s<a.length;s++)i&&!i(a[s])||e.removeCue(a[s]);"disabled"===n&&(e.mode=n)}function Wt(e){for(var t=[],r=0;r<e.length;r++){var i=e[r];"subtitles"!==i.kind&&"captions"!==i.kind||!i.label||t.push(e[r])}return t}var jt="org.id3",qt="com.apple.quicktime.HLS",Xt="https://aomedia.org/emsg/ID3";function zt(){if("undefined"!=typeof self)return self.VTTCue||self.TextTrackCue}function Qt(e,t,r,n,a){var s=new e(t,r,"");try{s.value=n,a&&(s.type=a)}catch(o){s=new e(t,r,JSON.stringify(a?i({type:a},n):n))}return s}var Jt=function(){var e=zt();try{e&&new e(0,Number.POSITIVE_INFINITY,"")}catch(e){return Number.MAX_VALUE}return Number.POSITIVE_INFINITY}();function $t(e,t){return e.getTime()/1e3-t}var Zt=function(){function e(e){this.hls=void 0,this.id3Track=null,this.media=null,this.dateRangeCuesAppended={},this.hls=e,this._registerListeners()}var t=e.prototype;return t.destroy=function(){this._unregisterListeners(),this.id3Track=null,this.media=null,this.dateRangeCuesAppended={},this.hls=null},t._registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.FRAG_PARSING_METADATA,this.onFragParsingMetadata,this),e.on(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.on(S.LEVEL_UPDATED,this.onLevelUpdated,this)},t._unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.FRAG_PARSING_METADATA,this.onFragParsingMetadata,this),e.off(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.off(S.LEVEL_UPDATED,this.onLevelUpdated,this)},t.onMediaAttached=function(e,t){this.media=t.media},t.onMediaDetaching=function(){this.id3Track&&(Vt(this.id3Track),this.id3Track=null,this.media=null,this.dateRangeCuesAppended={})},t.onManifestLoading=function(){this.dateRangeCuesAppended={}},t.createTrack=function(e){var t=this.getID3Track(e.textTracks);return t.mode="hidden",t},t.getID3Track=function(e){if(this.media){for(var t=0;t<e.length;t++){var r=e[t];if("metadata"===r.kind&&"id3"===r.label)return Kt(r,this.media),r}return this.media.addTextTrack("metadata","id3")}},t.onFragParsingMetadata=function(e,t){if(this.media){var r=this.hls.config,i=r.enableEmsgMetadataCues,n=r.enableID3MetadataCues;if(i||n){var a=t.samples;this.id3Track||(this.id3Track=this.createTrack(this.media));var s=zt();if(s)for(var o=0;o<a.length;o++){var l=a[o].type;if((l!==Xt||i)&&n){var u=Ee(a[o].data);if(u){var h=a[o].pts,d=h+a[o].duration;d>Jt&&(d=Jt),d-h<=0&&(d=h+.25);for(var c=0;c<u.length;c++){var f=u[c];if(!pe(f)){this.updateId3CueEnds(h,l);var g=Qt(s,h,d,f,l);g&&this.id3Track.addCue(g)}}}}}}}},t.updateId3CueEnds=function(e,t){var r,i=null==(r=this.id3Track)?void 0:r.cues;if(i)for(var n=i.length;n--;){var a=i[n];a.type===t&&a.startTime<e&&a.endTime===Jt&&(a.endTime=e)}},t.onBufferFlushing=function(e,t){var r=t.startOffset,i=t.endOffset,n=t.type,a=this.id3Track,s=this.hls;if(s){var o=s.config,l=o.enableEmsgMetadataCues,u=o.enableID3MetadataCues;a&&(l||u)&&Yt(a,r,i,"audio"===n?function(e){return e.type===jt&&u}:"video"===n?function(e){return e.type===Xt&&l}:function(e){return e.type===jt&&u||e.type===Xt&&l})}},t.onLevelUpdated=function(e,t){var r=this,i=t.details;if(this.media&&i.hasProgramDateTime&&this.hls.config.enableDateRangeMetadataCues){var n=this.dateRangeCuesAppended,a=this.id3Track,s=i.dateRanges,o=Object.keys(s);if(a)for(var l=Object.keys(n).filter((function(e){return!o.includes(e)})),u=function(){var e=l[h];Object.keys(n[e].cues).forEach((function(t){a.removeCue(n[e].cues[t])})),delete n[e]},h=l.length;h--;)u();var d=i.fragments[i.fragments.length-1];if(0!==o.length&&y(null==d?void 0:d.programDateTime)){this.id3Track||(this.id3Track=this.createTrack(this.media));for(var c=d.programDateTime/1e3-d.start,f=zt(),g=function(){var e=o[v],t=s[e],i=$t(t.startDate,c),a=n[e],l=(null==a?void 0:a.cues)||{},u=(null==a?void 0:a.durationKnown)||!1,h=Jt,d=t.endDate;if(d)h=$t(d,c),u=!0;else if(t.endOnNext&&!u){var g=o.reduce((function(e,r){if(r!==t.id){var i=s[r];if(i.class===t.class&&i.startDate>t.startDate&&(!e||t.startDate<e.startDate))return i}return e}),null);g&&(h=$t(g.startDate,c),u=!0)}for(var m,p,y=Object.keys(t.attr),E=0;E<y.length;E++){var T=y[E];if("ID"!==(p=T)&&"CLASS"!==p&&"START-DATE"!==p&&"DURATION"!==p&&"END-DATE"!==p&&"END-ON-NEXT"!==p){var S=l[T];if(S)u&&!a.durationKnown&&(S.endTime=h);else if(f){var L=t.attr[T];P(T)&&(m=L,L=Uint8Array.from(m.replace(/^0x/,"").replace(/([\da-fA-F]{2}) ?/g,"0x$1 ").replace(/ +$/,"").split(" ")).buffer);var A=Qt(f,i,h,{key:T,data:L},qt);A&&(A.id=e,r.id3Track.addCue(A),l[T]=A)}}}n[e]={cues:l,dateRange:t,durationKnown:u}},v=0;v<o.length;v++)g()}}},e}(),er=function(){function e(e){var t=this;this.hls=void 0,this.config=void 0,this.media=null,this.levelDetails=null,this.currentTime=0,this.stallCount=0,this._latency=null,this.timeupdateHandler=function(){return t.timeupdate()},this.hls=e,this.config=e.config,this.registerListeners()}var t=e.prototype;return t.destroy=function(){this.unregisterListeners(),this.onMediaDetaching(),this.levelDetails=null,this.hls=this.timeupdateHandler=null},t.registerListeners=function(){this.hls.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),this.hls.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),this.hls.on(S.MANIFEST_LOADING,this.onManifestLoading,this),this.hls.on(S.LEVEL_UPDATED,this.onLevelUpdated,this),this.hls.on(S.ERROR,this.onError,this)},t.unregisterListeners=function(){this.hls.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),this.hls.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),this.hls.off(S.MANIFEST_LOADING,this.onManifestLoading,this),this.hls.off(S.LEVEL_UPDATED,this.onLevelUpdated,this),this.hls.off(S.ERROR,this.onError,this)},t.onMediaAttached=function(e,t){this.media=t.media,this.media.addEventListener("timeupdate",this.timeupdateHandler)},t.onMediaDetaching=function(){this.media&&(this.media.removeEventListener("timeupdate",this.timeupdateHandler),this.media=null)},t.onManifestLoading=function(){this.levelDetails=null,this._latency=null,this.stallCount=0},t.onLevelUpdated=function(e,t){var r=t.details;this.levelDetails=r,r.advanced&&this.timeupdate(),!r.live&&this.media&&this.media.removeEventListener("timeupdate",this.timeupdateHandler)},t.onError=function(e,t){var r;t.details===A.BUFFER_STALLED_ERROR&&(this.stallCount++,null!=(r=this.levelDetails)&&r.live&&w.warn("[playback-rate-controller]: Stall detected, adjusting target latency"))},t.timeupdate=function(){var e=this.media,t=this.levelDetails;if(e&&t){this.currentTime=e.currentTime;var r=this.computeLatency();if(null!==r){this._latency=r;var i=this.config,n=i.lowLatencyMode,a=i.maxLiveSyncPlaybackRate;if(n&&1!==a&&t.live){var s=this.targetLatency;if(null!==s){var o=r-s;if(o<Math.min(this.maxLatency,s+t.targetduration)&&o>.05&&this.forwardBufferLength>1){var l=Math.min(2,Math.max(1,a)),u=Math.round(2/(1+Math.exp(-.75*o-this.edgeStalled))*20)/20;e.playbackRate=Math.min(l,Math.max(1,u))}else 1!==e.playbackRate&&0!==e.playbackRate&&(e.playbackRate=1)}}}}},t.estimateLiveEdge=function(){var e=this.levelDetails;return null===e?null:e.edge+e.age},t.computeLatency=function(){var e=this.estimateLiveEdge();return null===e?null:e-this.currentTime},s(e,[{key:"latency",get:function(){return this._latency||0}},{key:"maxLatency",get:function(){var e=this.config,t=this.levelDetails;return void 0!==e.liveMaxLatencyDuration?e.liveMaxLatencyDuration:t?e.liveMaxLatencyDurationCount*t.targetduration:0}},{key:"targetLatency",get:function(){var e=this.levelDetails;if(null===e)return null;var t=e.holdBack,r=e.partHoldBack,i=e.targetduration,n=this.config,a=n.liveSyncDuration,s=n.liveSyncDurationCount,o=n.lowLatencyMode,l=this.hls.userConfig,u=o&&r||t;(l.liveSyncDuration||l.liveSyncDurationCount||0===u)&&(u=void 0!==a?a:s*i);var h=i;return u+Math.min(1*this.stallCount,h)}},{key:"liveSyncPosition",get:function(){var e=this.estimateLiveEdge(),t=this.targetLatency,r=this.levelDetails;if(null===e||null===t||null===r)return null;var i=r.edge,n=e-t-this.edgeStalled,a=i-r.totalduration,s=i-(this.config.lowLatencyMode&&r.partTarget||r.targetduration);return Math.min(Math.max(a,n),s)}},{key:"drift",get:function(){var e=this.levelDetails;return null===e?1:e.drift}},{key:"edgeStalled",get:function(){var e=this.levelDetails;if(null===e)return 0;var t=3*(this.config.lowLatencyMode&&e.partTarget||e.targetduration);return Math.max(e.age-t,0)}},{key:"forwardBufferLength",get:function(){var e=this.media,t=this.levelDetails;if(!e||!t)return 0;var r=e.buffered.length;return(r?e.buffered.end(r-1):t.edge)-this.currentTime}}]),e}(),tr=["NONE","TYPE-0","TYPE-1",null],rr=["SDR","PQ","HLG"],ir="",nr="YES",ar="v2";function sr(e){var t=e.canSkipUntil,r=e.canSkipDateRanges,i=e.age;return t&&i<t/2?r?ar:nr:ir}var or=function(){function e(e,t,r){this.msn=void 0,this.part=void 0,this.skip=void 0,this.msn=e,this.part=t,this.skip=r}return e.prototype.addDirectives=function(e){var t=new self.URL(e);return void 0!==this.msn&&t.searchParams.set("_HLS_msn",this.msn.toString()),void 0!==this.part&&t.searchParams.set("_HLS_part",this.part.toString()),this.skip&&t.searchParams.set("_HLS_skip",this.skip),t.href},e}(),lr=function(){function e(e){this._attrs=void 0,this.audioCodec=void 0,this.bitrate=void 0,this.codecSet=void 0,this.url=void 0,this.frameRate=void 0,this.height=void 0,this.id=void 0,this.name=void 0,this.videoCodec=void 0,this.width=void 0,this.details=void 0,this.fragmentError=0,this.loadError=0,this.loaded=void 0,this.realBitrate=0,this.supportedPromise=void 0,this.supportedResult=void 0,this._avgBitrate=0,this._audioGroups=void 0,this._subtitleGroups=void 0,this._urlId=0,this.url=[e.url],this._attrs=[e.attrs],this.bitrate=e.bitrate,e.details&&(this.details=e.details),this.id=e.id||0,this.name=e.name,this.width=e.width||0,this.height=e.height||0,this.frameRate=e.attrs.optionalFloat("FRAME-RATE",0),this._avgBitrate=e.attrs.decimalInteger("AVERAGE-BANDWIDTH"),this.audioCodec=e.audioCodec,this.videoCodec=e.videoCodec,this.codecSet=[e.videoCodec,e.audioCodec].filter((function(e){return!!e})).map((function(e){return e.substring(0,4)})).join(","),this.addGroupId("audio",e.attrs.AUDIO),this.addGroupId("text",e.attrs.SUBTITLES)}var t=e.prototype;return t.hasAudioGroup=function(e){return ur(this._audioGroups,e)},t.hasSubtitleGroup=function(e){return ur(this._subtitleGroups,e)},t.addGroupId=function(e,t){if(t)if("audio"===e){var r=this._audioGroups;r||(r=this._audioGroups=[]),-1===r.indexOf(t)&&r.push(t)}else if("text"===e){var i=this._subtitleGroups;i||(i=this._subtitleGroups=[]),-1===i.indexOf(t)&&i.push(t)}},t.addFallback=function(){},s(e,[{key:"maxBitrate",get:function(){return Math.max(this.realBitrate,this.bitrate)}},{key:"averageBitrate",get:function(){return this._avgBitrate||this.realBitrate||this.bitrate}},{key:"attrs",get:function(){return this._attrs[0]}},{key:"codecs",get:function(){return this.attrs.CODECS||""}},{key:"pathwayId",get:function(){return this.attrs["PATHWAY-ID"]||"."}},{key:"videoRange",get:function(){return this.attrs["VIDEO-RANGE"]||"SDR"}},{key:"score",get:function(){return this.attrs.optionalFloat("SCORE",0)}},{key:"uri",get:function(){return this.url[0]||""}},{key:"audioGroups",get:function(){return this._audioGroups}},{key:"subtitleGroups",get:function(){return this._subtitleGroups}},{key:"urlId",get:function(){return 0},set:function(e){}},{key:"audioGroupIds",get:function(){return this.audioGroups?[this.audioGroupId]:void 0}},{key:"textGroupIds",get:function(){return this.subtitleGroups?[this.textGroupId]:void 0}},{key:"audioGroupId",get:function(){var e;return null==(e=this.audioGroups)?void 0:e[0]}},{key:"textGroupId",get:function(){var e;return null==(e=this.subtitleGroups)?void 0:e[0]}}]),e}();function ur(e,t){return!(!t||!e)&&-1!==e.indexOf(t)}function hr(e,t){var r=t.startPTS;if(y(r)){var i,n=0;t.sn>e.sn?(n=r-e.start,i=e):(n=e.start-r,i=t),i.duration!==n&&(i.duration=n)}else t.sn>e.sn?e.cc===t.cc&&e.minEndPTS?t.start=e.start+(e.minEndPTS-e.start):t.start=e.start+e.duration:t.start=Math.max(e.start-t.duration,0)}function dr(e,t,r,i,n,a){i-r<=0&&(w.warn("Fragment should have a positive duration",t),i=r+t.duration,a=n+t.duration);var s=r,o=i,l=t.startPTS,u=t.endPTS;if(y(l)){var h=Math.abs(l-r);y(t.deltaPTS)?t.deltaPTS=Math.max(h,t.deltaPTS):t.deltaPTS=h,s=Math.max(r,l),r=Math.min(r,l),n=Math.min(n,t.startDTS),o=Math.min(i,u),i=Math.max(i,u),a=Math.max(a,t.endDTS)}var d=r-t.start;0!==t.start&&(t.start=r),t.duration=i-t.start,t.startPTS=r,t.maxStartPTS=s,t.startDTS=n,t.endPTS=i,t.minEndPTS=o,t.endDTS=a;var c,f=t.sn;if(!e||f<e.startSN||f>e.endSN)return 0;var g=f-e.startSN,v=e.fragments;for(v[g]=t,c=g;c>0;c--)hr(v[c],v[c-1]);for(c=g;c<v.length-1;c++)hr(v[c],v[c+1]);return e.fragmentHint&&hr(v[v.length-1],e.fragmentHint),e.PTSKnown=e.alignedSliding=!0,d}function cr(e,t){for(var r,i=null,n=e.fragments,a=n.length-1;a>=0;a--){var s=n[a].initSegment;if(s){i=s;break}}e.fragmentHint&&delete e.fragmentHint.endPTS,function(e,t,r){for(var i=t.skippedSegments,n=Math.max(e.startSN,t.startSN)-t.startSN,a=(e.fragmentHint?1:0)+(i?t.endSN:Math.min(e.endSN,t.endSN))-t.startSN,s=t.startSN-e.startSN,o=t.fragmentHint?t.fragments.concat(t.fragmentHint):t.fragments,l=e.fragmentHint?e.fragments.concat(e.fragmentHint):e.fragments,u=n;u<=a;u++){var h=l[s+u],d=o[u];i&&!d&&u<i&&(d=t.fragments[u]=h),h&&d&&r(h,d,u,o)}}(e,t,(function(e,n,a,s){if(t.skippedSegments&&n.cc!==e.cc)for(var o=e.cc-n.cc,l=a;l<s.length;l++)s[l].cc+=o;y(e.startPTS)&&y(e.endPTS)&&(n.start=n.startPTS=e.startPTS,n.startDTS=e.startDTS,n.maxStartPTS=e.maxStartPTS,n.endPTS=e.endPTS,n.endDTS=e.endDTS,n.minEndPTS=e.minEndPTS,n.duration=e.endPTS-e.startPTS,n.duration&&(r=n),t.PTSKnown=t.alignedSliding=!0),n.elementaryStreams=e.elementaryStreams,n.loader=e.loader,n.stats=e.stats,e.initSegment&&(n.initSegment=e.initSegment,i=e.initSegment)}));var l,u,h,d,c=t.fragments;if(i&&(t.fragmentHint?c.concat(t.fragmentHint):c).forEach((function(e){var t;!e||e.initSegment&&e.initSegment.relurl!==(null==(t=i)?void 0:t.relurl)||(e.initSegment=i)})),t.skippedSegments){if(t.deltaUpdateFailed=c.some((function(e){return!e})),t.deltaUpdateFailed){w.warn("[level-helper] Previous playlist missing segments skipped in delta playlist");for(var f=t.skippedSegments;f--;)c.shift();t.startSN=c[0].sn}else t.canSkipDateRanges&&(t.dateRanges=(l=e.dateRanges,u=t.dateRanges,h=t.recentlyRemovedDateranges,d=o({},l),h&&h.forEach((function(e){delete d[e]})),Object.keys(u).forEach((function(e){var t=new F(u[e].attr,d[e]);t.isValid?d[e]=t:w.warn('Ignoring invalid Playlist Delta Update DATERANGE tag: "'+JSON.stringify(u[e].attr)+'"')})),d));t.startCC=t.fragments[0].cc,t.endCC=c[c.length-1].cc}!function(e,t,r){if(e&&t)for(var i=0,n=0,a=e.length;n<=a;n++){var s=e[n],o=t[n+i];s&&o&&s.index===o.index&&s.fragment.sn===o.fragment.sn?r(s,o):i--}}(e.partList,t.partList,(function(e,t){t.elementaryStreams=e.elementaryStreams,t.stats=e.stats})),r?dr(t,r,r.startPTS,r.endPTS,r.startDTS,r.endDTS):fr(e,t),c.length&&(t.totalduration=t.edge-c[0].start),t.driftStartTime=e.driftStartTime,t.driftStart=e.driftStart;var g=t.advancedDateTime;if(t.advanced&&g){var v=t.edge;t.driftStart||(t.driftStartTime=g,t.driftStart=v),t.driftEndTime=g,t.driftEnd=v}else t.driftEndTime=e.driftEndTime,t.driftEnd=e.driftEnd,t.advancedDateTime=e.advancedDateTime}function fr(e,t){var r=t.startSN+t.skippedSegments-e.startSN,i=e.fragments;r<0||r>=i.length||gr(t,i[r].start)}function gr(e,t){if(t){for(var r=e.fragments,i=e.skippedSegments;i<r.length;i++)r[i].start+=t;e.fragmentHint&&(e.fragmentHint.start+=t)}}function vr(e,t,r){var i;return null!=e&&e.details?mr(null==(i=e.details)?void 0:i.partList,t,r):null}function mr(e,t,r){if(e)for(var i=e.length;i--;){var n=e[i];if(n.index===r&&n.fragment.sn===t)return n}return null}function pr(e){e.forEach((function(e,t){var r=e.details;null!=r&&r.fragments&&r.fragments.forEach((function(e){e.level=t}))}))}function yr(e){switch(e.details){case A.FRAG_LOAD_TIMEOUT:case A.KEY_LOAD_TIMEOUT:case A.LEVEL_LOAD_TIMEOUT:case A.MANIFEST_LOAD_TIMEOUT:return!0}return!1}function Er(e,t){var r=yr(t);return e.default[(r?"timeout":"error")+"Retry"]}function Tr(e,t){var r="linear"===e.backoff?1:Math.pow(2,t);return Math.min(r*e.retryDelayMs,e.maxRetryDelayMs)}function Sr(e){return i(i({},e),{errorRetry:null,timeoutRetry:null})}function Lr(e,t,r,i){if(!e)return!1;var n=null==i?void 0:i.code,a=t<e.maxNumRetry&&(function(e){return 0===e&&!1===navigator.onLine||!!e&&(e<400||e>499)}(n)||!!r);return e.shouldRetry?e.shouldRetry(e,t,r,i,a):a}var Ar=function(e,t){for(var r=0,i=e.length-1,n=null,a=null;r<=i;){var s=t(a=e[n=(r+i)/2|0]);if(s>0)r=n+1;else{if(!(s<0))return a;i=n-1}}return null};function Rr(e,t,r,i,n){void 0===r&&(r=0),void 0===i&&(i=0),void 0===n&&(n=.005);var a=null;if(e){a=t[e.sn-t[0].sn+1]||null;var s=e.endDTS-r;s>0&&s<15e-7&&(r+=15e-7)}else 0===r&&0===t[0].start&&(a=t[0]);if(a&&((!e||e.level===a.level)&&0===kr(r,i,a)||function(e,t,r){if(t&&0===t.start&&t.level<e.level&&(t.endPTS||0)>0){var i=t.tagList.reduce((function(e,t){return"INF"===t[0]&&(e+=parseFloat(t[1])),e}),r);return e.start<=i}return!1}(a,e,Math.min(n,i))))return a;var o=Ar(t,kr.bind(null,r,i));return!o||o===e&&a?a:o}function kr(e,t,r){if(void 0===e&&(e=0),void 0===t&&(t=0),r.start<=e&&r.start+r.duration>e)return 0;var i=Math.min(t,r.duration+(r.deltaPTS?r.deltaPTS:0));return r.start+r.duration-i<=e?1:r.start-i>e&&r.start?-1:0}function br(e,t,r){var i=1e3*Math.min(t,r.duration+(r.deltaPTS?r.deltaPTS:0));return(r.endProgramDateTime||0)-i>e}var Dr=0,Ir=2,wr=3,Cr=5,_r=0,xr=1,Pr=2,Fr=function(){function e(e){this.hls=void 0,this.playlistError=0,this.penalizedRenditions={},this.log=void 0,this.warn=void 0,this.error=void 0,this.hls=e,this.log=w.log.bind(w,"[info]:"),this.warn=w.warn.bind(w,"[warning]:"),this.error=w.error.bind(w,"[error]:"),this.registerListeners()}var t=e.prototype;return t.registerListeners=function(){var e=this.hls;e.on(S.ERROR,this.onError,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.LEVEL_UPDATED,this.onLevelUpdated,this)},t.unregisterListeners=function(){var e=this.hls;e&&(e.off(S.ERROR,this.onError,this),e.off(S.ERROR,this.onErrorOut,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.LEVEL_UPDATED,this.onLevelUpdated,this))},t.destroy=function(){this.unregisterListeners(),this.hls=null,this.penalizedRenditions={}},t.startLoad=function(e){},t.stopLoad=function(){this.playlistError=0},t.getVariantLevelIndex=function(e){return(null==e?void 0:e.type)===Mt?e.level:this.hls.loadLevel},t.onManifestLoading=function(){this.playlistError=0,this.penalizedRenditions={}},t.onLevelUpdated=function(){this.playlistError=0},t.onError=function(e,t){var r,i;if(!t.fatal){var n=this.hls,a=t.context;switch(t.details){case A.FRAG_LOAD_ERROR:case A.FRAG_LOAD_TIMEOUT:case A.KEY_LOAD_ERROR:case A.KEY_LOAD_TIMEOUT:return void(t.errorAction=this.getFragRetryOrSwitchAction(t));case A.FRAG_PARSING_ERROR:if(null!=(r=t.frag)&&r.gap)return void(t.errorAction={action:Dr,flags:_r});case A.FRAG_GAP:case A.FRAG_DECRYPT_ERROR:return t.errorAction=this.getFragRetryOrSwitchAction(t),void(t.errorAction.action=Ir);case A.LEVEL_EMPTY_ERROR:case A.LEVEL_PARSING_ERROR:var s,o,l=t.parent===Mt?t.level:n.loadLevel;return void(t.details===A.LEVEL_EMPTY_ERROR&&null!=(s=t.context)&&null!=(o=s.levelDetails)&&o.live?t.errorAction=this.getPlaylistRetryOrSwitchAction(t,l):(t.levelRetry=!1,t.errorAction=this.getLevelSwitchAction(t,l)));case A.LEVEL_LOAD_ERROR:case A.LEVEL_LOAD_TIMEOUT:return void("number"==typeof(null==a?void 0:a.level)&&(t.errorAction=this.getPlaylistRetryOrSwitchAction(t,a.level)));case A.AUDIO_TRACK_LOAD_ERROR:case A.AUDIO_TRACK_LOAD_TIMEOUT:case A.SUBTITLE_LOAD_ERROR:case A.SUBTITLE_TRACK_LOAD_TIMEOUT:if(a){var u=n.levels[n.loadLevel];if(u&&(a.type===Pt&&u.hasAudioGroup(a.groupId)||a.type===Ft&&u.hasSubtitleGroup(a.groupId)))return t.errorAction=this.getPlaylistRetryOrSwitchAction(t,n.loadLevel),t.errorAction.action=Ir,void(t.errorAction.flags=xr)}return;case A.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED:var h=n.levels[n.loadLevel],d=null==h?void 0:h.attrs["HDCP-LEVEL"];return void(d?t.errorAction={action:Ir,flags:Pr,hdcpLevel:d}:this.keySystemError(t));case A.BUFFER_ADD_CODEC_ERROR:case A.REMUX_ALLOC_ERROR:case A.BUFFER_APPEND_ERROR:return void(t.errorAction=this.getLevelSwitchAction(t,null!=(i=t.level)?i:n.loadLevel));case A.INTERNAL_EXCEPTION:case A.BUFFER_APPENDING_ERROR:case A.BUFFER_FULL_ERROR:case A.LEVEL_SWITCH_ERROR:case A.BUFFER_STALLED_ERROR:case A.BUFFER_SEEK_OVER_HOLE:case A.BUFFER_NUDGE_ON_STALL:return void(t.errorAction={action:Dr,flags:_r})}t.type===L.KEY_SYSTEM_ERROR&&this.keySystemError(t)}},t.keySystemError=function(e){var t=this.getVariantLevelIndex(e.frag);e.levelRetry=!1,e.errorAction=this.getLevelSwitchAction(e,t)},t.getPlaylistRetryOrSwitchAction=function(e,t){var r=Er(this.hls.config.playlistLoadPolicy,e),i=this.playlistError++;if(Lr(r,i,yr(e),e.response))return{action:Cr,flags:_r,retryConfig:r,retryCount:i};var n=this.getLevelSwitchAction(e,t);return r&&(n.retryConfig=r,n.retryCount=i),n},t.getFragRetryOrSwitchAction=function(e){var t=this.hls,r=this.getVariantLevelIndex(e.frag),i=t.levels[r],n=t.config,a=n.fragLoadPolicy,s=n.keyLoadPolicy,o=Er(e.details.startsWith("key")?s:a,e),l=t.levels.reduce((function(e,t){return e+t.fragmentError}),0);if(i&&(e.details!==A.FRAG_GAP&&i.fragmentError++,Lr(o,l,yr(e),e.response)))return{action:Cr,flags:_r,retryConfig:o,retryCount:l};var u=this.getLevelSwitchAction(e,r);return o&&(u.retryConfig=o,u.retryCount=l),u},t.getLevelSwitchAction=function(e,t){var r=this.hls;null==t&&(t=r.loadLevel);var i=this.hls.levels[t];if(i){var n,a,s=e.details;i.loadError++,s===A.BUFFER_APPEND_ERROR&&i.fragmentError++;var o=-1,l=r.levels,u=r.loadLevel,h=r.minAutoLevel,d=r.maxAutoLevel;r.autoLevelEnabled||(r.loadLevel=-1);for(var c,f=null==(n=e.frag)?void 0:n.type,g=(f===Ot&&s===A.FRAG_PARSING_ERROR||"audio"===e.sourceBufferName&&(s===A.BUFFER_ADD_CODEC_ERROR||s===A.BUFFER_APPEND_ERROR))&&l.some((function(e){var t=e.audioCodec;return i.audioCodec!==t})),v="video"===e.sourceBufferName&&(s===A.BUFFER_ADD_CODEC_ERROR||s===A.BUFFER_APPEND_ERROR)&&l.some((function(e){var t=e.codecSet,r=e.audioCodec;return i.codecSet!==t&&i.audioCodec===r})),m=null!=(a=e.context)?a:{},p=m.type,y=m.groupId,E=function(){var t=(T+u)%l.length;if(t!==u&&t>=h&&t<=d&&0===l[t].loadError){var r,n,a=l[t];if(s===A.FRAG_GAP&&f===Mt&&e.frag){var c=l[t].details;if(c){var m=Rr(e.frag,c.fragments,e.frag.start);if(null!=m&&m.gap)return 0}}else{if(p===Pt&&a.hasAudioGroup(y)||p===Ft&&a.hasSubtitleGroup(y))return 0;if(f===Ot&&null!=(r=i.audioGroups)&&r.some((function(e){return a.hasAudioGroup(e)}))||f===Nt&&null!=(n=i.subtitleGroups)&&n.some((function(e){return a.hasSubtitleGroup(e)}))||g&&i.audioCodec===a.audioCodec||!g&&i.audioCodec!==a.audioCodec||v&&i.codecSet===a.codecSet)return 0}return o=t,1}},T=l.length;T--&&(0===(c=E())||1!==c););if(o>-1&&r.loadLevel!==o)return e.levelRetry=!0,this.playlistError=0,{action:Ir,flags:_r,nextAutoLevel:o}}return{action:Ir,flags:xr}},t.onErrorOut=function(e,t){var r;switch(null==(r=t.errorAction)?void 0:r.action){case Dr:break;case Ir:this.sendAlternateToPenaltyBox(t),t.errorAction.resolved||t.details===A.FRAG_GAP?/MediaSource readyState: ended/.test(t.error.message)&&(this.warn('MediaSource ended after "'+t.sourceBufferName+'" sourceBuffer append error. Attempting to recover from media error.'),this.hls.recoverMediaError()):t.fatal=!0}t.fatal&&this.hls.stopLoad()},t.sendAlternateToPenaltyBox=function(e){var t=this.hls,r=e.errorAction;if(r){var i=r.flags,n=r.hdcpLevel,a=r.nextAutoLevel;switch(i){case _r:this.switchLevel(e,a);break;case Pr:n&&(t.maxHdcpLevel=tr[tr.indexOf(n)-1],r.resolved=!0),this.warn('Restricting playback to HDCP-LEVEL of "'+t.maxHdcpLevel+'" or lower')}r.resolved||this.switchLevel(e,a)}},t.switchLevel=function(e,t){void 0!==t&&e.errorAction&&(this.warn("switching to level "+t+" after "+e.details),this.hls.nextAutoLevel=t,e.errorAction.resolved=!0,this.hls.nextLoadLevel=this.hls.nextAutoLevel)},e}(),Mr=function(){function e(e,t){this.hls=void 0,this.timer=-1,this.requestScheduled=-1,this.canLoad=!1,this.log=void 0,this.warn=void 0,this.log=w.log.bind(w,t+":"),this.warn=w.warn.bind(w,t+":"),this.hls=e}var t=e.prototype;return t.destroy=function(){this.clearTimer(),this.hls=this.log=this.warn=null},t.clearTimer=function(){-1!==this.timer&&(self.clearTimeout(this.timer),this.timer=-1)},t.startLoad=function(){this.canLoad=!0,this.requestScheduled=-1,this.loadPlaylist()},t.stopLoad=function(){this.canLoad=!1,this.clearTimer()},t.switchParams=function(e,t,r){var i=null==t?void 0:t.renditionReports;if(i){for(var n=-1,a=0;a<i.length;a++){var s=i[a],o=void 0;try{o=new self.URL(s.URI,t.url).href}catch(e){w.warn("Could not construct new URL for Rendition Report: "+e),o=s.URI||""}if(o===e){n=a;break}o===e.substring(0,o.length)&&(n=a)}if(-1!==n){var l=i[n],u=parseInt(l["LAST-MSN"])||(null==t?void 0:t.lastPartSn),h=parseInt(l["LAST-PART"])||(null==t?void 0:t.lastPartIndex);if(this.hls.config.lowLatencyMode){var d=Math.min(t.age-t.partTarget,t.targetduration);h>=0&&d>t.partTarget&&(h+=1)}var c=r&&sr(r);return new or(u,h>=0?h:void 0,c)}}},t.loadPlaylist=function(e){-1===this.requestScheduled&&(this.requestScheduled=self.performance.now())},t.shouldLoadPlaylist=function(e){return this.canLoad&&!!e&&!!e.url&&(!e.details||e.details.live)},t.shouldReloadPlaylist=function(e){return-1===this.timer&&-1===this.requestScheduled&&this.shouldLoadPlaylist(e)},t.playlistLoaded=function(e,t,r){var i=this,n=t.details,a=t.stats,s=self.performance.now(),o=a.loading.first?Math.max(0,s-a.loading.first):0;if(n.advancedDateTime=Date.now()-o,n.live||null!=r&&r.live){if(n.reloaded(r),r&&this.log("live playlist "+e+" "+(n.advanced?"REFRESHED "+n.lastPartSn+"-"+n.lastPartIndex:n.updated?"UPDATED":"MISSED")),r&&n.fragments.length>0&&cr(r,n),!this.canLoad||!n.live)return;var l,u=void 0,h=void 0;if(n.canBlockReload&&n.endSN&&n.advanced){var d=this.hls.config.lowLatencyMode,c=n.lastPartSn,f=n.endSN,g=n.lastPartIndex,v=c===f;-1!==g?(u=v?f+1:c,h=v?d?0:g:g+1):u=f+1;var m=n.age,p=m+n.ageHeader,y=Math.min(p-n.partTarget,1.5*n.targetduration);if(y>0){if(r&&y>r.tuneInGoal)this.warn("CDN Tune-in goal increased from: "+r.tuneInGoal+" to: "+y+" with playlist age: "+n.age),y=0;else{var E=Math.floor(y/n.targetduration);u+=E,void 0!==h&&(h+=Math.round(y%n.targetduration/n.partTarget)),this.log("CDN Tune-in age: "+n.ageHeader+"s last advanced "+m.toFixed(2)+"s goal: "+y+" skip sn "+E+" to part "+h)}n.tuneInGoal=y}if(l=this.getDeliveryDirectives(n,t.deliveryDirectives,u,h),d||!v)return void this.loadPlaylist(l)}else(n.canBlockReload||n.canSkipUntil)&&(l=this.getDeliveryDirectives(n,t.deliveryDirectives,u,h));var T=this.hls.mainForwardBufferInfo,S=T?T.end-T.len:0,L=function(e,t){void 0===t&&(t=1/0);var r=1e3*e.targetduration;if(e.updated){var i=e.fragments;if(i.length&&4*r>t){var n=1e3*i[i.length-1].duration;n<r&&(r=n)}}else r/=2;return Math.round(r)}(n,1e3*(n.edge-S));n.updated&&s>this.requestScheduled+L&&(this.requestScheduled=a.loading.start),void 0!==u&&n.canBlockReload?this.requestScheduled=a.loading.first+L-(1e3*n.partTarget||1e3):-1===this.requestScheduled||this.requestScheduled+L<s?this.requestScheduled=s:this.requestScheduled-s<=0&&(this.requestScheduled+=L);var A=this.requestScheduled-s;A=Math.max(0,A),this.log("reload live playlist "+e+" in "+Math.round(A)+" ms"),this.timer=self.setTimeout((function(){return i.loadPlaylist(l)}),A)}else this.clearTimer()},t.getDeliveryDirectives=function(e,t,r,i){var n=sr(e);return null!=t&&t.skip&&e.deltaUpdateFailed&&(r=t.msn,i=t.part,n=ir),new or(r,i,n)},t.checkRetry=function(e){var t=this,r=e.details,i=yr(e),n=e.errorAction,a=n||{},s=a.action,o=a.retryCount,l=void 0===o?0:o,u=a.retryConfig,h=!!n&&!!u&&(s===Cr||!n.resolved&&s===Ir);if(h){var d;if(this.requestScheduled=-1,l>=u.maxNumRetry)return!1;if(i&&null!=(d=e.context)&&d.deliveryDirectives)this.warn("Retrying playlist loading "+(l+1)+"/"+u.maxNumRetry+' after "'+r+'" without delivery-directives'),this.loadPlaylist();else{var c=Tr(u,l);this.timer=self.setTimeout((function(){return t.loadPlaylist()}),c),this.warn("Retrying playlist loading "+(l+1)+"/"+u.maxNumRetry+' after "'+r+'" in '+c+"ms")}e.levelRetry=!0,n.resolved=!0}return h},e}(),Or=function(){function e(e,t,r){void 0===t&&(t=0),void 0===r&&(r=0),this.halfLife=void 0,this.alpha_=void 0,this.estimate_=void 0,this.totalWeight_=void 0,this.halfLife=e,this.alpha_=e?Math.exp(Math.log(.5)/e):0,this.estimate_=t,this.totalWeight_=r}var t=e.prototype;return t.sample=function(e,t){var r=Math.pow(this.alpha_,e);this.estimate_=t*(1-r)+r*this.estimate_,this.totalWeight_+=e},t.getTotalWeight=function(){return this.totalWeight_},t.getEstimate=function(){if(this.alpha_){var e=1-Math.pow(this.alpha_,this.totalWeight_);if(e)return this.estimate_/e}return this.estimate_},e}(),Nr=function(){function e(e,t,r,i){void 0===i&&(i=100),this.defaultEstimate_=void 0,this.minWeight_=void 0,this.minDelayMs_=void 0,this.slow_=void 0,this.fast_=void 0,this.defaultTTFB_=void 0,this.ttfb_=void 0,this.defaultEstimate_=r,this.minWeight_=.001,this.minDelayMs_=50,this.slow_=new Or(e),this.fast_=new Or(t),this.defaultTTFB_=i,this.ttfb_=new Or(e)}var t=e.prototype;return t.update=function(e,t){var r=this.slow_,i=this.fast_,n=this.ttfb_;r.halfLife!==e&&(this.slow_=new Or(e,r.getEstimate(),r.getTotalWeight())),i.halfLife!==t&&(this.fast_=new Or(t,i.getEstimate(),i.getTotalWeight())),n.halfLife!==e&&(this.ttfb_=new Or(e,n.getEstimate(),n.getTotalWeight()))},t.sample=function(e,t){var r=(e=Math.max(e,this.minDelayMs_))/1e3,i=8*t/r;this.fast_.sample(r,i),this.slow_.sample(r,i)},t.sampleTTFB=function(e){var t=e/1e3,r=Math.sqrt(2)*Math.exp(-Math.pow(t,2)/2);this.ttfb_.sample(r,Math.max(e,5))},t.canEstimate=function(){return this.fast_.getTotalWeight()>=this.minWeight_},t.getEstimate=function(){return this.canEstimate()?Math.min(this.fast_.getEstimate(),this.slow_.getEstimate()):this.defaultEstimate_},t.getEstimateTTFB=function(){return this.ttfb_.getTotalWeight()>=this.minWeight_?this.ttfb_.getEstimate():this.defaultTTFB_},t.destroy=function(){},e}(),Ur={supported:!0,configurations:[],decodingInfoResults:[{supported:!0,powerEfficient:!0,smooth:!0}]},Br={};function Gr(e,t,r){var n=e.videoCodec,a=e.audioCodec;if(!n||!a||!r)return Promise.resolve(Ur);var s={width:e.width,height:e.height,bitrate:Math.ceil(Math.max(.9*e.bitrate,e.averageBitrate)),framerate:e.frameRate||30},o=e.videoRange;"SDR"!==o&&(s.transferFunction=o.toLowerCase());var l=n.split(",").map((function(e){return{type:"media-source",video:i(i({},s),{},{contentType:dt(e,"video")})}}));return a&&e.audioGroups&&e.audioGroups.forEach((function(e){var r;e&&(null==(r=t.groups[e])||r.tracks.forEach((function(t){if(t.groupId===e){var r=t.channels||"",i=parseFloat(r);y(i)&&i>2&&l.push.apply(l,a.split(",").map((function(e){return{type:"media-source",audio:{contentType:dt(e,"audio"),channels:""+i}}})))}})))})),Promise.all(l.map((function(e){var t=function(e){var t=e.audio,r=e.video,i=r||t;if(i){var n=i.contentType.split('"')[1];if(r)return"r"+r.height+"x"+r.width+"f"+Math.ceil(r.framerate)+(r.transferFunction||"sd")+"_"+n+"_"+Math.ceil(r.bitrate/1e5);if(t)return"c"+t.channels+(t.spatialRendering?"s":"n")+"_"+n}return""}(e);return Br[t]||(Br[t]=r.decodingInfo(e))}))).then((function(e){return{supported:!e.some((function(e){return!e.supported})),configurations:l,decodingInfoResults:e}})).catch((function(e){return{supported:!1,configurations:l,decodingInfoResults:[],error:e}}))}function Kr(e,t){var r=!1,i=[];return e&&(r="SDR"!==e,i=[e]),t&&(i=t.allowedVideoRanges||rr.slice(0),i=(r=void 0!==t.preferHDR?t.preferHDR:function(){if("function"==typeof matchMedia){var e=matchMedia("(dynamic-range: high)"),t=matchMedia("bad query");if(e.media!==t.media)return!0===e.matches}return!1}())?i.filter((function(e){return"SDR"!==e})):["SDR"]),{preferHDR:r,allowedVideoRanges:i}}function Hr(e,t){w.log('[abr] start candidates with "'+e+'" ignored because '+t)}function Vr(e,t,r){if("attrs"in e){var i=t.indexOf(e);if(-1!==i)return i}for(var n=0;n<t.length;n++)if(Yr(e,t[n],r))return n;return-1}function Yr(e,t,r){var i=e.groupId,n=e.name,a=e.lang,s=e.assocLang,o=e.default,l=e.forced;return(void 0===i||t.groupId===i)&&(void 0===n||t.name===n)&&(void 0===a||t.lang===a)&&(void 0===a||t.assocLang===s)&&(void 0===o||t.default===o)&&(void 0===l||t.forced===l)&&(!("characteristics"in e)||function(e,t){void 0===t&&(t="");var r=e.split(","),i=t.split(",");return r.length===i.length&&!r.some((function(e){return-1===i.indexOf(e)}))}(e.characteristics||"",t.characteristics))&&(void 0===r||r(e,t))}function Wr(e,t){var r=e.audioCodec,i=e.channels;return!(void 0!==r&&(t.audioCodec||"").substring(0,4)!==r.substring(0,4)||void 0!==i&&i!==(t.channels||"2"))}function jr(e,t,r){for(var i=t;i>-1;i--)if(r(e[i]))return i;for(var n=t+1;n<e.length;n++)if(r(e[n]))return n;return-1}var qr=function(){function e(e){var t=this;this.hls=void 0,this.lastLevelLoadSec=0,this.lastLoadedFragLevel=-1,this.firstSelection=-1,this._nextAutoLevel=-1,this.nextAutoLevelKey="",this.audioTracksByGroup=null,this.codecTiers=null,this.timer=-1,this.fragCurrent=null,this.partCurrent=null,this.bitrateTestDelay=0,this.bwEstimator=void 0,this._abandonRulesCheck=function(){var e=t.fragCurrent,r=t.partCurrent,i=t.hls,n=i.autoLevelEnabled,a=i.media;if(e&&a){var s=performance.now(),o=r?r.stats:e.stats,l=r?r.duration:e.duration,u=s-o.loading.start,h=i.minAutoLevel;if(o.aborted||o.loaded&&o.loaded===o.total||e.level<=h)return t.clearTimer(),void(t._nextAutoLevel=-1);if(n&&!a.paused&&a.playbackRate&&a.readyState){var d=i.mainForwardBufferInfo;if(null!==d){var c=t.bwEstimator.getEstimateTTFB(),f=Math.abs(a.playbackRate);if(!(u<=Math.max(c,l/(2*f)*1e3))){var g=d.len/f,v=o.loading.first?o.loading.first-o.loading.start:-1,m=o.loaded&&v>-1,p=t.getBwEstimate(),E=i.levels,T=E[e.level],L=o.total||Math.max(o.loaded,Math.round(l*T.averageBitrate/8)),A=m?u-v:u;A<1&&m&&(A=Math.min(u,8*o.loaded/p));var R=m?1e3*o.loaded/A:0,k=R?(L-o.loaded)/R:8*L/p+c/1e3;if(!(k<=g)){var b,D=R?8*R:p,I=Number.POSITIVE_INFINITY;for(b=e.level-1;b>h;b--){var C=E[b].maxBitrate;if((I=t.getTimeToLoadFrag(c/1e3,D,l*C,!E[b].details))<g)break}if(!(I>=k||I>10*l)){i.nextLoadLevel=i.nextAutoLevel=b,m?t.bwEstimator.sample(u-Math.min(c,v),o.loaded):t.bwEstimator.sampleTTFB(u);var _=E[b].maxBitrate;t.getBwEstimate()*t.hls.config.abrBandWidthUpFactor>_&&t.resetEstimator(_),t.clearTimer(),w.warn("[abr] Fragment "+e.sn+(r?" part "+r.index:"")+" of level "+e.level+" is loading too slowly;\n      Time to underbuffer: "+g.toFixed(3)+" s\n      Estimated load time for current fragment: "+k.toFixed(3)+" s\n      Estimated load time for down switch fragment: "+I.toFixed(3)+" s\n      TTFB estimate: "+(0|v)+" ms\n      Current BW estimate: "+(y(p)?0|p:"Unknown")+" bps\n      New BW estimate: "+(0|t.getBwEstimate())+" bps\n      Switching to level "+b+" @ "+(0|_)+" bps"),i.trigger(S.FRAG_LOAD_EMERGENCY_ABORTED,{frag:e,part:r,stats:o})}}}}}}},this.hls=e,this.bwEstimator=this.initEstimator(),this.registerListeners()}var t=e.prototype;return t.resetEstimator=function(e){e&&(w.log("setting initial bwe to "+e),this.hls.config.abrEwmaDefaultEstimate=e),this.firstSelection=-1,this.bwEstimator=this.initEstimator()},t.initEstimator=function(){var e=this.hls.config;return new Nr(e.abrEwmaSlowVoD,e.abrEwmaFastVoD,e.abrEwmaDefaultEstimate)},t.registerListeners=function(){var e=this.hls;e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.FRAG_LOADING,this.onFragLoading,this),e.on(S.FRAG_LOADED,this.onFragLoaded,this),e.on(S.FRAG_BUFFERED,this.onFragBuffered,this),e.on(S.LEVEL_SWITCHING,this.onLevelSwitching,this),e.on(S.LEVEL_LOADED,this.onLevelLoaded,this),e.on(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.on(S.MAX_AUTO_LEVEL_UPDATED,this.onMaxAutoLevelUpdated,this),e.on(S.ERROR,this.onError,this)},t.unregisterListeners=function(){var e=this.hls;e&&(e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.FRAG_LOADING,this.onFragLoading,this),e.off(S.FRAG_LOADED,this.onFragLoaded,this),e.off(S.FRAG_BUFFERED,this.onFragBuffered,this),e.off(S.LEVEL_SWITCHING,this.onLevelSwitching,this),e.off(S.LEVEL_LOADED,this.onLevelLoaded,this),e.off(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.off(S.MAX_AUTO_LEVEL_UPDATED,this.onMaxAutoLevelUpdated,this),e.off(S.ERROR,this.onError,this))},t.destroy=function(){this.unregisterListeners(),this.clearTimer(),this.hls=this._abandonRulesCheck=null,this.fragCurrent=this.partCurrent=null},t.onManifestLoading=function(e,t){this.lastLoadedFragLevel=-1,this.firstSelection=-1,this.lastLevelLoadSec=0,this.fragCurrent=this.partCurrent=null,this.onLevelsUpdated(),this.clearTimer()},t.onLevelsUpdated=function(){this.lastLoadedFragLevel>-1&&this.fragCurrent&&(this.lastLoadedFragLevel=this.fragCurrent.level),this._nextAutoLevel=-1,this.onMaxAutoLevelUpdated(),this.codecTiers=null,this.audioTracksByGroup=null},t.onMaxAutoLevelUpdated=function(){this.firstSelection=-1,this.nextAutoLevelKey=""},t.onFragLoading=function(e,t){var r,i=t.frag;this.ignoreFragment(i)||(i.bitrateTest||(this.fragCurrent=i,this.partCurrent=null!=(r=t.part)?r:null),this.clearTimer(),this.timer=self.setInterval(this._abandonRulesCheck,100))},t.onLevelSwitching=function(e,t){this.clearTimer()},t.onError=function(e,t){if(!t.fatal)switch(t.details){case A.BUFFER_ADD_CODEC_ERROR:case A.BUFFER_APPEND_ERROR:this.lastLoadedFragLevel=-1,this.firstSelection=-1;break;case A.FRAG_LOAD_TIMEOUT:var r=t.frag,i=this.fragCurrent,n=this.partCurrent;if(r&&i&&r.sn===i.sn&&r.level===i.level){var a=performance.now(),s=n?n.stats:r.stats,o=a-s.loading.start,l=s.loading.first?s.loading.first-s.loading.start:-1;if(s.loaded&&l>-1){var u=this.bwEstimator.getEstimateTTFB();this.bwEstimator.sample(o-Math.min(u,l),s.loaded)}else this.bwEstimator.sampleTTFB(o)}}},t.getTimeToLoadFrag=function(e,t,r,i){return e+r/t+(i?this.lastLevelLoadSec:0)},t.onLevelLoaded=function(e,t){var r=this.hls.config,i=t.stats.loading,n=i.end-i.start;y(n)&&(this.lastLevelLoadSec=n/1e3),t.details.live?this.bwEstimator.update(r.abrEwmaSlowLive,r.abrEwmaFastLive):this.bwEstimator.update(r.abrEwmaSlowVoD,r.abrEwmaFastVoD)},t.onFragLoaded=function(e,t){var r=t.frag,i=t.part,n=i?i.stats:r.stats;if(r.type===Mt&&this.bwEstimator.sampleTTFB(n.loading.first-n.loading.start),!this.ignoreFragment(r)){if(this.clearTimer(),r.level===this._nextAutoLevel&&(this._nextAutoLevel=-1),this.firstSelection=-1,this.hls.config.abrMaxWithRealBitrate){var a=i?i.duration:r.duration,s=this.hls.levels[r.level],o=(s.loaded?s.loaded.bytes:0)+n.loaded,l=(s.loaded?s.loaded.duration:0)+a;s.loaded={bytes:o,duration:l},s.realBitrate=Math.round(8*o/l)}if(r.bitrateTest){var u={stats:n,frag:r,part:i,id:r.type};this.onFragBuffered(S.FRAG_BUFFERED,u),r.bitrateTest=!1}else this.lastLoadedFragLevel=r.level}},t.onFragBuffered=function(e,t){var r=t.frag,i=t.part,n=null!=i&&i.stats.loaded?i.stats:r.stats;if(!n.aborted&&!this.ignoreFragment(r)){var a=n.parsing.end-n.loading.start-Math.min(n.loading.first-n.loading.start,this.bwEstimator.getEstimateTTFB());this.bwEstimator.sample(a,n.loaded),n.bwEstimate=this.getBwEstimate(),r.bitrateTest?this.bitrateTestDelay=a/1e3:this.bitrateTestDelay=0}},t.ignoreFragment=function(e){return e.type!==Mt||"initSegment"===e.sn},t.clearTimer=function(){this.timer>-1&&(self.clearInterval(this.timer),this.timer=-1)},t.getAutoLevelKey=function(){return this.getBwEstimate()+"_"+this.getStarvationDelay().toFixed(2)},t.getNextABRAutoLevel=function(){var e=this.fragCurrent,t=this.partCurrent,r=this.hls,i=r.maxAutoLevel,n=r.config,a=r.minAutoLevel,s=t?t.duration:e?e.duration:0,o=this.getBwEstimate(),l=this.getStarvationDelay(),u=n.abrBandWidthFactor,h=n.abrBandWidthUpFactor;if(l){var d=this.findBestLevel(o,a,i,l,0,u,h);if(d>=0)return d}var c=s?Math.min(s,n.maxStarvationDelay):n.maxStarvationDelay;if(!l){var f=this.bitrateTestDelay;f&&(c=(s?Math.min(s,n.maxLoadingDelay):n.maxLoadingDelay)-f,w.info("[abr] bitrate test took "+Math.round(1e3*f)+"ms, set first fragment max fetchDuration to "+Math.round(1e3*c)+" ms"),u=h=1)}var g=this.findBestLevel(o,a,i,l,c,u,h);if(w.info("[abr] "+(l?"rebuffering expected":"buffer is empty")+", optimal quality level "+g),g>-1)return g;var v=r.levels[a],m=r.levels[r.loadLevel];return(null==v?void 0:v.bitrate)<(null==m?void 0:m.bitrate)?a:r.loadLevel},t.getStarvationDelay=function(){var e=this.hls,t=e.media;if(!t)return 1/0;var r=t&&0!==t.playbackRate?Math.abs(t.playbackRate):1,i=e.mainForwardBufferInfo;return(i?i.len:0)/r},t.getBwEstimate=function(){return this.bwEstimator.canEstimate()?this.bwEstimator.getEstimate():this.hls.config.abrEwmaDefaultEstimate},t.findBestLevel=function(e,t,r,i,n,a,s){var o,l=this,u=i+n,h=this.lastLoadedFragLevel,d=-1===h?this.hls.firstLevel:h,c=this.fragCurrent,f=this.partCurrent,g=this.hls,v=g.levels,m=g.allAudioTracks,p=g.loadLevel,E=g.config;if(1===v.length)return 0;var T,S=v[d],L=!(null==S||null==(o=S.details)||!o.live),A=-1===p||-1===h,R="SDR",k=(null==S?void 0:S.frameRate)||0,b=E.audioPreference,D=E.videoPreference,I=this.audioTracksByGroup||(this.audioTracksByGroup=function(e){return e.reduce((function(e,t){var r=e.groups[t.groupId];r||(r=e.groups[t.groupId]={tracks:[],channels:{2:0},hasDefault:!1,hasAutoSelect:!1}),r.tracks.push(t);var i=t.channels||"2";return r.channels[i]=(r.channels[i]||0)+1,r.hasDefault=r.hasDefault||t.default,r.hasAutoSelect=r.hasAutoSelect||t.autoselect,r.hasDefault&&(e.hasDefaultAudio=!0),r.hasAutoSelect&&(e.hasAutoSelectAudio=!0),e}),{hasDefaultAudio:!1,hasAutoSelectAudio:!1,groups:{}})}(m));if(A){if(-1!==this.firstSelection)return this.firstSelection;var C=this.codecTiers||(this.codecTiers=function(e,t,r,i){return e.slice(r,i+1).reduce((function(e,r){if(!r.codecSet)return e;var i=r.audioGroups,n=e[r.codecSet];n||(e[r.codecSet]=n={minBitrate:1/0,minHeight:1/0,minFramerate:1/0,maxScore:0,videoRanges:{SDR:0},channels:{2:0},hasDefaultAudio:!i,fragmentError:0}),n.minBitrate=Math.min(n.minBitrate,r.bitrate);var a=Math.min(r.height,r.width);return n.minHeight=Math.min(n.minHeight,a),n.minFramerate=Math.min(n.minFramerate,r.frameRate),n.maxScore=Math.max(n.maxScore,r.score),n.fragmentError+=r.fragmentError,n.videoRanges[r.videoRange]=(n.videoRanges[r.videoRange]||0)+1,i&&i.forEach((function(e){if(e){var r=t.groups[e];r&&(n.hasDefaultAudio=n.hasDefaultAudio||t.hasDefaultAudio?r.hasDefault:r.hasAutoSelect||!t.hasDefaultAudio&&!t.hasAutoSelectAudio,Object.keys(r.channels).forEach((function(e){n.channels[e]=(n.channels[e]||0)+r.channels[e]})))}})),e}),{})}(v,I,t,r)),_=function(e,t,r,i,n){for(var a=Object.keys(e),s=null==i?void 0:i.channels,o=null==i?void 0:i.audioCodec,l=s&&2===parseInt(s),u=!0,h=!1,d=1/0,c=1/0,f=1/0,g=0,v=[],m=Kr(t,n),p=m.preferHDR,E=m.allowedVideoRanges,T=function(){var t=e[a[S]];u=t.channels[2]>0,d=Math.min(d,t.minHeight),c=Math.min(c,t.minFramerate),f=Math.min(f,t.minBitrate);var r=E.filter((function(e){return t.videoRanges[e]>0}));r.length>0&&(h=!0,v=r)},S=a.length;S--;)T();d=y(d)?d:0,c=y(c)?c:0;var L=Math.max(1080,d),A=Math.max(30,c);return f=y(f)?f:r,r=Math.max(f,r),h||(t=void 0,v=[]),{codecSet:a.reduce((function(t,i){var n=e[i];if(i===t)return t;if(n.minBitrate>r)return Hr(i,"min bitrate of "+n.minBitrate+" > current estimate of "+r),t;if(!n.hasDefaultAudio)return Hr(i,"no renditions with default or auto-select sound found"),t;if(o&&i.indexOf(o.substring(0,4))%5!=0)return Hr(i,'audio codec preference "'+o+'" not found'),t;if(s&&!l){if(!n.channels[s])return Hr(i,"no renditions with "+s+" channel sound found (channels options: "+Object.keys(n.channels)+")"),t}else if((!o||l)&&u&&0===n.channels[2])return Hr(i,"no renditions with stereo sound found"),t;return n.minHeight>L?(Hr(i,"min resolution of "+n.minHeight+" > maximum of "+L),t):n.minFramerate>A?(Hr(i,"min framerate of "+n.minFramerate+" > maximum of "+A),t):v.some((function(e){return n.videoRanges[e]>0}))?n.maxScore<g?(Hr(i,"max score of "+n.maxScore+" < selected max of "+g),t):t&&(ft(i)>=ft(t)||n.fragmentError>e[t].fragmentError)?t:(g=n.maxScore,i):(Hr(i,"no variants with VIDEO-RANGE of "+JSON.stringify(v)+" found"),t)}),void 0),videoRanges:v,preferHDR:p,minFramerate:c,minBitrate:f}}(C,R,e,b,D),x=_.codecSet,P=_.videoRanges,F=_.minFramerate,M=_.minBitrate,O=_.preferHDR;T=x,R=O?P[P.length-1]:P[0],k=F,e=Math.max(e,M),w.log("[abr] picked start tier "+JSON.stringify(_))}else T=null==S?void 0:S.codecSet,R=null==S?void 0:S.videoRange;for(var N,U=f?f.duration:c?c.duration:0,B=this.bwEstimator.getEstimateTTFB()/1e3,G=[],K=function(){var t,o=v[H],c=H>d;if(!o)return 0;if(E.useMediaCapabilities&&!o.supportedResult&&!o.supportedPromise){var g=navigator.mediaCapabilities;"function"==typeof(null==g?void 0:g.decodingInfo)&&function(e,t,r,i,n,a){var s=e.audioCodec?e.audioGroups:null,o=null==a?void 0:a.audioCodec,l=null==a?void 0:a.channels,u=l?parseInt(l):o?1/0:2,h=null;if(null!=s&&s.length)try{h=1===s.length&&s[0]?t.groups[s[0]].channels:s.reduce((function(e,r){if(r){var i=t.groups[r];if(!i)throw new Error("Audio track group "+r+" not found");Object.keys(i.channels).forEach((function(t){e[t]=(e[t]||0)+i.channels[t]}))}return e}),{2:0})}catch(e){return!0}return void 0!==e.videoCodec&&(e.width>1920&&e.height>1088||e.height>1920&&e.width>1088||e.frameRate>Math.max(i,30)||"SDR"!==e.videoRange&&e.videoRange!==r||e.bitrate>Math.max(n,8e6))||!!h&&y(u)&&Object.keys(h).some((function(e){return parseInt(e)>u}))}(o,I,R,k,e,b)?(o.supportedPromise=Gr(o,I,g),o.supportedPromise.then((function(e){if(l.hls){o.supportedResult=e;var t=l.hls.levels,r=t.indexOf(o);e.error?w.warn('[abr] MediaCapabilities decodingInfo error: "'+e.error+'" for level '+r+" "+JSON.stringify(e)):e.supported||(w.warn("[abr] Unsupported MediaCapabilities decodingInfo result for level "+r+" "+JSON.stringify(e)),r>-1&&t.length>1&&(w.log("[abr] Removing unsupported level "+r),l.hls.removeLevel(r)))}}))):o.supportedResult=Ur}if(T&&o.codecSet!==T||R&&o.videoRange!==R||c&&k>o.frameRate||!c&&k>0&&k<o.frameRate||o.supportedResult&&(null==(t=o.supportedResult.decodingInfoResults)||!t[0].smooth))return G.push(H),0;var m,D=o.details,C=(f?null==D?void 0:D.partTarget:null==D?void 0:D.averagetargetduration)||U;m=c?s*e:a*e;var _=U&&i>=2*U&&0===n?v[H].averageBitrate:v[H].maxBitrate,x=l.getTimeToLoadFrag(B,m,_*C,void 0===D);if(m>=_&&(H===h||0===o.loadError&&0===o.fragmentError)&&(x<=B||!y(x)||L&&!l.bitrateTestDelay||x<u)){var P=l.forcedAutoLevel;return H===p||-1!==P&&P===p||(G.length&&w.trace("[abr] Skipped level(s) "+G.join(",")+" of "+r+' max with CODECS and VIDEO-RANGE:"'+v[G[0]].codecs+'" '+v[G[0]].videoRange+'; not compatible with "'+S.codecs+'" '+R),w.info("[abr] switch candidate:"+d+"->"+H+" adjustedbw("+Math.round(m)+")-bitrate="+Math.round(m-_)+" ttfb:"+B.toFixed(1)+" avgDuration:"+C.toFixed(1)+" maxFetchDuration:"+u.toFixed(1)+" fetchDuration:"+x.toFixed(1)+" firstSelection:"+A+" codecSet:"+T+" videoRange:"+R+" hls.loadLevel:"+p)),A&&(l.firstSelection=H),{v:H}}},H=r;H>=t;H--)if(0!==(N=K())&&N)return N.v;return-1},s(e,[{key:"firstAutoLevel",get:function(){var e=this.hls,t=e.maxAutoLevel,r=e.minAutoLevel,i=this.getBwEstimate(),n=this.hls.config.maxStarvationDelay,a=this.findBestLevel(i,r,t,0,n,1,1);if(a>-1)return a;var s=this.hls.firstLevel,o=Math.min(Math.max(s,r),t);return w.warn("[abr] Could not find best starting auto level. Defaulting to first in playlist "+s+" clamped to "+o),o}},{key:"forcedAutoLevel",get:function(){return this.nextAutoLevelKey?-1:this._nextAutoLevel}},{key:"nextAutoLevel",get:function(){var e=this.forcedAutoLevel,t=this.bwEstimator.canEstimate(),r=this.lastLoadedFragLevel>-1;if(!(-1===e||t&&r&&this.nextAutoLevelKey!==this.getAutoLevelKey()))return e;var i=t&&r?this.getNextABRAutoLevel():this.firstAutoLevel;if(-1!==e){var n=this.hls.levels;if(n.length>Math.max(e,i)&&n[e].loadError<=n[i].loadError)return e}return this._nextAutoLevel=i,this.nextAutoLevelKey=this.getAutoLevelKey(),i},set:function(e){var t=this.hls,r=t.maxAutoLevel,i=t.minAutoLevel,n=Math.min(Math.max(e,i),r);this._nextAutoLevel!==n&&(this.nextAutoLevelKey="",this._nextAutoLevel=n)}}]),e}(),Xr=function(){function e(){this._boundTick=void 0,this._tickTimer=null,this._tickInterval=null,this._tickCallCount=0,this._boundTick=this.tick.bind(this)}var t=e.prototype;return t.destroy=function(){this.onHandlerDestroying(),this.onHandlerDestroyed()},t.onHandlerDestroying=function(){this.clearNextTick(),this.clearInterval()},t.onHandlerDestroyed=function(){},t.hasInterval=function(){return!!this._tickInterval},t.hasNextTick=function(){return!!this._tickTimer},t.setInterval=function(e){return!this._tickInterval&&(this._tickCallCount=0,this._tickInterval=self.setInterval(this._boundTick,e),!0)},t.clearInterval=function(){return!!this._tickInterval&&(self.clearInterval(this._tickInterval),this._tickInterval=null,!0)},t.clearNextTick=function(){return!!this._tickTimer&&(self.clearTimeout(this._tickTimer),this._tickTimer=null,!0)},t.tick=function(){this._tickCallCount++,1===this._tickCallCount&&(this.doTick(),this._tickCallCount>1&&this.tickImmediate(),this._tickCallCount=0)},t.tickImmediate=function(){this.clearNextTick(),this._tickTimer=self.setTimeout(this._boundTick,0)},t.doTick=function(){},e}(),zr="NOT_LOADED",Qr="APPENDING",Jr="PARTIAL",$r="OK",Zr=function(){function e(e){this.activePartLists=Object.create(null),this.endListFragments=Object.create(null),this.fragments=Object.create(null),this.timeRanges=Object.create(null),this.bufferPadding=.2,this.hls=void 0,this.hasGaps=!1,this.hls=e,this._registerListeners()}var t=e.prototype;return t._registerListeners=function(){var e=this.hls;e.on(S.BUFFER_APPENDED,this.onBufferAppended,this),e.on(S.FRAG_BUFFERED,this.onFragBuffered,this),e.on(S.FRAG_LOADED,this.onFragLoaded,this)},t._unregisterListeners=function(){var e=this.hls;e.off(S.BUFFER_APPENDED,this.onBufferAppended,this),e.off(S.FRAG_BUFFERED,this.onFragBuffered,this),e.off(S.FRAG_LOADED,this.onFragLoaded,this)},t.destroy=function(){this._unregisterListeners(),this.fragments=this.activePartLists=this.endListFragments=this.timeRanges=null},t.getAppendedFrag=function(e,t){var r=this.activePartLists[t];if(r)for(var i=r.length;i--;){var n=r[i];if(!n)break;var a=n.end;if(n.start<=e&&null!==a&&e<=a)return n}return this.getBufferedFrag(e,t)},t.getBufferedFrag=function(e,t){for(var r=this.fragments,i=Object.keys(r),n=i.length;n--;){var a=r[i[n]];if((null==a?void 0:a.body.type)===t&&a.buffered){var s=a.body;if(s.start<=e&&e<=s.end)return s}}return null},t.detectEvictedFragments=function(e,t,r,i){var n=this;this.timeRanges&&(this.timeRanges[e]=t);var a=(null==i?void 0:i.fragment.sn)||-1;Object.keys(this.fragments).forEach((function(i){var s=n.fragments[i];if(s&&!(a>=s.body.sn))if(s.buffered||s.loaded){var o=s.range[e];o&&o.time.some((function(e){var r=!n.isTimeBuffered(e.startPTS,e.endPTS,t);return r&&n.removeFragment(s.body),r}))}else s.body.type===r&&n.removeFragment(s.body)}))},t.detectPartialFragments=function(e){var t=this,r=this.timeRanges,i=e.frag,n=e.part;if(r&&"initSegment"!==i.sn){var a=ti(i),s=this.fragments[a];if(!(!s||s.buffered&&i.gap)){var o=!i.relurl;Object.keys(r).forEach((function(e){var a=i.elementaryStreams[e];if(a){var l=r[e],u=o||!0===a.partial;s.range[e]=t.getBufferedTimes(i,n,u,l)}})),s.loaded=null,Object.keys(s.range).length?(s.buffered=!0,(s.body.endList=i.endList||s.body.endList)&&(this.endListFragments[s.body.type]=s),ei(s)||this.removeParts(i.sn-1,i.type)):this.removeFragment(s.body)}}},t.removeParts=function(e,t){var r=this.activePartLists[t];r&&(this.activePartLists[t]=r.filter((function(t){return t.fragment.sn>=e})))},t.fragBuffered=function(e,t){var r=ti(e),i=this.fragments[r];!i&&t&&(i=this.fragments[r]={body:e,appendedPTS:null,loaded:null,buffered:!1,range:Object.create(null)},e.gap&&(this.hasGaps=!0)),i&&(i.loaded=null,i.buffered=!0)},t.getBufferedTimes=function(e,t,r,i){for(var n={time:[],partial:r},a=e.start,s=e.end,o=e.minEndPTS||s,l=e.maxStartPTS||a,u=0;u<i.length;u++){var h=i.start(u)-this.bufferPadding,d=i.end(u)+this.bufferPadding;if(l>=h&&o<=d){n.time.push({startPTS:Math.max(a,i.start(u)),endPTS:Math.min(s,i.end(u))});break}if(a<d&&s>h){var c=Math.max(a,i.start(u)),f=Math.min(s,i.end(u));f>c&&(n.partial=!0,n.time.push({startPTS:c,endPTS:f}))}else if(s<=h)break}return n},t.getPartialFragment=function(e){var t,r,i,n=null,a=0,s=this.bufferPadding,o=this.fragments;return Object.keys(o).forEach((function(l){var u=o[l];u&&ei(u)&&(r=u.body.start-s,i=u.body.end+s,e>=r&&e<=i&&(t=Math.min(e-r,i-e),a<=t&&(n=u.body,a=t)))})),n},t.isEndListAppended=function(e){var t=this.endListFragments[e];return void 0!==t&&(t.buffered||ei(t))},t.getState=function(e){var t=ti(e),r=this.fragments[t];return r?r.buffered?ei(r)?Jr:$r:Qr:zr},t.isTimeBuffered=function(e,t,r){for(var i,n,a=0;a<r.length;a++){if(i=r.start(a)-this.bufferPadding,n=r.end(a)+this.bufferPadding,e>=i&&t<=n)return!0;if(t<=i)return!1}return!1},t.onFragLoaded=function(e,t){var r=t.frag,i=t.part;if("initSegment"!==r.sn&&!r.bitrateTest){var n=i?null:t,a=ti(r);this.fragments[a]={body:r,appendedPTS:null,loaded:n,buffered:!1,range:Object.create(null)}}},t.onBufferAppended=function(e,t){var r=this,i=t.frag,n=t.part,a=t.timeRanges;if("initSegment"!==i.sn){var s=i.type;if(n){var o=this.activePartLists[s];o||(this.activePartLists[s]=o=[]),o.push(n)}this.timeRanges=a,Object.keys(a).forEach((function(e){var t=a[e];r.detectEvictedFragments(e,t,s,n)}))}},t.onFragBuffered=function(e,t){this.detectPartialFragments(t)},t.hasFragment=function(e){var t=ti(e);return!!this.fragments[t]},t.hasParts=function(e){var t;return!(null==(t=this.activePartLists[e])||!t.length)},t.removeFragmentsInRange=function(e,t,r,i,n){var a=this;i&&!this.hasGaps||Object.keys(this.fragments).forEach((function(s){var o=a.fragments[s];if(o){var l=o.body;l.type!==r||i&&!l.gap||l.start<t&&l.end>e&&(o.buffered||n)&&a.removeFragment(l)}}))},t.removeFragment=function(e){var t=ti(e);e.stats.loaded=0,e.clearElementaryStreamInfo();var r=this.activePartLists[e.type];if(r){var i=e.sn;this.activePartLists[e.type]=r.filter((function(e){return e.fragment.sn!==i}))}delete this.fragments[t],e.endList&&delete this.endListFragments[e.type]},t.removeAllFragments=function(){this.fragments=Object.create(null),this.endListFragments=Object.create(null),this.activePartLists=Object.create(null),this.hasGaps=!1},e}();function ei(e){var t,r,i;return e.buffered&&(e.body.gap||(null==(t=e.range.video)?void 0:t.partial)||(null==(r=e.range.audio)?void 0:r.partial)||(null==(i=e.range.audiovideo)?void 0:i.partial))}function ti(e){return e.type+"_"+e.level+"_"+e.sn}var ri={length:0,start:function(){return 0},end:function(){return 0}},ii=function(){function e(){}return e.isBuffered=function(t,r){try{if(t)for(var i=e.getBuffered(t),n=0;n<i.length;n++)if(r>=i.start(n)&&r<=i.end(n))return!0}catch(e){}return!1},e.bufferInfo=function(t,r,i){try{if(t){var n,a=e.getBuffered(t),s=[];for(n=0;n<a.length;n++)s.push({start:a.start(n),end:a.end(n)});return this.bufferedInfo(s,r,i)}}catch(e){}return{len:0,start:r,end:r,nextStart:void 0}},e.bufferedInfo=function(e,t,r){t=Math.max(0,t),e.sort((function(e,t){var r=e.start-t.start;return r||t.end-e.end}));var i=[];if(r)for(var n=0;n<e.length;n++){var a=i.length;if(a){var s=i[a-1].end;e[n].start-s<r?e[n].end>s&&(i[a-1].end=e[n].end):i.push(e[n])}else i.push(e[n])}else i=e;for(var o,l=0,u=t,h=t,d=0;d<i.length;d++){var c=i[d].start,f=i[d].end;if(t+r>=c&&t<f)u=c,l=(h=f)-t;else if(t+r<c){o=c;break}}return{len:l,start:u||0,end:h||0,nextStart:o}},e.getBuffered=function(e){try{return e.buffered}catch(e){return w.log("failed to get media.buffered",e),ri}},e}(),ni=function(e,t,r,i,n,a){void 0===i&&(i=0),void 0===n&&(n=-1),void 0===a&&(a=!1),this.level=void 0,this.sn=void 0,this.part=void 0,this.id=void 0,this.size=void 0,this.partial=void 0,this.transmuxing={start:0,executeStart:0,executeEnd:0,end:0},this.buffering={audio:{start:0,executeStart:0,executeEnd:0,end:0},video:{start:0,executeStart:0,executeEnd:0,end:0},audiovideo:{start:0,executeStart:0,executeEnd:0,end:0}},this.level=e,this.sn=t,this.id=r,this.size=i,this.part=n,this.partial=a};function ai(e,t){for(var r=0,i=e.length;r<i;r++){var n;if((null==(n=e[r])?void 0:n.cc)===t)return e[r]}return null}function si(e,t){if(e){var r=e.start+t;e.start=e.startPTS=r,e.endPTS=r+e.duration}}function oi(e,t){for(var r=t.fragments,i=0,n=r.length;i<n;i++)si(r[i],e);t.fragmentHint&&si(t.fragmentHint,e),t.alignedSliding=!0}function li(e,t,r){t&&(function(e,t,r){if(function(e,t,r){return!(!t||!(r.endCC>r.startCC||e&&e.cc<r.startCC))}(e,r,t)){var i=function(e,t){var r=e.fragments,i=t.fragments;if(i.length&&r.length){var n=ai(r,i[0].cc);if(n&&(!n||n.startPTS))return n;w.log("No frag in previous level to align on")}else w.log("No fragments to align")}(r,t);i&&y(i.start)&&(w.log("Adjusting PTS using last level due to CC increase within current level "+t.url),oi(i.start,t))}}(e,r,t),!r.alignedSliding&&t&&ui(r,t),r.alignedSliding||!t||r.skippedSegments||fr(t,r))}function ui(e,t){if(e.hasProgramDateTime&&t.hasProgramDateTime){var r=e.fragments,i=t.fragments;if(r.length&&i.length){var n,a,s=Math.min(t.endCC,e.endCC);t.startCC<s&&e.startCC<s&&(n=ai(i,s),a=ai(r,s)),n&&a||(a=ai(r,(n=i[Math.floor(i.length/2)]).cc)||r[Math.floor(r.length/2)]);var o=n.programDateTime,l=a.programDateTime;o&&l&&oi((l-o)/1e3-(a.start-n.start),e)}}}var hi=Math.pow(2,17),di=function(){function e(e){this.config=void 0,this.loader=null,this.partLoadTimeout=-1,this.config=e}var t=e.prototype;return t.destroy=function(){this.loader&&(this.loader.destroy(),this.loader=null)},t.abort=function(){this.loader&&this.loader.abort()},t.load=function(e,t){var r=this,n=e.url;if(!n)return Promise.reject(new gi({type:L.NETWORK_ERROR,details:A.FRAG_LOAD_ERROR,fatal:!1,frag:e,error:new Error("Fragment does not have a "+(n?"part list":"url")),networkDetails:null}));this.abort();var a=this.config,s=a.fLoader,o=a.loader;return new Promise((function(l,u){if(r.loader&&r.loader.destroy(),e.gap){if(e.tagList.some((function(e){return"GAP"===e[0]})))return void u(fi(e));e.gap=!1}var h=r.loader=e.loader=s?new s(a):new o(a),d=ci(e),c=Sr(a.fragLoadPolicy.default),f={loadPolicy:c,timeout:c.maxLoadTimeMs,maxRetry:0,retryDelay:0,maxRetryDelay:0,highWaterMark:"initSegment"===e.sn?1/0:hi};e.stats=h.stats,h.load(d,f,{onSuccess:function(t,i,n,a){r.resetLoader(e,h);var s=t.data;n.resetIV&&e.decryptdata&&(e.decryptdata.iv=new Uint8Array(s.slice(0,16)),s=s.slice(16)),l({frag:e,part:null,payload:s,networkDetails:a})},onError:function(t,a,s,o){r.resetLoader(e,h),u(new gi({type:L.NETWORK_ERROR,details:A.FRAG_LOAD_ERROR,fatal:!1,frag:e,response:i({url:n,data:void 0},t),error:new Error("HTTP Error "+t.code+" "+t.text),networkDetails:s,stats:o}))},onAbort:function(t,i,n){r.resetLoader(e,h),u(new gi({type:L.NETWORK_ERROR,details:A.INTERNAL_ABORTED,fatal:!1,frag:e,error:new Error("Aborted"),networkDetails:n,stats:t}))},onTimeout:function(t,i,n){r.resetLoader(e,h),u(new gi({type:L.NETWORK_ERROR,details:A.FRAG_LOAD_TIMEOUT,fatal:!1,frag:e,error:new Error("Timeout after "+f.timeout+"ms"),networkDetails:n,stats:t}))},onProgress:function(r,i,n,a){t&&t({frag:e,part:null,payload:n,networkDetails:a})}})}))},t.loadPart=function(e,t,r){var n=this;this.abort();var a=this.config,s=a.fLoader,o=a.loader;return new Promise((function(l,u){if(n.loader&&n.loader.destroy(),e.gap||t.gap)u(fi(e,t));else{var h=n.loader=e.loader=s?new s(a):new o(a),d=ci(e,t),c=Sr(a.fragLoadPolicy.default),f={loadPolicy:c,timeout:c.maxLoadTimeMs,maxRetry:0,retryDelay:0,maxRetryDelay:0,highWaterMark:hi};t.stats=h.stats,h.load(d,f,{onSuccess:function(i,a,s,o){n.resetLoader(e,h),n.updateStatsFromPart(e,t);var u={frag:e,part:t,payload:i.data,networkDetails:o};r(u),l(u)},onError:function(r,a,s,o){n.resetLoader(e,h),u(new gi({type:L.NETWORK_ERROR,details:A.FRAG_LOAD_ERROR,fatal:!1,frag:e,part:t,response:i({url:d.url,data:void 0},r),error:new Error("HTTP Error "+r.code+" "+r.text),networkDetails:s,stats:o}))},onAbort:function(r,i,a){e.stats.aborted=t.stats.aborted,n.resetLoader(e,h),u(new gi({type:L.NETWORK_ERROR,details:A.INTERNAL_ABORTED,fatal:!1,frag:e,part:t,error:new Error("Aborted"),networkDetails:a,stats:r}))},onTimeout:function(r,i,a){n.resetLoader(e,h),u(new gi({type:L.NETWORK_ERROR,details:A.FRAG_LOAD_TIMEOUT,fatal:!1,frag:e,part:t,error:new Error("Timeout after "+f.timeout+"ms"),networkDetails:a,stats:r}))}})}}))},t.updateStatsFromPart=function(e,t){var r=e.stats,i=t.stats,n=i.total;if(r.loaded+=i.loaded,n){var a=Math.round(e.duration/t.duration),s=Math.min(Math.round(r.loaded/n),a),o=(a-s)*Math.round(r.loaded/s);r.total=r.loaded+o}else r.total=Math.max(r.loaded,r.total);var l=r.loading,u=i.loading;l.start?l.first+=u.first-u.start:(l.start=u.start,l.first=u.first),l.end=u.end},t.resetLoader=function(e,t){e.loader=null,this.loader===t&&(self.clearTimeout(this.partLoadTimeout),this.loader=null),t.destroy()},e}();function ci(e,t){void 0===t&&(t=null);var r=t||e,i={frag:e,part:t,responseType:"arraybuffer",url:r.url,headers:{},rangeStart:0,rangeEnd:0},n=r.byteRangeStartOffset,a=r.byteRangeEndOffset;if(y(n)&&y(a)){var s,o=n,l=a;if("initSegment"===e.sn&&"AES-128"===(null==(s=e.decryptdata)?void 0:s.method)){var u=a-n;u%16&&(l=a+(16-u%16)),0!==n&&(i.resetIV=!0,o=n-16)}i.rangeStart=o,i.rangeEnd=l}return i}function fi(e,t){var r=new Error("GAP "+(e.gap?"tag":"attribute")+" found"),i={type:L.MEDIA_ERROR,details:A.FRAG_GAP,fatal:!1,frag:e,error:r,networkDetails:null};return t&&(i.part=t),(t||e).stats.aborted=!0,new gi(i)}var gi=function(e){function t(t){var r;return(r=e.call(this,t.error.message)||this).data=void 0,r.data=t,r}return l(t,e),t}(c(Error)),vi=function(){function e(e,t){this.subtle=void 0,this.aesIV=void 0,this.subtle=e,this.aesIV=t}return e.prototype.decrypt=function(e,t){return this.subtle.decrypt({name:"AES-CBC",iv:this.aesIV},t,e)},e}(),mi=function(){function e(e,t){this.subtle=void 0,this.key=void 0,this.subtle=e,this.key=t}return e.prototype.expandKey=function(){return this.subtle.importKey("raw",this.key,{name:"AES-CBC"},!1,["encrypt","decrypt"])},e}(),pi=function(){function e(){this.rcon=[0,1,2,4,8,16,32,64,128,27,54],this.subMix=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)],this.invSubMix=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)],this.sBox=new Uint32Array(256),this.invSBox=new Uint32Array(256),this.key=new Uint32Array(0),this.ksRows=0,this.keySize=0,this.keySchedule=void 0,this.invKeySchedule=void 0,this.initTable()}var t=e.prototype;return t.uint8ArrayToUint32Array_=function(e){for(var t=new DataView(e),r=new Uint32Array(4),i=0;i<4;i++)r[i]=t.getUint32(4*i);return r},t.initTable=function(){var e=this.sBox,t=this.invSBox,r=this.subMix,i=r[0],n=r[1],a=r[2],s=r[3],o=this.invSubMix,l=o[0],u=o[1],h=o[2],d=o[3],c=new Uint32Array(256),f=0,g=0,v=0;for(v=0;v<256;v++)c[v]=v<128?v<<1:v<<1^283;for(v=0;v<256;v++){var m=g^g<<1^g<<2^g<<3^g<<4;m=m>>>8^255&m^99,e[f]=m,t[m]=f;var p=c[f],y=c[p],E=c[y],T=257*c[m]^16843008*m;i[f]=T<<24|T>>>8,n[f]=T<<16|T>>>16,a[f]=T<<8|T>>>24,s[f]=T,T=16843009*E^65537*y^257*p^16843008*f,l[m]=T<<24|T>>>8,u[m]=T<<16|T>>>16,h[m]=T<<8|T>>>24,d[m]=T,f?(f=p^c[c[c[E^p]]],g^=c[c[g]]):f=g=1}},t.expandKey=function(e){for(var t=this.uint8ArrayToUint32Array_(e),r=!0,i=0;i<t.length&&r;)r=t[i]===this.key[i],i++;if(!r){this.key=t;var n=this.keySize=t.length;if(4!==n&&6!==n&&8!==n)throw new Error("Invalid aes key size="+n);var a,s,o,l,u=this.ksRows=4*(n+6+1),h=this.keySchedule=new Uint32Array(u),d=this.invKeySchedule=new Uint32Array(u),c=this.sBox,f=this.rcon,g=this.invSubMix,v=g[0],m=g[1],p=g[2],y=g[3];for(a=0;a<u;a++)a<n?o=h[a]=t[a]:(l=o,a%n==0?(l=c[(l=l<<8|l>>>24)>>>24]<<24|c[l>>>16&255]<<16|c[l>>>8&255]<<8|c[255&l],l^=f[a/n|0]<<24):n>6&&a%n==4&&(l=c[l>>>24]<<24|c[l>>>16&255]<<16|c[l>>>8&255]<<8|c[255&l]),h[a]=o=(h[a-n]^l)>>>0);for(s=0;s<u;s++)a=u-s,l=3&s?h[a]:h[a-4],d[s]=s<4||a<=4?l:v[c[l>>>24]]^m[c[l>>>16&255]]^p[c[l>>>8&255]]^y[c[255&l]],d[s]=d[s]>>>0}},t.networkToHostOrderSwap=function(e){return e<<24|(65280&e)<<8|(16711680&e)>>8|e>>>24},t.decrypt=function(e,t,r){for(var i,n,a,s,o,l,u,h,d,c,f,g,v,m,p=this.keySize+6,y=this.invKeySchedule,E=this.invSBox,T=this.invSubMix,S=T[0],L=T[1],A=T[2],R=T[3],k=this.uint8ArrayToUint32Array_(r),b=k[0],D=k[1],I=k[2],w=k[3],C=new Int32Array(e),_=new Int32Array(C.length),x=this.networkToHostOrderSwap;t<C.length;){for(d=x(C[t]),c=x(C[t+1]),f=x(C[t+2]),g=x(C[t+3]),o=d^y[0],l=g^y[1],u=f^y[2],h=c^y[3],v=4,m=1;m<p;m++)i=S[o>>>24]^L[l>>16&255]^A[u>>8&255]^R[255&h]^y[v],n=S[l>>>24]^L[u>>16&255]^A[h>>8&255]^R[255&o]^y[v+1],a=S[u>>>24]^L[h>>16&255]^A[o>>8&255]^R[255&l]^y[v+2],s=S[h>>>24]^L[o>>16&255]^A[l>>8&255]^R[255&u]^y[v+3],o=i,l=n,u=a,h=s,v+=4;i=E[o>>>24]<<24^E[l>>16&255]<<16^E[u>>8&255]<<8^E[255&h]^y[v],n=E[l>>>24]<<24^E[u>>16&255]<<16^E[h>>8&255]<<8^E[255&o]^y[v+1],a=E[u>>>24]<<24^E[h>>16&255]<<16^E[o>>8&255]<<8^E[255&l]^y[v+2],s=E[h>>>24]<<24^E[o>>16&255]<<16^E[l>>8&255]<<8^E[255&u]^y[v+3],_[t]=x(i^b),_[t+1]=x(s^D),_[t+2]=x(a^I),_[t+3]=x(n^w),b=d,D=c,I=f,w=g,t+=4}return _.buffer},e}(),yi=function(){function e(e,t){var r=(void 0===t?{}:t).removePKCS7Padding,i=void 0===r||r;if(this.logEnabled=!0,this.removePKCS7Padding=void 0,this.subtle=null,this.softwareDecrypter=null,this.key=null,this.fastAesKey=null,this.remainderData=null,this.currentIV=null,this.currentResult=null,this.useSoftware=void 0,this.useSoftware=e.enableSoftwareAES,this.removePKCS7Padding=i,i)try{var n=self.crypto;n&&(this.subtle=n.subtle||n.webkitSubtle)}catch(e){}this.useSoftware=!this.subtle}var t=e.prototype;return t.destroy=function(){this.subtle=null,this.softwareDecrypter=null,this.key=null,this.fastAesKey=null,this.remainderData=null,this.currentIV=null,this.currentResult=null},t.isSync=function(){return this.useSoftware},t.flush=function(){var e=this.currentResult,t=this.remainderData;if(!e||t)return this.reset(),null;var r,i,n,a=new Uint8Array(e);return this.reset(),this.removePKCS7Padding?(i=(r=a).byteLength,(n=i&&new DataView(r.buffer).getUint8(i-1))?ue(r,0,i-n):r):a},t.reset=function(){this.currentResult=null,this.currentIV=null,this.remainderData=null,this.softwareDecrypter&&(this.softwareDecrypter=null)},t.decrypt=function(e,t,r){var i=this;return this.useSoftware?new Promise((function(n,a){i.softwareDecrypt(new Uint8Array(e),t,r);var s=i.flush();s?n(s.buffer):a(new Error("[softwareDecrypt] Failed to decrypt data"))})):this.webCryptoDecrypt(new Uint8Array(e),t,r)},t.softwareDecrypt=function(e,t,r){var i=this.currentIV,n=this.currentResult,a=this.remainderData;this.logOnce("JS AES decrypt"),a&&(e=je(a,e),this.remainderData=null);var s=this.getValidChunk(e);if(!s.length)return null;i&&(r=i);var o=this.softwareDecrypter;o||(o=this.softwareDecrypter=new pi),o.expandKey(t);var l=n;return this.currentResult=o.decrypt(s.buffer,0,r),this.currentIV=ue(s,-16).buffer,l||null},t.webCryptoDecrypt=function(e,t,r){var i=this;if(this.key!==t||!this.fastAesKey){if(!this.subtle)return Promise.resolve(this.onWebCryptoError(e,t,r));this.key=t,this.fastAesKey=new mi(this.subtle,t)}return this.fastAesKey.expandKey().then((function(t){return i.subtle?(i.logOnce("WebCrypto AES decrypt"),new vi(i.subtle,new Uint8Array(r)).decrypt(e.buffer,t)):Promise.reject(new Error("web crypto not initialized"))})).catch((function(n){return w.warn("[decrypter]: WebCrypto Error, disable WebCrypto API, "+n.name+": "+n.message),i.onWebCryptoError(e,t,r)}))},t.onWebCryptoError=function(e,t,r){this.useSoftware=!0,this.logEnabled=!0,this.softwareDecrypt(e,t,r);var i=this.flush();if(i)return i.buffer;throw new Error("WebCrypto and softwareDecrypt: failed to decrypt data")},t.getValidChunk=function(e){var t=e,r=e.length-e.length%16;return r!==e.length&&(t=ue(e,0,r),this.remainderData=ue(e,r)),t},t.logOnce=function(e){this.logEnabled&&(w.log("[decrypter]: "+e),this.logEnabled=!1)},e}(),Ei=function(e){for(var t="",r=e.length,i=0;i<r;i++)t+="["+e.start(i).toFixed(3)+"-"+e.end(i).toFixed(3)+"]";return t},Ti="STOPPED",Si="IDLE",Li="KEY_LOADING",Ai="FRAG_LOADING",Ri="FRAG_LOADING_WAITING_RETRY",ki="WAITING_TRACK",bi="PARSING",Di="PARSED",Ii="ENDED",wi="ERROR",Ci="WAITING_INIT_PTS",_i="WAITING_LEVEL",xi=function(e){function t(t,r,i,n,a){var s;return(s=e.call(this)||this).hls=void 0,s.fragPrevious=null,s.fragCurrent=null,s.fragmentTracker=void 0,s.transmuxer=null,s._state=Ti,s.playlistType=void 0,s.media=null,s.mediaBuffer=null,s.config=void 0,s.bitrateTest=!1,s.lastCurrentTime=0,s.nextLoadPosition=0,s.startPosition=0,s.startTimeOffset=null,s.loadedmetadata=!1,s.retryDate=0,s.levels=null,s.fragmentLoader=void 0,s.keyLoader=void 0,s.levelLastLoaded=null,s.startFragRequested=!1,s.decrypter=void 0,s.initPTS=[],s.buffering=!0,s.onvseeking=null,s.onvended=null,s.logPrefix="",s.log=void 0,s.warn=void 0,s.playlistType=a,s.logPrefix=n,s.log=w.log.bind(w,n+":"),s.warn=w.warn.bind(w,n+":"),s.hls=t,s.fragmentLoader=new di(t.config),s.keyLoader=i,s.fragmentTracker=r,s.config=t.config,s.decrypter=new yi(t.config),t.on(S.MANIFEST_LOADED,s.onManifestLoaded,function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(s)),s}l(t,e);var r=t.prototype;return r.doTick=function(){this.onTickEnd()},r.onTickEnd=function(){},r.startLoad=function(e){},r.stopLoad=function(){this.fragmentLoader.abort(),this.keyLoader.abort(this.playlistType);var e=this.fragCurrent;null!=e&&e.loader&&(e.abortRequests(),this.fragmentTracker.removeFragment(e)),this.resetTransmuxer(),this.fragCurrent=null,this.fragPrevious=null,this.clearInterval(),this.clearNextTick(),this.state=Ti},r.pauseBuffering=function(){this.buffering=!1},r.resumeBuffering=function(){this.buffering=!0},r._streamEnded=function(e,t){if(t.live||e.nextStart||!e.end||!this.media)return!1;var r=t.partList;if(null!=r&&r.length){var i=r[r.length-1];return ii.isBuffered(this.media,i.start+i.duration/2)}var n=t.fragments[t.fragments.length-1].type;return this.fragmentTracker.isEndListAppended(n)},r.getLevelDetails=function(){var e;if(this.levels&&null!==this.levelLastLoaded)return null==(e=this.levelLastLoaded)?void 0:e.details},r.onMediaAttached=function(e,t){var r=this.media=this.mediaBuffer=t.media;this.onvseeking=this.onMediaSeeking.bind(this),this.onvended=this.onMediaEnded.bind(this),r.addEventListener("seeking",this.onvseeking),r.addEventListener("ended",this.onvended);var i=this.config;this.levels&&i.autoStartLoad&&this.state===Ti&&this.startLoad(i.startPosition)},r.onMediaDetaching=function(){var e=this.media;null!=e&&e.ended&&(this.log("MSE detaching and video ended, reset startPosition"),this.startPosition=this.lastCurrentTime=0),e&&this.onvseeking&&this.onvended&&(e.removeEventListener("seeking",this.onvseeking),e.removeEventListener("ended",this.onvended),this.onvseeking=this.onvended=null),this.keyLoader&&this.keyLoader.detach(),this.media=this.mediaBuffer=null,this.loadedmetadata=!1,this.fragmentTracker.removeAllFragments(),this.stopLoad()},r.onMediaSeeking=function(){var e=this.config,t=this.fragCurrent,r=this.media,i=this.mediaBuffer,n=this.state,a=r?r.currentTime:0,s=ii.bufferInfo(i||r,a,e.maxBufferHole);if(this.log("media seeking to "+(y(a)?a.toFixed(3):a)+", state: "+n),this.state===Ii)this.resetLoadingState();else if(t){var o=e.maxFragLookUpTolerance,l=t.start-o,u=t.start+t.duration+o;if(!s.len||u<s.start||l>s.end){var h=a>u;(a<l||h)&&(h&&t.loader&&(this.log("seeking outside of buffer while fragment load in progress, cancel fragment load"),t.abortRequests(),this.resetLoadingState()),this.fragPrevious=null)}}r&&(this.fragmentTracker.removeFragmentsInRange(a,1/0,this.playlistType,!0),this.lastCurrentTime=a),this.loadedmetadata||s.len||(this.nextLoadPosition=this.startPosition=a),this.tickImmediate()},r.onMediaEnded=function(){this.startPosition=this.lastCurrentTime=0},r.onManifestLoaded=function(e,t){this.startTimeOffset=t.startTimeOffset,this.initPTS=[]},r.onHandlerDestroying=function(){this.hls.off(S.MANIFEST_LOADED,this.onManifestLoaded,this),this.stopLoad(),e.prototype.onHandlerDestroying.call(this),this.hls=null},r.onHandlerDestroyed=function(){this.state=Ti,this.fragmentLoader&&this.fragmentLoader.destroy(),this.keyLoader&&this.keyLoader.destroy(),this.decrypter&&this.decrypter.destroy(),this.hls=this.log=this.warn=this.decrypter=this.keyLoader=this.fragmentLoader=this.fragmentTracker=null,e.prototype.onHandlerDestroyed.call(this)},r.loadFragment=function(e,t,r){this._loadFragForPlayback(e,t,r)},r._loadFragForPlayback=function(e,t,r){var i=this;this._doFragLoad(e,t,r,(function(t){if(i.fragContextChanged(e))return i.warn("Fragment "+e.sn+(t.part?" p: "+t.part.index:"")+" of level "+e.level+" was dropped during download."),void i.fragmentTracker.removeFragment(e);e.stats.chunkCount++,i._handleFragmentLoadProgress(t)})).then((function(t){if(t){var r=i.state;i.fragContextChanged(e)?(r===Ai||!i.fragCurrent&&r===bi)&&(i.fragmentTracker.removeFragment(e),i.state=Si):("payload"in t&&(i.log("Loaded fragment "+e.sn+" of level "+e.level),i.hls.trigger(S.FRAG_LOADED,t)),i._handleFragmentLoadComplete(t))}})).catch((function(t){i.state!==Ti&&i.state!==wi&&(i.warn("Frag error: "+((null==t?void 0:t.message)||t)),i.resetFragmentLoading(e))}))},r.clearTrackerIfNeeded=function(e){var t,r=this.fragmentTracker;if(r.getState(e)===Qr){var i=e.type,n=this.getFwdBufferInfo(this.mediaBuffer,i),a=Math.max(e.duration,n?n.len:this.config.maxBufferLength),s=this.backtrackFragment;(1==(s?e.sn-s.sn:0)||this.reduceMaxBufferLength(a,e.duration))&&r.removeFragment(e)}else 0===(null==(t=this.mediaBuffer)?void 0:t.buffered.length)?r.removeAllFragments():r.hasParts(e.type)&&(r.detectPartialFragments({frag:e,part:null,stats:e.stats,id:e.type}),r.getState(e)===Jr&&r.removeFragment(e))},r.checkLiveUpdate=function(e){if(e.updated&&!e.live){var t=e.fragments[e.fragments.length-1];this.fragmentTracker.detectPartialFragments({frag:t,part:null,stats:t.stats,id:t.type})}e.fragments[0]||(e.deltaUpdateFailed=!0)},r.flushMainBuffer=function(e,t,r){if(void 0===r&&(r=null),e-t){var i={startOffset:e,endOffset:t,type:r};this.hls.trigger(S.BUFFER_FLUSHING,i)}},r._loadInitSegment=function(e,t){var r=this;this._doFragLoad(e,t).then((function(t){if(!t||r.fragContextChanged(e)||!r.levels)throw new Error("init load aborted");return t})).then((function(t){var i=r.hls,n=t.payload,a=e.decryptdata;if(n&&n.byteLength>0&&null!=a&&a.key&&a.iv&&"AES-128"===a.method){var s=self.performance.now();return r.decrypter.decrypt(new Uint8Array(n),a.key.buffer,a.iv.buffer).catch((function(t){throw i.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_DECRYPT_ERROR,fatal:!1,error:t,reason:t.message,frag:e}),t})).then((function(n){var a=self.performance.now();return i.trigger(S.FRAG_DECRYPTED,{frag:e,payload:n,stats:{tstart:s,tdecrypt:a}}),t.payload=n,r.completeInitSegmentLoad(t)}))}return r.completeInitSegmentLoad(t)})).catch((function(t){r.state!==Ti&&r.state!==wi&&(r.warn(t),r.resetFragmentLoading(e))}))},r.completeInitSegmentLoad=function(e){if(!this.levels)throw new Error("init load aborted, missing levels");var t=e.frag.stats;this.state=Si,e.frag.data=new Uint8Array(e.payload),t.parsing.start=t.buffering.start=self.performance.now(),t.parsing.end=t.buffering.end=self.performance.now(),this.tick()},r.fragContextChanged=function(e){var t=this.fragCurrent;return!e||!t||e.sn!==t.sn||e.level!==t.level},r.fragBufferedComplete=function(e,t){var r,i,n,a,s=this.mediaBuffer?this.mediaBuffer:this.media;if(this.log("Buffered "+e.type+" sn: "+e.sn+(t?" part: "+t.index:"")+" of "+(this.playlistType===Mt?"level":"track")+" "+e.level+" (frag:["+(null!=(r=e.startPTS)?r:NaN).toFixed(3)+"-"+(null!=(i=e.endPTS)?i:NaN).toFixed(3)+"] > buffer:"+(s?Ei(ii.getBuffered(s)):"(detached)")+")"),"initSegment"!==e.sn){var o;if(e.type!==Nt){var l=e.elementaryStreams;if(!Object.keys(l).some((function(e){return!!l[e]})))return void(this.state=Si)}var u=null==(o=this.levels)?void 0:o[e.level];null!=u&&u.fragmentError&&(this.log("Resetting level fragment error count of "+u.fragmentError+" on frag buffered"),u.fragmentError=0)}this.state=Si,s&&(!this.loadedmetadata&&e.type==Mt&&s.buffered.length&&(null==(n=this.fragCurrent)?void 0:n.sn)===(null==(a=this.fragPrevious)?void 0:a.sn)&&(this.loadedmetadata=!0,this.seekToStartPos()),this.tick())},r.seekToStartPos=function(){},r._handleFragmentLoadComplete=function(e){var t=this.transmuxer;if(t){var r=e.frag,i=e.part,n=e.partsLoaded,a=!n||0===n.length||n.some((function(e){return!e})),s=new ni(r.level,r.sn,r.stats.chunkCount+1,0,i?i.index:-1,!a);t.flush(s)}},r._handleFragmentLoadProgress=function(e){},r._doFragLoad=function(e,t,r,i){var n,a=this;void 0===r&&(r=null);var s=null==t?void 0:t.details;if(!this.levels||!s)throw new Error("frag load aborted, missing level"+(s?"":" detail")+"s");var o=null;if(!e.encrypted||null!=(n=e.decryptdata)&&n.key?!e.encrypted&&s.encryptedFragments.length&&this.keyLoader.loadClear(e,s.encryptedFragments):(this.log("Loading key for "+e.sn+" of ["+s.startSN+"-"+s.endSN+"], "+("[stream-controller]"===this.logPrefix?"level":"track")+" "+e.level),this.state=Li,this.fragCurrent=e,o=this.keyLoader.load(e).then((function(e){if(!a.fragContextChanged(e.frag))return a.hls.trigger(S.KEY_LOADED,e),a.state===Li&&(a.state=Si),e})),this.hls.trigger(S.KEY_LOADING,{frag:e}),null===this.fragCurrent&&(o=Promise.reject(new Error("frag load aborted, context changed in KEY_LOADING")))),r=Math.max(e.start,r||0),this.config.lowLatencyMode&&"initSegment"!==e.sn){var l=s.partList;if(l&&i){r>e.end&&s.fragmentHint&&(e=s.fragmentHint);var u=this.getNextPart(l,e,r);if(u>-1){var h,d=l[u];return this.log("Loading part sn: "+e.sn+" p: "+d.index+" cc: "+e.cc+" of playlist ["+s.startSN+"-"+s.endSN+"] parts [0-"+u+"-"+(l.length-1)+"] "+("[stream-controller]"===this.logPrefix?"level":"track")+": "+e.level+", target: "+parseFloat(r.toFixed(3))),this.nextLoadPosition=d.start+d.duration,this.state=Ai,h=o?o.then((function(r){return!r||a.fragContextChanged(r.frag)?null:a.doFragPartsLoad(e,d,t,i)})).catch((function(e){return a.handleFragLoadError(e)})):this.doFragPartsLoad(e,d,t,i).catch((function(e){return a.handleFragLoadError(e)})),this.hls.trigger(S.FRAG_LOADING,{frag:e,part:d,targetBufferTime:r}),null===this.fragCurrent?Promise.reject(new Error("frag load aborted, context changed in FRAG_LOADING parts")):h}if(!e.url||this.loadedEndOfParts(l,r))return Promise.resolve(null)}}this.log("Loading fragment "+e.sn+" cc: "+e.cc+" "+(s?"of ["+s.startSN+"-"+s.endSN+"] ":"")+("[stream-controller]"===this.logPrefix?"level":"track")+": "+e.level+", target: "+parseFloat(r.toFixed(3))),y(e.sn)&&!this.bitrateTest&&(this.nextLoadPosition=e.start+e.duration),this.state=Ai;var c,f=this.config.progressive;return c=f&&o?o.then((function(t){return!t||a.fragContextChanged(null==t?void 0:t.frag)?null:a.fragmentLoader.load(e,i)})).catch((function(e){return a.handleFragLoadError(e)})):Promise.all([this.fragmentLoader.load(e,f?i:void 0),o]).then((function(e){var t=e[0];return!f&&t&&i&&i(t),t})).catch((function(e){return a.handleFragLoadError(e)})),this.hls.trigger(S.FRAG_LOADING,{frag:e,targetBufferTime:r}),null===this.fragCurrent?Promise.reject(new Error("frag load aborted, context changed in FRAG_LOADING")):c},r.doFragPartsLoad=function(e,t,r,i){var n=this;return new Promise((function(a,s){var o,l=[],u=null==(o=r.details)?void 0:o.partList;!function t(o){n.fragmentLoader.loadPart(e,o,i).then((function(i){l[o.index]=i;var s=i.part;n.hls.trigger(S.FRAG_LOADED,i);var h=vr(r,e.sn,o.index+1)||mr(u,e.sn,o.index+1);if(!h)return a({frag:e,part:s,partsLoaded:l});t(h)})).catch(s)}(t)}))},r.handleFragLoadError=function(e){if("data"in e){var t=e.data;e.data&&t.details===A.INTERNAL_ABORTED?this.handleFragLoadAborted(t.frag,t.part):this.hls.trigger(S.ERROR,t)}else this.hls.trigger(S.ERROR,{type:L.OTHER_ERROR,details:A.INTERNAL_EXCEPTION,err:e,error:e,fatal:!0});return null},r._handleTransmuxerFlush=function(e){var t=this.getCurrentContext(e);if(t&&this.state===bi){var r=t.frag,i=t.part,n=t.level,a=self.performance.now();r.stats.parsing.end=a,i&&(i.stats.parsing.end=a),this.updateLevelTiming(r,i,n,e.partial)}else this.fragCurrent||this.state===Ti||this.state===wi||(this.state=Si)},r.getCurrentContext=function(e){var t=this.levels,r=this.fragCurrent,i=e.level,n=e.sn,a=e.part;if(null==t||!t[i])return this.warn("Levels object was unset while buffering fragment "+n+" of level "+i+". The current chunk will not be buffered."),null;var s=t[i],o=a>-1?vr(s,n,a):null,l=o?o.fragment:function(e,t,r){if(null==e||!e.details)return null;var i=e.details,n=i.fragments[t-i.startSN];return n||((n=i.fragmentHint)&&n.sn===t?n:t<i.startSN&&r&&r.sn===t?r:null)}(s,n,r);return l?(r&&r!==l&&(l.stats=r.stats),{frag:l,part:o,level:s}):null},r.bufferFragmentData=function(e,t,r,i,n){var a;if(e&&this.state===bi){var s=e.data1,o=e.data2,l=s;if(s&&o&&(l=je(s,o)),null!=(a=l)&&a.length){var u={type:e.type,frag:t,part:r,chunkMeta:i,parent:t.type,data:l};if(this.hls.trigger(S.BUFFER_APPENDING,u),e.dropped&&e.independent&&!r){if(n)return;this.flushBufferGap(t)}}}},r.flushBufferGap=function(e){var t=this.media;if(t)if(ii.isBuffered(t,t.currentTime)){var r=t.currentTime,i=ii.bufferInfo(t,r,0),n=e.duration,a=Math.min(2*this.config.maxFragLookUpTolerance,.25*n),s=Math.max(Math.min(e.start-a,i.end-a),r+a);e.start-s>a&&this.flushMainBuffer(s,e.start)}else this.flushMainBuffer(0,e.start)},r.getFwdBufferInfo=function(e,t){var r=this.getLoadPosition();return y(r)?this.getFwdBufferInfoAtPos(e,r,t):null},r.getFwdBufferInfoAtPos=function(e,t,r){var i=this.config.maxBufferHole,n=ii.bufferInfo(e,t,i);if(0===n.len&&void 0!==n.nextStart){var a=this.fragmentTracker.getBufferedFrag(t,r);if(a&&n.nextStart<a.end)return ii.bufferInfo(e,t,Math.max(n.nextStart,i))}return n},r.getMaxBufferLength=function(e){var t,r=this.config;return t=e?Math.max(8*r.maxBufferSize/e,r.maxBufferLength):r.maxBufferLength,Math.min(t,r.maxMaxBufferLength)},r.reduceMaxBufferLength=function(e,t){var r=this.config,i=Math.max(Math.min(e-t,r.maxBufferLength),t),n=Math.max(e-3*t,r.maxMaxBufferLength/2,i);return n>=i&&(r.maxMaxBufferLength=n,this.warn("Reduce max buffer length to "+n+"s"),!0)},r.getAppendedFrag=function(e,t){var r=this.fragmentTracker.getAppendedFrag(e,Mt);return r&&"fragment"in r?r.fragment:r},r.getNextFragment=function(e,t){var r=t.fragments,i=r.length;if(!i)return null;var n,a=this.config,s=r[0].start;if(t.live){var o=a.initialLiveManifestSize;if(i<o)return this.warn("Not enough fragments to start playback (have: "+i+", need: "+o+")"),null;(!t.PTSKnown&&!this.startFragRequested&&-1===this.startPosition||e<s)&&(n=this.getInitialLiveFragment(t,r),this.startPosition=this.nextLoadPosition=n?this.hls.liveSyncPosition||n.start:e)}else e<=s&&(n=r[0]);if(!n){var l=a.lowLatencyMode?t.partEnd:t.fragmentEnd;n=this.getFragmentAtPosition(e,l,t)}return this.mapToInitFragWhenRequired(n)},r.isLoopLoading=function(e,t){var r=this.fragmentTracker.getState(e);return(r===$r||r===Jr&&!!e.gap)&&this.nextLoadPosition>t},r.getNextFragmentLoopLoading=function(e,t,r,i,n){var a=e.gap,s=this.getNextFragment(this.nextLoadPosition,t);if(null===s)return s;if(e=s,a&&e&&!e.gap&&r.nextStart){var o=this.getFwdBufferInfoAtPos(this.mediaBuffer?this.mediaBuffer:this.media,r.nextStart,i);if(null!==o&&r.len+o.len>=n)return this.log('buffer full after gaps in "'+i+'" playlist starting at sn: '+e.sn),null}return e},r.mapToInitFragWhenRequired=function(e){return null==e||!e.initSegment||null!=e&&e.initSegment.data||this.bitrateTest?e:e.initSegment},r.getNextPart=function(e,t,r){for(var i=-1,n=!1,a=!0,s=0,o=e.length;s<o;s++){var l=e[s];if(a=a&&!l.independent,i>-1&&r<l.start)break;var u=l.loaded;u?i=-1:(n||l.independent||a)&&l.fragment===t&&(i=s),n=u}return i},r.loadedEndOfParts=function(e,t){var r=e[e.length-1];return r&&t>r.start&&r.loaded},r.getInitialLiveFragment=function(e,t){var r=this.fragPrevious,i=null;if(r){if(e.hasProgramDateTime&&(this.log("Live playlist, switching playlist, load frag with same PDT: "+r.programDateTime),i=function(e,t,r){if(null===t||!Array.isArray(e)||!e.length||!y(t))return null;if(t<(e[0].programDateTime||0))return null;if(t>=(e[e.length-1].endProgramDateTime||0))return null;r=r||0;for(var i=0;i<e.length;++i){var n=e[i];if(br(t,r,n))return n}return null}(t,r.endProgramDateTime,this.config.maxFragLookUpTolerance)),!i){var n=r.sn+1;if(n>=e.startSN&&n<=e.endSN){var a=t[n-e.startSN];r.cc===a.cc&&(i=a,this.log("Live playlist, switching playlist, load frag with next SN: "+i.sn))}i||(i=function(e,t){return Ar(e,(function(e){return e.cc<t?1:e.cc>t?-1:0}))}(t,r.cc),i&&this.log("Live playlist, switching playlist, load frag with same CC: "+i.sn))}}else{var s=this.hls.liveSyncPosition;null!==s&&(i=this.getFragmentAtPosition(s,this.bitrateTest?e.fragmentEnd:e.edge,e))}return i},r.getFragmentAtPosition=function(e,t,r){var i,n=this.config,a=this.fragPrevious,s=r.fragments,o=r.endSN,l=r.fragmentHint,u=n.maxFragLookUpTolerance,h=r.partList,d=!!(n.lowLatencyMode&&null!=h&&h.length&&l);if(d&&l&&!this.bitrateTest&&(s=s.concat(l),o=l.sn),i=e<t?Rr(a,s,e,e>t-u?0:u):s[s.length-1]){var c=i.sn-r.startSN,f=this.fragmentTracker.getState(i);if((f===$r||f===Jr&&i.gap)&&(a=i),a&&i.sn===a.sn&&(!d||h[0].fragment.sn>i.sn)&&a&&i.level===a.level){var g=s[c+1];i=i.sn<o&&this.fragmentTracker.getState(g)!==$r?g:null}}return i},r.synchronizeToLiveEdge=function(e){var t=this.config,r=this.media;if(r){var i=this.hls.liveSyncPosition,n=r.currentTime,a=e.fragments[0].start,s=e.edge,o=n>=a-t.maxFragLookUpTolerance&&n<=s;if(null!==i&&r.duration>i&&(n<i||!o)){var l=void 0!==t.liveMaxLatencyDuration?t.liveMaxLatencyDuration:t.liveMaxLatencyDurationCount*e.targetduration;(!o&&r.readyState<4||n<s-l)&&(this.loadedmetadata||(this.nextLoadPosition=i),r.readyState&&(this.warn("Playback: "+n.toFixed(3)+" is located too far from the end of live sliding playlist: "+s+", reset currentTime to : "+i.toFixed(3)),r.currentTime=i))}}},r.alignPlaylists=function(e,t,r){var i=e.fragments.length;if(!i)return this.warn("No fragments in live playlist"),0;var n=e.fragments[0].start,a=!t,s=e.alignedSliding&&y(n);if(a||!s&&!n){var o=this.fragPrevious;li(o,r,e);var l=e.fragments[0].start;return this.log("Live playlist sliding: "+l.toFixed(2)+" start-sn: "+(t?t.startSN:"na")+"->"+e.startSN+" prev-sn: "+(o?o.sn:"na")+" fragments: "+i),l}return n},r.waitForCdnTuneIn=function(e){return e.live&&e.canBlockReload&&e.partTarget&&e.tuneInGoal>Math.max(e.partHoldBack,3*e.partTarget)},r.setStartPosition=function(e,t){var r=this.startPosition;if(r<t&&(r=-1),-1===r||-1===this.lastCurrentTime){var i=null!==this.startTimeOffset,n=i?this.startTimeOffset:e.startTimeOffset;null!==n&&y(n)?(r=t+n,n<0&&(r+=e.totalduration),r=Math.min(Math.max(t,r),t+e.totalduration),this.log("Start time offset "+n+" found in "+(i?"multivariant":"media")+" playlist, adjust startPosition to "+r),this.startPosition=r):e.live?r=this.hls.liveSyncPosition||t:this.startPosition=r=0,this.lastCurrentTime=r}this.nextLoadPosition=r},r.getLoadPosition=function(){var e=this.media,t=0;return this.loadedmetadata&&e?t=e.currentTime:this.nextLoadPosition&&(t=this.nextLoadPosition),t},r.handleFragLoadAborted=function(e,t){this.transmuxer&&"initSegment"!==e.sn&&e.stats.aborted&&(this.warn("Fragment "+e.sn+(t?" part "+t.index:"")+" of level "+e.level+" was aborted"),this.resetFragmentLoading(e))},r.resetFragmentLoading=function(e){this.fragCurrent&&(this.fragContextChanged(e)||this.state===Ri)||(this.state=Si)},r.onFragmentOrKeyLoadError=function(e,t){if(t.chunkMeta&&!t.frag){var r=this.getCurrentContext(t.chunkMeta);r&&(t.frag=r.frag)}var i=t.frag;if(i&&i.type===e&&this.levels)if(this.fragContextChanged(i)){var n;this.warn("Frag load error must match current frag to retry "+i.url+" > "+(null==(n=this.fragCurrent)?void 0:n.url))}else{var a=t.details===A.FRAG_GAP;a&&this.fragmentTracker.fragBuffered(i,!0);var s=t.errorAction,o=s||{},l=o.action,u=o.retryCount,h=void 0===u?0:u,d=o.retryConfig;if(s&&l===Cr&&d){this.resetStartWhenNotLoaded(this.levelLastLoaded);var c=Tr(d,h);this.warn("Fragment "+i.sn+" of "+e+" "+i.level+" errored with "+t.details+", retrying loading "+(h+1)+"/"+d.maxNumRetry+" in "+c+"ms"),s.resolved=!0,this.retryDate=self.performance.now()+c,this.state=Ri}else if(d&&s){if(this.resetFragmentErrors(e),!(h<d.maxNumRetry))return void w.warn(t.details+" reached or exceeded max retry ("+h+")");a||l===wr||(s.resolved=!0)}else(null==s?void 0:s.action)===Ir?this.state=_i:this.state=wi;this.tickImmediate()}},r.reduceLengthAndFlushBuffer=function(e){if(this.state===bi||this.state===Di){var t=e.frag,r=e.parent,i=this.getFwdBufferInfo(this.mediaBuffer,r),n=i&&i.len>.5;n&&this.reduceMaxBufferLength(i.len,(null==t?void 0:t.duration)||10);var a=!n;return a&&this.warn("Buffer full error while media.currentTime is not buffered, flush "+r+" buffer"),t&&(this.fragmentTracker.removeFragment(t),this.nextLoadPosition=t.start),this.resetLoadingState(),a}return!1},r.resetFragmentErrors=function(e){e===Ot&&(this.fragCurrent=null),this.loadedmetadata||(this.startFragRequested=!1),this.state!==Ti&&(this.state=Si)},r.afterBufferFlushed=function(e,t,r){if(e){var i=ii.getBuffered(e);this.fragmentTracker.detectEvictedFragments(t,i,r),this.state===Ii&&this.resetLoadingState()}},r.resetLoadingState=function(){this.log("Reset loading state"),this.fragCurrent=null,this.fragPrevious=null,this.state=Si},r.resetStartWhenNotLoaded=function(e){if(!this.loadedmetadata){this.startFragRequested=!1;var t=e?e.details:null;null!=t&&t.live?(this.startPosition=-1,this.setStartPosition(t,0),this.resetLoadingState()):this.nextLoadPosition=this.startPosition}},r.resetWhenMissingContext=function(e){this.warn("The loading context changed while buffering fragment "+e.sn+" of level "+e.level+". This chunk will not be buffered."),this.removeUnbufferedFrags(),this.resetStartWhenNotLoaded(this.levelLastLoaded),this.resetLoadingState()},r.removeUnbufferedFrags=function(e){void 0===e&&(e=0),this.fragmentTracker.removeFragmentsInRange(e,1/0,this.playlistType,!1,!0)},r.updateLevelTiming=function(e,t,r,i){var n,a=this,s=r.details;if(s){if(!Object.keys(e.elementaryStreams).reduce((function(t,n){var o=e.elementaryStreams[n];if(o){var l=o.endPTS-o.startPTS;if(l<=0)return a.warn("Could not parse fragment "+e.sn+" "+n+" duration reliably ("+l+")"),t||!1;var u=i?0:dr(s,e,o.startPTS,o.endPTS,o.startDTS,o.endDTS);return a.hls.trigger(S.LEVEL_PTS_UPDATED,{details:s,level:r,drift:u,type:n,frag:e,start:o.startPTS,end:o.endPTS}),!0}return t}),!1)&&null===(null==(n=this.transmuxer)?void 0:n.error)){var o=new Error("Found no media in fragment "+e.sn+" of level "+e.level+" resetting transmuxer to fallback to playlist timing");if(0===r.fragmentError&&(r.fragmentError++,e.gap=!0,this.fragmentTracker.removeFragment(e),this.fragmentTracker.fragBuffered(e,!0)),this.warn(o.message),this.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,fatal:!1,error:o,frag:e,reason:"Found no media in msn "+e.sn+' of level "'+r.url+'"'}),!this.hls)return;this.resetTransmuxer()}this.state=Di,this.hls.trigger(S.FRAG_PARSED,{frag:e,part:t})}else this.warn("level.details undefined")},r.resetTransmuxer=function(){this.transmuxer&&(this.transmuxer.destroy(),this.transmuxer=null)},r.recoverWorkerError=function(e){"demuxerWorker"===e.event&&(this.fragmentTracker.removeAllFragments(),this.resetTransmuxer(),this.resetStartWhenNotLoaded(this.levelLastLoaded),this.resetLoadingState())},s(t,[{key:"state",get:function(){return this._state},set:function(e){var t=this._state;t!==e&&(this._state=e,this.log(t+"->"+e))}}]),t}(Xr),Pi=function(){function e(){this.chunks=[],this.dataLength=0}var t=e.prototype;return t.push=function(e){this.chunks.push(e),this.dataLength+=e.length},t.flush=function(){var e,t=this.chunks,r=this.dataLength;return t.length?(e=1===t.length?t[0]:function(e,t){for(var r=new Uint8Array(t),i=0,n=0;n<e.length;n++){var a=e[n];r.set(a,i),i+=a.length}return r}(t,r),this.reset(),e):new Uint8Array(0)},t.reset=function(){this.chunks.length=0,this.dataLength=0},e}();function Fi(e,t){return void 0===e&&(e=""),void 0===t&&(t=9e4),{type:e,id:-1,pid:-1,inputTimeScale:t,sequenceNumber:-1,samples:[],dropped:0}}var Mi=function(){function e(){this._audioTrack=void 0,this._id3Track=void 0,this.frameIndex=0,this.cachedData=null,this.basePTS=null,this.initPTS=null,this.lastPTS=null}var t=e.prototype;return t.resetInitSegment=function(e,t,r,i){this._id3Track={type:"id3",id:3,pid:-1,inputTimeScale:9e4,sequenceNumber:0,samples:[],dropped:0}},t.resetTimeStamp=function(e){this.initPTS=e,this.resetContiguity()},t.resetContiguity=function(){this.basePTS=null,this.lastPTS=null,this.frameIndex=0},t.canParse=function(e,t){return!1},t.appendFrame=function(e,t,r){},t.demux=function(e,t){this.cachedData&&(e=je(this.cachedData,e),this.cachedData=null);var r,i=fe(e,0),n=i?i.length:0,a=this._audioTrack,s=this._id3Track,o=i?me(i):void 0,l=e.length;for((null===this.basePTS||0===this.frameIndex&&y(o))&&(this.basePTS=Oi(o,t,this.initPTS),this.lastPTS=this.basePTS),null===this.lastPTS&&(this.lastPTS=this.basePTS),i&&i.length>0&&s.samples.push({pts:this.lastPTS,dts:this.lastPTS,data:i,type:jt,duration:Number.POSITIVE_INFINITY});n<l;){if(this.canParse(e,n)){var u=this.appendFrame(a,e,n);u?(this.frameIndex++,this.lastPTS=u.sample.pts,r=n+=u.length):n=l}else ve(e,n)?(i=fe(e,n),s.samples.push({pts:this.lastPTS,dts:this.lastPTS,data:i,type:jt,duration:Number.POSITIVE_INFINITY}),r=n+=i.length):n++;if(n===l&&r!==l){var h=ue(e,r);this.cachedData?this.cachedData=je(this.cachedData,h):this.cachedData=h}}return{audioTrack:a,videoTrack:Fi(),id3Track:s,textTrack:Fi()}},t.demuxSampleAes=function(e,t,r){return Promise.reject(new Error("["+this+"] This demuxer does not support Sample-AES decryption"))},t.flush=function(e){var t=this.cachedData;return t&&(this.cachedData=null,this.demux(t,0)),{audioTrack:this._audioTrack,videoTrack:Fi(),id3Track:this._id3Track,textTrack:Fi()}},t.destroy=function(){},e}(),Oi=function(e,t,r){return y(e)?90*e:9e4*t+(r?9e4*r.baseTime/r.timescale:0)};function Ni(e,t){return 255===e[t]&&240==(246&e[t+1])}function Ui(e,t){return 1&e[t+1]?7:9}function Bi(e,t){return(3&e[t+3])<<11|e[t+4]<<3|(224&e[t+5])>>>5}function Gi(e,t){return t+1<e.length&&Ni(e,t)}function Ki(e,t){if(Gi(e,t)){var r=Ui(e,t);if(t+r>=e.length)return!1;var i=Bi(e,t);if(i<=r)return!1;var n=t+i;return n===e.length||Gi(e,n)}return!1}function Hi(e,t,r,i,n){if(!e.samplerate){var a=function(e,t,r,i){var n,a,s,o,l=navigator.userAgent.toLowerCase(),u=i,h=[96e3,88200,64e3,48e3,44100,32e3,24e3,22050,16e3,12e3,11025,8e3,7350];n=1+((192&t[r+2])>>>6);var d=(60&t[r+2])>>>2;if(!(d>h.length-1))return s=(1&t[r+2])<<2,s|=(192&t[r+3])>>>6,w.log("manifest codec:"+i+", ADTS type:"+n+", samplingIndex:"+d),/firefox/i.test(l)?d>=6?(n=5,o=new Array(4),a=d-3):(n=2,o=new Array(2),a=d):-1!==l.indexOf("android")?(n=2,o=new Array(2),a=d):(n=5,o=new Array(4),i&&(-1!==i.indexOf("mp4a.40.29")||-1!==i.indexOf("mp4a.40.5"))||!i&&d>=6?a=d-3:((i&&-1!==i.indexOf("mp4a.40.2")&&(d>=6&&1===s||/vivaldi/i.test(l))||!i&&1===s)&&(n=2,o=new Array(2)),a=d)),o[0]=n<<3,o[0]|=(14&d)>>1,o[1]|=(1&d)<<7,o[1]|=s<<3,5===n&&(o[1]|=(14&a)>>1,o[2]=(1&a)<<7,o[2]|=8,o[3]=0),{config:o,samplerate:h[d],channelCount:s,codec:"mp4a.40."+n,manifestCodec:u};var c=new Error("invalid ADTS sampling index:"+d);e.emit(S.ERROR,S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,fatal:!0,error:c,reason:c.message})}(t,r,i,n);if(!a)return;e.config=a.config,e.samplerate=a.samplerate,e.channelCount=a.channelCount,e.codec=a.codec,e.manifestCodec=a.manifestCodec,w.log("parsed codec:"+e.codec+", rate:"+a.samplerate+", channels:"+a.channelCount)}}function Vi(e){return 9216e4/e}function Yi(e,t,r,i,n){var a,s=i+n*Vi(e.samplerate),o=function(e,t){var r=Ui(e,t);if(t+r<=e.length){var i=Bi(e,t)-r;if(i>0)return{headerLength:r,frameLength:i}}}(t,r);if(o){var l=o.frameLength,u=o.headerLength,h=u+l,d=Math.max(0,r+h-t.length);d?(a=new Uint8Array(h-u)).set(t.subarray(r+u,t.length),0):a=t.subarray(r+u,r+h);var c={unit:a,pts:s};return d||e.samples.push(c),{sample:c,length:h,missing:d}}var f=t.length-r;return(a=new Uint8Array(f)).set(t.subarray(r,t.length),0),{sample:{unit:a,pts:s},length:f,missing:-1}}var Wi=null,ji=[32,64,96,128,160,192,224,256,288,320,352,384,416,448,32,48,56,64,80,96,112,128,160,192,224,256,320,384,32,40,48,56,64,80,96,112,128,160,192,224,256,320,32,48,56,64,80,96,112,128,144,160,176,192,224,256,8,16,24,32,40,48,56,64,80,96,112,128,144,160],qi=[44100,48e3,32e3,22050,24e3,16e3,11025,12e3,8e3],Xi=[[0,72,144,12],[0,0,0,0],[0,72,144,12],[0,144,144,12]],zi=[0,1,1,4];function Qi(e,t,r,i,n){if(!(r+24>t.length)){var a=Ji(t,r);if(a&&r+a.frameLength<=t.length){var s=i+n*(9e4*a.samplesPerFrame/a.sampleRate),o={unit:t.subarray(r,r+a.frameLength),pts:s,dts:s};return e.config=[],e.channelCount=a.channelCount,e.samplerate=a.sampleRate,e.samples.push(o),{sample:o,length:a.frameLength,missing:0}}}}function Ji(e,t){var r=e[t+1]>>3&3,i=e[t+1]>>1&3,n=e[t+2]>>4&15,a=e[t+2]>>2&3;if(1!==r&&0!==n&&15!==n&&3!==a){var s=e[t+2]>>1&1,o=e[t+3]>>6,l=1e3*ji[14*(3===r?3-i:3===i?3:4)+n-1],u=qi[3*(3===r?0:2===r?1:2)+a],h=3===o?1:2,d=Xi[r][i],c=zi[i],f=8*d*c,g=Math.floor(d*l/u+s)*c;if(null===Wi){var v=(navigator.userAgent||"").match(/Chrome\/(\d+)/i);Wi=v?parseInt(v[1]):0}return!!Wi&&Wi<=87&&2===i&&l>=224e3&&0===o&&(e[t+3]=128|e[t+3]),{sampleRate:u,channelCount:h,frameLength:g,samplesPerFrame:f}}}function $i(e,t){return 255===e[t]&&224==(224&e[t+1])&&0!=(6&e[t+1])}function Zi(e,t){return t+1<e.length&&$i(e,t)}function en(e,t){if(t+1<e.length&&$i(e,t)){var r=Ji(e,t),i=4;null!=r&&r.frameLength&&(i=r.frameLength);var n=t+i;return n===e.length||Zi(e,n)}return!1}var tn=function(e){function t(t,r){var i;return(i=e.call(this)||this).observer=void 0,i.config=void 0,i.observer=t,i.config=r,i}l(t,e);var r=t.prototype;return r.resetInitSegment=function(t,r,i,n){e.prototype.resetInitSegment.call(this,t,r,i,n),this._audioTrack={container:"audio/adts",type:"audio",id:2,pid:-1,sequenceNumber:0,segmentCodec:"aac",samples:[],manifestCodec:r,duration:n,inputTimeScale:9e4,dropped:0}},t.probe=function(e){if(!e)return!1;var t=fe(e,0),r=(null==t?void 0:t.length)||0;if(en(e,r))return!1;for(var i=e.length;r<i;r++)if(Ki(e,r))return w.log("ADTS sync word found !"),!0;return!1},r.canParse=function(e,t){return function(e,t){return function(e,t){return t+5<e.length}(e,t)&&Ni(e,t)&&Bi(e,t)<=e.length-t}(e,t)},r.appendFrame=function(e,t,r){Hi(e,this.observer,t,r,e.manifestCodec);var i=Yi(e,t,r,this.basePTS,this.frameIndex);if(i&&0===i.missing)return i},t}(Mi),rn=/\/emsg[-/]ID3/i,nn=function(){function e(e,t){this.remainderData=null,this.timeOffset=0,this.config=void 0,this.videoTrack=void 0,this.audioTrack=void 0,this.id3Track=void 0,this.txtTrack=void 0,this.config=t}var t=e.prototype;return t.resetTimeStamp=function(){},t.resetInitSegment=function(e,t,r,i){var n=this.videoTrack=Fi("video",1),a=this.audioTrack=Fi("audio",1),s=this.txtTrack=Fi("text",1);if(this.id3Track=Fi("id3",1),this.timeOffset=0,null!=e&&e.byteLength){var o=Be(e);if(o.video){var l=o.video,u=l.id,h=l.timescale,d=l.codec;n.id=u,n.timescale=s.timescale=h,n.codec=d}if(o.audio){var c=o.audio,f=c.id,g=c.timescale,v=c.codec;a.id=f,a.timescale=g,a.codec=v}s.id=Ce.text,n.sampleDuration=0,n.duration=a.duration=i}},t.resetContiguity=function(){this.remainderData=null},e.probe=function(e){return function(e){for(var t=e.byteLength,r=0;r<t;){var i=Pe(e,r);if(i>8&&109===e[r+4]&&111===e[r+5]&&111===e[r+6]&&102===e[r+7])return!0;r=i>1?r+i:t}return!1}(e)},t.demux=function(e,t){this.timeOffset=t;var r=e,i=this.videoTrack,n=this.txtTrack;if(this.config.progressive){this.remainderData&&(r=je(this.remainderData,e));var a=function(e){var t={valid:null,remainder:null},r=Ne(e,["moof"]);if(r.length<2)return t.remainder=e,t;var i=r[r.length-1];return t.valid=ue(e,0,i.byteOffset-8),t.remainder=ue(e,i.byteOffset-8),t}(r);this.remainderData=a.remainder,i.samples=a.valid||new Uint8Array}else i.samples=r;var s=this.extractID3Track(i,t);return n.samples=qe(t,i),{videoTrack:i,audioTrack:this.audioTrack,id3Track:s,textTrack:this.txtTrack}},t.flush=function(){var e=this.timeOffset,t=this.videoTrack,r=this.txtTrack;t.samples=this.remainderData||new Uint8Array,this.remainderData=null;var i=this.extractID3Track(t,this.timeOffset);return r.samples=qe(e,t),{videoTrack:t,audioTrack:Fi(),id3Track:i,textTrack:Fi()}},t.extractID3Track=function(e,t){var r=this.id3Track;if(e.samples.length){var i=Ne(e.samples,["emsg"]);i&&i.forEach((function(e){var i=function(e){var t=e[0],r="",i="",n=0,a=0,s=0,o=0,l=0,u=0;if(0===t){for(;"\0"!==_e(e.subarray(u,u+1));)r+=_e(e.subarray(u,u+1)),u+=1;for(r+=_e(e.subarray(u,u+1)),u+=1;"\0"!==_e(e.subarray(u,u+1));)i+=_e(e.subarray(u,u+1)),u+=1;i+=_e(e.subarray(u,u+1)),u+=1,n=Pe(e,12),a=Pe(e,16),o=Pe(e,20),l=Pe(e,24),u=28}else if(1===t){n=Pe(e,u+=4);var h=Pe(e,u+=4),d=Pe(e,u+=4);for(u+=4,s=Math.pow(2,32)*h+d,E(s)||(s=Number.MAX_SAFE_INTEGER,w.warn("Presentation time exceeds safe integer limit and wrapped to max safe integer in parsing emsg box")),o=Pe(e,u),l=Pe(e,u+=4),u+=4;"\0"!==_e(e.subarray(u,u+1));)r+=_e(e.subarray(u,u+1)),u+=1;for(r+=_e(e.subarray(u,u+1)),u+=1;"\0"!==_e(e.subarray(u,u+1));)i+=_e(e.subarray(u,u+1)),u+=1;i+=_e(e.subarray(u,u+1)),u+=1}return{schemeIdUri:r,value:i,timeScale:n,presentationTime:s,presentationTimeDelta:a,eventDuration:o,id:l,payload:e.subarray(u,e.byteLength)}}(e);if(rn.test(i.schemeIdUri)){var n=y(i.presentationTime)?i.presentationTime/i.timeScale:t+i.presentationTimeDelta/i.timeScale,a=4294967295===i.eventDuration?Number.POSITIVE_INFINITY:i.eventDuration/i.timeScale;a<=.001&&(a=Number.POSITIVE_INFINITY);var s=i.payload;r.samples.push({data:s,len:s.byteLength,dts:n,pts:n,type:Xt,duration:a})}}))}return r},t.demuxSampleAes=function(e,t,r){return Promise.reject(new Error("The MP4 demuxer does not support SAMPLE-AES decryption"))},t.destroy=function(){},e}(),an=function(e,t){var r=0,i=5;t+=i;for(var n=new Uint32Array(1),a=new Uint32Array(1),s=new Uint8Array(1);i>0;){s[0]=e[t];var o=Math.min(i,8),l=8-o;a[0]=4278190080>>>24+l<<l,n[0]=(s[0]&a[0])>>l,r=r?r<<o|n[0]:n[0],t+=1,i-=o}return r},sn=function(e){function t(t){var r;return(r=e.call(this)||this).observer=void 0,r.observer=t,r}l(t,e);var r=t.prototype;return r.resetInitSegment=function(t,r,i,n){e.prototype.resetInitSegment.call(this,t,r,i,n),this._audioTrack={container:"audio/ac-3",type:"audio",id:2,pid:-1,sequenceNumber:0,segmentCodec:"ac3",samples:[],manifestCodec:r,duration:n,inputTimeScale:9e4,dropped:0}},r.canParse=function(e,t){return t+64<e.length},r.appendFrame=function(e,t,r){var i=on(e,t,r,this.basePTS,this.frameIndex);if(-1!==i)return{sample:e.samples[e.samples.length-1],length:i,missing:0}},t.probe=function(e){if(!e)return!1;var t=fe(e,0);if(!t)return!1;var r=t.length;return 11===e[r]&&119===e[r+1]&&void 0!==me(t)&&an(e,r)<16},t}(Mi);function on(e,t,r,i,n){if(r+8>t.length)return-1;if(11!==t[r]||119!==t[r+1])return-1;var a=t[r+4]>>6;if(a>=3)return-1;var s=[48e3,44100,32e3][a],o=63&t[r+4],l=2*[64,69,96,64,70,96,80,87,120,80,88,120,96,104,144,96,105,144,112,121,168,112,122,168,128,139,192,128,140,192,160,174,240,160,175,240,192,208,288,192,209,288,224,243,336,224,244,336,256,278,384,256,279,384,320,348,480,320,349,480,384,417,576,384,418,576,448,487,672,448,488,672,512,557,768,512,558,768,640,696,960,640,697,960,768,835,1152,768,836,1152,896,975,1344,896,976,1344,1024,1114,1536,1024,1115,1536,1152,1253,1728,1152,1254,1728,1280,1393,1920,1280,1394,1920][3*o+a];if(r+l>t.length)return-1;var u=t[r+6]>>5,h=0;2===u?h+=2:(1&u&&1!==u&&(h+=2),4&u&&(h+=2));var d=(t[r+6]<<8|t[r+7])>>12-h&1,c=[2,1,2,3,3,4,4,5][u]+d,f=t[r+5]>>3,g=7&t[r+5],v=new Uint8Array([a<<6|f<<1|g>>2,(3&g)<<6|u<<3|d<<2|o>>4,o<<4&224]),m=i+n*(1536/s*9e4),p=t.subarray(r,r+l);return e.config=v,e.channelCount=c,e.samplerate=s,e.samples.push({unit:p,pts:m}),l}var ln=function(){function e(){this.VideoSample=null}var t=e.prototype;return t.createVideoSample=function(e,t,r,i){return{key:e,frame:!1,pts:t,dts:r,units:[],debug:i,length:0}},t.getLastNalUnit=function(e){var t,r,i=this.VideoSample;if(i&&0!==i.units.length||(i=e[e.length-1]),null!=(t=i)&&t.units){var n=i.units;r=n[n.length-1]}return r},t.pushAccessUnit=function(e,t){if(e.units.length&&e.frame){if(void 0===e.pts){var r=t.samples,i=r.length;if(!i)return void t.dropped++;var n=r[i-1];e.pts=n.pts,e.dts=n.dts}t.samples.push(e)}e.debug.length&&w.log(e.pts+"/"+e.dts+":"+e.debug)},e}(),un=function(){function e(e){this.data=void 0,this.bytesAvailable=void 0,this.word=void 0,this.bitsAvailable=void 0,this.data=e,this.bytesAvailable=e.byteLength,this.word=0,this.bitsAvailable=0}var t=e.prototype;return t.loadWord=function(){var e=this.data,t=this.bytesAvailable,r=e.byteLength-t,i=new Uint8Array(4),n=Math.min(4,t);if(0===n)throw new Error("no bytes available");i.set(e.subarray(r,r+n)),this.word=new DataView(i.buffer).getUint32(0),this.bitsAvailable=8*n,this.bytesAvailable-=n},t.skipBits=function(e){var t;e=Math.min(e,8*this.bytesAvailable+this.bitsAvailable),this.bitsAvailable>e?(this.word<<=e,this.bitsAvailable-=e):(e-=this.bitsAvailable,e-=(t=e>>3)<<3,this.bytesAvailable-=t,this.loadWord(),this.word<<=e,this.bitsAvailable-=e)},t.readBits=function(e){var t=Math.min(this.bitsAvailable,e),r=this.word>>>32-t;if(e>32&&w.error("Cannot read more than 32 bits at a time"),this.bitsAvailable-=t,this.bitsAvailable>0)this.word<<=t;else{if(!(this.bytesAvailable>0))throw new Error("no bits available");this.loadWord()}return(t=e-t)>0&&this.bitsAvailable?r<<t|this.readBits(t):r},t.skipLZ=function(){var e;for(e=0;e<this.bitsAvailable;++e)if(0!=(this.word&2147483648>>>e))return this.word<<=e,this.bitsAvailable-=e,e;return this.loadWord(),e+this.skipLZ()},t.skipUEG=function(){this.skipBits(1+this.skipLZ())},t.skipEG=function(){this.skipBits(1+this.skipLZ())},t.readUEG=function(){var e=this.skipLZ();return this.readBits(e+1)-1},t.readEG=function(){var e=this.readUEG();return 1&e?1+e>>>1:-1*(e>>>1)},t.readBoolean=function(){return 1===this.readBits(1)},t.readUByte=function(){return this.readBits(8)},t.readUShort=function(){return this.readBits(16)},t.readUInt=function(){return this.readBits(32)},t.skipScalingList=function(e){for(var t=8,r=8,i=0;i<e;i++)0!==r&&(r=(t+this.readEG()+256)%256),t=0===r?t:r},t.readSPS=function(){var e,t,r,i=0,n=0,a=0,s=0,o=this.readUByte.bind(this),l=this.readBits.bind(this),u=this.readUEG.bind(this),h=this.readBoolean.bind(this),d=this.skipBits.bind(this),c=this.skipEG.bind(this),f=this.skipUEG.bind(this),g=this.skipScalingList.bind(this);o();var v=o();if(l(5),d(3),o(),f(),100===v||110===v||122===v||244===v||44===v||83===v||86===v||118===v||128===v){var m=u();if(3===m&&d(1),f(),f(),d(1),h())for(t=3!==m?8:12,r=0;r<t;r++)h()&&g(r<6?16:64)}f();var p=u();if(0===p)u();else if(1===p)for(d(1),c(),c(),e=u(),r=0;r<e;r++)c();f(),d(1);var y=u(),E=u(),T=l(1);0===T&&d(1),d(1),h()&&(i=u(),n=u(),a=u(),s=u());var S=[1,1];if(h()&&h())switch(o()){case 1:S=[1,1];break;case 2:S=[12,11];break;case 3:S=[10,11];break;case 4:S=[16,11];break;case 5:S=[40,33];break;case 6:S=[24,11];break;case 7:S=[20,11];break;case 8:S=[32,11];break;case 9:S=[80,33];break;case 10:S=[18,11];break;case 11:S=[15,11];break;case 12:S=[64,33];break;case 13:S=[160,99];break;case 14:S=[4,3];break;case 15:S=[3,2];break;case 16:S=[2,1];break;case 255:S=[o()<<8|o(),o()<<8|o()]}return{width:Math.ceil(16*(y+1)-2*i-2*n),height:(2-T)*(E+1)*16-(T?2:4)*(a+s),pixelRatio:S}},t.readSliceType=function(){return this.readUByte(),this.readUEG(),this.readUEG()},e}(),hn=function(e){function t(){return e.apply(this,arguments)||this}l(t,e);var r=t.prototype;return r.parseAVCPES=function(e,t,r,i,n){var a,s=this,o=this.parseAVCNALu(e,r.data),l=this.VideoSample,u=!1;r.data=null,l&&o.length&&!e.audFound&&(this.pushAccessUnit(l,e),l=this.VideoSample=this.createVideoSample(!1,r.pts,r.dts,"")),o.forEach((function(i){var o;switch(i.type){case 1:var h=!1;a=!0;var d,c=i.data;if(u&&c.length>4){var f=new un(c).readSliceType();2!==f&&4!==f&&7!==f&&9!==f||(h=!0)}h&&null!=(d=l)&&d.frame&&!l.key&&(s.pushAccessUnit(l,e),l=s.VideoSample=null),l||(l=s.VideoSample=s.createVideoSample(!0,r.pts,r.dts,"")),l.frame=!0,l.key=h;break;case 5:a=!0,null!=(o=l)&&o.frame&&!l.key&&(s.pushAccessUnit(l,e),l=s.VideoSample=null),l||(l=s.VideoSample=s.createVideoSample(!0,r.pts,r.dts,"")),l.key=!0,l.frame=!0;break;case 6:a=!0,ze(i.data,1,r.pts,t.samples);break;case 7:var g,v;a=!0,u=!0;var m=i.data,p=new un(m).readSPS();if(!e.sps||e.width!==p.width||e.height!==p.height||(null==(g=e.pixelRatio)?void 0:g[0])!==p.pixelRatio[0]||(null==(v=e.pixelRatio)?void 0:v[1])!==p.pixelRatio[1]){e.width=p.width,e.height=p.height,e.pixelRatio=p.pixelRatio,e.sps=[m],e.duration=n;for(var y=m.subarray(1,4),E="avc1.",T=0;T<3;T++){var S=y[T].toString(16);S.length<2&&(S="0"+S),E+=S}e.codec=E}break;case 8:a=!0,e.pps=[i.data];break;case 9:a=!0,e.audFound=!0,l&&s.pushAccessUnit(l,e),l=s.VideoSample=s.createVideoSample(!1,r.pts,r.dts,"");break;case 12:a=!0;break;default:a=!1,l&&(l.debug+="unknown NAL "+i.type+" ")}l&&a&&l.units.push(i)})),i&&l&&(this.pushAccessUnit(l,e),this.VideoSample=null)},r.parseAVCNALu=function(e,t){var r,i,n=t.byteLength,a=e.naluState||0,s=a,o=[],l=0,u=-1,h=0;for(-1===a&&(u=0,h=31&t[0],a=0,l=1);l<n;)if(r=t[l++],a)if(1!==a)if(r)if(1===r){if(i=l-a-1,u>=0){var d={data:t.subarray(u,i),type:h};o.push(d)}else{var c=this.getLastNalUnit(e.samples);c&&(s&&l<=4-s&&c.state&&(c.data=c.data.subarray(0,c.data.byteLength-s)),i>0&&(c.data=je(c.data,t.subarray(0,i)),c.state=0))}l<n?(u=l,h=31&t[l],a=0):a=-1}else a=0;else a=3;else a=r?0:2;else a=r?0:1;if(u>=0&&a>=0){var f={data:t.subarray(u,n),type:h,state:a};o.push(f)}if(0===o.length){var g=this.getLastNalUnit(e.samples);g&&(g.data=je(g.data,t))}return e.naluState=a,o},t}(ln),dn=function(){function e(e,t,r){this.keyData=void 0,this.decrypter=void 0,this.keyData=r,this.decrypter=new yi(t,{removePKCS7Padding:!1})}var t=e.prototype;return t.decryptBuffer=function(e){return this.decrypter.decrypt(e,this.keyData.key.buffer,this.keyData.iv.buffer)},t.decryptAacSample=function(e,t,r){var i=this,n=e[t].unit;if(!(n.length<=16)){var a=n.subarray(16,n.length-n.length%16),s=a.buffer.slice(a.byteOffset,a.byteOffset+a.length);this.decryptBuffer(s).then((function(a){var s=new Uint8Array(a);n.set(s,16),i.decrypter.isSync()||i.decryptAacSamples(e,t+1,r)}))}},t.decryptAacSamples=function(e,t,r){for(;;t++){if(t>=e.length)return void r();if(!(e[t].unit.length<32||(this.decryptAacSample(e,t,r),this.decrypter.isSync())))return}},t.getAvcEncryptedData=function(e){for(var t=16*Math.floor((e.length-48)/160)+16,r=new Int8Array(t),i=0,n=32;n<e.length-16;n+=160,i+=16)r.set(e.subarray(n,n+16),i);return r},t.getAvcDecryptedUnit=function(e,t){for(var r=new Uint8Array(t),i=0,n=32;n<e.length-16;n+=160,i+=16)e.set(r.subarray(i,i+16),n);return e},t.decryptAvcSample=function(e,t,r,i,n){var a=this,s=Qe(n.data),o=this.getAvcEncryptedData(s);this.decryptBuffer(o.buffer).then((function(o){n.data=a.getAvcDecryptedUnit(s,o),a.decrypter.isSync()||a.decryptAvcSamples(e,t,r+1,i)}))},t.decryptAvcSamples=function(e,t,r,i){if(e instanceof Uint8Array)throw new Error("Cannot decrypt samples of type Uint8Array");for(;;t++,r=0){if(t>=e.length)return void i();for(var n=e[t].units;!(r>=n.length);r++){var a=n[r];if(!(a.data.length<=48||1!==a.type&&5!==a.type||(this.decryptAvcSample(e,t,r,i,a),this.decrypter.isSync())))return}}},e}(),cn=188,fn=function(){function e(e,t,r){this.observer=void 0,this.config=void 0,this.typeSupported=void 0,this.sampleAes=null,this.pmtParsed=!1,this.audioCodec=void 0,this.videoCodec=void 0,this._duration=0,this._pmtId=-1,this._videoTrack=void 0,this._audioTrack=void 0,this._id3Track=void 0,this._txtTrack=void 0,this.aacOverFlow=null,this.remainderData=null,this.videoParser=void 0,this.observer=e,this.config=t,this.typeSupported=r,this.videoParser=new hn}e.probe=function(t){var r=e.syncOffset(t);return r>0&&w.warn("MPEG2-TS detected but first sync word found @ offset "+r),-1!==r},e.syncOffset=function(e){for(var t=e.length,r=Math.min(940,t-cn)+1,i=0;i<r;){for(var n=!1,a=-1,s=0,o=i;o<t;o+=cn){if(71!==e[o]||t-o!==cn&&71!==e[o+cn]){if(s)return-1;break}if(s++,-1===a&&0!==(a=o)&&(r=Math.min(a+18612,e.length-cn)+1),n||(n=0===gn(e,o)),n&&s>1&&(0===a&&s>2||o+cn>r))return a}i++}return-1},e.createTrack=function(e,t){return{container:"video"===e||"audio"===e?"video/mp2t":void 0,type:e,id:Ce[e],pid:-1,inputTimeScale:9e4,sequenceNumber:0,samples:[],dropped:0,duration:"audio"===e?t:void 0}};var t=e.prototype;return t.resetInitSegment=function(t,r,i,n){this.pmtParsed=!1,this._pmtId=-1,this._videoTrack=e.createTrack("video"),this._audioTrack=e.createTrack("audio",n),this._id3Track=e.createTrack("id3"),this._txtTrack=e.createTrack("text"),this._audioTrack.segmentCodec="aac",this.aacOverFlow=null,this.remainderData=null,this.audioCodec=r,this.videoCodec=i,this._duration=n},t.resetTimeStamp=function(){},t.resetContiguity=function(){var e=this._audioTrack,t=this._videoTrack,r=this._id3Track;e&&(e.pesData=null),t&&(t.pesData=null),r&&(r.pesData=null),this.aacOverFlow=null,this.remainderData=null},t.demux=function(t,r,i,n){var a;void 0===i&&(i=!1),void 0===n&&(n=!1),i||(this.sampleAes=null);var s=this._videoTrack,o=this._audioTrack,l=this._id3Track,u=this._txtTrack,h=s.pid,d=s.pesData,c=o.pid,f=l.pid,g=o.pesData,v=l.pesData,m=null,p=this.pmtParsed,y=this._pmtId,E=t.length;if(this.remainderData&&(E=(t=je(this.remainderData,t)).length,this.remainderData=null),E<cn&&!n)return this.remainderData=t,{audioTrack:o,videoTrack:s,id3Track:l,textTrack:u};var T=Math.max(0,e.syncOffset(t));(E-=(E-T)%cn)<t.byteLength&&!n&&(this.remainderData=new Uint8Array(t.buffer,E,t.buffer.byteLength-E));for(var S=0,L=T;L<E;L+=cn)if(71===t[L]){var A=!!(64&t[L+1]),R=gn(t,L),k=void 0;if((48&t[L+3])>>4>1){if((k=L+5+t[L+4])===L+cn)continue}else k=L+4;switch(R){case h:A&&(d&&(a=En(d))&&this.videoParser.parseAVCPES(s,u,a,!1,this._duration),d={data:[],size:0}),d&&(d.data.push(t.subarray(k,L+cn)),d.size+=L+cn-k);break;case c:if(A){if(g&&(a=En(g)))switch(o.segmentCodec){case"aac":this.parseAACPES(o,a);break;case"mp3":this.parseMPEGPES(o,a);break;case"ac3":this.parseAC3PES(o,a)}g={data:[],size:0}}g&&(g.data.push(t.subarray(k,L+cn)),g.size+=L+cn-k);break;case f:A&&(v&&(a=En(v))&&this.parseID3PES(l,a),v={data:[],size:0}),v&&(v.data.push(t.subarray(k,L+cn)),v.size+=L+cn-k);break;case 0:A&&(k+=t[k]+1),y=this._pmtId=vn(t,k);break;case y:A&&(k+=t[k]+1);var b=mn(t,k,this.typeSupported,i,this.observer);(h=b.videoPid)>0&&(s.pid=h,s.segmentCodec=b.segmentVideoCodec),(c=b.audioPid)>0&&(o.pid=c,o.segmentCodec=b.segmentAudioCodec),(f=b.id3Pid)>0&&(l.pid=f),null===m||p||(w.warn("MPEG-TS PMT found at "+L+" after unknown PID '"+m+"'. Backtracking to sync byte @"+T+" to parse all TS packets."),m=null,L=T-188),p=this.pmtParsed=!0;break;case 17:case 8191:break;default:m=R}}else S++;S>0&&pn(this.observer,new Error("Found "+S+" TS packet/s that do not start with 0x47")),s.pesData=d,o.pesData=g,l.pesData=v;var D={audioTrack:o,videoTrack:s,id3Track:l,textTrack:u};return n&&this.extractRemainingSamples(D),D},t.flush=function(){var e,t=this.remainderData;return this.remainderData=null,e=t?this.demux(t,-1,!1,!0):{videoTrack:this._videoTrack,audioTrack:this._audioTrack,id3Track:this._id3Track,textTrack:this._txtTrack},this.extractRemainingSamples(e),this.sampleAes?this.decrypt(e,this.sampleAes):e},t.extractRemainingSamples=function(e){var t,r=e.audioTrack,i=e.videoTrack,n=e.id3Track,a=e.textTrack,s=i.pesData,o=r.pesData,l=n.pesData;if(s&&(t=En(s))?(this.videoParser.parseAVCPES(i,a,t,!0,this._duration),i.pesData=null):i.pesData=s,o&&(t=En(o))){switch(r.segmentCodec){case"aac":this.parseAACPES(r,t);break;case"mp3":this.parseMPEGPES(r,t);break;case"ac3":this.parseAC3PES(r,t)}r.pesData=null}else null!=o&&o.size&&w.log("last AAC PES packet truncated,might overlap between fragments"),r.pesData=o;l&&(t=En(l))?(this.parseID3PES(n,t),n.pesData=null):n.pesData=l},t.demuxSampleAes=function(e,t,r){var i=this.demux(e,r,!0,!this.config.progressive),n=this.sampleAes=new dn(this.observer,this.config,t);return this.decrypt(i,n)},t.decrypt=function(e,t){return new Promise((function(r){var i=e.audioTrack,n=e.videoTrack;i.samples&&"aac"===i.segmentCodec?t.decryptAacSamples(i.samples,0,(function(){n.samples?t.decryptAvcSamples(n.samples,0,0,(function(){r(e)})):r(e)})):n.samples&&t.decryptAvcSamples(n.samples,0,0,(function(){r(e)}))}))},t.destroy=function(){this._duration=0},t.parseAACPES=function(e,t){var r,i,n,a=0,s=this.aacOverFlow,o=t.data;if(s){this.aacOverFlow=null;var l=s.missing,u=s.sample.unit.byteLength;if(-1===l)o=je(s.sample.unit,o);else{var h=u-l;s.sample.unit.set(o.subarray(0,l),h),e.samples.push(s.sample),a=s.missing}}for(r=a,i=o.length;r<i-1&&!Gi(o,r);r++);if(r!==a){var d,c=r<i-1;if(d=c?"AAC PES did not start with ADTS header,offset:"+r:"No ADTS header found in AAC PES",pn(this.observer,new Error(d),c),!c)return}if(Hi(e,this.observer,o,r,this.audioCodec),void 0!==t.pts)n=t.pts;else{if(!s)return void w.warn("[tsdemuxer]: AAC PES unknown PTS");var f=Vi(e.samplerate);n=s.sample.pts+f}for(var g,v=0;r<i;){if(r+=(g=Yi(e,o,r,n,v)).length,g.missing){this.aacOverFlow=g;break}for(v++;r<i-1&&!Gi(o,r);r++);}},t.parseMPEGPES=function(e,t){var r=t.data,i=r.length,n=0,a=0,s=t.pts;if(void 0!==s)for(;a<i;)if(Zi(r,a)){var o=Qi(e,r,a,s,n);if(!o)break;a+=o.length,n++}else a++;else w.warn("[tsdemuxer]: MPEG PES unknown PTS")},t.parseAC3PES=function(e,t){var r=t.data,i=t.pts;if(void 0!==i)for(var n,a=r.length,s=0,o=0;o<a&&(n=on(e,r,o,i,s++))>0;)o+=n;else w.warn("[tsdemuxer]: AC3 PES unknown PTS")},t.parseID3PES=function(e,t){if(void 0!==t.pts){var r=o({},t,{type:this._videoTrack?Xt:jt,duration:Number.POSITIVE_INFINITY});e.samples.push(r)}else w.warn("[tsdemuxer]: ID3 PES unknown PTS")},e}();function gn(e,t){return((31&e[t+1])<<8)+e[t+2]}function vn(e,t){return(31&e[t+10])<<8|e[t+11]}function mn(e,t,r,i,n){var a={audioPid:-1,videoPid:-1,id3Pid:-1,segmentVideoCodec:"avc",segmentAudioCodec:"aac"},s=t+3+((15&e[t+1])<<8|e[t+2])-4;for(t+=12+((15&e[t+10])<<8|e[t+11]);t<s;){var o=gn(e,t),l=(15&e[t+3])<<8|e[t+4];switch(e[t]){case 207:if(!i){yn("ADTS AAC");break}case 15:-1===a.audioPid&&(a.audioPid=o);break;case 21:-1===a.id3Pid&&(a.id3Pid=o);break;case 219:if(!i){yn("H.264");break}case 27:-1===a.videoPid&&(a.videoPid=o,a.segmentVideoCodec="avc");break;case 3:case 4:r.mpeg||r.mp3?-1===a.audioPid&&(a.audioPid=o,a.segmentAudioCodec="mp3"):w.log("MPEG audio found, not supported in this browser");break;case 193:if(!i){yn("AC-3");break}case 129:r.ac3?-1===a.audioPid&&(a.audioPid=o,a.segmentAudioCodec="ac3"):w.log("AC-3 audio found, not supported in this browser");break;case 6:if(-1===a.audioPid&&l>0)for(var u=t+5,h=l;h>2;){106===e[u]&&(!0!==r.ac3?w.log("AC-3 audio found, not supported in this browser for now"):(a.audioPid=o,a.segmentAudioCodec="ac3"));var d=e[u+1]+2;u+=d,h-=d}break;case 194:case 135:return pn(n,new Error("Unsupported EC-3 in M2TS found")),a;case 36:return pn(n,new Error("Unsupported HEVC in M2TS found")),a}t+=l+5}return a}function pn(e,t,r){w.warn("parsing error: "+t.message),e.emit(S.ERROR,S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,fatal:!1,levelRetry:r,error:t,reason:t.message})}function yn(e){w.log(e+" with AES-128-CBC encryption found in unencrypted stream")}function En(e){var t,r,i,n,a,s=0,o=e.data;if(!e||0===e.size)return null;for(;o[0].length<19&&o.length>1;)o[0]=je(o[0],o[1]),o.splice(1,1);if(1===((t=o[0])[0]<<16)+(t[1]<<8)+t[2]){if((r=(t[4]<<8)+t[5])&&r>e.size-6)return null;var l=t[7];192&l&&(n=536870912*(14&t[9])+4194304*(255&t[10])+16384*(254&t[11])+128*(255&t[12])+(254&t[13])/2,64&l?n-(a=536870912*(14&t[14])+4194304*(255&t[15])+16384*(254&t[16])+128*(255&t[17])+(254&t[18])/2)>54e5&&(w.warn(Math.round((n-a)/9e4)+"s delta between PTS and DTS, align them"),n=a):a=n);var u=(i=t[8])+9;if(e.size<=u)return null;e.size-=u;for(var h=new Uint8Array(e.size),d=0,c=o.length;d<c;d++){var f=(t=o[d]).byteLength;if(u){if(u>f){u-=f;continue}t=t.subarray(u),f-=u,u=0}h.set(t,s),s+=f}return r&&(r-=i+3),{data:h,pts:n,dts:a,len:r}}return null}var Tn=function(e){function t(){return e.apply(this,arguments)||this}l(t,e);var r=t.prototype;return r.resetInitSegment=function(t,r,i,n){e.prototype.resetInitSegment.call(this,t,r,i,n),this._audioTrack={container:"audio/mpeg",type:"audio",id:2,pid:-1,sequenceNumber:0,segmentCodec:"mp3",samples:[],manifestCodec:r,duration:n,inputTimeScale:9e4,dropped:0}},t.probe=function(e){if(!e)return!1;var t=fe(e,0),r=(null==t?void 0:t.length)||0;if(t&&11===e[r]&&119===e[r+1]&&void 0!==me(t)&&an(e,r)<=16)return!1;for(var i=e.length;r<i;r++)if(en(e,r))return w.log("MPEG Audio sync word found !"),!0;return!1},r.canParse=function(e,t){return function(e,t){return $i(e,t)&&4<=e.length-t}(e,t)},r.appendFrame=function(e,t,r){if(null!==this.basePTS)return Qi(e,t,r,this.basePTS,this.frameIndex)},t}(Mi),Sn=function(){function e(){}return e.getSilentFrame=function(e,t){if("mp4a.40.2"===e){if(1===t)return new Uint8Array([0,200,0,128,35,128]);if(2===t)return new Uint8Array([33,0,73,144,2,25,0,35,128]);if(3===t)return new Uint8Array([0,200,0,128,32,132,1,38,64,8,100,0,142]);if(4===t)return new Uint8Array([0,200,0,128,32,132,1,38,64,8,100,0,128,44,128,8,2,56]);if(5===t)return new Uint8Array([0,200,0,128,32,132,1,38,64,8,100,0,130,48,4,153,0,33,144,2,56]);if(6===t)return new Uint8Array([0,200,0,128,32,132,1,38,64,8,100,0,130,48,4,153,0,33,144,2,0,178,0,32,8,224])}else{if(1===t)return new Uint8Array([1,64,34,128,163,78,230,128,186,8,0,0,0,28,6,241,193,10,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,94]);if(2===t)return new Uint8Array([1,64,34,128,163,94,230,128,186,8,0,0,0,0,149,0,6,241,161,10,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,94]);if(3===t)return new Uint8Array([1,64,34,128,163,94,230,128,186,8,0,0,0,0,149,0,6,241,161,10,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,90,94])}},e}(),Ln=Math.pow(2,32)-1,An=function(){function e(){}return e.init=function(){var t;for(t in e.types={avc1:[],avcC:[],btrt:[],dinf:[],dref:[],esds:[],ftyp:[],hdlr:[],mdat:[],mdhd:[],mdia:[],mfhd:[],minf:[],moof:[],moov:[],mp4a:[],".mp3":[],dac3:[],"ac-3":[],mvex:[],mvhd:[],pasp:[],sdtp:[],stbl:[],stco:[],stsc:[],stsd:[],stsz:[],stts:[],tfdt:[],tfhd:[],traf:[],trak:[],trun:[],trex:[],tkhd:[],vmhd:[],smhd:[]},e.types)e.types.hasOwnProperty(t)&&(e.types[t]=[t.charCodeAt(0),t.charCodeAt(1),t.charCodeAt(2),t.charCodeAt(3)]);var r=new Uint8Array([0,0,0,0,0,0,0,0,118,105,100,101,0,0,0,0,0,0,0,0,0,0,0,0,86,105,100,101,111,72,97,110,100,108,101,114,0]),i=new Uint8Array([0,0,0,0,0,0,0,0,115,111,117,110,0,0,0,0,0,0,0,0,0,0,0,0,83,111,117,110,100,72,97,110,100,108,101,114,0]);e.HDLR_TYPES={video:r,audio:i};var n=new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,12,117,114,108,32,0,0,0,1]),a=new Uint8Array([0,0,0,0,0,0,0,0]);e.STTS=e.STSC=e.STCO=a,e.STSZ=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0]),e.VMHD=new Uint8Array([0,0,0,1,0,0,0,0,0,0,0,0]),e.SMHD=new Uint8Array([0,0,0,0,0,0,0,0]),e.STSD=new Uint8Array([0,0,0,0,0,0,0,1]);var s=new Uint8Array([105,115,111,109]),o=new Uint8Array([97,118,99,49]),l=new Uint8Array([0,0,0,1]);e.FTYP=e.box(e.types.ftyp,s,l,s,o),e.DINF=e.box(e.types.dinf,e.box(e.types.dref,n))},e.box=function(e){for(var t=8,r=arguments.length,i=new Array(r>1?r-1:0),n=1;n<r;n++)i[n-1]=arguments[n];for(var a=i.length,s=a;a--;)t+=i[a].byteLength;var o=new Uint8Array(t);for(o[0]=t>>24&255,o[1]=t>>16&255,o[2]=t>>8&255,o[3]=255&t,o.set(e,4),a=0,t=8;a<s;a++)o.set(i[a],t),t+=i[a].byteLength;return o},e.hdlr=function(t){return e.box(e.types.hdlr,e.HDLR_TYPES[t])},e.mdat=function(t){return e.box(e.types.mdat,t)},e.mdhd=function(t,r){r*=t;var i=Math.floor(r/(Ln+1)),n=Math.floor(r%(Ln+1));return e.box(e.types.mdhd,new Uint8Array([1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,3,t>>24&255,t>>16&255,t>>8&255,255&t,i>>24,i>>16&255,i>>8&255,255&i,n>>24,n>>16&255,n>>8&255,255&n,85,196,0,0]))},e.mdia=function(t){return e.box(e.types.mdia,e.mdhd(t.timescale,t.duration),e.hdlr(t.type),e.minf(t))},e.mfhd=function(t){return e.box(e.types.mfhd,new Uint8Array([0,0,0,0,t>>24,t>>16&255,t>>8&255,255&t]))},e.minf=function(t){return"audio"===t.type?e.box(e.types.minf,e.box(e.types.smhd,e.SMHD),e.DINF,e.stbl(t)):e.box(e.types.minf,e.box(e.types.vmhd,e.VMHD),e.DINF,e.stbl(t))},e.moof=function(t,r,i){return e.box(e.types.moof,e.mfhd(t),e.traf(i,r))},e.moov=function(t){for(var r=t.length,i=[];r--;)i[r]=e.trak(t[r]);return e.box.apply(null,[e.types.moov,e.mvhd(t[0].timescale,t[0].duration)].concat(i).concat(e.mvex(t)))},e.mvex=function(t){for(var r=t.length,i=[];r--;)i[r]=e.trex(t[r]);return e.box.apply(null,[e.types.mvex].concat(i))},e.mvhd=function(t,r){r*=t;var i=Math.floor(r/(Ln+1)),n=Math.floor(r%(Ln+1)),a=new Uint8Array([1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,3,t>>24&255,t>>16&255,t>>8&255,255&t,i>>24,i>>16&255,i>>8&255,255&i,n>>24,n>>16&255,n>>8&255,255&n,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255]);return e.box(e.types.mvhd,a)},e.sdtp=function(t){var r,i,n=t.samples||[],a=new Uint8Array(4+n.length);for(r=0;r<n.length;r++)i=n[r].flags,a[r+4]=i.dependsOn<<4|i.isDependedOn<<2|i.hasRedundancy;return e.box(e.types.sdtp,a)},e.stbl=function(t){return e.box(e.types.stbl,e.stsd(t),e.box(e.types.stts,e.STTS),e.box(e.types.stsc,e.STSC),e.box(e.types.stsz,e.STSZ),e.box(e.types.stco,e.STCO))},e.avc1=function(t){var r,i,n,a=[],s=[];for(r=0;r<t.sps.length;r++)n=(i=t.sps[r]).byteLength,a.push(n>>>8&255),a.push(255&n),a=a.concat(Array.prototype.slice.call(i));for(r=0;r<t.pps.length;r++)n=(i=t.pps[r]).byteLength,s.push(n>>>8&255),s.push(255&n),s=s.concat(Array.prototype.slice.call(i));var o=e.box(e.types.avcC,new Uint8Array([1,a[3],a[4],a[5],255,224|t.sps.length].concat(a).concat([t.pps.length]).concat(s))),l=t.width,u=t.height,h=t.pixelRatio[0],d=t.pixelRatio[1];return e.box(e.types.avc1,new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,l>>8&255,255&l,u>>8&255,255&u,0,72,0,0,0,72,0,0,0,0,0,0,0,1,18,100,97,105,108,121,109,111,116,105,111,110,47,104,108,115,46,106,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,17,17]),o,e.box(e.types.btrt,new Uint8Array([0,28,156,128,0,45,198,192,0,45,198,192])),e.box(e.types.pasp,new Uint8Array([h>>24,h>>16&255,h>>8&255,255&h,d>>24,d>>16&255,d>>8&255,255&d])))},e.esds=function(e){var t=e.config.length;return new Uint8Array([0,0,0,0,3,23+t,0,1,0,4,15+t,64,21,0,0,0,0,0,0,0,0,0,0,0,5].concat([t]).concat(e.config).concat([6,1,2]))},e.audioStsd=function(e){var t=e.samplerate;return new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,e.channelCount,0,16,0,0,0,0,t>>8&255,255&t,0,0])},e.mp4a=function(t){return e.box(e.types.mp4a,e.audioStsd(t),e.box(e.types.esds,e.esds(t)))},e.mp3=function(t){return e.box(e.types[".mp3"],e.audioStsd(t))},e.ac3=function(t){return e.box(e.types["ac-3"],e.audioStsd(t),e.box(e.types.dac3,t.config))},e.stsd=function(t){return"audio"===t.type?"mp3"===t.segmentCodec&&"mp3"===t.codec?e.box(e.types.stsd,e.STSD,e.mp3(t)):"ac3"===t.segmentCodec?e.box(e.types.stsd,e.STSD,e.ac3(t)):e.box(e.types.stsd,e.STSD,e.mp4a(t)):e.box(e.types.stsd,e.STSD,e.avc1(t))},e.tkhd=function(t){var r=t.id,i=t.duration*t.timescale,n=t.width,a=t.height,s=Math.floor(i/(Ln+1)),o=Math.floor(i%(Ln+1));return e.box(e.types.tkhd,new Uint8Array([1,0,0,7,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,3,r>>24&255,r>>16&255,r>>8&255,255&r,0,0,0,0,s>>24,s>>16&255,s>>8&255,255&s,o>>24,o>>16&255,o>>8&255,255&o,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,n>>8&255,255&n,0,0,a>>8&255,255&a,0,0]))},e.traf=function(t,r){var i=e.sdtp(t),n=t.id,a=Math.floor(r/(Ln+1)),s=Math.floor(r%(Ln+1));return e.box(e.types.traf,e.box(e.types.tfhd,new Uint8Array([0,0,0,0,n>>24,n>>16&255,n>>8&255,255&n])),e.box(e.types.tfdt,new Uint8Array([1,0,0,0,a>>24,a>>16&255,a>>8&255,255&a,s>>24,s>>16&255,s>>8&255,255&s])),e.trun(t,i.length+16+20+8+16+8+8),i)},e.trak=function(t){return t.duration=t.duration||4294967295,e.box(e.types.trak,e.tkhd(t),e.mdia(t))},e.trex=function(t){var r=t.id;return e.box(e.types.trex,new Uint8Array([0,0,0,0,r>>24,r>>16&255,r>>8&255,255&r,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1]))},e.trun=function(t,r){var i,n,a,s,o,l,u=t.samples||[],h=u.length,d=12+16*h,c=new Uint8Array(d);for(r+=8+d,c.set(["video"===t.type?1:0,0,15,1,h>>>24&255,h>>>16&255,h>>>8&255,255&h,r>>>24&255,r>>>16&255,r>>>8&255,255&r],0),i=0;i<h;i++)a=(n=u[i]).duration,s=n.size,o=n.flags,l=n.cts,c.set([a>>>24&255,a>>>16&255,a>>>8&255,255&a,s>>>24&255,s>>>16&255,s>>>8&255,255&s,o.isLeading<<2|o.dependsOn,o.isDependedOn<<6|o.hasRedundancy<<4|o.paddingValue<<1|o.isNonSync,61440&o.degradPrio,15&o.degradPrio,l>>>24&255,l>>>16&255,l>>>8&255,255&l],12+16*i);return e.box(e.types.trun,c)},e.initSegment=function(t){e.types||e.init();var r=e.moov(t);return je(e.FTYP,r)},e}();An.types=void 0,An.HDLR_TYPES=void 0,An.STTS=void 0,An.STSC=void 0,An.STCO=void 0,An.STSZ=void 0,An.VMHD=void 0,An.SMHD=void 0,An.STSD=void 0,An.FTYP=void 0,An.DINF=void 0;var Rn=9e4;function kn(e,t,r,i){void 0===r&&(r=1),void 0===i&&(i=!1);var n=e*t*r;return i?Math.round(n):n}function bn(e,t){return void 0===t&&(t=!1),kn(e,1e3,1/Rn,t)}var Dn=null,In=null,wn=function(){function e(e,t,r,i){if(this.observer=void 0,this.config=void 0,this.typeSupported=void 0,this.ISGenerated=!1,this._initPTS=null,this._initDTS=null,this.nextAvcDts=null,this.nextAudioPts=null,this.videoSampleDuration=null,this.isAudioContiguous=!1,this.isVideoContiguous=!1,this.videoTrackConfig=void 0,this.observer=e,this.config=t,this.typeSupported=r,this.ISGenerated=!1,null===Dn){var n=(navigator.userAgent||"").match(/Chrome\/(\d+)/i);Dn=n?parseInt(n[1]):0}if(null===In){var a=navigator.userAgent.match(/Safari\/(\d+)/i);In=a?parseInt(a[1]):0}}var t=e.prototype;return t.destroy=function(){this.config=this.videoTrackConfig=this._initPTS=this._initDTS=null},t.resetTimeStamp=function(e){w.log("[mp4-remuxer]: initPTS & initDTS reset"),this._initPTS=this._initDTS=e},t.resetNextTimestamp=function(){w.log("[mp4-remuxer]: reset next timestamp"),this.isVideoContiguous=!1,this.isAudioContiguous=!1},t.resetInitSegment=function(){w.log("[mp4-remuxer]: ISGenerated flag reset"),this.ISGenerated=!1,this.videoTrackConfig=void 0},t.getVideoStartPts=function(e){var t=!1,r=e[0].pts,i=e.reduce((function(e,i){var n=i.pts,a=n-e;return a<-4294967296&&(t=!0,a=(n=Cn(n,r))-e),a>0?e:n}),r);return t&&w.debug("PTS rollover detected"),i},t.remux=function(e,t,r,i,n,a,s,o){var l,u,h,d,c,f,g=n,v=n,m=e.pid>-1,p=t.pid>-1,y=t.samples.length,E=e.samples.length>0,T=s&&y>0||y>1;if((!m||E)&&(!p||T)||this.ISGenerated||s){if(this.ISGenerated){var S,L,A,R,k=this.videoTrackConfig;!k||t.width===k.width&&t.height===k.height&&(null==(S=t.pixelRatio)?void 0:S[0])===(null==(L=k.pixelRatio)?void 0:L[0])&&(null==(A=t.pixelRatio)?void 0:A[1])===(null==(R=k.pixelRatio)?void 0:R[1])||this.resetInitSegment()}else h=this.generateIS(e,t,n,a);var b,D=this.isVideoContiguous,I=-1;if(T&&(I=function(e){for(var t=0;t<e.length;t++)if(e[t].key)return t;return-1}(t.samples),!D&&this.config.forceKeyFrameOnDiscontinuity))if(f=!0,I>0){w.warn("[mp4-remuxer]: Dropped "+I+" out of "+y+" video samples due to a missing keyframe");var C=this.getVideoStartPts(t.samples);t.samples=t.samples.slice(I),t.dropped+=I,b=v+=(t.samples[0].pts-C)/t.inputTimeScale}else-1===I&&(w.warn("[mp4-remuxer]: No keyframe found out of "+y+" video samples"),f=!1);if(this.ISGenerated){if(E&&T){var _=this.getVideoStartPts(t.samples),x=(Cn(e.samples[0].pts,_)-_)/t.inputTimeScale;g+=Math.max(0,x),v+=Math.max(0,-x)}if(E){if(e.samplerate||(w.warn("[mp4-remuxer]: regenerate InitSegment as audio detected"),h=this.generateIS(e,t,n,a)),u=this.remuxAudio(e,g,this.isAudioContiguous,a,p||T||o===Ot?v:void 0),T){var P=u?u.endPTS-u.startPTS:0;t.inputTimeScale||(w.warn("[mp4-remuxer]: regenerate InitSegment as video detected"),h=this.generateIS(e,t,n,a)),l=this.remuxVideo(t,v,D,P)}}else T&&(l=this.remuxVideo(t,v,D,0));l&&(l.firstKeyFrame=I,l.independent=-1!==I,l.firstKeyFramePTS=b)}}return this.ISGenerated&&this._initPTS&&this._initDTS&&(r.samples.length&&(c=_n(r,n,this._initPTS,this._initDTS)),i.samples.length&&(d=xn(i,n,this._initPTS))),{audio:u,video:l,initSegment:h,independent:f,text:d,id3:c}},t.generateIS=function(e,t,r,i){var n,a,s,o=e.samples,l=t.samples,u=this.typeSupported,h={},d=this._initPTS,c=!d||i,f="audio/mp4";if(c&&(n=a=1/0),e.config&&o.length){switch(e.timescale=e.samplerate,e.segmentCodec){case"mp3":u.mpeg?(f="audio/mpeg",e.codec=""):u.mp3&&(e.codec="mp3");break;case"ac3":e.codec="ac-3"}h.audio={id:"audio",container:f,codec:e.codec,initSegment:"mp3"===e.segmentCodec&&u.mpeg?new Uint8Array(0):An.initSegment([e]),metadata:{channelCount:e.channelCount}},c&&(s=e.inputTimeScale,d&&s===d.timescale?c=!1:n=a=o[0].pts-Math.round(s*r))}if(t.sps&&t.pps&&l.length){if(t.timescale=t.inputTimeScale,h.video={id:"main",container:"video/mp4",codec:t.codec,initSegment:An.initSegment([t]),metadata:{width:t.width,height:t.height}},c)if(s=t.inputTimeScale,d&&s===d.timescale)c=!1;else{var g=this.getVideoStartPts(l),v=Math.round(s*r);a=Math.min(a,Cn(l[0].dts,g)-v),n=Math.min(n,g-v)}this.videoTrackConfig={width:t.width,height:t.height,pixelRatio:t.pixelRatio}}if(Object.keys(h).length)return this.ISGenerated=!0,c?(this._initPTS={baseTime:n,timescale:s},this._initDTS={baseTime:a,timescale:s}):n=s=void 0,{tracks:h,initPTS:n,timescale:s}},t.remuxVideo=function(e,t,r,i){var n,a,s=e.inputTimeScale,l=e.samples,u=[],h=l.length,d=this._initPTS,c=this.nextAvcDts,f=8,g=this.videoSampleDuration,v=Number.POSITIVE_INFINITY,m=Number.NEGATIVE_INFINITY,p=!1;if(!r||null===c){var y=t*s,E=l[0].pts-Cn(l[0].dts,l[0].pts);Dn&&null!==c&&Math.abs(y-E-c)<15e3?r=!0:c=y-E}for(var T=d.baseTime*s/d.timescale,R=0;R<h;R++){var k=l[R];k.pts=Cn(k.pts-T,c),k.dts=Cn(k.dts-T,c),k.dts<l[R>0?R-1:R].dts&&(p=!0)}p&&l.sort((function(e,t){var r=e.dts-t.dts,i=e.pts-t.pts;return r||i})),n=l[0].dts;var b=(a=l[l.length-1].dts)-n,D=b?Math.round(b/(h-1)):g||e.inputTimeScale/30;if(r){var I=n-c,C=I>D,_=I<-1;if((C||_)&&(C?w.warn("AVC: "+bn(I,!0)+" ms ("+I+"dts) hole between fragments detected at "+t.toFixed(3)):w.warn("AVC: "+bn(-I,!0)+" ms ("+I+"dts) overlapping between fragments detected at "+t.toFixed(3)),!_||c>=l[0].pts||Dn)){n=c;var x=l[0].pts-I;if(C)l[0].dts=n,l[0].pts=x;else for(var P=0;P<l.length&&!(l[P].dts>x);P++)l[P].dts-=I,l[P].pts-=I;w.log("Video: Initial PTS/DTS adjusted: "+bn(x,!0)+"/"+bn(n,!0)+", delta: "+bn(I,!0)+" ms")}}for(var F=0,M=0,O=n=Math.max(0,n),N=0;N<h;N++){for(var U=l[N],B=U.units,G=B.length,K=0,H=0;H<G;H++)K+=B[H].data.length;M+=K,F+=G,U.length=K,U.dts<O?(U.dts=O,O+=D/4|0||1):O=U.dts,v=Math.min(U.pts,v),m=Math.max(U.pts,m)}a=l[h-1].dts;var V,Y=M+4*F+8;try{V=new Uint8Array(Y)}catch(e){return void this.observer.emit(S.ERROR,S.ERROR,{type:L.MUX_ERROR,details:A.REMUX_ALLOC_ERROR,fatal:!1,error:e,bytes:Y,reason:"fail allocating video mdat "+Y})}var W=new DataView(V.buffer);W.setUint32(0,Y),V.set(An.types.mdat,4);for(var j=!1,q=Number.POSITIVE_INFINITY,X=Number.POSITIVE_INFINITY,z=Number.NEGATIVE_INFINITY,Q=Number.NEGATIVE_INFINITY,J=0;J<h;J++){for(var $=l[J],Z=$.units,ee=0,te=0,re=Z.length;te<re;te++){var ie=Z[te],ne=ie.data,ae=ie.data.byteLength;W.setUint32(f,ae),f+=4,V.set(ne,f),f+=ae,ee+=4+ae}var se=void 0;if(J<h-1)g=l[J+1].dts-$.dts,se=l[J+1].pts-$.pts;else{var oe=this.config,le=J>0?$.dts-l[J-1].dts:D;if(se=J>0?$.pts-l[J-1].pts:D,oe.stretchShortVideoTrack&&null!==this.nextAudioPts){var ue=Math.floor(oe.maxBufferHole*s),he=(i?v+i*s:this.nextAudioPts)-$.pts;he>ue?((g=he-le)<0?g=le:j=!0,w.log("[mp4-remuxer]: It is approximately "+he/90+" ms to the next segment; using duration "+g/90+" ms for the last video frame.")):g=le}else g=le}var de=Math.round($.pts-$.dts);q=Math.min(q,g),z=Math.max(z,g),X=Math.min(X,se),Q=Math.max(Q,se),u.push(new Fn($.key,g,ee,de))}if(u.length)if(Dn){if(Dn<70){var ce=u[0].flags;ce.dependsOn=2,ce.isNonSync=0}}else if(In&&Q-X<z-q&&D/z<.025&&0===u[0].cts){w.warn("Found irregular gaps in sample duration. Using PTS instead of DTS to determine MP4 sample duration.");for(var fe=n,ge=0,ve=u.length;ge<ve;ge++){var me=fe+u[ge].duration,pe=fe+u[ge].cts;if(ge<ve-1){var ye=me+u[ge+1].cts;u[ge].duration=ye-pe}else u[ge].duration=ge?u[ge-1].duration:D;u[ge].cts=0,fe=me}}g=j||!g?D:g,this.nextAvcDts=c=a+g,this.videoSampleDuration=g,this.isVideoContiguous=!0;var Ee={data1:An.moof(e.sequenceNumber++,n,o({},e,{samples:u})),data2:V,startPTS:v/s,endPTS:(m+g)/s,startDTS:n/s,endDTS:c/s,type:"video",hasAudio:!1,hasVideo:!0,nb:u.length,dropped:e.dropped};return e.samples=[],e.dropped=0,Ee},t.getSamplesPerFrame=function(e){switch(e.segmentCodec){case"mp3":return 1152;case"ac3":return 1536;default:return 1024}},t.remuxAudio=function(e,t,r,i,n){var a=e.inputTimeScale,s=a/(e.samplerate?e.samplerate:a),l=this.getSamplesPerFrame(e),u=l*s,h=this._initPTS,d="mp3"===e.segmentCodec&&this.typeSupported.mpeg,c=[],f=void 0!==n,g=e.samples,v=d?0:8,m=this.nextAudioPts||-1,p=t*a,y=h.baseTime*a/h.timescale;if(this.isAudioContiguous=r=r||g.length&&m>0&&(i&&Math.abs(p-m)<9e3||Math.abs(Cn(g[0].pts-y,p)-m)<20*u),g.forEach((function(e){e.pts=Cn(e.pts-y,p)})),!r||m<0){if(g=g.filter((function(e){return e.pts>=0})),!g.length)return;m=0===n?0:i&&!f?Math.max(0,p):g[0].pts}if("aac"===e.segmentCodec)for(var E=this.config.maxAudioFramesDrift,T=0,R=m;T<g.length;T++){var k=g[T],b=k.pts,D=b-R,I=Math.abs(1e3*D/a);if(D<=-E*u&&f)0===T&&(w.warn("Audio frame @ "+(b/a).toFixed(3)+"s overlaps nextAudioPts by "+Math.round(1e3*D/a)+" ms."),this.nextAudioPts=m=R=b);else if(D>=E*u&&I<1e4&&f){var C=Math.round(D/u);(R=b-C*u)<0&&(C--,R+=u),0===T&&(this.nextAudioPts=m=R),w.warn("[mp4-remuxer]: Injecting "+C+" audio frame @ "+(R/a).toFixed(3)+"s due to "+Math.round(1e3*D/a)+" ms gap.");for(var _=0;_<C;_++){var x=Math.max(R,0),P=Sn.getSilentFrame(e.manifestCodec||e.codec,e.channelCount);P||(w.log("[mp4-remuxer]: Unable to get silent frame for given audio codec; duplicating last frame instead."),P=k.unit.subarray()),g.splice(T,0,{unit:P,pts:x}),R+=u,T++}}k.pts=R,R+=u}for(var F,M=null,O=null,N=0,U=g.length;U--;)N+=g[U].unit.byteLength;for(var B=0,G=g.length;B<G;B++){var K=g[B],H=K.unit,V=K.pts;if(null!==O)c[B-1].duration=Math.round((V-O)/s);else{if(r&&"aac"===e.segmentCodec&&(V=m),M=V,!(N>0))return;N+=v;try{F=new Uint8Array(N)}catch(e){return void this.observer.emit(S.ERROR,S.ERROR,{type:L.MUX_ERROR,details:A.REMUX_ALLOC_ERROR,fatal:!1,error:e,bytes:N,reason:"fail allocating audio mdat "+N})}d||(new DataView(F.buffer).setUint32(0,N),F.set(An.types.mdat,4))}F.set(H,v);var Y=H.byteLength;v+=Y,c.push(new Fn(!0,l,Y,0)),O=V}var W=c.length;if(W){var j=c[c.length-1];this.nextAudioPts=m=O+s*j.duration;var q=d?new Uint8Array(0):An.moof(e.sequenceNumber++,M/s,o({},e,{samples:c}));e.samples=[];var X=M/a,z=m/a,Q={data1:q,data2:F,startPTS:X,endPTS:z,startDTS:X,endDTS:z,type:"audio",hasAudio:!0,hasVideo:!1,nb:W};return this.isAudioContiguous=!0,Q}},t.remuxEmptyAudio=function(e,t,r,i){var n=e.inputTimeScale,a=n/(e.samplerate?e.samplerate:n),s=this.nextAudioPts,o=this._initDTS,l=9e4*o.baseTime/o.timescale,u=(null!==s?s:i.startDTS*n)+l,h=i.endDTS*n+l,d=1024*a,c=Math.ceil((h-u)/d),f=Sn.getSilentFrame(e.manifestCodec||e.codec,e.channelCount);if(w.warn("[mp4-remuxer]: remux empty Audio"),f){for(var g=[],v=0;v<c;v++){var m=u+v*d;g.push({unit:f,pts:m,dts:m})}return e.samples=g,this.remuxAudio(e,t,r,!1)}w.trace("[mp4-remuxer]: Unable to remuxEmptyAudio since we were unable to get a silent frame for given audio codec")},e}();function Cn(e,t){var r;if(null===t)return e;for(r=t<e?-8589934592:8589934592;Math.abs(e-t)>4294967296;)e+=r;return e}function _n(e,t,r,i){var n=e.samples.length;if(n){for(var a=e.inputTimeScale,s=0;s<n;s++){var o=e.samples[s];o.pts=Cn(o.pts-r.baseTime*a/r.timescale,t*a)/a,o.dts=Cn(o.dts-i.baseTime*a/i.timescale,t*a)/a}var l=e.samples;return e.samples=[],{samples:l}}}function xn(e,t,r){var i=e.samples.length;if(i){for(var n=e.inputTimeScale,a=0;a<i;a++){var s=e.samples[a];s.pts=Cn(s.pts-r.baseTime*n/r.timescale,t*n)/n}e.samples.sort((function(e,t){return e.pts-t.pts}));var o=e.samples;return e.samples=[],{samples:o}}}var Pn,Fn=function(e,t,r,i){this.size=void 0,this.duration=void 0,this.cts=void 0,this.flags=void 0,this.duration=t,this.size=r,this.cts=i,this.flags={isLeading:0,isDependedOn:0,hasRedundancy:0,degradPrio:0,dependsOn:e?2:1,isNonSync:e?0:1}},Mn=function(){function e(){this.emitInitSegment=!1,this.audioCodec=void 0,this.videoCodec=void 0,this.initData=void 0,this.initPTS=null,this.initTracks=void 0,this.lastEndTime=null}var t=e.prototype;return t.destroy=function(){},t.resetTimeStamp=function(e){this.initPTS=e,this.lastEndTime=null},t.resetNextTimestamp=function(){this.lastEndTime=null},t.resetInitSegment=function(e,t,r,i){this.audioCodec=t,this.videoCodec=r,this.generateInitSegment(function(e,t){if(!e||!t)return e;var r=t.keyId;return r&&t.isCommonEncryption&&Ne(e,["moov","trak"]).forEach((function(e){var t=Ne(e,["mdia","minf","stbl","stsd"])[0].subarray(8),i=Ne(t,["enca"]),n=i.length>0;n||(i=Ne(t,["encv"])),i.forEach((function(e){Ne(n?e.subarray(28):e.subarray(78),["sinf"]).forEach((function(e){var t=Ye(e);if(t){var i=t.subarray(8,24);i.some((function(e){return 0!==e}))||(w.log("[eme] Patching keyId in 'enc"+(n?"a":"v")+">sinf>>tenc' box: "+De.hexDump(i)+" -> "+De.hexDump(r)),t.set(r,8))}}))}))})),e}(e,i)),this.emitInitSegment=!0},t.generateInitSegment=function(e){var t=this.audioCodec,r=this.videoCodec;if(null==e||!e.byteLength)return this.initTracks=void 0,void(this.initData=void 0);var i=this.initData=Be(e);i.audio&&(t=On(i.audio,O)),i.video&&(r=On(i.video,N));var n={};i.audio&&i.video?n.audiovideo={container:"video/mp4",codec:t+","+r,initSegment:e,id:"main"}:i.audio?n.audio={container:"audio/mp4",codec:t,initSegment:e,id:"audio"}:i.video?n.video={container:"video/mp4",codec:r,initSegment:e,id:"main"}:w.warn("[passthrough-remuxer.ts]: initSegment does not contain moov or trak boxes."),this.initTracks=n},t.remux=function(e,t,r,i,n,a){var s,o,l=this.initPTS,u=this.lastEndTime,h={audio:void 0,video:void 0,text:i,id3:r,initSegment:void 0};y(u)||(u=this.lastEndTime=n||0);var d=t.samples;if(null==d||!d.length)return h;var c={initPTS:void 0,timescale:1},f=this.initData;if(null!=(s=f)&&s.length||(this.generateInitSegment(d),f=this.initData),null==(o=f)||!o.length)return w.warn("[passthrough-remuxer.ts]: Failed to generate initSegment."),h;this.emitInitSegment&&(c.tracks=this.initTracks,this.emitInitSegment=!1);var g=function(e,t){for(var r=0,i=0,n=0,a=Ne(e,["moof","traf"]),s=0;s<a.length;s++){var o=a[s],l=Ne(o,["tfhd"])[0],u=t[Pe(l,4)];if(u){var h=u.default,d=Pe(l,0)|(null==h?void 0:h.flags),c=null==h?void 0:h.duration;8&d&&(c=Pe(l,2&d?12:8));for(var f=u.timescale||9e4,g=Ne(o,["trun"]),v=0;v<g.length;v++)!(r=We(g[v]))&&c&&(r=c*Pe(g[v],4)),u.type===N?i+=r/f:u.type===O&&(n+=r/f)}}if(0===i&&0===n){for(var m=1/0,p=0,E=0,T=Ne(e,["sidx"]),S=0;S<T.length;S++){var L=Ue(T[S]);if(null!=L&&L.references){m=Math.min(m,L.earliestPresentationTime/L.timescale);var A=L.references.reduce((function(e,t){return e+t.info.duration||0}),0);E=(p=Math.max(p,A+L.earliestPresentationTime/L.timescale))-m}}if(E&&y(E))return E}return i||n}(d,f),v=function(e,t){return Ne(t,["moof","traf"]).reduce((function(t,r){var i=Ne(r,["tfdt"])[0],n=i[0],a=Ne(r,["tfhd"]).reduce((function(t,r){var a=Pe(r,4),s=e[a];if(s){var o=Pe(i,4);if(1===n){if(o===Ie)return w.warn("[mp4-demuxer]: Ignoring assumed invalid signed 64-bit track fragment decode time"),t;o*=Ie+1,o+=Pe(i,8)}var l=o/(s.timescale||9e4);if(y(l)&&(null===t||l<t))return l}return t}),null);return null!==a&&y(a)&&(null===t||a<t)?a:t}),null)}(f,d),m=null===v?n:v;(function(e,t,r,i){if(null===e)return!0;var n=Math.max(i,1),a=t-e.baseTime/e.timescale;return Math.abs(a-r)>n}(l,m,n,g)||c.timescale!==l.timescale&&a)&&(c.initPTS=m-n,l&&1===l.timescale&&w.warn("Adjusting initPTS by "+(c.initPTS-l.baseTime)),this.initPTS=l={baseTime:c.initPTS,timescale:1});var p=e?m-l.baseTime/l.timescale:u,E=p+g;!function(e,t,r){Ne(t,["moof","traf"]).forEach((function(t){Ne(t,["tfhd"]).forEach((function(i){var n=Pe(i,4),a=e[n];if(a){var s=a.timescale||9e4;Ne(t,["tfdt"]).forEach((function(e){var t=e[0],i=r*s;if(i){var n=Pe(e,4);if(0===t)n-=i,Oe(e,4,n=Math.max(n,0));else{n*=Math.pow(2,32),n+=Pe(e,8),n-=i,n=Math.max(n,0);var a=Math.floor(n/(Ie+1)),o=Math.floor(n%(Ie+1));Oe(e,4,a),Oe(e,8,o)}}}))}}))}))}(f,d,l.baseTime/l.timescale),g>0?this.lastEndTime=E:(w.warn("Duration parsed from mp4 should be greater than zero"),this.resetNextTimestamp());var T=!!f.audio,S=!!f.video,L="";T&&(L+="audio"),S&&(L+="video");var A={data1:d,startPTS:p,startDTS:p,endPTS:E,endDTS:E,type:L,hasAudio:T,hasVideo:S,nb:1,dropped:0};return h.audio="audio"===A.type?A:void 0,h.video="audio"!==A.type?A:void 0,h.initSegment=c,h.id3=_n(r,n,l,l),i.samples.length&&(h.text=xn(i,n,l)),h},e}();function On(e,t){var r=null==e?void 0:e.codec;if(r&&r.length>4)return r;if(t===O){if("ec-3"===r||"ac-3"===r||"alac"===r)return r;if("fLaC"===r||"Opus"===r)return mt(r,!1);var i="mp4a.40.5";return w.info('Parsed audio codec "'+r+'" or audio object type not handled. Using "'+i+'"'),i}return w.warn('Unhandled video codec "'+r+'"'),"hvc1"===r||"hev1"===r?"hvc1.1.6.L120.90":"av01"===r?"av01.0.04M.08":"avc1.42e01e"}try{Pn=self.performance.now.bind(self.performance)}catch(e){w.debug("Unable to use Performance API on this environment"),Pn=null==j?void 0:j.Date.now}var Nn=[{demux:nn,remux:Mn},{demux:fn,remux:wn},{demux:tn,remux:wn},{demux:Tn,remux:wn}];Nn.splice(2,0,{demux:sn,remux:wn});var Un=function(){function e(e,t,r,i,n){this.async=!1,this.observer=void 0,this.typeSupported=void 0,this.config=void 0,this.vendor=void 0,this.id=void 0,this.demuxer=void 0,this.remuxer=void 0,this.decrypter=void 0,this.probe=void 0,this.decryptionPromise=null,this.transmuxConfig=void 0,this.currentTransmuxState=void 0,this.observer=e,this.typeSupported=t,this.config=r,this.vendor=i,this.id=n}var t=e.prototype;return t.configure=function(e){this.transmuxConfig=e,this.decrypter&&this.decrypter.reset()},t.push=function(e,t,r,i){var n=this,a=r.transmuxing;a.executeStart=Pn();var s=new Uint8Array(e),o=this.currentTransmuxState,l=this.transmuxConfig;i&&(this.currentTransmuxState=i);var u=i||o,h=u.contiguous,d=u.discontinuity,c=u.trackSwitch,f=u.accurateTimeOffset,g=u.timeOffset,v=u.initSegmentChange,m=l.audioCodec,p=l.videoCodec,y=l.defaultInitPts,E=l.duration,T=l.initSegmentData,R=function(e,t){var r=null;return e.byteLength>0&&null!=(null==t?void 0:t.key)&&null!==t.iv&&null!=t.method&&(r=t),r}(s,t);if(R&&"AES-128"===R.method){var k=this.getDecrypter();if(!k.isSync())return this.decryptionPromise=k.webCryptoDecrypt(s,R.key.buffer,R.iv.buffer).then((function(e){var t=n.push(e,null,r);return n.decryptionPromise=null,t})),this.decryptionPromise;var b=k.softwareDecrypt(s,R.key.buffer,R.iv.buffer);if(r.part>-1&&(b=k.flush()),!b)return a.executeEnd=Pn(),Bn(r);s=new Uint8Array(b)}var D=this.needsProbing(d,c);if(D){var I=this.configureTransmuxer(s);if(I)return w.warn("[transmuxer] "+I.message),this.observer.emit(S.ERROR,S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,fatal:!1,error:I,reason:I.message}),a.executeEnd=Pn(),Bn(r)}(d||c||v||D)&&this.resetInitSegment(T,m,p,E,t),(d||v||D)&&this.resetInitialTimestamp(y),h||this.resetContiguity();var C=this.transmux(s,R,g,f,r),_=this.currentTransmuxState;return _.contiguous=!0,_.discontinuity=!1,_.trackSwitch=!1,a.executeEnd=Pn(),C},t.flush=function(e){var t=this,r=e.transmuxing;r.executeStart=Pn();var i=this.decrypter,n=this.currentTransmuxState,a=this.decryptionPromise;if(a)return a.then((function(){return t.flush(e)}));var s=[],o=n.timeOffset;if(i){var l=i.flush();l&&s.push(this.push(l,null,e))}var u=this.demuxer,h=this.remuxer;if(!u||!h)return r.executeEnd=Pn(),[Bn(e)];var d=u.flush(o);return Gn(d)?d.then((function(r){return t.flushRemux(s,r,e),s})):(this.flushRemux(s,d,e),s)},t.flushRemux=function(e,t,r){var i=t.audioTrack,n=t.videoTrack,a=t.id3Track,s=t.textTrack,o=this.currentTransmuxState,l=o.accurateTimeOffset,u=o.timeOffset;w.log("[transmuxer.ts]: Flushed fragment "+r.sn+(r.part>-1?" p: "+r.part:"")+" of level "+r.level);var h=this.remuxer.remux(i,n,a,s,u,l,!0,this.id);e.push({remuxResult:h,chunkMeta:r}),r.transmuxing.executeEnd=Pn()},t.resetInitialTimestamp=function(e){var t=this.demuxer,r=this.remuxer;t&&r&&(t.resetTimeStamp(e),r.resetTimeStamp(e))},t.resetContiguity=function(){var e=this.demuxer,t=this.remuxer;e&&t&&(e.resetContiguity(),t.resetNextTimestamp())},t.resetInitSegment=function(e,t,r,i,n){var a=this.demuxer,s=this.remuxer;a&&s&&(a.resetInitSegment(e,t,r,i),s.resetInitSegment(e,t,r,n))},t.destroy=function(){this.demuxer&&(this.demuxer.destroy(),this.demuxer=void 0),this.remuxer&&(this.remuxer.destroy(),this.remuxer=void 0)},t.transmux=function(e,t,r,i,n){return t&&"SAMPLE-AES"===t.method?this.transmuxSampleAes(e,t,r,i,n):this.transmuxUnencrypted(e,r,i,n)},t.transmuxUnencrypted=function(e,t,r,i){var n=this.demuxer.demux(e,t,!1,!this.config.progressive),a=n.audioTrack,s=n.videoTrack,o=n.id3Track,l=n.textTrack;return{remuxResult:this.remuxer.remux(a,s,o,l,t,r,!1,this.id),chunkMeta:i}},t.transmuxSampleAes=function(e,t,r,i,n){var a=this;return this.demuxer.demuxSampleAes(e,t,r).then((function(e){return{remuxResult:a.remuxer.remux(e.audioTrack,e.videoTrack,e.id3Track,e.textTrack,r,i,!1,a.id),chunkMeta:n}}))},t.configureTransmuxer=function(e){for(var t,r=this.config,i=this.observer,n=this.typeSupported,a=this.vendor,s=0,o=Nn.length;s<o;s++){var l;if(null!=(l=Nn[s].demux)&&l.probe(e)){t=Nn[s];break}}if(!t)return new Error("Failed to find demuxer by probing fragment data");var u=this.demuxer,h=this.remuxer,d=t.remux,c=t.demux;h&&h instanceof d||(this.remuxer=new d(i,r,n,a)),u&&u instanceof c||(this.demuxer=new c(i,r,n),this.probe=c.probe)},t.needsProbing=function(e,t){return!this.demuxer||!this.remuxer||e||t},t.getDecrypter=function(){var e=this.decrypter;return e||(e=this.decrypter=new yi(this.config)),e},e}(),Bn=function(e){return{remuxResult:{},chunkMeta:e}};function Gn(e){return"then"in e&&e.then instanceof Function}var Kn=function(e,t,r,i,n){this.audioCodec=void 0,this.videoCodec=void 0,this.initSegmentData=void 0,this.duration=void 0,this.defaultInitPts=void 0,this.audioCodec=e,this.videoCodec=t,this.initSegmentData=r,this.duration=i,this.defaultInitPts=n||null},Hn=function(e,t,r,i,n,a){this.discontinuity=void 0,this.contiguous=void 0,this.accurateTimeOffset=void 0,this.trackSwitch=void 0,this.timeOffset=void 0,this.initSegmentChange=void 0,this.discontinuity=e,this.contiguous=t,this.accurateTimeOffset=r,this.trackSwitch=i,this.timeOffset=n,this.initSegmentChange=a},Vn={exports:{}};!function(e){var t=Object.prototype.hasOwnProperty,r="~";function i(){}function n(e,t,r){this.fn=e,this.context=t,this.once=r||!1}function a(e,t,i,a,s){if("function"!=typeof i)throw new TypeError("The listener must be a function");var o=new n(i,a||e,s),l=r?r+t:t;return e._events[l]?e._events[l].fn?e._events[l]=[e._events[l],o]:e._events[l].push(o):(e._events[l]=o,e._eventsCount++),e}function s(e,t){0==--e._eventsCount?e._events=new i:delete e._events[t]}function o(){this._events=new i,this._eventsCount=0}Object.create&&(i.prototype=Object.create(null),(new i).__proto__||(r=!1)),o.prototype.eventNames=function(){var e,i,n=[];if(0===this._eventsCount)return n;for(i in e=this._events)t.call(e,i)&&n.push(r?i.slice(1):i);return Object.getOwnPropertySymbols?n.concat(Object.getOwnPropertySymbols(e)):n},o.prototype.listeners=function(e){var t=r?r+e:e,i=this._events[t];if(!i)return[];if(i.fn)return[i.fn];for(var n=0,a=i.length,s=new Array(a);n<a;n++)s[n]=i[n].fn;return s},o.prototype.listenerCount=function(e){var t=r?r+e:e,i=this._events[t];return i?i.fn?1:i.length:0},o.prototype.emit=function(e,t,i,n,a,s){var o=r?r+e:e;if(!this._events[o])return!1;var l,u,h=this._events[o],d=arguments.length;if(h.fn){switch(h.once&&this.removeListener(e,h.fn,void 0,!0),d){case 1:return h.fn.call(h.context),!0;case 2:return h.fn.call(h.context,t),!0;case 3:return h.fn.call(h.context,t,i),!0;case 4:return h.fn.call(h.context,t,i,n),!0;case 5:return h.fn.call(h.context,t,i,n,a),!0;case 6:return h.fn.call(h.context,t,i,n,a,s),!0}for(u=1,l=new Array(d-1);u<d;u++)l[u-1]=arguments[u];h.fn.apply(h.context,l)}else{var c,f=h.length;for(u=0;u<f;u++)switch(h[u].once&&this.removeListener(e,h[u].fn,void 0,!0),d){case 1:h[u].fn.call(h[u].context);break;case 2:h[u].fn.call(h[u].context,t);break;case 3:h[u].fn.call(h[u].context,t,i);break;case 4:h[u].fn.call(h[u].context,t,i,n);break;default:if(!l)for(c=1,l=new Array(d-1);c<d;c++)l[c-1]=arguments[c];h[u].fn.apply(h[u].context,l)}}return!0},o.prototype.on=function(e,t,r){return a(this,e,t,r,!1)},o.prototype.once=function(e,t,r){return a(this,e,t,r,!0)},o.prototype.removeListener=function(e,t,i,n){var a=r?r+e:e;if(!this._events[a])return this;if(!t)return s(this,a),this;var o=this._events[a];if(o.fn)o.fn!==t||n&&!o.once||i&&o.context!==i||s(this,a);else{for(var l=0,u=[],h=o.length;l<h;l++)(o[l].fn!==t||n&&!o[l].once||i&&o[l].context!==i)&&u.push(o[l]);u.length?this._events[a]=1===u.length?u[0]:u:s(this,a)}return this},o.prototype.removeAllListeners=function(e){var t;return e?(t=r?r+e:e,this._events[t]&&s(this,t)):(this._events=new i,this._eventsCount=0),this},o.prototype.off=o.prototype.removeListener,o.prototype.addListener=o.prototype.on,o.prefixed=r,o.EventEmitter=o,e.exports=o}(Vn);var Yn=v(Vn.exports);function Wn(e,t){if(!((r=t.remuxResult).audio||r.video||r.text||r.id3||r.initSegment))return!1;var r,i=[],n=t.remuxResult,a=n.audio,s=n.video;return a&&jn(i,a),s&&jn(i,s),e.postMessage({event:"transmuxComplete",data:t},i),!0}function jn(e,t){t.data1&&e.push(t.data1.buffer),t.data2&&e.push(t.data2.buffer)}function qn(e,t,r){t.reduce((function(t,r){return Wn(e,r)||t}),!1)||e.postMessage({event:"transmuxComplete",data:t[0]}),e.postMessage({event:"flush",data:r})}void 0!==t&&t&&function(e){var t=new Yn,r=function(t,r){e.postMessage({event:t,data:r})};t.on(S.FRAG_DECRYPTED,r),t.on(S.ERROR,r);var i=function(){var e=function(e){var t=function(t){r("workerLog",{logType:e,message:t})};w[e]=t};for(var t in w)e(t)};e.addEventListener("message",(function(n){var a=n.data;switch(a.cmd){case"init":var s=JSON.parse(a.config);e.transmuxer=new Un(t,a.typeSupported,s,"",a.id),I(s.debug,a.id),i(),r("init",null);break;case"configure":e.transmuxer.configure(a.config);break;case"demux":var o=e.transmuxer.push(a.data,a.decryptdata,a.chunkMeta,a.state);Gn(o)?(e.transmuxer.async=!0,o.then((function(t){Wn(e,t)})).catch((function(e){r(S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,chunkMeta:a.chunkMeta,fatal:!1,error:e,err:e,reason:"transmuxer-worker push error"})}))):(e.transmuxer.async=!1,Wn(e,o));break;case"flush":var l=a.chunkMeta,u=e.transmuxer.flush(l);Gn(u)||e.transmuxer.async?(Gn(u)||(u=Promise.resolve(u)),u.then((function(t){qn(e,t,l)})).catch((function(e){r(S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,chunkMeta:a.chunkMeta,fatal:!1,error:e,err:e,reason:"transmuxer-worker flush error"})}))):qn(e,u,l)}}))}(self);var Xn=function(){function t(t,r,i,n){var a=this;this.error=null,this.hls=void 0,this.id=void 0,this.observer=void 0,this.frag=null,this.part=null,this.useWorker=void 0,this.workerContext=null,this.onwmsg=void 0,this.transmuxer=null,this.onTransmuxComplete=void 0,this.onFlush=void 0;var s=t.config;this.hls=t,this.id=r,this.useWorker=!!s.enableWorker,this.onTransmuxComplete=i,this.onFlush=n;var o=function(e,t){(t=t||{}).frag=a.frag,t.id=a.id,e===S.ERROR&&(a.error=t.error),a.hls.trigger(e,t)};this.observer=new Yn,this.observer.on(S.FRAG_DECRYPTED,o),this.observer.on(S.ERROR,o);var l,u,h,d,c=ot(s.preferManagedMediaSource)||{isTypeSupported:function(){return!1}},f={mpeg:c.isTypeSupported("audio/mpeg"),mp3:c.isTypeSupported('audio/mp4; codecs="mp3"'),ac3:c.isTypeSupported('audio/mp4; codecs="ac-3"')};if(!this.useWorker||"undefined"==typeof Worker||(s.workerPath,0))this.transmuxer=new Un(this.observer,f,s,"",r);else try{s.workerPath?(w.log("loading Web Worker "+s.workerPath+' for "'+r+'"'),this.workerContext=(h=s.workerPath,d=new self.URL(h,self.location.href).href,{worker:new self.Worker(d),scriptURL:d})):(w.log('injecting Web Worker for "'+r+'"'),this.workerContext=(l=new self.Blob(["var exports={};var module={exports:exports};function define(f){f()};define.amd=true;("+e.toString()+")(true);"],{type:"text/javascript"}),u=self.URL.createObjectURL(l),{worker:new self.Worker(u),objectURL:u})),this.onwmsg=function(e){return a.onWorkerMessage(e)};var g=this.workerContext.worker;g.addEventListener("message",this.onwmsg),g.onerror=function(e){var t=new Error(e.message+"  ("+e.filename+":"+e.lineno+")");s.enableWorker=!1,w.warn('Error in "'+r+'" Web Worker, fallback to inline'),a.hls.trigger(S.ERROR,{type:L.OTHER_ERROR,details:A.INTERNAL_EXCEPTION,fatal:!1,event:"demuxerWorker",error:t})},g.postMessage({cmd:"init",typeSupported:f,vendor:"",id:r,config:JSON.stringify(s)})}catch(e){w.warn('Error setting up "'+r+'" Web Worker, fallback to inline',e),this.resetWorker(),this.error=null,this.transmuxer=new Un(this.observer,f,s,"",r)}}var r=t.prototype;return r.resetWorker=function(){if(this.workerContext){var e=this.workerContext,t=e.worker,r=e.objectURL;r&&self.URL.revokeObjectURL(r),t.removeEventListener("message",this.onwmsg),t.onerror=null,t.terminate(),this.workerContext=null}},r.destroy=function(){if(this.workerContext)this.resetWorker(),this.onwmsg=void 0;else{var e=this.transmuxer;e&&(e.destroy(),this.transmuxer=null)}var t=this.observer;t&&t.removeAllListeners(),this.frag=null,this.observer=null,this.hls=null},r.push=function(e,t,r,i,n,a,s,o,l,u){var h,d,c=this;l.transmuxing.start=self.performance.now();var f=this.transmuxer,g=a?a.start:n.start,v=n.decryptdata,m=this.frag,p=!(m&&n.cc===m.cc),y=!(m&&l.level===m.level),E=m?l.sn-m.sn:-1,T=this.part?l.part-this.part.index:-1,S=0===E&&l.id>1&&l.id===(null==m?void 0:m.stats.chunkCount),L=!y&&(1===E||0===E&&(1===T||S&&T<=0)),A=self.performance.now();(y||E||0===n.stats.parsing.start)&&(n.stats.parsing.start=A),!a||!T&&L||(a.stats.parsing.start=A);var R=!(m&&(null==(h=n.initSegment)?void 0:h.url)===(null==(d=m.initSegment)?void 0:d.url)),k=new Hn(p,L,o,y,g,R);if(!L||p||R){w.log("[transmuxer-interface, "+n.type+"]: Starting new transmux session for sn: "+l.sn+" p: "+l.part+" level: "+l.level+" id: "+l.id+"\n        discontinuity: "+p+"\n        trackSwitch: "+y+"\n        contiguous: "+L+"\n        accurateTimeOffset: "+o+"\n        timeOffset: "+g+"\n        initSegmentChange: "+R);var b=new Kn(r,i,t,s,u);this.configureTransmuxer(b)}if(this.frag=n,this.part=a,this.workerContext)this.workerContext.worker.postMessage({cmd:"demux",data:e,decryptdata:v,chunkMeta:l,state:k},e instanceof ArrayBuffer?[e]:[]);else if(f){var D=f.push(e,v,l,k);Gn(D)?(f.async=!0,D.then((function(e){c.handleTransmuxComplete(e)})).catch((function(e){c.transmuxerError(e,l,"transmuxer-interface push error")}))):(f.async=!1,this.handleTransmuxComplete(D))}},r.flush=function(e){var t=this;e.transmuxing.start=self.performance.now();var r=this.transmuxer;if(this.workerContext)this.workerContext.worker.postMessage({cmd:"flush",chunkMeta:e});else if(r){var i=r.flush(e);Gn(i)||r.async?(Gn(i)||(i=Promise.resolve(i)),i.then((function(r){t.handleFlushResult(r,e)})).catch((function(r){t.transmuxerError(r,e,"transmuxer-interface flush error")}))):this.handleFlushResult(i,e)}},r.transmuxerError=function(e,t,r){this.hls&&(this.error=e,this.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_PARSING_ERROR,chunkMeta:t,frag:this.frag||void 0,fatal:!1,error:e,err:e,reason:r}))},r.handleFlushResult=function(e,t){var r=this;e.forEach((function(e){r.handleTransmuxComplete(e)})),this.onFlush(t)},r.onWorkerMessage=function(e){var t=e.data;if(null!=t&&t.event){var r=this.hls;if(this.hls)switch(t.event){case"init":var i,n=null==(i=this.workerContext)?void 0:i.objectURL;n&&self.URL.revokeObjectURL(n);break;case"transmuxComplete":this.handleTransmuxComplete(t.data);break;case"flush":this.onFlush(t.data);break;case"workerLog":w[t.data.logType]&&w[t.data.logType](t.data.message);break;default:t.data=t.data||{},t.data.frag=this.frag,t.data.id=this.id,r.trigger(t.event,t.data)}}else w.warn("worker message received with no "+(t?"event name":"data"))},r.configureTransmuxer=function(e){var t=this.transmuxer;this.workerContext?this.workerContext.worker.postMessage({cmd:"configure",config:e}):t&&t.configure(e)},r.handleTransmuxComplete=function(e){e.chunkMeta.transmuxing.end=self.performance.now(),this.onTransmuxComplete(e)},t}(),zn=function(e){function t(t,r,i){var n;return(n=e.call(this,t,r,i,"[audio-stream-controller]",Ot)||this).videoBuffer=null,n.videoTrackCC=-1,n.waitingVideoCC=-1,n.bufferedTrack=null,n.switchingTrack=null,n.trackId=-1,n.waitingData=null,n.mainDetails=null,n.flushing=!1,n.bufferFlushed=!1,n.cachedTrackLoadedData=null,n._registerListeners(),n}l(t,e);var r=t.prototype;return r.onHandlerDestroying=function(){this._unregisterListeners(),e.prototype.onHandlerDestroying.call(this),this.mainDetails=null,this.bufferedTrack=null,this.switchingTrack=null},r._registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.LEVEL_LOADED,this.onLevelLoaded,this),e.on(S.AUDIO_TRACKS_UPDATED,this.onAudioTracksUpdated,this),e.on(S.AUDIO_TRACK_SWITCHING,this.onAudioTrackSwitching,this),e.on(S.AUDIO_TRACK_LOADED,this.onAudioTrackLoaded,this),e.on(S.ERROR,this.onError,this),e.on(S.BUFFER_RESET,this.onBufferReset,this),e.on(S.BUFFER_CREATED,this.onBufferCreated,this),e.on(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.on(S.BUFFER_FLUSHED,this.onBufferFlushed,this),e.on(S.INIT_PTS_FOUND,this.onInitPtsFound,this),e.on(S.FRAG_BUFFERED,this.onFragBuffered,this)},r._unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.LEVEL_LOADED,this.onLevelLoaded,this),e.off(S.AUDIO_TRACKS_UPDATED,this.onAudioTracksUpdated,this),e.off(S.AUDIO_TRACK_SWITCHING,this.onAudioTrackSwitching,this),e.off(S.AUDIO_TRACK_LOADED,this.onAudioTrackLoaded,this),e.off(S.ERROR,this.onError,this),e.off(S.BUFFER_RESET,this.onBufferReset,this),e.off(S.BUFFER_CREATED,this.onBufferCreated,this),e.off(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.off(S.BUFFER_FLUSHED,this.onBufferFlushed,this),e.off(S.INIT_PTS_FOUND,this.onInitPtsFound,this),e.off(S.FRAG_BUFFERED,this.onFragBuffered,this)},r.onInitPtsFound=function(e,t){var r=t.frag,i=t.id,n=t.initPTS,a=t.timescale;if("main"===i){var s=r.cc;this.initPTS[r.cc]={baseTime:n,timescale:a},this.log("InitPTS for cc: "+s+" found from main: "+n),this.videoTrackCC=s,this.state===Ci&&this.tick()}},r.startLoad=function(e){if(!this.levels)return this.startPosition=e,void(this.state=Ti);var t=this.lastCurrentTime;this.stopLoad(),this.setInterval(100),t>0&&-1===e?(this.log("Override startPosition with lastCurrentTime @"+t.toFixed(3)),e=t,this.state=Si):(this.loadedmetadata=!1,this.state=ki),this.nextLoadPosition=this.startPosition=this.lastCurrentTime=e,this.tick()},r.doTick=function(){switch(this.state){case Si:this.doTickIdle();break;case ki:var t,r=this.levels,i=this.trackId,n=null==r||null==(t=r[i])?void 0:t.details;if(n){if(this.waitForCdnTuneIn(n))break;this.state=Ci}break;case Ri:var a,s=performance.now(),o=this.retryDate;if(!o||s>=o||null!=(a=this.media)&&a.seeking){var l=this.levels,u=this.trackId;this.log("RetryDate reached, switch back to IDLE state"),this.resetStartWhenNotLoaded((null==l?void 0:l[u])||null),this.state=Si}break;case Ci:var h=this.waitingData;if(h){var d=h.frag,c=h.part,f=h.cache,g=h.complete;if(void 0!==this.initPTS[d.cc]){this.waitingData=null,this.waitingVideoCC=-1,this.state=Ai;var v={frag:d,part:c,payload:f.flush(),networkDetails:null};this._handleFragmentLoadProgress(v),g&&e.prototype._handleFragmentLoadComplete.call(this,v)}else if(this.videoTrackCC!==this.waitingVideoCC)this.log("Waiting fragment cc ("+d.cc+") cancelled because video is at cc "+this.videoTrackCC),this.clearWaitingFragment();else{var m=this.getLoadPosition(),p=ii.bufferInfo(this.mediaBuffer,m,this.config.maxBufferHole);kr(p.end,this.config.maxFragLookUpTolerance,d)<0&&(this.log("Waiting fragment cc ("+d.cc+") @ "+d.start+" cancelled because another fragment at "+p.end+" is needed"),this.clearWaitingFragment())}}else this.state=Si}this.onTickEnd()},r.clearWaitingFragment=function(){var e=this.waitingData;e&&(this.fragmentTracker.removeFragment(e.frag),this.waitingData=null,this.waitingVideoCC=-1,this.state=Si)},r.resetLoadingState=function(){this.clearWaitingFragment(),e.prototype.resetLoadingState.call(this)},r.onTickEnd=function(){var e=this.media;null!=e&&e.readyState&&(this.lastCurrentTime=e.currentTime)},r.doTickIdle=function(){var e=this.hls,t=this.levels,r=this.media,i=this.trackId,n=e.config;if(this.buffering&&(r||!this.startFragRequested&&n.startFragPrefetch)&&null!=t&&t[i]){var a=t[i],s=a.details;if(!s||s.live&&this.levelLastLoaded!==a||this.waitForCdnTuneIn(s))this.state=ki;else{var o=this.mediaBuffer?this.mediaBuffer:this.media;this.bufferFlushed&&o&&(this.bufferFlushed=!1,this.afterBufferFlushed(o,O,Ot));var l=this.getFwdBufferInfo(o,Ot);if(null!==l){if(!this.switchingTrack&&this._streamEnded(l,s))return e.trigger(S.BUFFER_EOS,{type:"audio"}),void(this.state=Ii);var u=this.getFwdBufferInfo(this.videoBuffer?this.videoBuffer:this.media,Mt),h=l.len,d=this.getMaxBufferLength(null==u?void 0:u.len),c=s.fragments,f=c[0].start,g=this.getLoadPosition(),v=this.flushing?g:l.end;if(this.switchingTrack&&r){var m=g;s.PTSKnown&&m<f&&(l.end>f||l.nextStart)&&(this.log("Alt audio track ahead of main track, seek to start of alt audio track"),r.currentTime=f+.05)}if(!(h>=d&&!this.switchingTrack&&v<c[c.length-1].start)){var p=this.getNextFragment(v,s),y=!1;if(p&&this.isLoopLoading(p,v)&&(y=!!p.gap,p=this.getNextFragmentLoopLoading(p,s,l,Mt,d)),p){var E=u&&p.start>u.end+s.targetduration;if(E||(null==u||!u.len)&&l.len){var T=this.getAppendedFrag(p.start,Mt);if(null===T)return;if(y||(y=!!T.gap||!!E&&0===u.len),E&&!y||y&&l.nextStart&&l.nextStart<T.end)return}this.loadFragment(p,a,v)}else this.bufferFlushed=!0}}}}},r.getMaxBufferLength=function(t){var r=e.prototype.getMaxBufferLength.call(this);return t?Math.min(Math.max(r,t),this.config.maxMaxBufferLength):r},r.onMediaDetaching=function(){this.videoBuffer=null,this.bufferFlushed=this.flushing=!1,e.prototype.onMediaDetaching.call(this)},r.onAudioTracksUpdated=function(e,t){var r=t.audioTracks;this.resetTransmuxer(),this.levels=r.map((function(e){return new lr(e)}))},r.onAudioTrackSwitching=function(e,t){var r=!!t.url;this.trackId=t.id;var i=this.fragCurrent;i&&(i.abortRequests(),this.removeUnbufferedFrags(i.start)),this.resetLoadingState(),r?this.setInterval(100):this.resetTransmuxer(),r?(this.switchingTrack=t,this.state=Si,this.flushAudioIfNeeded(t)):(this.switchingTrack=null,this.bufferedTrack=t,this.state=Ti),this.tick()},r.onManifestLoading=function(){this.fragmentTracker.removeAllFragments(),this.startPosition=this.lastCurrentTime=0,this.bufferFlushed=this.flushing=!1,this.levels=this.mainDetails=this.waitingData=this.bufferedTrack=this.cachedTrackLoadedData=this.switchingTrack=null,this.startFragRequested=!1,this.trackId=this.videoTrackCC=this.waitingVideoCC=-1},r.onLevelLoaded=function(e,t){this.mainDetails=t.details,null!==this.cachedTrackLoadedData&&(this.hls.trigger(S.AUDIO_TRACK_LOADED,this.cachedTrackLoadedData),this.cachedTrackLoadedData=null)},r.onAudioTrackLoaded=function(e,t){var r;if(null!=this.mainDetails){var i=this.levels,n=t.details,a=t.id;if(i){this.log("Audio track "+a+" loaded ["+n.startSN+","+n.endSN+"]"+(n.lastPartSn?"[part-"+n.lastPartSn+"-"+n.lastPartIndex+"]":"")+",duration:"+n.totalduration);var s=i[a],o=0;if(n.live||null!=(r=s.details)&&r.live){this.checkLiveUpdate(n);var l,u=this.mainDetails;if(n.deltaUpdateFailed||!u)return;!s.details&&n.hasProgramDateTime&&u.hasProgramDateTime?(ui(n,u),o=n.fragments[0].start):o=this.alignPlaylists(n,s.details,null==(l=this.levelLastLoaded)?void 0:l.details)}s.details=n,this.levelLastLoaded=s,this.startFragRequested||!this.mainDetails&&n.live||this.setStartPosition(this.mainDetails||n,o),this.state!==ki||this.waitForCdnTuneIn(n)||(this.state=Si),this.tick()}else this.warn("Audio tracks were reset while loading level "+a)}else this.cachedTrackLoadedData=t},r._handleFragmentLoadProgress=function(e){var t,r=e.frag,i=e.part,n=e.payload,a=this.config,s=this.trackId,o=this.levels;if(o){var l=o[s];if(l){var u=l.details;if(!u)return this.warn("Audio track details undefined on fragment load progress"),void this.removeUnbufferedFrags(r.start);var h=a.defaultAudioCodec||l.audioCodec||"mp4a.40.2",d=this.transmuxer;d||(d=this.transmuxer=new Xn(this.hls,Ot,this._handleTransmuxComplete.bind(this),this._handleTransmuxerFlush.bind(this)));var c=this.initPTS[r.cc],f=null==(t=r.initSegment)?void 0:t.data;if(void 0!==c){var g=i?i.index:-1,v=-1!==g,m=new ni(r.level,r.sn,r.stats.chunkCount,n.byteLength,g,v);d.push(n,f,h,"",r,i,u.totalduration,!1,m,c)}else this.log("Unknown video PTS for cc "+r.cc+", waiting for video PTS before demuxing audio frag "+r.sn+" of ["+u.startSN+" ,"+u.endSN+"],track "+s),(this.waitingData=this.waitingData||{frag:r,part:i,cache:new Pi,complete:!1}).cache.push(new Uint8Array(n)),this.waitingVideoCC=this.videoTrackCC,this.state=Ci}else this.warn("Audio track is undefined on fragment load progress")}else this.warn("Audio tracks were reset while fragment load was in progress. Fragment "+r.sn+" of level "+r.level+" will not be buffered")},r._handleFragmentLoadComplete=function(t){this.waitingData?this.waitingData.complete=!0:e.prototype._handleFragmentLoadComplete.call(this,t)},r.onBufferReset=function(){this.mediaBuffer=this.videoBuffer=null,this.loadedmetadata=!1},r.onBufferCreated=function(e,t){var r=t.tracks.audio;r&&(this.mediaBuffer=r.buffer||null),t.tracks.video&&(this.videoBuffer=t.tracks.video.buffer||null)},r.onFragBuffered=function(e,t){var r=t.frag,n=t.part;if(r.type===Ot)if(this.fragContextChanged(r))this.warn("Fragment "+r.sn+(n?" p: "+n.index:"")+" of level "+r.level+" finished buffering, but was aborted. state: "+this.state+", audioSwitch: "+(this.switchingTrack?this.switchingTrack.name:"false"));else{if("initSegment"!==r.sn){this.fragPrevious=r;var a=this.switchingTrack;a&&(this.bufferedTrack=a,this.switchingTrack=null,this.hls.trigger(S.AUDIO_TRACK_SWITCHED,i({},a)))}this.fragBufferedComplete(r,n)}else if(!this.loadedmetadata&&r.type===Mt){var s=this.videoBuffer||this.media;s&&ii.getBuffered(s).length&&(this.loadedmetadata=!0)}},r.onError=function(t,r){var i;if(r.fatal)this.state=wi;else switch(r.details){case A.FRAG_GAP:case A.FRAG_PARSING_ERROR:case A.FRAG_DECRYPT_ERROR:case A.FRAG_LOAD_ERROR:case A.FRAG_LOAD_TIMEOUT:case A.KEY_LOAD_ERROR:case A.KEY_LOAD_TIMEOUT:this.onFragmentOrKeyLoadError(Ot,r);break;case A.AUDIO_TRACK_LOAD_ERROR:case A.AUDIO_TRACK_LOAD_TIMEOUT:case A.LEVEL_PARSING_ERROR:r.levelRetry||this.state!==ki||(null==(i=r.context)?void 0:i.type)!==Pt||(this.state=Si);break;case A.BUFFER_APPEND_ERROR:case A.BUFFER_FULL_ERROR:if(!r.parent||"audio"!==r.parent)return;if(r.details===A.BUFFER_APPEND_ERROR)return void this.resetLoadingState();this.reduceLengthAndFlushBuffer(r)&&(this.bufferedTrack=null,e.prototype.flushMainBuffer.call(this,0,Number.POSITIVE_INFINITY,"audio"));break;case A.INTERNAL_EXCEPTION:this.recoverWorkerError(r)}},r.onBufferFlushing=function(e,t){t.type!==N&&(this.flushing=!0)},r.onBufferFlushed=function(e,t){var r=t.type;if(r!==N){this.flushing=!1,this.bufferFlushed=!0,this.state===Ii&&(this.state=Si);var i=this.mediaBuffer||this.media;i&&(this.afterBufferFlushed(i,r,Ot),this.tick())}},r._handleTransmuxComplete=function(e){var t,r="audio",i=this.hls,n=e.remuxResult,a=e.chunkMeta,s=this.getCurrentContext(a);if(s){var l=s.frag,u=s.part,h=s.level,d=h.details,c=n.audio,f=n.text,g=n.id3,v=n.initSegment;if(!this.fragContextChanged(l)&&d){if(this.state=bi,this.switchingTrack&&c&&this.completeAudioSwitch(this.switchingTrack),null!=v&&v.tracks){var m=l.initSegment||l;this._bufferInitSegment(h,v.tracks,m,a),i.trigger(S.FRAG_PARSING_INIT_SEGMENT,{frag:m,id:r,tracks:v.tracks})}if(c){var p=c.startPTS,y=c.endPTS,E=c.startDTS,T=c.endDTS;u&&(u.elementaryStreams[O]={startPTS:p,endPTS:y,startDTS:E,endDTS:T}),l.setElementaryStreamInfo(O,p,y,E,T),this.bufferFragmentData(c,l,u,a)}if(null!=g&&null!=(t=g.samples)&&t.length){var L=o({id:r,frag:l,details:d},g);i.trigger(S.FRAG_PARSING_METADATA,L)}if(f){var A=o({id:r,frag:l,details:d},f);i.trigger(S.FRAG_PARSING_USERDATA,A)}}else this.fragmentTracker.removeFragment(l)}else this.resetWhenMissingContext(a)},r._bufferInitSegment=function(e,t,r,i){if(this.state===bi){t.video&&delete t.video;var n=t.audio;if(n){n.id="audio";var a=e.audioCodec;this.log("Init audio buffer, container:"+n.container+", codecs[level/parsed]=["+a+"/"+n.codec+"]"),a&&1===a.split(",").length&&(n.levelCodec=a),this.hls.trigger(S.BUFFER_CODECS,t);var s=n.initSegment;if(null!=s&&s.byteLength){var o={type:"audio",frag:r,part:null,chunkMeta:i,parent:r.type,data:s};this.hls.trigger(S.BUFFER_APPENDING,o)}this.tickImmediate()}}},r.loadFragment=function(t,r,i){var n,a=this.fragmentTracker.getState(t);if(this.fragCurrent=t,this.switchingTrack||a===zr||a===Jr)if("initSegment"===t.sn)this._loadInitSegment(t,r);else if(null!=(n=r.details)&&n.live&&!this.initPTS[t.cc]){this.log("Waiting for video PTS in continuity counter "+t.cc+" of live stream before loading audio fragment "+t.sn+" of level "+this.trackId),this.state=Ci;var s=this.mainDetails;s&&s.fragments[0].start!==r.details.fragments[0].start&&ui(r.details,s)}else this.startFragRequested=!0,e.prototype.loadFragment.call(this,t,r,i);else this.clearTrackerIfNeeded(t)},r.flushAudioIfNeeded=function(t){if(this.media&&this.bufferedTrack){var r=this.bufferedTrack;Yr({name:r.name,lang:r.lang,assocLang:r.assocLang,characteristics:r.characteristics,audioCodec:r.audioCodec,channels:r.channels},t,Wr)||(this.log("Switching audio track : flushing all audio"),e.prototype.flushMainBuffer.call(this,0,Number.POSITIVE_INFINITY,"audio"),this.bufferedTrack=null)}},r.completeAudioSwitch=function(e){var t=this.hls;this.flushAudioIfNeeded(e),this.bufferedTrack=e,this.switchingTrack=null,t.trigger(S.AUDIO_TRACK_SWITCHED,i({},e))},t}(xi);function Qn(e,t){if(e.length!==t.length)return!1;for(var r=0;r<e.length;r++)if(!Jn(e[r].attrs,t[r].attrs))return!1;return!0}function Jn(e,t,r){var i=e["STABLE-RENDITION-ID"];return i&&!r?i===t["STABLE-RENDITION-ID"]:!(r||["LANGUAGE","NAME","CHARACTERISTICS","AUTOSELECT","DEFAULT","FORCED","ASSOC-LANGUAGE"]).some((function(r){return e[r]!==t[r]}))}function $n(e,t){return t.label.toLowerCase()===e.name.toLowerCase()&&(!t.language||t.language.toLowerCase()===(e.lang||"").toLowerCase())}var Zn=function(e){function t(t){var r;return(r=e.call(this,t,"[audio-track-controller]")||this).tracks=[],r.groupIds=null,r.tracksInGroup=[],r.trackId=-1,r.currentTrack=null,r.selectDefaultTrack=!0,r.registerListeners(),r}l(t,e);var r=t.prototype;return r.registerListeners=function(){var e=this.hls;e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_PARSED,this.onManifestParsed,this),e.on(S.LEVEL_LOADING,this.onLevelLoading,this),e.on(S.LEVEL_SWITCHING,this.onLevelSwitching,this),e.on(S.AUDIO_TRACK_LOADED,this.onAudioTrackLoaded,this),e.on(S.ERROR,this.onError,this)},r.unregisterListeners=function(){var e=this.hls;e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_PARSED,this.onManifestParsed,this),e.off(S.LEVEL_LOADING,this.onLevelLoading,this),e.off(S.LEVEL_SWITCHING,this.onLevelSwitching,this),e.off(S.AUDIO_TRACK_LOADED,this.onAudioTrackLoaded,this),e.off(S.ERROR,this.onError,this)},r.destroy=function(){this.unregisterListeners(),this.tracks.length=0,this.tracksInGroup.length=0,this.currentTrack=null,e.prototype.destroy.call(this)},r.onManifestLoading=function(){this.tracks=[],this.tracksInGroup=[],this.groupIds=null,this.currentTrack=null,this.trackId=-1,this.selectDefaultTrack=!0},r.onManifestParsed=function(e,t){this.tracks=t.audioTracks||[]},r.onAudioTrackLoaded=function(e,t){var r=t.id,i=t.groupId,n=t.details,a=this.tracksInGroup[r];if(a&&a.groupId===i){var s=a.details;a.details=t.details,this.log("Audio track "+r+' "'+a.name+'" lang:'+a.lang+" group:"+i+" loaded ["+n.startSN+"-"+n.endSN+"]"),r===this.trackId&&this.playlistLoaded(r,t,s)}else this.warn("Audio track with id:"+r+" and group:"+i+" not found in active group "+(null==a?void 0:a.groupId))},r.onLevelLoading=function(e,t){this.switchLevel(t.level)},r.onLevelSwitching=function(e,t){this.switchLevel(t.level)},r.switchLevel=function(e){var t=this.hls.levels[e];if(t){var r=t.audioGroups||null,i=this.groupIds,n=this.currentTrack;if(!r||(null==i?void 0:i.length)!==(null==r?void 0:r.length)||null!=r&&r.some((function(e){return-1===(null==i?void 0:i.indexOf(e))}))){this.groupIds=r,this.trackId=-1,this.currentTrack=null;var a=this.tracks.filter((function(e){return!r||-1!==r.indexOf(e.groupId)}));if(a.length)this.selectDefaultTrack&&!a.some((function(e){return e.default}))&&(this.selectDefaultTrack=!1),a.forEach((function(e,t){e.id=t}));else if(!n&&!this.tracksInGroup.length)return;this.tracksInGroup=a;var s=this.hls.config.audioPreference;if(!n&&s){var o=Vr(s,a,Wr);if(o>-1)n=a[o];else{var l=Vr(s,this.tracks);n=this.tracks[l]}}var u=this.findTrackId(n);-1===u&&n&&(u=this.findTrackId(null));var h={audioTracks:a};this.log("Updating audio tracks, "+a.length+" track(s) found in group(s): "+(null==r?void 0:r.join(","))),this.hls.trigger(S.AUDIO_TRACKS_UPDATED,h);var d=this.trackId;if(-1!==u&&-1===d)this.setAudioTrack(u);else if(a.length&&-1===d){var c,f=new Error("No audio track selected for current audio group-ID(s): "+(null==(c=this.groupIds)?void 0:c.join(","))+" track count: "+a.length);this.warn(f.message),this.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.AUDIO_TRACK_LOAD_ERROR,fatal:!0,error:f})}}else this.shouldReloadPlaylist(n)&&this.setAudioTrack(this.trackId)}},r.onError=function(e,t){!t.fatal&&t.context&&(t.context.type!==Pt||t.context.id!==this.trackId||this.groupIds&&-1===this.groupIds.indexOf(t.context.groupId)||(this.requestScheduled=-1,this.checkRetry(t)))},r.setAudioOption=function(e){var t=this.hls;if(t.config.audioPreference=e,e){var r=this.allAudioTracks;if(this.selectDefaultTrack=!1,r.length){var i=this.currentTrack;if(i&&Yr(e,i,Wr))return i;var n=Vr(e,this.tracksInGroup,Wr);if(n>-1){var a=this.tracksInGroup[n];return this.setAudioTrack(n),a}if(i){var s=t.loadLevel;-1===s&&(s=t.firstAutoLevel);var o=function(e,t,r,i,n){var a=t[i],s=t.reduce((function(e,t,r){var i=t.uri;return(e[i]||(e[i]=[])).push(r),e}),{})[a.uri];s.length>1&&(i=Math.max.apply(Math,s));var o=a.videoRange,l=a.frameRate,u=a.codecSet.substring(0,4),h=jr(t,i,(function(t){if(t.videoRange!==o||t.frameRate!==l||t.codecSet.substring(0,4)!==u)return!1;var i=t.audioGroups,a=r.filter((function(e){return!i||-1!==i.indexOf(e.groupId)}));return Vr(e,a,n)>-1}));return h>-1?h:jr(t,i,(function(t){var i=t.audioGroups,a=r.filter((function(e){return!i||-1!==i.indexOf(e.groupId)}));return Vr(e,a,n)>-1}))}(e,t.levels,r,s,Wr);if(-1===o)return null;t.nextLoadLevel=o}if(e.channels||e.audioCodec){var l=Vr(e,r);if(l>-1)return r[l]}}}return null},r.setAudioTrack=function(e){var t=this.tracksInGroup;if(e<0||e>=t.length)this.warn("Invalid audio track id: "+e);else{this.clearTimer(),this.selectDefaultTrack=!1;var r=this.currentTrack,n=t[e],a=n.details&&!n.details.live;if(!(e===this.trackId&&n===r&&a||(this.log("Switching to audio-track "+e+' "'+n.name+'" lang:'+n.lang+" group:"+n.groupId+" channels:"+n.channels),this.trackId=e,this.currentTrack=n,this.hls.trigger(S.AUDIO_TRACK_SWITCHING,i({},n)),a))){var s=this.switchParams(n.url,null==r?void 0:r.details,n.details);this.loadPlaylist(s)}}},r.findTrackId=function(e){for(var t=this.tracksInGroup,r=0;r<t.length;r++){var i=t[r];if((!this.selectDefaultTrack||i.default)&&(!e||Yr(e,i,Wr)))return r}if(e){for(var n=e.name,a=e.lang,s=e.assocLang,o=e.characteristics,l=e.audioCodec,u=e.channels,h=0;h<t.length;h++)if(Yr({name:n,lang:a,assocLang:s,characteristics:o,audioCodec:l,channels:u},t[h],Wr))return h;for(var d=0;d<t.length;d++){var c=t[d];if(Jn(e.attrs,c.attrs,["LANGUAGE","ASSOC-LANGUAGE","CHARACTERISTICS"]))return d}for(var f=0;f<t.length;f++){var g=t[f];if(Jn(e.attrs,g.attrs,["LANGUAGE"]))return f}}return-1},r.loadPlaylist=function(t){var r=this.currentTrack;if(this.shouldLoadPlaylist(r)&&r){e.prototype.loadPlaylist.call(this);var i=r.id,n=r.groupId,a=r.url;if(t)try{a=t.addDirectives(a)}catch(e){this.warn("Could not construct new URL with HLS Delivery Directives: "+e)}this.log("loading audio-track playlist "+i+' "'+r.name+'" lang:'+r.lang+" group:"+n),this.clearTimer(),this.hls.trigger(S.AUDIO_TRACK_LOADING,{url:a,id:i,groupId:n,deliveryDirectives:t||null})}},s(t,[{key:"allAudioTracks",get:function(){return this.tracks}},{key:"audioTracks",get:function(){return this.tracksInGroup}},{key:"audioTrack",get:function(){return this.trackId},set:function(e){this.selectDefaultTrack=!1,this.setAudioTrack(e)}}]),t}(Mr),ea=function(e){function t(t,r,i){var n;return(n=e.call(this,t,r,i,"[subtitle-stream-controller]",Nt)||this).currentTrackId=-1,n.tracksBuffered=[],n.mainDetails=null,n._registerListeners(),n}l(t,e);var r=t.prototype;return r.onHandlerDestroying=function(){this._unregisterListeners(),e.prototype.onHandlerDestroying.call(this),this.mainDetails=null},r._registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.LEVEL_LOADED,this.onLevelLoaded,this),e.on(S.ERROR,this.onError,this),e.on(S.SUBTITLE_TRACKS_UPDATED,this.onSubtitleTracksUpdated,this),e.on(S.SUBTITLE_TRACK_SWITCH,this.onSubtitleTrackSwitch,this),e.on(S.SUBTITLE_TRACK_LOADED,this.onSubtitleTrackLoaded,this),e.on(S.SUBTITLE_FRAG_PROCESSED,this.onSubtitleFragProcessed,this),e.on(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.on(S.FRAG_BUFFERED,this.onFragBuffered,this)},r._unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.LEVEL_LOADED,this.onLevelLoaded,this),e.off(S.ERROR,this.onError,this),e.off(S.SUBTITLE_TRACKS_UPDATED,this.onSubtitleTracksUpdated,this),e.off(S.SUBTITLE_TRACK_SWITCH,this.onSubtitleTrackSwitch,this),e.off(S.SUBTITLE_TRACK_LOADED,this.onSubtitleTrackLoaded,this),e.off(S.SUBTITLE_FRAG_PROCESSED,this.onSubtitleFragProcessed,this),e.off(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.off(S.FRAG_BUFFERED,this.onFragBuffered,this)},r.startLoad=function(e){this.stopLoad(),this.state=Si,this.setInterval(500),this.nextLoadPosition=this.startPosition=this.lastCurrentTime=e,this.tick()},r.onManifestLoading=function(){this.mainDetails=null,this.fragmentTracker.removeAllFragments()},r.onMediaDetaching=function(){this.tracksBuffered=[],e.prototype.onMediaDetaching.call(this)},r.onLevelLoaded=function(e,t){this.mainDetails=t.details},r.onSubtitleFragProcessed=function(e,t){var r=t.frag,i=t.success;if(this.fragPrevious=r,this.state=Si,i){var n=this.tracksBuffered[this.currentTrackId];if(n){for(var a,s=r.start,o=0;o<n.length;o++)if(s>=n[o].start&&s<=n[o].end){a=n[o];break}var l=r.start+r.duration;a?a.end=l:(a={start:s,end:l},n.push(a)),this.fragmentTracker.fragBuffered(r),this.fragBufferedComplete(r,null)}}},r.onBufferFlushing=function(e,t){var r=t.startOffset,i=t.endOffset;if(0===r&&i!==Number.POSITIVE_INFINITY){var n=i-1;if(n<=0)return;t.endOffsetSubtitles=Math.max(0,n),this.tracksBuffered.forEach((function(e){for(var t=0;t<e.length;)if(e[t].end<=n)e.shift();else{if(!(e[t].start<n))break;e[t].start=n,t++}})),this.fragmentTracker.removeFragmentsInRange(r,n,Nt)}},r.onFragBuffered=function(e,t){var r;this.loadedmetadata||t.frag.type!==Mt||null!=(r=this.media)&&r.buffered.length&&(this.loadedmetadata=!0)},r.onError=function(e,t){var r=t.frag;(null==r?void 0:r.type)===Nt&&(t.details===A.FRAG_GAP&&this.fragmentTracker.fragBuffered(r,!0),this.fragCurrent&&this.fragCurrent.abortRequests(),this.state!==Ti&&(this.state=Si))},r.onSubtitleTracksUpdated=function(e,t){var r=this,i=t.subtitleTracks;this.levels&&Qn(this.levels,i)?this.levels=i.map((function(e){return new lr(e)})):(this.tracksBuffered=[],this.levels=i.map((function(e){var t=new lr(e);return r.tracksBuffered[t.id]=[],t})),this.fragmentTracker.removeFragmentsInRange(0,Number.POSITIVE_INFINITY,Nt),this.fragPrevious=null,this.mediaBuffer=null)},r.onSubtitleTrackSwitch=function(e,t){var r;if(this.currentTrackId=t.id,null!=(r=this.levels)&&r.length&&-1!==this.currentTrackId){var i=this.levels[this.currentTrackId];null!=i&&i.details?this.mediaBuffer=this.mediaBufferTimeRanges:this.mediaBuffer=null,i&&this.setInterval(500)}else this.clearInterval()},r.onSubtitleTrackLoaded=function(e,t){var r,i=this.currentTrackId,n=this.levels,a=t.details,s=t.id;if(n){var o=n[s];if(!(s>=n.length)&&o){this.log("Subtitle track "+s+" loaded ["+a.startSN+","+a.endSN+"]"+(a.lastPartSn?"[part-"+a.lastPartSn+"-"+a.lastPartIndex+"]":"")+",duration:"+a.totalduration),this.mediaBuffer=this.mediaBufferTimeRanges;var l=0;if(a.live||null!=(r=o.details)&&r.live){var u=this.mainDetails;if(a.deltaUpdateFailed||!u)return;var h,d=u.fragments[0];o.details?0===(l=this.alignPlaylists(a,o.details,null==(h=this.levelLastLoaded)?void 0:h.details))&&d&&gr(a,l=d.start):a.hasProgramDateTime&&u.hasProgramDateTime?(ui(a,u),l=a.fragments[0].start):d&&gr(a,l=d.start)}o.details=a,this.levelLastLoaded=o,s===i&&(this.startFragRequested||!this.mainDetails&&a.live||this.setStartPosition(this.mainDetails||a,l),this.tick(),a.live&&!this.fragCurrent&&this.media&&this.state===Si&&(Rr(null,a.fragments,this.media.currentTime,0)||(this.warn("Subtitle playlist not aligned with playback"),o.details=void 0)))}}else this.warn("Subtitle tracks were reset while loading level "+s)},r._handleFragmentLoadComplete=function(e){var t=this,r=e.frag,i=e.payload,n=r.decryptdata,a=this.hls;if(!this.fragContextChanged(r)&&i&&i.byteLength>0&&null!=n&&n.key&&n.iv&&"AES-128"===n.method){var s=performance.now();this.decrypter.decrypt(new Uint8Array(i),n.key.buffer,n.iv.buffer).catch((function(e){throw a.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.FRAG_DECRYPT_ERROR,fatal:!1,error:e,reason:e.message,frag:r}),e})).then((function(e){var t=performance.now();a.trigger(S.FRAG_DECRYPTED,{frag:r,payload:e,stats:{tstart:s,tdecrypt:t}})})).catch((function(e){t.warn(e.name+": "+e.message),t.state=Si}))}},r.doTick=function(){if(this.media){if(this.state===Si){var e=this.currentTrackId,t=this.levels,r=null==t?void 0:t[e];if(!r||!t.length||!r.details)return;var i=this.config,n=this.getLoadPosition(),a=ii.bufferedInfo(this.tracksBuffered[this.currentTrackId]||[],n,i.maxBufferHole),s=a.end,o=a.len,l=this.getFwdBufferInfo(this.media,Mt),u=r.details;if(o>this.getMaxBufferLength(null==l?void 0:l.len)+u.levelTargetDuration)return;var h=u.fragments,d=h.length,c=u.edge,f=null,g=this.fragPrevious;if(s<c){var v=i.maxFragLookUpTolerance,m=s>c-v?0:v;!(f=Rr(g,h,Math.max(h[0].start,s),m))&&g&&g.start<h[0].start&&(f=h[0])}else f=h[d-1];if(!f)return;if("initSegment"!==(f=this.mapToInitFragWhenRequired(f)).sn){var p=h[f.sn-u.startSN-1];p&&p.cc===f.cc&&this.fragmentTracker.getState(p)===zr&&(f=p)}this.fragmentTracker.getState(f)===zr&&this.loadFragment(f,r,s)}}else this.state=Si},r.getMaxBufferLength=function(t){var r=e.prototype.getMaxBufferLength.call(this);return t?Math.max(r,t):r},r.loadFragment=function(t,r,i){this.fragCurrent=t,"initSegment"===t.sn?this._loadInitSegment(t,r):(this.startFragRequested=!0,e.prototype.loadFragment.call(this,t,r,i))},s(t,[{key:"mediaBufferTimeRanges",get:function(){return new ta(this.tracksBuffered[this.currentTrackId]||[])}}]),t}(xi),ta=function(e){this.buffered=void 0;var t=function(t,r,i){if((r>>>=0)>i-1)throw new DOMException("Failed to execute '"+t+"' on 'TimeRanges': The index provided ("+r+") is greater than the maximum bound ("+i+")");return e[r][t]};this.buffered={get length(){return e.length},end:function(r){return t("end",r,e.length)},start:function(r){return t("start",r,e.length)}}},ra=function(e){function t(t){var r;return(r=e.call(this,t,"[subtitle-track-controller]")||this).media=null,r.tracks=[],r.groupIds=null,r.tracksInGroup=[],r.trackId=-1,r.currentTrack=null,r.selectDefaultTrack=!0,r.queuedDefaultTrack=-1,r.asyncPollTrackChange=function(){return r.pollTrackChange(0)},r.useTextTrackPolling=!1,r.subtitlePollingInterval=-1,r._subtitleDisplay=!0,r.onTextTracksChanged=function(){if(r.useTextTrackPolling||self.clearInterval(r.subtitlePollingInterval),r.media&&r.hls.config.renderTextTracksNatively){for(var e=null,t=Wt(r.media.textTracks),i=0;i<t.length;i++)if("hidden"===t[i].mode)e=t[i];else if("showing"===t[i].mode){e=t[i];break}var n=r.findTrackForTextTrack(e);r.subtitleTrack!==n&&r.setSubtitleTrack(n)}},r.registerListeners(),r}l(t,e);var r=t.prototype;return r.destroy=function(){this.unregisterListeners(),this.tracks.length=0,this.tracksInGroup.length=0,this.currentTrack=null,this.onTextTracksChanged=this.asyncPollTrackChange=null,e.prototype.destroy.call(this)},r.registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_PARSED,this.onManifestParsed,this),e.on(S.LEVEL_LOADING,this.onLevelLoading,this),e.on(S.LEVEL_SWITCHING,this.onLevelSwitching,this),e.on(S.SUBTITLE_TRACK_LOADED,this.onSubtitleTrackLoaded,this),e.on(S.ERROR,this.onError,this)},r.unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_PARSED,this.onManifestParsed,this),e.off(S.LEVEL_LOADING,this.onLevelLoading,this),e.off(S.LEVEL_SWITCHING,this.onLevelSwitching,this),e.off(S.SUBTITLE_TRACK_LOADED,this.onSubtitleTrackLoaded,this),e.off(S.ERROR,this.onError,this)},r.onMediaAttached=function(e,t){this.media=t.media,this.media&&(this.queuedDefaultTrack>-1&&(this.subtitleTrack=this.queuedDefaultTrack,this.queuedDefaultTrack=-1),this.useTextTrackPolling=!(this.media.textTracks&&"onchange"in this.media.textTracks),this.useTextTrackPolling?this.pollTrackChange(500):this.media.textTracks.addEventListener("change",this.asyncPollTrackChange))},r.pollTrackChange=function(e){self.clearInterval(this.subtitlePollingInterval),this.subtitlePollingInterval=self.setInterval(this.onTextTracksChanged,e)},r.onMediaDetaching=function(){this.media&&(self.clearInterval(this.subtitlePollingInterval),this.useTextTrackPolling||this.media.textTracks.removeEventListener("change",this.asyncPollTrackChange),this.trackId>-1&&(this.queuedDefaultTrack=this.trackId),Wt(this.media.textTracks).forEach((function(e){Vt(e)})),this.subtitleTrack=-1,this.media=null)},r.onManifestLoading=function(){this.tracks=[],this.groupIds=null,this.tracksInGroup=[],this.trackId=-1,this.currentTrack=null,this.selectDefaultTrack=!0},r.onManifestParsed=function(e,t){this.tracks=t.subtitleTracks},r.onSubtitleTrackLoaded=function(e,t){var r=t.id,i=t.groupId,n=t.details,a=this.tracksInGroup[r];if(a&&a.groupId===i){var s=a.details;a.details=t.details,this.log("Subtitle track "+r+' "'+a.name+'" lang:'+a.lang+" group:"+i+" loaded ["+n.startSN+"-"+n.endSN+"]"),r===this.trackId&&this.playlistLoaded(r,t,s)}else this.warn("Subtitle track with id:"+r+" and group:"+i+" not found in active group "+(null==a?void 0:a.groupId))},r.onLevelLoading=function(e,t){this.switchLevel(t.level)},r.onLevelSwitching=function(e,t){this.switchLevel(t.level)},r.switchLevel=function(e){var t=this.hls.levels[e];if(t){var r=t.subtitleGroups||null,i=this.groupIds,n=this.currentTrack;if(!r||(null==i?void 0:i.length)!==(null==r?void 0:r.length)||null!=r&&r.some((function(e){return-1===(null==i?void 0:i.indexOf(e))}))){this.groupIds=r,this.trackId=-1,this.currentTrack=null;var a=this.tracks.filter((function(e){return!r||-1!==r.indexOf(e.groupId)}));if(a.length)this.selectDefaultTrack&&!a.some((function(e){return e.default}))&&(this.selectDefaultTrack=!1),a.forEach((function(e,t){e.id=t}));else if(!n&&!this.tracksInGroup.length)return;this.tracksInGroup=a;var s=this.hls.config.subtitlePreference;if(!n&&s){this.selectDefaultTrack=!1;var o=Vr(s,a);if(o>-1)n=a[o];else{var l=Vr(s,this.tracks);n=this.tracks[l]}}var u=this.findTrackId(n);-1===u&&n&&(u=this.findTrackId(null));var h={subtitleTracks:a};this.log("Updating subtitle tracks, "+a.length+' track(s) found in "'+(null==r?void 0:r.join(","))+'" group-id'),this.hls.trigger(S.SUBTITLE_TRACKS_UPDATED,h),-1!==u&&-1===this.trackId&&this.setSubtitleTrack(u)}else this.shouldReloadPlaylist(n)&&this.setSubtitleTrack(this.trackId)}},r.findTrackId=function(e){for(var t=this.tracksInGroup,r=this.selectDefaultTrack,i=0;i<t.length;i++){var n=t[i];if((!r||n.default)&&(r||e)&&(!e||Yr(n,e)))return i}if(e){for(var a=0;a<t.length;a++){var s=t[a];if(Jn(e.attrs,s.attrs,["LANGUAGE","ASSOC-LANGUAGE","CHARACTERISTICS"]))return a}for(var o=0;o<t.length;o++){var l=t[o];if(Jn(e.attrs,l.attrs,["LANGUAGE"]))return o}}return-1},r.findTrackForTextTrack=function(e){if(e)for(var t=this.tracksInGroup,r=0;r<t.length;r++)if($n(t[r],e))return r;return-1},r.onError=function(e,t){!t.fatal&&t.context&&(t.context.type!==Ft||t.context.id!==this.trackId||this.groupIds&&-1===this.groupIds.indexOf(t.context.groupId)||this.checkRetry(t))},r.setSubtitleOption=function(e){if(this.hls.config.subtitlePreference=e,e){var t=this.allSubtitleTracks;if(this.selectDefaultTrack=!1,t.length){var r=this.currentTrack;if(r&&Yr(e,r))return r;var i=Vr(e,this.tracksInGroup);if(i>-1){var n=this.tracksInGroup[i];return this.setSubtitleTrack(i),n}if(r)return null;var a=Vr(e,t);if(a>-1)return t[a]}}return null},r.loadPlaylist=function(t){e.prototype.loadPlaylist.call(this);var r=this.currentTrack;if(this.shouldLoadPlaylist(r)&&r){var i=r.id,n=r.groupId,a=r.url;if(t)try{a=t.addDirectives(a)}catch(e){this.warn("Could not construct new URL with HLS Delivery Directives: "+e)}this.log("Loading subtitle playlist for id "+i),this.hls.trigger(S.SUBTITLE_TRACK_LOADING,{url:a,id:i,groupId:n,deliveryDirectives:t||null})}},r.toggleTrackModes=function(){var e=this.media;if(e){var t,r=Wt(e.textTracks),i=this.currentTrack;if(i&&((t=r.filter((function(e){return $n(i,e)}))[0])||this.warn('Unable to find subtitle TextTrack with name "'+i.name+'" and language "'+i.lang+'"')),[].slice.call(r).forEach((function(e){"disabled"!==e.mode&&e!==t&&(e.mode="disabled")})),t){var n=this.subtitleDisplay?"showing":"hidden";t.mode!==n&&(t.mode=n)}}},r.setSubtitleTrack=function(e){var t=this.tracksInGroup;if(this.media)if(e<-1||e>=t.length||!y(e))this.warn("Invalid subtitle track id: "+e);else{this.clearTimer(),this.selectDefaultTrack=!1;var r=this.currentTrack,i=t[e]||null;if(this.trackId=e,this.currentTrack=i,this.toggleTrackModes(),i){var n=!!i.details&&!i.details.live;if(e!==this.trackId||i!==r||!n){this.log("Switching to subtitle-track "+e+(i?' "'+i.name+'" lang:'+i.lang+" group:"+i.groupId:""));var a=i.id,s=i.groupId,o=void 0===s?"":s,l=i.name,u=i.type,h=i.url;this.hls.trigger(S.SUBTITLE_TRACK_SWITCH,{id:a,groupId:o,name:l,type:u,url:h});var d=this.switchParams(i.url,null==r?void 0:r.details,i.details);this.loadPlaylist(d)}}else this.hls.trigger(S.SUBTITLE_TRACK_SWITCH,{id:e})}else this.queuedDefaultTrack=e},s(t,[{key:"subtitleDisplay",get:function(){return this._subtitleDisplay},set:function(e){this._subtitleDisplay=e,this.trackId>-1&&this.toggleTrackModes()}},{key:"allSubtitleTracks",get:function(){return this.tracks}},{key:"subtitleTracks",get:function(){return this.tracksInGroup}},{key:"subtitleTrack",get:function(){return this.trackId},set:function(e){this.selectDefaultTrack=!1,this.setSubtitleTrack(e)}}]),t}(Mr),ia=function(){function e(e){this.buffers=void 0,this.queues={video:[],audio:[],audiovideo:[]},this.buffers=e}var t=e.prototype;return t.append=function(e,t,r){var i=this.queues[t];i.push(e),1!==i.length||r||this.executeNext(t)},t.insertAbort=function(e,t){this.queues[t].unshift(e),this.executeNext(t)},t.appendBlocker=function(e){var t,r=new Promise((function(e){t=e})),i={execute:t,onStart:function(){},onComplete:function(){},onError:function(){}};return this.append(i,e),r},t.executeNext=function(e){var t=this.queues[e];if(t.length){var r=t[0];try{r.execute()}catch(t){w.warn('[buffer-operation-queue]: Exception executing "'+e+'" SourceBuffer operation: '+t),r.onError(t);var i=this.buffers[e];null!=i&&i.updating||this.shiftAndExecuteNext(e)}}},t.shiftAndExecuteNext=function(e){this.queues[e].shift(),this.executeNext(e)},t.current=function(e){return this.queues[e][0]},e}(),na=/(avc[1234]|hvc1|hev1|dvh[1e]|vp09|av01)(?:\.[^.,]+)+/,aa=function(){function e(e){var t=this;this.details=null,this._objectUrl=null,this.operationQueue=void 0,this.listeners=void 0,this.hls=void 0,this.bufferCodecEventsExpected=0,this._bufferCodecEventsTotal=0,this.media=null,this.mediaSource=null,this.lastMpegAudioChunk=null,this.appendSource=void 0,this.appendErrors={audio:0,video:0,audiovideo:0},this.tracks={},this.pendingTracks={},this.sourceBuffer=void 0,this.log=void 0,this.warn=void 0,this.error=void 0,this._onEndStreaming=function(e){t.hls&&t.hls.pauseBuffering()},this._onStartStreaming=function(e){t.hls&&t.hls.resumeBuffering()},this._onMediaSourceOpen=function(){var e=t.media,r=t.mediaSource;t.log("Media source opened"),e&&(e.removeEventListener("emptied",t._onMediaEmptied),t.updateMediaElementDuration(),t.hls.trigger(S.MEDIA_ATTACHED,{media:e,mediaSource:r})),r&&r.removeEventListener("sourceopen",t._onMediaSourceOpen),t.checkPendingTracks()},this._onMediaSourceClose=function(){t.log("Media source closed")},this._onMediaSourceEnded=function(){t.log("Media source ended")},this._onMediaEmptied=function(){var e=t.mediaSrc,r=t._objectUrl;e!==r&&w.error("Media element src was set while attaching MediaSource ("+r+" > "+e+")")},this.hls=e;var r,i="[buffer-controller]";this.appendSource=(r=ot(e.config.preferManagedMediaSource),"undefined"!=typeof self&&r===self.ManagedMediaSource),this.log=w.log.bind(w,i),this.warn=w.warn.bind(w,i),this.error=w.error.bind(w,i),this._initSourceBuffer(),this.registerListeners()}var t=e.prototype;return t.hasSourceTypes=function(){return this.getSourceBufferTypes().length>0||Object.keys(this.pendingTracks).length>0},t.destroy=function(){this.unregisterListeners(),this.details=null,this.lastMpegAudioChunk=null,this.hls=null},t.registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHING,this.onMediaAttaching,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_PARSED,this.onManifestParsed,this),e.on(S.BUFFER_RESET,this.onBufferReset,this),e.on(S.BUFFER_APPENDING,this.onBufferAppending,this),e.on(S.BUFFER_CODECS,this.onBufferCodecs,this),e.on(S.BUFFER_EOS,this.onBufferEos,this),e.on(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.on(S.LEVEL_UPDATED,this.onLevelUpdated,this),e.on(S.FRAG_PARSED,this.onFragParsed,this),e.on(S.FRAG_CHANGED,this.onFragChanged,this)},t.unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHING,this.onMediaAttaching,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_PARSED,this.onManifestParsed,this),e.off(S.BUFFER_RESET,this.onBufferReset,this),e.off(S.BUFFER_APPENDING,this.onBufferAppending,this),e.off(S.BUFFER_CODECS,this.onBufferCodecs,this),e.off(S.BUFFER_EOS,this.onBufferEos,this),e.off(S.BUFFER_FLUSHING,this.onBufferFlushing,this),e.off(S.LEVEL_UPDATED,this.onLevelUpdated,this),e.off(S.FRAG_PARSED,this.onFragParsed,this),e.off(S.FRAG_CHANGED,this.onFragChanged,this)},t._initSourceBuffer=function(){this.sourceBuffer={},this.operationQueue=new ia(this.sourceBuffer),this.listeners={audio:[],video:[],audiovideo:[]},this.appendErrors={audio:0,video:0,audiovideo:0},this.lastMpegAudioChunk=null},t.onManifestLoading=function(){this.bufferCodecEventsExpected=this._bufferCodecEventsTotal=0,this.details=null},t.onManifestParsed=function(e,t){var r=2;(t.audio&&!t.video||!t.altAudio)&&(r=1),this.bufferCodecEventsExpected=this._bufferCodecEventsTotal=r,this.log(this.bufferCodecEventsExpected+" bufferCodec event(s) expected")},t.onMediaAttaching=function(e,t){var r=this.media=t.media,i=ot(this.appendSource);if(r&&i){var n,a=this.mediaSource=new i;this.log("created media source: "+(null==(n=a.constructor)?void 0:n.name)),a.addEventListener("sourceopen",this._onMediaSourceOpen),a.addEventListener("sourceended",this._onMediaSourceEnded),a.addEventListener("sourceclose",this._onMediaSourceClose),this.appendSource&&(a.addEventListener("startstreaming",this._onStartStreaming),a.addEventListener("endstreaming",this._onEndStreaming));var s=this._objectUrl=self.URL.createObjectURL(a);if(this.appendSource)try{r.removeAttribute("src");var o=self.ManagedMediaSource;r.disableRemotePlayback=r.disableRemotePlayback||o&&a instanceof o,sa(r),function(e,t){var r=self.document.createElement("source");r.type="video/mp4",r.src=t,e.appendChild(r)}(r,s),r.load()}catch(e){r.src=s}else r.src=s;r.addEventListener("emptied",this._onMediaEmptied)}},t.onMediaDetaching=function(){var e=this.media,t=this.mediaSource,r=this._objectUrl;if(t){if(this.log("media source detaching"),"open"===t.readyState)try{t.endOfStream()}catch(e){this.warn("onMediaDetaching: "+e.message+" while calling endOfStream")}this.onBufferReset(),t.removeEventListener("sourceopen",this._onMediaSourceOpen),t.removeEventListener("sourceended",this._onMediaSourceEnded),t.removeEventListener("sourceclose",this._onMediaSourceClose),this.appendSource&&(t.removeEventListener("startstreaming",this._onStartStreaming),t.removeEventListener("endstreaming",this._onEndStreaming)),e&&(e.removeEventListener("emptied",this._onMediaEmptied),r&&self.URL.revokeObjectURL(r),this.mediaSrc===r?(e.removeAttribute("src"),this.appendSource&&sa(e),e.load()):this.warn("media|source.src was changed by a third party - skip cleanup")),this.mediaSource=null,this.media=null,this._objectUrl=null,this.bufferCodecEventsExpected=this._bufferCodecEventsTotal,this.pendingTracks={},this.tracks={}}this.hls.trigger(S.MEDIA_DETACHED,void 0)},t.onBufferReset=function(){var e=this;this.getSourceBufferTypes().forEach((function(t){e.resetBuffer(t)})),this._initSourceBuffer(),this.hls.resumeBuffering()},t.resetBuffer=function(e){var t=this.sourceBuffer[e];try{var r;t&&(this.removeBufferListeners(e),this.sourceBuffer[e]=void 0,null!=(r=this.mediaSource)&&r.sourceBuffers.length&&this.mediaSource.removeSourceBuffer(t))}catch(t){this.warn("onBufferReset "+e,t)}},t.onBufferCodecs=function(e,t){var r=this,i=this.getSourceBufferTypes().length,n=Object.keys(t);if(n.forEach((function(e){if(i){var n=r.tracks[e];if(n&&"function"==typeof n.buffer.changeType){var a,s=t[e],o=s.id,l=s.codec,u=s.levelCodec,h=s.container,d=s.metadata,c=pt(n.codec,n.levelCodec),f=null==c?void 0:c.replace(na,"$1"),g=pt(l,u),v=null==(a=g)?void 0:a.replace(na,"$1");if(g&&f!==v){"audio"===e.slice(0,5)&&(g=mt(g,r.appendSource));var m=h+";codecs="+g;r.appendChangeType(e,m),r.log("switching codec "+c+" to "+g),r.tracks[e]={buffer:n.buffer,codec:l,container:h,levelCodec:u,metadata:d,id:o}}}}else r.pendingTracks[e]=t[e]})),!i){var a=Math.max(this.bufferCodecEventsExpected-1,0);this.bufferCodecEventsExpected!==a&&(this.log(a+" bufferCodec event(s) expected "+n.join(",")),this.bufferCodecEventsExpected=a),this.mediaSource&&"open"===this.mediaSource.readyState&&this.checkPendingTracks()}},t.appendChangeType=function(e,t){var r=this,i=this.operationQueue,n={execute:function(){var n=r.sourceBuffer[e];n&&(r.log("changing "+e+" sourceBuffer type to "+t),n.changeType(t)),i.shiftAndExecuteNext(e)},onStart:function(){},onComplete:function(){},onError:function(t){r.warn("Failed to change "+e+" SourceBuffer type",t)}};i.append(n,e,!!this.pendingTracks[e])},t.onBufferAppending=function(e,t){var r=this,i=this.hls,n=this.operationQueue,a=this.tracks,s=t.data,o=t.type,l=t.frag,u=t.part,h=t.chunkMeta,d=h.buffering[o],c=self.performance.now();d.start=c;var f=l.stats.buffering,g=u?u.stats.buffering:null;0===f.start&&(f.start=c),g&&0===g.start&&(g.start=c);var v=a.audio,m=!1;"audio"===o&&"audio/mpeg"===(null==v?void 0:v.container)&&(m=!this.lastMpegAudioChunk||1===h.id||this.lastMpegAudioChunk.sn!==h.sn,this.lastMpegAudioChunk=h);var p=l.start,y={execute:function(){if(d.executeStart=self.performance.now(),m){var e=r.sourceBuffer[o];if(e){var t=p-e.timestampOffset;Math.abs(t)>=.1&&(r.log("Updating audio SourceBuffer timestampOffset to "+p+" (delta: "+t+") sn: "+l.sn+")"),e.timestampOffset=p)}}r.appendExecutor(s,o)},onStart:function(){},onComplete:function(){var e=self.performance.now();d.executeEnd=d.end=e,0===f.first&&(f.first=e),g&&0===g.first&&(g.first=e);var t=r.sourceBuffer,i={};for(var n in t)i[n]=ii.getBuffered(t[n]);r.appendErrors[o]=0,"audio"===o||"video"===o?r.appendErrors.audiovideo=0:(r.appendErrors.audio=0,r.appendErrors.video=0),r.hls.trigger(S.BUFFER_APPENDED,{type:o,frag:l,part:u,chunkMeta:h,parent:l.type,timeRanges:i})},onError:function(e){var t={type:L.MEDIA_ERROR,parent:l.type,details:A.BUFFER_APPEND_ERROR,sourceBufferName:o,frag:l,part:u,chunkMeta:h,error:e,err:e,fatal:!1};if(e.code===DOMException.QUOTA_EXCEEDED_ERR)t.details=A.BUFFER_FULL_ERROR;else{var n=++r.appendErrors[o];t.details=A.BUFFER_APPEND_ERROR,r.warn("Failed "+n+"/"+i.config.appendErrorMaxRetry+' times to append segment in "'+o+'" sourceBuffer'),n>=i.config.appendErrorMaxRetry&&(t.fatal=!0)}i.trigger(S.ERROR,t)}};n.append(y,o,!!this.pendingTracks[o])},t.onBufferFlushing=function(e,t){var r=this,i=this.operationQueue,n=function(e){return{execute:r.removeExecutor.bind(r,e,t.startOffset,t.endOffset),onStart:function(){},onComplete:function(){r.hls.trigger(S.BUFFER_FLUSHED,{type:e})},onError:function(t){r.warn("Failed to remove from "+e+" SourceBuffer",t)}}};t.type?i.append(n(t.type),t.type):this.getSourceBufferTypes().forEach((function(e){i.append(n(e),e)}))},t.onFragParsed=function(e,t){var r=this,i=t.frag,n=t.part,a=[],s=n?n.elementaryStreams:i.elementaryStreams;s[U]?a.push("audiovideo"):(s[O]&&a.push("audio"),s[N]&&a.push("video")),0===a.length&&this.warn("Fragments must have at least one ElementaryStreamType set. type: "+i.type+" level: "+i.level+" sn: "+i.sn),this.blockBuffers((function(){var e=self.performance.now();i.stats.buffering.end=e,n&&(n.stats.buffering.end=e);var t=n?n.stats:i.stats;r.hls.trigger(S.FRAG_BUFFERED,{frag:i,part:n,stats:t,id:i.type})}),a)},t.onFragChanged=function(e,t){this.trimBuffers()},t.onBufferEos=function(e,t){var r=this;this.getSourceBufferTypes().reduce((function(e,i){var n=r.sourceBuffer[i];return!n||t.type&&t.type!==i||(n.ending=!0,n.ended||(n.ended=!0,r.log(i+" sourceBuffer now EOS"))),e&&!(n&&!n.ended)}),!0)&&(this.log("Queueing mediaSource.endOfStream()"),this.blockBuffers((function(){r.getSourceBufferTypes().forEach((function(e){var t=r.sourceBuffer[e];t&&(t.ending=!1)}));var e=r.mediaSource;e&&"open"===e.readyState?(r.log("Calling mediaSource.endOfStream()"),e.endOfStream()):e&&r.log("Could not call mediaSource.endOfStream(). mediaSource.readyState: "+e.readyState)})))},t.onLevelUpdated=function(e,t){var r=t.details;r.fragments.length&&(this.details=r,this.getSourceBufferTypes().length?this.blockBuffers(this.updateMediaElementDuration.bind(this)):this.updateMediaElementDuration())},t.trimBuffers=function(){var e=this.hls,t=this.details,r=this.media;if(r&&null!==t&&this.getSourceBufferTypes().length){var i=e.config,n=r.currentTime,a=t.levelTargetDuration,s=t.live&&null!==i.liveBackBufferLength?i.liveBackBufferLength:i.backBufferLength;if(y(s)&&s>0){var o=Math.max(s,a),l=Math.floor(n/a)*a-o;this.flushBackBuffer(n,a,l)}if(y(i.frontBufferFlushThreshold)&&i.frontBufferFlushThreshold>0){var u=Math.max(i.maxBufferLength,i.frontBufferFlushThreshold),h=Math.max(u,a),d=Math.floor(n/a)*a+h;this.flushFrontBuffer(n,a,d)}}},t.flushBackBuffer=function(e,t,r){var i=this,n=this.details,a=this.sourceBuffer;this.getSourceBufferTypes().forEach((function(s){var o=a[s];if(o){var l=ii.getBuffered(o);if(l.length>0&&r>l.start(0)){if(i.hls.trigger(S.BACK_BUFFER_REACHED,{bufferEnd:r}),null!=n&&n.live)i.hls.trigger(S.LIVE_BACK_BUFFER_REACHED,{bufferEnd:r});else if(o.ended&&l.end(l.length-1)-e<2*t)return void i.log("Cannot flush "+s+" back buffer while SourceBuffer is in ended state");i.hls.trigger(S.BUFFER_FLUSHING,{startOffset:0,endOffset:r,type:s})}}}))},t.flushFrontBuffer=function(e,t,r){var i=this,n=this.sourceBuffer;this.getSourceBufferTypes().forEach((function(a){var s=n[a];if(s){var o=ii.getBuffered(s),l=o.length;if(l<2)return;var u=o.start(l-1),h=o.end(l-1);if(r>u||e>=u&&e<=h)return;if(s.ended&&e-h<2*t)return void i.log("Cannot flush "+a+" front buffer while SourceBuffer is in ended state");i.hls.trigger(S.BUFFER_FLUSHING,{startOffset:u,endOffset:1/0,type:a})}}))},t.updateMediaElementDuration=function(){if(this.details&&this.media&&this.mediaSource&&"open"===this.mediaSource.readyState){var e=this.details,t=this.hls,r=this.media,i=this.mediaSource,n=e.fragments[0].start+e.totalduration,a=r.duration,s=y(i.duration)?i.duration:0;e.live&&t.config.liveDurationInfinity?(i.duration=1/0,this.updateSeekableRange(e)):(n>s&&n>a||!y(a))&&(this.log("Updating Media Source duration to "+n.toFixed(3)),i.duration=n)}},t.updateSeekableRange=function(e){var t=this.mediaSource,r=e.fragments;if(r.length&&e.live&&null!=t&&t.setLiveSeekableRange){var i=Math.max(0,r[0].start),n=Math.max(i,i+e.totalduration);this.log("Media Source duration is set to "+t.duration+". Setting seekable range to "+i+"-"+n+"."),t.setLiveSeekableRange(i,n)}},t.checkPendingTracks=function(){var e=this.bufferCodecEventsExpected,t=this.operationQueue,r=this.pendingTracks,i=Object.keys(r).length;if(i&&(!e||2===i||"audiovideo"in r)){this.createSourceBuffers(r),this.pendingTracks={};var n=this.getSourceBufferTypes();if(n.length)this.hls.trigger(S.BUFFER_CREATED,{tracks:this.tracks}),n.forEach((function(e){t.executeNext(e)}));else{var a=new Error("could not create source buffer for media codec(s)");this.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_INCOMPATIBLE_CODECS_ERROR,fatal:!0,error:a,reason:a.message})}}},t.createSourceBuffers=function(e){var t=this,r=this.sourceBuffer,i=this.mediaSource;if(!i)throw Error("createSourceBuffers called when mediaSource was null");var n=function(n){if(!r[n]){var a,s=e[n];if(!s)throw Error("source buffer exists for track "+n+", however track does not");var o=-1===(null==(a=s.levelCodec)?void 0:a.indexOf(","))?s.levelCodec:s.codec;o&&"audio"===n.slice(0,5)&&(o=mt(o,t.appendSource));var l=s.container+";codecs="+o;t.log("creating sourceBuffer("+l+")");try{var u=r[n]=i.addSourceBuffer(l),h=n;t.addBufferListener(h,"updatestart",t._onSBUpdateStart),t.addBufferListener(h,"updateend",t._onSBUpdateEnd),t.addBufferListener(h,"error",t._onSBUpdateError),t.appendSource&&t.addBufferListener(h,"bufferedchange",(function(e,r){var i=r.removedRanges;null!=i&&i.length&&t.hls.trigger(S.BUFFER_FLUSHED,{type:n})})),t.tracks[n]={buffer:u,codec:o,container:s.container,levelCodec:s.levelCodec,metadata:s.metadata,id:s.id}}catch(e){t.error("error while trying to add sourceBuffer: "+e.message),t.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_ADD_CODEC_ERROR,fatal:!1,error:e,sourceBufferName:n,mimeType:l})}}};for(var a in e)n(a)},t._onSBUpdateStart=function(e){this.operationQueue.current(e).onStart()},t._onSBUpdateEnd=function(e){var t;if("closed"!==(null==(t=this.mediaSource)?void 0:t.readyState)){var r=this.operationQueue;r.current(e).onComplete(),r.shiftAndExecuteNext(e)}else this.resetBuffer(e)},t._onSBUpdateError=function(e,t){var r,i=new Error(e+" SourceBuffer error. MediaSource readyState: "+(null==(r=this.mediaSource)?void 0:r.readyState));this.error(""+i,t),this.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_APPENDING_ERROR,sourceBufferName:e,error:i,fatal:!1});var n=this.operationQueue.current(e);n&&n.onError(i)},t.removeExecutor=function(e,t,r){var i=this.media,n=this.mediaSource,a=this.operationQueue,s=this.sourceBuffer[e];if(!i||!n||!s)return this.warn("Attempting to remove from the "+e+" SourceBuffer, but it does not exist"),void a.shiftAndExecuteNext(e);var o=y(i.duration)?i.duration:1/0,l=y(n.duration)?n.duration:1/0,u=Math.max(0,t),h=Math.min(r,o,l);h>u&&(!s.ending||s.ended)?(s.ended=!1,this.log("Removing ["+u+","+h+"] from the "+e+" SourceBuffer"),s.remove(u,h)):a.shiftAndExecuteNext(e)},t.appendExecutor=function(e,t){var r=this.sourceBuffer[t];if(r)r.ended=!1,r.appendBuffer(e);else if(!this.pendingTracks[t])throw new Error("Attempting to append to the "+t+" SourceBuffer, but it does not exist")},t.blockBuffers=function(e,t){var r=this;if(void 0===t&&(t=this.getSourceBufferTypes()),!t.length)return this.log("Blocking operation requested, but no SourceBuffers exist"),void Promise.resolve().then(e);var i=this.operationQueue,n=t.map((function(e){return i.appendBlocker(e)}));Promise.all(n).then((function(){e(),t.forEach((function(e){var t=r.sourceBuffer[e];null!=t&&t.updating||i.shiftAndExecuteNext(e)}))}))},t.getSourceBufferTypes=function(){return Object.keys(this.sourceBuffer)},t.addBufferListener=function(e,t,r){var i=this.sourceBuffer[e];if(i){var n=r.bind(this,e);this.listeners[e].push({event:t,listener:n}),i.addEventListener(t,n)}},t.removeBufferListeners=function(e){var t=this.sourceBuffer[e];t&&this.listeners[e].forEach((function(e){t.removeEventListener(e.event,e.listener)}))},s(e,[{key:"mediaSrc",get:function(){var e,t,r=(null==(e=this.media)||null==(t=e.querySelector)?void 0:t.call(e,"source"))||this.media;return null==r?void 0:r.src}}]),e}();function sa(e){var t=e.querySelectorAll("source");[].slice.call(t).forEach((function(t){e.removeChild(t)}))}var oa={42:225,92:233,94:237,95:243,96:250,123:231,124:247,125:209,126:241,127:9608,128:174,129:176,130:189,131:191,132:8482,133:162,134:163,135:9834,136:224,137:32,138:232,139:226,140:234,141:238,142:244,143:251,144:193,145:201,146:211,147:218,148:220,149:252,150:8216,151:161,152:42,153:8217,154:9473,155:169,156:8480,157:8226,158:8220,159:8221,160:192,161:194,162:199,163:200,164:202,165:203,166:235,167:206,168:207,169:239,170:212,171:217,172:249,173:219,174:171,175:187,176:195,177:227,178:205,179:204,180:236,181:210,182:242,183:213,184:245,185:123,186:125,187:92,188:94,189:95,190:124,191:8764,192:196,193:228,194:214,195:246,196:223,197:165,198:164,199:9475,200:197,201:229,202:216,203:248,204:9487,205:9491,206:9495,207:9499},la=function(e){return String.fromCharCode(oa[e]||e)},ua=15,ha=100,da={17:1,18:3,21:5,22:7,23:9,16:11,19:12,20:14},ca={17:2,18:4,21:6,22:8,23:10,19:13,20:15},fa={25:1,26:3,29:5,30:7,31:9,24:11,27:12,28:14},ga={25:2,26:4,29:6,30:8,31:10,27:13,28:15},va=["white","green","blue","cyan","red","yellow","magenta","black","transparent"],ma=function(){function e(){this.time=null,this.verboseLevel=0}return e.prototype.log=function(e,t){if(this.verboseLevel>=e){var r="function"==typeof t?t():t;w.log(this.time+" ["+e+"] "+r)}},e}(),pa=function(e){for(var t=[],r=0;r<e.length;r++)t.push(e[r].toString(16));return t},ya=function(){function e(){this.foreground="white",this.underline=!1,this.italics=!1,this.background="black",this.flash=!1}var t=e.prototype;return t.reset=function(){this.foreground="white",this.underline=!1,this.italics=!1,this.background="black",this.flash=!1},t.setStyles=function(e){for(var t=["foreground","underline","italics","background","flash"],r=0;r<t.length;r++){var i=t[r];e.hasOwnProperty(i)&&(this[i]=e[i])}},t.isDefault=function(){return"white"===this.foreground&&!this.underline&&!this.italics&&"black"===this.background&&!this.flash},t.equals=function(e){return this.foreground===e.foreground&&this.underline===e.underline&&this.italics===e.italics&&this.background===e.background&&this.flash===e.flash},t.copy=function(e){this.foreground=e.foreground,this.underline=e.underline,this.italics=e.italics,this.background=e.background,this.flash=e.flash},t.toString=function(){return"color="+this.foreground+", underline="+this.underline+", italics="+this.italics+", background="+this.background+", flash="+this.flash},e}(),Ea=function(){function e(){this.uchar=" ",this.penState=new ya}var t=e.prototype;return t.reset=function(){this.uchar=" ",this.penState.reset()},t.setChar=function(e,t){this.uchar=e,this.penState.copy(t)},t.setPenState=function(e){this.penState.copy(e)},t.equals=function(e){return this.uchar===e.uchar&&this.penState.equals(e.penState)},t.copy=function(e){this.uchar=e.uchar,this.penState.copy(e.penState)},t.isEmpty=function(){return" "===this.uchar&&this.penState.isDefault()},e}(),Ta=function(){function e(e){this.chars=[],this.pos=0,this.currPenState=new ya,this.cueStartTime=null,this.logger=void 0;for(var t=0;t<ha;t++)this.chars.push(new Ea);this.logger=e}var t=e.prototype;return t.equals=function(e){for(var t=0;t<ha;t++)if(!this.chars[t].equals(e.chars[t]))return!1;return!0},t.copy=function(e){for(var t=0;t<ha;t++)this.chars[t].copy(e.chars[t])},t.isEmpty=function(){for(var e=!0,t=0;t<ha;t++)if(!this.chars[t].isEmpty()){e=!1;break}return e},t.setCursor=function(e){this.pos!==e&&(this.pos=e),this.pos<0?(this.logger.log(3,"Negative cursor position "+this.pos),this.pos=0):this.pos>ha&&(this.logger.log(3,"Too large cursor position "+this.pos),this.pos=ha)},t.moveCursor=function(e){var t=this.pos+e;if(e>1)for(var r=this.pos+1;r<t+1;r++)this.chars[r].setPenState(this.currPenState);this.setCursor(t)},t.backSpace=function(){this.moveCursor(-1),this.chars[this.pos].setChar(" ",this.currPenState)},t.insertChar=function(e){var t=this;e>=144&&this.backSpace();var r=la(e);this.pos>=ha?this.logger.log(0,(function(){return"Cannot insert "+e.toString(16)+" ("+r+") at position "+t.pos+". Skipping it!"})):(this.chars[this.pos].setChar(r,this.currPenState),this.moveCursor(1))},t.clearFromPos=function(e){var t;for(t=e;t<ha;t++)this.chars[t].reset()},t.clear=function(){this.clearFromPos(0),this.pos=0,this.currPenState.reset()},t.clearToEndOfRow=function(){this.clearFromPos(this.pos)},t.getTextString=function(){for(var e=[],t=!0,r=0;r<ha;r++){var i=this.chars[r].uchar;" "!==i&&(t=!1),e.push(i)}return t?"":e.join("")},t.setPenStyles=function(e){this.currPenState.setStyles(e),this.chars[this.pos].setPenState(this.currPenState)},e}(),Sa=function(){function e(e){this.rows=[],this.currRow=14,this.nrRollUpRows=null,this.lastOutputScreen=null,this.logger=void 0;for(var t=0;t<ua;t++)this.rows.push(new Ta(e));this.logger=e}var t=e.prototype;return t.reset=function(){for(var e=0;e<ua;e++)this.rows[e].clear();this.currRow=14},t.equals=function(e){for(var t=!0,r=0;r<ua;r++)if(!this.rows[r].equals(e.rows[r])){t=!1;break}return t},t.copy=function(e){for(var t=0;t<ua;t++)this.rows[t].copy(e.rows[t])},t.isEmpty=function(){for(var e=!0,t=0;t<ua;t++)if(!this.rows[t].isEmpty()){e=!1;break}return e},t.backSpace=function(){this.rows[this.currRow].backSpace()},t.clearToEndOfRow=function(){this.rows[this.currRow].clearToEndOfRow()},t.insertChar=function(e){this.rows[this.currRow].insertChar(e)},t.setPen=function(e){this.rows[this.currRow].setPenStyles(e)},t.moveCursor=function(e){this.rows[this.currRow].moveCursor(e)},t.setCursor=function(e){this.logger.log(2,"setCursor: "+e),this.rows[this.currRow].setCursor(e)},t.setPAC=function(e){this.logger.log(2,(function(){return"pacData = "+JSON.stringify(e)}));var t=e.row-1;if(this.nrRollUpRows&&t<this.nrRollUpRows-1&&(t=this.nrRollUpRows-1),this.nrRollUpRows&&this.currRow!==t){for(var r=0;r<ua;r++)this.rows[r].clear();var i=this.currRow+1-this.nrRollUpRows,n=this.lastOutputScreen;if(n){var a=n.rows[i].cueStartTime,s=this.logger.time;if(null!==a&&null!==s&&a<s)for(var o=0;o<this.nrRollUpRows;o++)this.rows[t-this.nrRollUpRows+o+1].copy(n.rows[i+o])}}this.currRow=t;var l=this.rows[this.currRow];if(null!==e.indent){var u=e.indent,h=Math.max(u-1,0);l.setCursor(e.indent),e.color=l.chars[h].penState.foreground}var d={foreground:e.color,underline:e.underline,italics:e.italics,background:"black",flash:!1};this.setPen(d)},t.setBkgData=function(e){this.logger.log(2,(function(){return"bkgData = "+JSON.stringify(e)})),this.backSpace(),this.setPen(e),this.insertChar(32)},t.setRollUpRows=function(e){this.nrRollUpRows=e},t.rollUp=function(){var e=this;if(null!==this.nrRollUpRows){this.logger.log(1,(function(){return e.getDisplayText()}));var t=this.currRow+1-this.nrRollUpRows,r=this.rows.splice(t,1)[0];r.clear(),this.rows.splice(this.currRow,0,r),this.logger.log(2,"Rolling up")}else this.logger.log(3,"roll_up but nrRollUpRows not set yet")},t.getDisplayText=function(e){e=e||!1;for(var t=[],r="",i=-1,n=0;n<ua;n++){var a=this.rows[n].getTextString();a&&(i=n+1,e?t.push("Row "+i+": '"+a+"'"):t.push(a.trim()))}return t.length>0&&(r=e?"["+t.join(" | ")+"]":t.join("\n")),r},t.getTextAndFormat=function(){return this.rows},e}(),La=function(){function e(e,t,r){this.chNr=void 0,this.outputFilter=void 0,this.mode=void 0,this.verbose=void 0,this.displayedMemory=void 0,this.nonDisplayedMemory=void 0,this.lastOutputScreen=void 0,this.currRollUpRow=void 0,this.writeScreen=void 0,this.cueStartTime=void 0,this.logger=void 0,this.chNr=e,this.outputFilter=t,this.mode=null,this.verbose=0,this.displayedMemory=new Sa(r),this.nonDisplayedMemory=new Sa(r),this.lastOutputScreen=new Sa(r),this.currRollUpRow=this.displayedMemory.rows[14],this.writeScreen=this.displayedMemory,this.mode=null,this.cueStartTime=null,this.logger=r}var t=e.prototype;return t.reset=function(){this.mode=null,this.displayedMemory.reset(),this.nonDisplayedMemory.reset(),this.lastOutputScreen.reset(),this.outputFilter.reset(),this.currRollUpRow=this.displayedMemory.rows[14],this.writeScreen=this.displayedMemory,this.mode=null,this.cueStartTime=null},t.getHandler=function(){return this.outputFilter},t.setHandler=function(e){this.outputFilter=e},t.setPAC=function(e){this.writeScreen.setPAC(e)},t.setBkgData=function(e){this.writeScreen.setBkgData(e)},t.setMode=function(e){e!==this.mode&&(this.mode=e,this.logger.log(2,(function(){return"MODE="+e})),"MODE_POP-ON"===this.mode?this.writeScreen=this.nonDisplayedMemory:(this.writeScreen=this.displayedMemory,this.writeScreen.reset()),"MODE_ROLL-UP"!==this.mode&&(this.displayedMemory.nrRollUpRows=null,this.nonDisplayedMemory.nrRollUpRows=null),this.mode=e)},t.insertChars=function(e){for(var t=this,r=0;r<e.length;r++)this.writeScreen.insertChar(e[r]);var i=this.writeScreen===this.displayedMemory?"DISP":"NON_DISP";this.logger.log(2,(function(){return i+": "+t.writeScreen.getDisplayText(!0)})),"MODE_PAINT-ON"!==this.mode&&"MODE_ROLL-UP"!==this.mode||(this.logger.log(1,(function(){return"DISPLAYED: "+t.displayedMemory.getDisplayText(!0)})),this.outputDataUpdate())},t.ccRCL=function(){this.logger.log(2,"RCL - Resume Caption Loading"),this.setMode("MODE_POP-ON")},t.ccBS=function(){this.logger.log(2,"BS - BackSpace"),"MODE_TEXT"!==this.mode&&(this.writeScreen.backSpace(),this.writeScreen===this.displayedMemory&&this.outputDataUpdate())},t.ccAOF=function(){},t.ccAON=function(){},t.ccDER=function(){this.logger.log(2,"DER- Delete to End of Row"),this.writeScreen.clearToEndOfRow(),this.outputDataUpdate()},t.ccRU=function(e){this.logger.log(2,"RU("+e+") - Roll Up"),this.writeScreen=this.displayedMemory,this.setMode("MODE_ROLL-UP"),this.writeScreen.setRollUpRows(e)},t.ccFON=function(){this.logger.log(2,"FON - Flash On"),this.writeScreen.setPen({flash:!0})},t.ccRDC=function(){this.logger.log(2,"RDC - Resume Direct Captioning"),this.setMode("MODE_PAINT-ON")},t.ccTR=function(){this.logger.log(2,"TR"),this.setMode("MODE_TEXT")},t.ccRTD=function(){this.logger.log(2,"RTD"),this.setMode("MODE_TEXT")},t.ccEDM=function(){this.logger.log(2,"EDM - Erase Displayed Memory"),this.displayedMemory.reset(),this.outputDataUpdate(!0)},t.ccCR=function(){this.logger.log(2,"CR - Carriage Return"),this.writeScreen.rollUp(),this.outputDataUpdate(!0)},t.ccENM=function(){this.logger.log(2,"ENM - Erase Non-displayed Memory"),this.nonDisplayedMemory.reset()},t.ccEOC=function(){var e=this;if(this.logger.log(2,"EOC - End Of Caption"),"MODE_POP-ON"===this.mode){var t=this.displayedMemory;this.displayedMemory=this.nonDisplayedMemory,this.nonDisplayedMemory=t,this.writeScreen=this.nonDisplayedMemory,this.logger.log(1,(function(){return"DISP: "+e.displayedMemory.getDisplayText()}))}this.outputDataUpdate(!0)},t.ccTO=function(e){this.logger.log(2,"TO("+e+") - Tab Offset"),this.writeScreen.moveCursor(e)},t.ccMIDROW=function(e){var t={flash:!1};if(t.underline=e%2==1,t.italics=e>=46,t.italics)t.foreground="white";else{var r=Math.floor(e/2)-16;t.foreground=["white","green","blue","cyan","red","yellow","magenta"][r]}this.logger.log(2,"MIDROW: "+JSON.stringify(t)),this.writeScreen.setPen(t)},t.outputDataUpdate=function(e){void 0===e&&(e=!1);var t=this.logger.time;null!==t&&this.outputFilter&&(null!==this.cueStartTime||this.displayedMemory.isEmpty()?this.displayedMemory.equals(this.lastOutputScreen)||(this.outputFilter.newCue(this.cueStartTime,t,this.lastOutputScreen),e&&this.outputFilter.dispatchCue&&this.outputFilter.dispatchCue(),this.cueStartTime=this.displayedMemory.isEmpty()?null:t):this.cueStartTime=t,this.lastOutputScreen.copy(this.displayedMemory))},t.cueSplitAtTime=function(e){this.outputFilter&&(this.displayedMemory.isEmpty()||(this.outputFilter.newCue&&this.outputFilter.newCue(this.cueStartTime,e,this.displayedMemory),this.cueStartTime=e))},e}(),Aa=function(){function e(e,t,r){this.channels=void 0,this.currentChannel=0,this.cmdHistory={a:null,b:null},this.logger=void 0;var i=this.logger=new ma;this.channels=[null,new La(e,t,i),new La(e+1,r,i)]}var t=e.prototype;return t.getHandler=function(e){return this.channels[e].getHandler()},t.setHandler=function(e,t){this.channels[e].setHandler(t)},t.addData=function(e,t){var r=this;this.logger.time=e;for(var i=function(e){var i=127&t[e],n=127&t[e+1],a=!1,s=null;if(0===i&&0===n)return 0;r.logger.log(3,(function(){return"["+pa([t[e],t[e+1]])+"] -> ("+pa([i,n])+")"}));var o=r.cmdHistory;if(i>=16&&i<=31){if(function(e,t,r){return r.a===e&&r.b===t}(i,n,o))return Ra(null,null,o),r.logger.log(3,(function(){return"Repeated command ("+pa([i,n])+") is dropped"})),0;Ra(i,n,r.cmdHistory),(a=r.parseCmd(i,n))||(a=r.parseMidrow(i,n)),a||(a=r.parsePAC(i,n)),a||(a=r.parseBackgroundAttributes(i,n))}else Ra(null,null,o);if(!a&&(s=r.parseChars(i,n))){var l=r.currentChannel;l&&l>0?r.channels[l].insertChars(s):r.logger.log(2,"No channel found yet. TEXT-MODE?")}a||s||r.logger.log(2,(function(){return"Couldn't parse cleaned data "+pa([i,n])+" orig: "+pa([t[e],t[e+1]])}))},n=0;n<t.length;n+=2)i(n)},t.parseCmd=function(e,t){if(!((20===e||28===e||21===e||29===e)&&t>=32&&t<=47||(23===e||31===e)&&t>=33&&t<=35))return!1;var r=20===e||21===e||23===e?1:2,i=this.channels[r];return 20===e||21===e||28===e||29===e?32===t?i.ccRCL():33===t?i.ccBS():34===t?i.ccAOF():35===t?i.ccAON():36===t?i.ccDER():37===t?i.ccRU(2):38===t?i.ccRU(3):39===t?i.ccRU(4):40===t?i.ccFON():41===t?i.ccRDC():42===t?i.ccTR():43===t?i.ccRTD():44===t?i.ccEDM():45===t?i.ccCR():46===t?i.ccENM():47===t&&i.ccEOC():i.ccTO(t-32),this.currentChannel=r,!0},t.parseMidrow=function(e,t){var r=0;if((17===e||25===e)&&t>=32&&t<=47){if((r=17===e?1:2)!==this.currentChannel)return this.logger.log(0,"Mismatch channel in midrow parsing"),!1;var i=this.channels[r];return!!i&&(i.ccMIDROW(t),this.logger.log(3,(function(){return"MIDROW ("+pa([e,t])+")"})),!0)}return!1},t.parsePAC=function(e,t){var r;if(!((e>=17&&e<=23||e>=25&&e<=31)&&t>=64&&t<=127||(16===e||24===e)&&t>=64&&t<=95))return!1;var i=e<=23?1:2;r=t>=64&&t<=95?1===i?da[e]:fa[e]:1===i?ca[e]:ga[e];var n=this.channels[i];return!!n&&(n.setPAC(this.interpretPAC(r,t)),this.currentChannel=i,!0)},t.interpretPAC=function(e,t){var r,i={color:null,italics:!1,indent:null,underline:!1,row:e};return r=t>95?t-96:t-64,i.underline=1==(1&r),r<=13?i.color=["white","green","blue","cyan","red","yellow","magenta","white"][Math.floor(r/2)]:r<=15?(i.italics=!0,i.color="white"):i.indent=4*Math.floor((r-16)/2),i},t.parseChars=function(e,t){var r,i,n=null,a=null;return e>=25?(r=2,a=e-8):(r=1,a=e),a>=17&&a<=19?(i=17===a?t+80:18===a?t+112:t+144,this.logger.log(2,(function(){return"Special char '"+la(i)+"' in channel "+r})),n=[i]):e>=32&&e<=127&&(n=0===t?[e]:[e,t]),n&&this.logger.log(3,(function(){return"Char codes =  "+pa(n).join(",")})),n},t.parseBackgroundAttributes=function(e,t){var r;if(!((16===e||24===e)&&t>=32&&t<=47||(23===e||31===e)&&t>=45&&t<=47))return!1;var i={};16===e||24===e?(r=Math.floor((t-32)/2),i.background=va[r],t%2==1&&(i.background=i.background+"_semi")):45===t?i.background="transparent":(i.foreground="black",47===t&&(i.underline=!0));var n=e<=23?1:2;return this.channels[n].setBkgData(i),!0},t.reset=function(){for(var e=0;e<Object.keys(this.channels).length;e++){var t=this.channels[e];t&&t.reset()}Ra(null,null,this.cmdHistory)},t.cueSplitAtTime=function(e){for(var t=0;t<this.channels.length;t++){var r=this.channels[t];r&&r.cueSplitAtTime(e)}},e}();function Ra(e,t,r){r.a=e,r.b=t}var ka=function(){function e(e,t){this.timelineController=void 0,this.cueRanges=[],this.trackName=void 0,this.startTime=null,this.endTime=null,this.screen=null,this.timelineController=e,this.trackName=t}var t=e.prototype;return t.dispatchCue=function(){null!==this.startTime&&(this.timelineController.addCues(this.trackName,this.startTime,this.endTime,this.screen,this.cueRanges),this.startTime=null)},t.newCue=function(e,t,r){(null===this.startTime||this.startTime>e)&&(this.startTime=e),this.endTime=t,this.screen=r,this.timelineController.createCaptionsTrack(this.trackName)},t.reset=function(){this.cueRanges=[],this.startTime=null},e}(),ba=function(){if(null!=j&&j.VTTCue)return self.VTTCue;var e=["","lr","rl"],t=["start","middle","end","left","right"];function r(e,t){if("string"!=typeof t)return!1;if(!Array.isArray(e))return!1;var r=t.toLowerCase();return!!~e.indexOf(r)&&r}function i(e){return r(t,e)}function n(e){for(var t=arguments.length,r=new Array(t>1?t-1:0),i=1;i<t;i++)r[i-1]=arguments[i];for(var n=1;n<arguments.length;n++){var a=arguments[n];for(var s in a)e[s]=a[s]}return e}function a(t,a,s){var o=this,l={enumerable:!0};o.hasBeenReset=!1;var u="",h=!1,d=t,c=a,f=s,g=null,v="",m=!0,p="auto",y="start",E=50,T="middle",S=50,L="middle";Object.defineProperty(o,"id",n({},l,{get:function(){return u},set:function(e){u=""+e}})),Object.defineProperty(o,"pauseOnExit",n({},l,{get:function(){return h},set:function(e){h=!!e}})),Object.defineProperty(o,"startTime",n({},l,{get:function(){return d},set:function(e){if("number"!=typeof e)throw new TypeError("Start time must be set to a number.");d=e,this.hasBeenReset=!0}})),Object.defineProperty(o,"endTime",n({},l,{get:function(){return c},set:function(e){if("number"!=typeof e)throw new TypeError("End time must be set to a number.");c=e,this.hasBeenReset=!0}})),Object.defineProperty(o,"text",n({},l,{get:function(){return f},set:function(e){f=""+e,this.hasBeenReset=!0}})),Object.defineProperty(o,"region",n({},l,{get:function(){return g},set:function(e){g=e,this.hasBeenReset=!0}})),Object.defineProperty(o,"vertical",n({},l,{get:function(){return v},set:function(t){var i=function(t){return r(e,t)}(t);if(!1===i)throw new SyntaxError("An invalid or illegal string was specified.");v=i,this.hasBeenReset=!0}})),Object.defineProperty(o,"snapToLines",n({},l,{get:function(){return m},set:function(e){m=!!e,this.hasBeenReset=!0}})),Object.defineProperty(o,"line",n({},l,{get:function(){return p},set:function(e){if("number"!=typeof e&&"auto"!==e)throw new SyntaxError("An invalid number or illegal string was specified.");p=e,this.hasBeenReset=!0}})),Object.defineProperty(o,"lineAlign",n({},l,{get:function(){return y},set:function(e){var t=i(e);if(!t)throw new SyntaxError("An invalid or illegal string was specified.");y=t,this.hasBeenReset=!0}})),Object.defineProperty(o,"position",n({},l,{get:function(){return E},set:function(e){if(e<0||e>100)throw new Error("Position must be between 0 and 100.");E=e,this.hasBeenReset=!0}})),Object.defineProperty(o,"positionAlign",n({},l,{get:function(){return T},set:function(e){var t=i(e);if(!t)throw new SyntaxError("An invalid or illegal string was specified.");T=t,this.hasBeenReset=!0}})),Object.defineProperty(o,"size",n({},l,{get:function(){return S},set:function(e){if(e<0||e>100)throw new Error("Size must be between 0 and 100.");S=e,this.hasBeenReset=!0}})),Object.defineProperty(o,"align",n({},l,{get:function(){return L},set:function(e){var t=i(e);if(!t)throw new SyntaxError("An invalid or illegal string was specified.");L=t,this.hasBeenReset=!0}})),o.displayState=void 0}return a.prototype.getCueAsHTML=function(){return self.WebVTT.convertCueToDOMTree(self,this.text)},a}(),Da=function(){function e(){}return e.prototype.decode=function(e,t){if(!e)return"";if("string"!=typeof e)throw new Error("Error - expected string data.");return decodeURIComponent(encodeURIComponent(e))},e}();function Ia(e){function t(e,t,r,i){return 3600*(0|e)+60*(0|t)+(0|r)+parseFloat(i||0)}var r=e.match(/^(?:(\d+):)?(\d{2}):(\d{2})(\.\d+)?/);return r?parseFloat(r[2])>59?t(r[2],r[3],0,r[4]):t(r[1],r[2],r[3],r[4]):null}var wa=function(){function e(){this.values=Object.create(null)}var t=e.prototype;return t.set=function(e,t){this.get(e)||""===t||(this.values[e]=t)},t.get=function(e,t,r){return r?this.has(e)?this.values[e]:t[r]:this.has(e)?this.values[e]:t},t.has=function(e){return e in this.values},t.alt=function(e,t,r){for(var i=0;i<r.length;++i)if(t===r[i]){this.set(e,t);break}},t.integer=function(e,t){/^-?\d+$/.test(t)&&this.set(e,parseInt(t,10))},t.percent=function(e,t){if(/^([\d]{1,3})(\.[\d]*)?%$/.test(t)){var r=parseFloat(t);if(r>=0&&r<=100)return this.set(e,r),!0}return!1},e}();function Ca(e,t,r,i){var n=i?e.split(i):[e];for(var a in n)if("string"==typeof n[a]){var s=n[a].split(r);2===s.length&&t(s[0],s[1])}}var _a=new ba(0,0,""),xa="middle"===_a.align?"middle":"center";function Pa(e,t,r){var i=e;function n(){var t=Ia(e);if(null===t)throw new Error("Malformed timestamp: "+i);return e=e.replace(/^[^\sa-zA-Z-]+/,""),t}function a(){e=e.replace(/^\s+/,"")}if(a(),t.startTime=n(),a(),"--\x3e"!==e.slice(0,3))throw new Error("Malformed time stamp (time stamps must be separated by '--\x3e'): "+i);e=e.slice(3),a(),t.endTime=n(),a(),function(e,t){var i=new wa;Ca(e,(function(e,t){var n;switch(e){case"region":for(var a=r.length-1;a>=0;a--)if(r[a].id===t){i.set(e,r[a].region);break}break;case"vertical":i.alt(e,t,["rl","lr"]);break;case"line":n=t.split(","),i.integer(e,n[0]),i.percent(e,n[0])&&i.set("snapToLines",!1),i.alt(e,n[0],["auto"]),2===n.length&&i.alt("lineAlign",n[1],["start",xa,"end"]);break;case"position":n=t.split(","),i.percent(e,n[0]),2===n.length&&i.alt("positionAlign",n[1],["start",xa,"end","line-left","line-right","auto"]);break;case"size":i.percent(e,t);break;case"align":i.alt(e,t,["start",xa,"end","left","right"])}}),/:/,/\s/),t.region=i.get("region",null),t.vertical=i.get("vertical","");var n=i.get("line","auto");"auto"===n&&-1===_a.line&&(n=-1),t.line=n,t.lineAlign=i.get("lineAlign","start"),t.snapToLines=i.get("snapToLines",!0),t.size=i.get("size",100),t.align=i.get("align",xa);var a=i.get("position","auto");"auto"===a&&50===_a.position&&(a="start"===t.align||"left"===t.align?0:"end"===t.align||"right"===t.align?100:50),t.position=a}(e,t)}function Fa(e){return e.replace(/<br(?: \/)?>/gi,"\n")}var Ma=function(){function e(){this.state="INITIAL",this.buffer="",this.decoder=new Da,this.regionList=[],this.cue=null,this.oncue=void 0,this.onparsingerror=void 0,this.onflush=void 0}var t=e.prototype;return t.parse=function(e){var t=this;function r(){var e=t.buffer,r=0;for(e=Fa(e);r<e.length&&"\r"!==e[r]&&"\n"!==e[r];)++r;var i=e.slice(0,r);return"\r"===e[r]&&++r,"\n"===e[r]&&++r,t.buffer=e.slice(r),i}e&&(t.buffer+=t.decoder.decode(e,{stream:!0}));try{var i="";if("INITIAL"===t.state){if(!/\r\n|\n/.test(t.buffer))return this;var n=(i=r()).match(/^(ï»¿)?WEBVTT([ \t].*)?$/);if(null==n||!n[0])throw new Error("Malformed WebVTT signature.");t.state="HEADER"}for(var a=!1;t.buffer;){if(!/\r\n|\n/.test(t.buffer))return this;switch(a?a=!1:i=r(),t.state){case"HEADER":/:/.test(i)?Ca(i,(function(e,t){}),/:/):i||(t.state="ID");continue;case"NOTE":i||(t.state="ID");continue;case"ID":if(/^NOTE($|[ \t])/.test(i)){t.state="NOTE";break}if(!i)continue;if(t.cue=new ba(0,0,""),t.state="CUE",-1===i.indexOf("--\x3e")){t.cue.id=i;continue}case"CUE":if(!t.cue){t.state="BADCUE";continue}try{Pa(i,t.cue,t.regionList)}catch(e){t.cue=null,t.state="BADCUE";continue}t.state="CUETEXT";continue;case"CUETEXT":var s=-1!==i.indexOf("--\x3e");if(!i||s&&(a=!0)){t.oncue&&t.cue&&t.oncue(t.cue),t.cue=null,t.state="ID";continue}if(null===t.cue)continue;t.cue.text&&(t.cue.text+="\n"),t.cue.text+=i;continue;case"BADCUE":i||(t.state="ID")}}}catch(e){"CUETEXT"===t.state&&t.cue&&t.oncue&&t.oncue(t.cue),t.cue=null,t.state="INITIAL"===t.state?"BADWEBVTT":"BADCUE"}return this},t.flush=function(){var e=this;try{if((e.cue||"HEADER"===e.state)&&(e.buffer+="\n\n",e.parse()),"INITIAL"===e.state||"BADWEBVTT"===e.state)throw new Error("Malformed WebVTT signature.")}catch(t){e.onparsingerror&&e.onparsingerror(t)}return e.onflush&&e.onflush(),this},e}(),Oa=/\r\n|\n\r|\n|\r/g,Na=function(e,t,r){return void 0===r&&(r=0),e.slice(r,r+t.length)===t},Ua=function(e){for(var t=5381,r=e.length;r;)t=33*t^e.charCodeAt(--r);return(t>>>0).toString()};function Ba(e,t,r){return Ua(e.toString())+Ua(t.toString())+Ua(r)}function Ga(e,t,r,i,n,a,s){var o,l,u,h=new Ma,d=ke(new Uint8Array(e)).trim().replace(Oa,"\n").split("\n"),c=[],f=t?(o=t.baseTime,void 0===(l=t.timescale)&&(l=1),kn(o,Rn,1/l)):0,g="00:00.000",v=0,m=0,p=!0;h.oncue=function(e){var a=r[i],s=r.ccOffset,o=(v-f)/9e4;if(null!=a&&a.new&&(void 0!==m?s=r.ccOffset=a.start:function(e,t,r){var i=e[t],n=e[i.prevCC];if(!n||!n.new&&i.new)return e.ccOffset=e.presentationOffset=i.start,void(i.new=!1);for(;null!=(a=n)&&a.new;){var a;e.ccOffset+=i.start-n.start,i.new=!1,n=e[(i=n).prevCC]}e.presentationOffset=r}(r,i,o)),o){if(!t)return void(u=new Error("Missing initPTS for VTT MPEGTS"));s=o-r.presentationOffset}var l=e.endTime-e.startTime,h=Cn(9e4*(e.startTime+s-m),9e4*n)/9e4;e.startTime=Math.max(h,0),e.endTime=Math.max(h+l,0);var d=e.text.trim();e.text=decodeURIComponent(encodeURIComponent(d)),e.id||(e.id=Ba(e.startTime,e.endTime,d)),e.endTime>0&&c.push(e)},h.onparsingerror=function(e){u=e},h.onflush=function(){u?s(u):a(c)},d.forEach((function(e){if(p){if(Na(e,"X-TIMESTAMP-MAP=")){p=!1,e.slice(16).split(",").forEach((function(e){Na(e,"LOCAL:")?g=e.slice(6):Na(e,"MPEGTS:")&&(v=parseInt(e.slice(7)))}));try{m=function(e){var t=parseInt(e.slice(-3)),r=parseInt(e.slice(-6,-4)),i=parseInt(e.slice(-9,-7)),n=e.length>9?parseInt(e.substring(0,e.indexOf(":"))):0;if(!(y(t)&&y(r)&&y(i)&&y(n)))throw Error("Malformed X-TIMESTAMP-MAP: Local:"+e);return t+=1e3*r,(t+=6e4*i)+36e5*n}(g)/1e3}catch(e){u=e}return}""===e&&(p=!1)}h.parse(e+"\n")})),h.flush()}var Ka="stpp.ttml.im1t",Ha=/^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/,Va=/^(\d*(?:\.\d*)?)(h|m|s|ms|f|t)$/,Ya={left:"start",center:"center",right:"end",start:"start",end:"end"};function Wa(e,t,r,i){var n=Ne(new Uint8Array(e),["mdat"]);if(0!==n.length){var a,s,l,u,h=n.map((function(e){return ke(e)})),d=(a=t.baseTime,s=1,void 0===(l=t.timescale)&&(l=1),void 0===u&&(u=!1),kn(a,s,1/l,u));try{h.forEach((function(e){return r(function(e,t){var r=(new DOMParser).parseFromString(e,"text/xml"),i=r.getElementsByTagName("tt")[0];if(!i)throw new Error("Invalid ttml");var n={frameRate:30,subFrameRate:1,frameRateMultiplier:0,tickRate:0},a=Object.keys(n).reduce((function(e,t){return e[t]=i.getAttribute("ttp:"+t)||n[t],e}),{}),s="preserve"!==i.getAttribute("xml:space"),l=qa(ja(i,"styling","style")),u=qa(ja(i,"layout","region")),h=ja(i,"body","[begin]");return[].map.call(h,(function(e){var r=Xa(e,s);if(!r||!e.hasAttribute("begin"))return null;var i=Ja(e.getAttribute("begin"),a),n=Ja(e.getAttribute("dur"),a),h=Ja(e.getAttribute("end"),a);if(null===i)throw Qa(e);if(null===h){if(null===n)throw Qa(e);h=i+n}var d=new ba(i-t,h-t,r);d.id=Ba(d.startTime,d.endTime,d.text);var c=function(e,t,r){var i="http://www.w3.org/ns/ttml#styling",n=null,a=["displayAlign","textAlign","color","backgroundColor","fontSize","fontFamily"],s=null!=e&&e.hasAttribute("style")?e.getAttribute("style"):null;return s&&r.hasOwnProperty(s)&&(n=r[s]),a.reduce((function(r,a){var s=za(t,i,a)||za(e,i,a)||za(n,i,a);return s&&(r[a]=s),r}),{})}(u[e.getAttribute("region")],l[e.getAttribute("style")],l),f=c.textAlign;if(f){var g=Ya[f];g&&(d.lineAlign=g),d.align=f}return o(d,c),d})).filter((function(e){return null!==e}))}(e,d))}))}catch(e){i(e)}}else i(new Error("Could not parse IMSC1 mdat"))}function ja(e,t,r){var i=e.getElementsByTagName(t)[0];return i?[].slice.call(i.querySelectorAll(r)):[]}function qa(e){return e.reduce((function(e,t){var r=t.getAttribute("xml:id");return r&&(e[r]=t),e}),{})}function Xa(e,t){return[].slice.call(e.childNodes).reduce((function(e,r,i){var n;return"br"===r.nodeName&&i?e+"\n":null!=(n=r.childNodes)&&n.length?Xa(r,t):t?e+r.textContent.trim().replace(/\s+/g," "):e+r.textContent}),"")}function za(e,t,r){return e&&e.hasAttributeNS(t,r)?e.getAttributeNS(t,r):null}function Qa(e){return new Error("Could not parse ttml timestamp "+e)}function Ja(e,t){if(!e)return null;var r=Ia(e);return null===r&&(Ha.test(e)?r=function(e,t){var r=Ha.exec(e),i=(0|r[4])+(0|r[5])/t.subFrameRate;return 3600*(0|r[1])+60*(0|r[2])+(0|r[3])+i/t.frameRate}(e,t):Va.test(e)&&(r=function(e,t){var r=Va.exec(e),i=Number(r[1]);switch(r[2]){case"h":return 3600*i;case"m":return 60*i;case"ms":return 1e3*i;case"f":return i/t.frameRate;case"t":return i/t.tickRate}return i}(e,t))),r}var $a=function(){function e(e){this.hls=void 0,this.media=null,this.config=void 0,this.enabled=!0,this.Cues=void 0,this.textTracks=[],this.tracks=[],this.initPTS=[],this.unparsedVttFrags=[],this.captionsTracks={},this.nonNativeCaptionsTracks={},this.cea608Parser1=void 0,this.cea608Parser2=void 0,this.lastCc=-1,this.lastSn=-1,this.lastPartIndex=-1,this.prevCC=-1,this.vttCCs={ccOffset:0,presentationOffset:0,0:{start:0,prevCC:-1,new:!0}},this.captionsProperties=void 0,this.hls=e,this.config=e.config,this.Cues=e.config.cueHandler,this.captionsProperties={textTrack1:{label:this.config.captionsTextTrack1Label,languageCode:this.config.captionsTextTrack1LanguageCode},textTrack2:{label:this.config.captionsTextTrack2Label,languageCode:this.config.captionsTextTrack2LanguageCode},textTrack3:{label:this.config.captionsTextTrack3Label,languageCode:this.config.captionsTextTrack3LanguageCode},textTrack4:{label:this.config.captionsTextTrack4Label,languageCode:this.config.captionsTextTrack4LanguageCode}},e.on(S.MEDIA_ATTACHING,this.onMediaAttaching,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_LOADED,this.onManifestLoaded,this),e.on(S.SUBTITLE_TRACKS_UPDATED,this.onSubtitleTracksUpdated,this),e.on(S.FRAG_LOADING,this.onFragLoading,this),e.on(S.FRAG_LOADED,this.onFragLoaded,this),e.on(S.FRAG_PARSING_USERDATA,this.onFragParsingUserdata,this),e.on(S.FRAG_DECRYPTED,this.onFragDecrypted,this),e.on(S.INIT_PTS_FOUND,this.onInitPtsFound,this),e.on(S.SUBTITLE_TRACKS_CLEARED,this.onSubtitleTracksCleared,this),e.on(S.BUFFER_FLUSHING,this.onBufferFlushing,this)}var t=e.prototype;return t.destroy=function(){var e=this.hls;e.off(S.MEDIA_ATTACHING,this.onMediaAttaching,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_LOADED,this.onManifestLoaded,this),e.off(S.SUBTITLE_TRACKS_UPDATED,this.onSubtitleTracksUpdated,this),e.off(S.FRAG_LOADING,this.onFragLoading,this),e.off(S.FRAG_LOADED,this.onFragLoaded,this),e.off(S.FRAG_PARSING_USERDATA,this.onFragParsingUserdata,this),e.off(S.FRAG_DECRYPTED,this.onFragDecrypted,this),e.off(S.INIT_PTS_FOUND,this.onInitPtsFound,this),e.off(S.SUBTITLE_TRACKS_CLEARED,this.onSubtitleTracksCleared,this),e.off(S.BUFFER_FLUSHING,this.onBufferFlushing,this),this.hls=this.config=null,this.cea608Parser1=this.cea608Parser2=void 0},t.initCea608Parsers=function(){if(this.config.enableCEA708Captions&&(!this.cea608Parser1||!this.cea608Parser2)){var e=new ka(this,"textTrack1"),t=new ka(this,"textTrack2"),r=new ka(this,"textTrack3"),i=new ka(this,"textTrack4");this.cea608Parser1=new Aa(1,e,t),this.cea608Parser2=new Aa(3,r,i)}},t.addCues=function(e,t,r,i,n){for(var a,s,o,l,u=!1,h=n.length;h--;){var d=n[h],c=(a=d[0],s=d[1],o=t,l=r,Math.min(s,l)-Math.max(a,o));if(c>=0&&(d[0]=Math.min(d[0],t),d[1]=Math.max(d[1],r),u=!0,c/(r-t)>.5))return}if(u||n.push([t,r]),this.config.renderTextTracksNatively){var f=this.captionsTracks[e];this.Cues.newCue(f,t,r,i)}else{var g=this.Cues.newCue(null,t,r,i);this.hls.trigger(S.CUES_PARSED,{type:"captions",cues:g,track:e})}},t.onInitPtsFound=function(e,t){var r=this,i=t.frag,n=t.id,a=t.initPTS,s=t.timescale,o=this.unparsedVttFrags;"main"===n&&(this.initPTS[i.cc]={baseTime:a,timescale:s}),o.length&&(this.unparsedVttFrags=[],o.forEach((function(e){r.onFragLoaded(S.FRAG_LOADED,e)})))},t.getExistingTrack=function(e,t){var r=this.media;if(r)for(var i=0;i<r.textTracks.length;i++){var n=r.textTracks[i];if(es(n,{name:e,lang:t,attrs:{}}))return n}return null},t.createCaptionsTrack=function(e){this.config.renderTextTracksNatively?this.createNativeTrack(e):this.createNonNativeTrack(e)},t.createNativeTrack=function(e){if(!this.captionsTracks[e]){var t=this.captionsProperties,r=this.captionsTracks,i=this.media,n=t[e],a=n.label,s=n.languageCode,o=this.getExistingTrack(a,s);if(o)r[e]=o,Vt(r[e]),Kt(r[e],i);else{var l=this.createTextTrack("captions",a,s);l&&(l[e]=!0,r[e]=l)}}},t.createNonNativeTrack=function(e){if(!this.nonNativeCaptionsTracks[e]){var t=this.captionsProperties[e];if(t){var r={_id:e,label:t.label,kind:"captions",default:!!t.media&&!!t.media.default,closedCaptions:t.media};this.nonNativeCaptionsTracks[e]=r,this.hls.trigger(S.NON_NATIVE_TEXT_TRACKS_FOUND,{tracks:[r]})}}},t.createTextTrack=function(e,t,r){var i=this.media;if(i)return i.addTextTrack(e,t,r)},t.onMediaAttaching=function(e,t){this.media=t.media,this._cleanTracks()},t.onMediaDetaching=function(){var e=this.captionsTracks;Object.keys(e).forEach((function(t){Vt(e[t]),delete e[t]})),this.nonNativeCaptionsTracks={}},t.onManifestLoading=function(){this.lastCc=-1,this.lastSn=-1,this.lastPartIndex=-1,this.prevCC=-1,this.vttCCs={ccOffset:0,presentationOffset:0,0:{start:0,prevCC:-1,new:!0}},this._cleanTracks(),this.tracks=[],this.captionsTracks={},this.nonNativeCaptionsTracks={},this.textTracks=[],this.unparsedVttFrags=[],this.initPTS=[],this.cea608Parser1&&this.cea608Parser2&&(this.cea608Parser1.reset(),this.cea608Parser2.reset())},t._cleanTracks=function(){var e=this.media;if(e){var t=e.textTracks;if(t)for(var r=0;r<t.length;r++)Vt(t[r])}},t.onSubtitleTracksUpdated=function(e,t){var r=this,i=t.subtitleTracks||[],n=i.some((function(e){return e.textCodec===Ka}));if(this.config.enableWebVTT||n&&this.config.enableIMSC1){if(Qn(this.tracks,i))return void(this.tracks=i);if(this.textTracks=[],this.tracks=i,this.config.renderTextTracksNatively){var a=this.media,s=a?Wt(a.textTracks):null;if(this.tracks.forEach((function(e,t){var i;if(s){for(var n=null,a=0;a<s.length;a++)if(s[a]&&es(s[a],e)){n=s[a],s[a]=null;break}n&&(i=n)}if(i)Vt(i);else{var o=Za(e);(i=r.createTextTrack(o,e.name,e.lang))&&(i.mode="disabled")}i&&r.textTracks.push(i)})),null!=s&&s.length){var o=s.filter((function(e){return null!==e})).map((function(e){return e.label}));o.length&&w.warn("Media element contains unused subtitle tracks: "+o.join(", ")+". Replace media element for each source to clear TextTracks and captions menu.")}}else if(this.tracks.length){var l=this.tracks.map((function(e){return{label:e.name,kind:e.type.toLowerCase(),default:e.default,subtitleTrack:e}}));this.hls.trigger(S.NON_NATIVE_TEXT_TRACKS_FOUND,{tracks:l})}}},t.onManifestLoaded=function(e,t){var r=this;this.config.enableCEA708Captions&&t.captions&&t.captions.forEach((function(e){var t=/(?:CC|SERVICE)([1-4])/.exec(e.instreamId);if(t){var i="textTrack"+t[1],n=r.captionsProperties[i];n&&(n.label=e.name,e.lang&&(n.languageCode=e.lang),n.media=e)}}))},t.closedCaptionsForLevel=function(e){var t=this.hls.levels[e.level];return null==t?void 0:t.attrs["CLOSED-CAPTIONS"]},t.onFragLoading=function(e,t){if(this.enabled&&t.frag.type===Mt){var r,i,n=this.cea608Parser1,a=this.cea608Parser2,s=this.lastSn,o=t.frag,l=o.cc,u=o.sn,h=null!=(r=null==(i=t.part)?void 0:i.index)?r:-1;n&&a&&(u!==s+1||u===s&&h!==this.lastPartIndex+1||l!==this.lastCc)&&(n.reset(),a.reset()),this.lastCc=l,this.lastSn=u,this.lastPartIndex=h}},t.onFragLoaded=function(e,t){var r=t.frag,i=t.payload;if(r.type===Nt)if(i.byteLength){var n=r.decryptdata,a="stats"in t;if(null==n||!n.encrypted||a){var s=this.tracks[r.level],o=this.vttCCs;o[r.cc]||(o[r.cc]={start:r.start,prevCC:this.prevCC,new:!0},this.prevCC=r.cc),s&&s.textCodec===Ka?this._parseIMSC1(r,i):this._parseVTTs(t)}}else this.hls.trigger(S.SUBTITLE_FRAG_PROCESSED,{success:!1,frag:r,error:new Error("Empty subtitle payload")})},t._parseIMSC1=function(e,t){var r=this,i=this.hls;Wa(t,this.initPTS[e.cc],(function(t){r._appendCues(t,e.level),i.trigger(S.SUBTITLE_FRAG_PROCESSED,{success:!0,frag:e})}),(function(t){w.log("Failed to parse IMSC1: "+t),i.trigger(S.SUBTITLE_FRAG_PROCESSED,{success:!1,frag:e,error:t})}))},t._parseVTTs=function(e){var t,r=this,i=e.frag,n=e.payload,a=this.initPTS,s=this.unparsedVttFrags,o=a.length-1;if(a[i.cc]||-1!==o){var l=this.hls;Ga(null!=(t=i.initSegment)&&t.data?je(i.initSegment.data,new Uint8Array(n)):n,this.initPTS[i.cc],this.vttCCs,i.cc,i.start,(function(e){r._appendCues(e,i.level),l.trigger(S.SUBTITLE_FRAG_PROCESSED,{success:!0,frag:i})}),(function(t){var a="Missing initPTS for VTT MPEGTS"===t.message;a?s.push(e):r._fallbackToIMSC1(i,n),w.log("Failed to parse VTT cue: "+t),a&&o>i.cc||l.trigger(S.SUBTITLE_FRAG_PROCESSED,{success:!1,frag:i,error:t})}))}else s.push(e)},t._fallbackToIMSC1=function(e,t){var r=this,i=this.tracks[e.level];i.textCodec||Wa(t,this.initPTS[e.cc],(function(){i.textCodec=Ka,r._parseIMSC1(e,t)}),(function(){i.textCodec="wvtt"}))},t._appendCues=function(e,t){var r=this.hls;if(this.config.renderTextTracksNatively){var i=this.textTracks[t];if(!i||"disabled"===i.mode)return;e.forEach((function(e){return Ht(i,e)}))}else{var n=this.tracks[t];if(!n)return;var a=n.default?"default":"subtitles"+t;r.trigger(S.CUES_PARSED,{type:"subtitles",cues:e,track:a})}},t.onFragDecrypted=function(e,t){t.frag.type===Nt&&this.onFragLoaded(S.FRAG_LOADED,t)},t.onSubtitleTracksCleared=function(){this.tracks=[],this.captionsTracks={}},t.onFragParsingUserdata=function(e,t){this.initCea608Parsers();var r=this.cea608Parser1,i=this.cea608Parser2;if(this.enabled&&r&&i){var n=t.frag,a=t.samples;if(n.type!==Mt||"NONE"!==this.closedCaptionsForLevel(n))for(var s=0;s<a.length;s++){var o=a[s].bytes;if(o){var l=this.extractCea608Data(o);r.addData(a[s].pts,l[0]),i.addData(a[s].pts,l[1])}}}},t.onBufferFlushing=function(e,t){var r=t.startOffset,i=t.endOffset,n=t.endOffsetSubtitles,a=t.type,s=this.media;if(s&&!(s.currentTime<i)){if(!a||"video"===a){var o=this.captionsTracks;Object.keys(o).forEach((function(e){return Yt(o[e],r,i)}))}if(this.config.renderTextTracksNatively&&0===r&&void 0!==n){var l=this.textTracks;Object.keys(l).forEach((function(e){return Yt(l[e],r,n)}))}}},t.extractCea608Data=function(e){for(var t=[[],[]],r=31&e[0],i=2,n=0;n<r;n++){var a=e[i++],s=127&e[i++],o=127&e[i++];if((0!==s||0!==o)&&0!=(4&a)){var l=3&a;0!==l&&1!==l||(t[l].push(s),t[l].push(o))}}return t},e}();function Za(e){return e.characteristics&&/transcribes-spoken-dialog/gi.test(e.characteristics)&&/describes-music-and-sound/gi.test(e.characteristics)?"captions":"subtitles"}function es(e,t){return!!e&&e.kind===Za(t)&&$n(t,e)}var ts=function(){function e(e){this.hls=void 0,this.autoLevelCapping=void 0,this.firstLevel=void 0,this.media=void 0,this.restrictedLevels=void 0,this.timer=void 0,this.clientRect=void 0,this.streamController=void 0,this.hls=e,this.autoLevelCapping=Number.POSITIVE_INFINITY,this.firstLevel=-1,this.media=null,this.restrictedLevels=[],this.timer=void 0,this.clientRect=null,this.registerListeners()}var t=e.prototype;return t.setStreamController=function(e){this.streamController=e},t.destroy=function(){this.hls&&this.unregisterListener(),this.timer&&this.stopCapping(),this.media=null,this.clientRect=null,this.hls=this.streamController=null},t.registerListeners=function(){var e=this.hls;e.on(S.FPS_DROP_LEVEL_CAPPING,this.onFpsDropLevelCapping,this),e.on(S.MEDIA_ATTACHING,this.onMediaAttaching,this),e.on(S.MANIFEST_PARSED,this.onManifestParsed,this),e.on(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.on(S.BUFFER_CODECS,this.onBufferCodecs,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this)},t.unregisterListener=function(){var e=this.hls;e.off(S.FPS_DROP_LEVEL_CAPPING,this.onFpsDropLevelCapping,this),e.off(S.MEDIA_ATTACHING,this.onMediaAttaching,this),e.off(S.MANIFEST_PARSED,this.onManifestParsed,this),e.off(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.off(S.BUFFER_CODECS,this.onBufferCodecs,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this)},t.onFpsDropLevelCapping=function(e,t){var r=this.hls.levels[t.droppedLevel];this.isLevelAllowed(r)&&this.restrictedLevels.push({bitrate:r.bitrate,height:r.height,width:r.width})},t.onMediaAttaching=function(e,t){this.media=t.media instanceof HTMLVideoElement?t.media:null,this.clientRect=null,this.timer&&this.hls.levels.length&&this.detectPlayerSize()},t.onManifestParsed=function(e,t){var r=this.hls;this.restrictedLevels=[],this.firstLevel=t.firstLevel,r.config.capLevelToPlayerSize&&t.video&&this.startCapping()},t.onLevelsUpdated=function(e,t){this.timer&&y(this.autoLevelCapping)&&this.detectPlayerSize()},t.onBufferCodecs=function(e,t){this.hls.config.capLevelToPlayerSize&&t.video&&this.startCapping()},t.onMediaDetaching=function(){this.stopCapping()},t.detectPlayerSize=function(){if(this.media){if(this.mediaHeight<=0||this.mediaWidth<=0)return void(this.clientRect=null);var e=this.hls.levels;if(e.length){var t=this.hls,r=this.getMaxLevel(e.length-1);r!==this.autoLevelCapping&&w.log("Setting autoLevelCapping to "+r+": "+e[r].height+"p@"+e[r].bitrate+" for media "+this.mediaWidth+"x"+this.mediaHeight),t.autoLevelCapping=r,t.autoLevelCapping>this.autoLevelCapping&&this.streamController&&this.streamController.nextLevelSwitch(),this.autoLevelCapping=t.autoLevelCapping}}},t.getMaxLevel=function(t){var r=this,i=this.hls.levels;if(!i.length)return-1;var n=i.filter((function(e,i){return r.isLevelAllowed(e)&&i<=t}));return this.clientRect=null,e.getMaxLevelByMediaSize(n,this.mediaWidth,this.mediaHeight)},t.startCapping=function(){this.timer||(this.autoLevelCapping=Number.POSITIVE_INFINITY,self.clearInterval(this.timer),this.timer=self.setInterval(this.detectPlayerSize.bind(this),1e3),this.detectPlayerSize())},t.stopCapping=function(){this.restrictedLevels=[],this.firstLevel=-1,this.autoLevelCapping=Number.POSITIVE_INFINITY,this.timer&&(self.clearInterval(this.timer),this.timer=void 0)},t.getDimensions=function(){if(this.clientRect)return this.clientRect;var e=this.media,t={width:0,height:0};if(e){var r=e.getBoundingClientRect();t.width=r.width,t.height=r.height,t.width||t.height||(t.width=r.right-r.left||e.width||0,t.height=r.bottom-r.top||e.height||0)}return this.clientRect=t,t},t.isLevelAllowed=function(e){return!this.restrictedLevels.some((function(t){return e.bitrate===t.bitrate&&e.width===t.width&&e.height===t.height}))},e.getMaxLevelByMediaSize=function(e,t,r){if(null==e||!e.length)return-1;for(var i,n,a=e.length-1,s=Math.max(t,r),o=0;o<e.length;o+=1){var l=e[o];if((l.width>=s||l.height>=s)&&(i=l,!(n=e[o+1])||i.width!==n.width||i.height!==n.height)){a=o;break}}return a},s(e,[{key:"mediaWidth",get:function(){return this.getDimensions().width*this.contentScaleFactor}},{key:"mediaHeight",get:function(){return this.getDimensions().height*this.contentScaleFactor}},{key:"contentScaleFactor",get:function(){var e=1;if(!this.hls.config.ignoreDevicePixelRatio)try{e=self.devicePixelRatio}catch(e){}return e}}]),e}(),rs=function(){function e(e){this.hls=void 0,this.isVideoPlaybackQualityAvailable=!1,this.timer=void 0,this.media=null,this.lastTime=void 0,this.lastDroppedFrames=0,this.lastDecodedFrames=0,this.streamController=void 0,this.hls=e,this.registerListeners()}var t=e.prototype;return t.setStreamController=function(e){this.streamController=e},t.registerListeners=function(){this.hls.on(S.MEDIA_ATTACHING,this.onMediaAttaching,this)},t.unregisterListeners=function(){this.hls.off(S.MEDIA_ATTACHING,this.onMediaAttaching,this)},t.destroy=function(){this.timer&&clearInterval(this.timer),this.unregisterListeners(),this.isVideoPlaybackQualityAvailable=!1,this.media=null},t.onMediaAttaching=function(e,t){var r=this.hls.config;if(r.capLevelOnFPSDrop){var i=t.media instanceof self.HTMLVideoElement?t.media:null;this.media=i,i&&"function"==typeof i.getVideoPlaybackQuality&&(this.isVideoPlaybackQualityAvailable=!0),self.clearInterval(this.timer),this.timer=self.setInterval(this.checkFPSInterval.bind(this),r.fpsDroppedMonitoringPeriod)}},t.checkFPS=function(e,t,r){var i=performance.now();if(t){if(this.lastTime){var n=i-this.lastTime,a=r-this.lastDroppedFrames,s=t-this.lastDecodedFrames,o=1e3*a/n,l=this.hls;if(l.trigger(S.FPS_DROP,{currentDropped:a,currentDecoded:s,totalDroppedFrames:r}),o>0&&a>l.config.fpsDroppedMonitoringThreshold*s){var u=l.currentLevel;w.warn("drop FPS ratio greater than max allowed value for currentLevel: "+u),u>0&&(-1===l.autoLevelCapping||l.autoLevelCapping>=u)&&(u-=1,l.trigger(S.FPS_DROP_LEVEL_CAPPING,{level:u,droppedLevel:l.currentLevel}),l.autoLevelCapping=u,this.streamController.nextLevelSwitch())}}this.lastTime=i,this.lastDroppedFrames=r,this.lastDecodedFrames=t}},t.checkFPSInterval=function(){var e=this.media;if(e)if(this.isVideoPlaybackQualityAvailable){var t=e.getVideoPlaybackQuality();this.checkFPS(e,t.totalVideoFrames,t.droppedVideoFrames)}else this.checkFPS(e,e.webkitDecodedFrameCount,e.webkitDroppedFrameCount)},e}(),is="[eme]",ns=function(){function e(t){var r=this;this.hls=void 0,this.config=void 0,this.media=null,this.keyFormatPromise=null,this.keySystemAccessPromises={},this._requestLicenseFailureCount=0,this.mediaKeySessions=[],this.keyIdToKeySessionPromise={},this.setMediaKeysQueue=e.CDMCleanupPromise?[e.CDMCleanupPromise]:[],this.debug=w.debug.bind(w,is),this.log=w.log.bind(w,is),this.warn=w.warn.bind(w,is),this.error=w.error.bind(w,is),this.onMediaEncrypted=function(e){var t=e.initDataType,i=e.initData,n='"'+e.type+'" event: init data type: "'+t+'"';if(r.debug(n),null!==i){if(!r.keyFormatPromise){var a=Object.keys(r.keySystemAccessPromises);a.length||(a=ae(r.config));var s=a.map(ne).filter((function(e){return!!e}));r.keyFormatPromise=r.getKeyFormatPromise(s)}r.keyFormatPromise.then((function(a){var s,o,l=$(a);if("sinf"===t){if(l!==q.FAIRPLAY)return void r.warn('Ignoring unexpected "'+e.type+'" event with init data type: "'+t+'" for selected key-system '+l);var u=_e(new Uint8Array(i));try{var h=Ye(V(JSON.parse(u).sinf));if(!h)throw new Error("'schm' box missing or not cbcs/cenc with schi > tenc");s=h.subarray(8,24),o=q.FAIRPLAY}catch(e){return void r.warn(n+" Failed to parse sinf: "+e)}}else{if(l!==q.WIDEVINE&&l!==q.PLAYREADY)return void r.warn('Ignoring unexpected "'+e.type+'" event with init data type: "'+t+'" for selected key-system '+l);var d=function(e){var t=[];if(e instanceof ArrayBuffer)for(var r=e.byteLength,i=0;i+32<r;){var n=$e(new DataView(e,i));t.push(n),i+=n.size}return t}(i),c=d.filter((function(e){return!!e.systemId&&ie(e.systemId)===l}));c.length>1&&r.warn(n+" Using first of "+c.length+" pssh found for selected key-system "+l);var f=c[0];if(!f)return void(0===d.length||d.some((function(e){return!e.systemId}))?r.warn(n+" contains incomplete or invalid pssh data"):r.log("ignoring "+n+" for "+d.map((function(e){return ie(e.systemId)})).join(",")+" pssh data in favor of playlist keys"));if(o=ie(f.systemId),0===f.version&&f.data)if(o===q.WIDEVINE){var g=f.data.length-22;s=f.data.subarray(g,g+16)}else o===q.PLAYREADY&&(s=le(f.data))}if(o&&s){for(var v,m=De.hexDump(s),p=r.keyIdToKeySessionPromise,y=r.mediaKeySessions,E=p[m],T=function(){var e=y[S],n=e.decryptdata;if(!n.keyId)return 0;var a=De.hexDump(n.keyId);return m===a||-1!==n.uri.replace(/-/g,"").indexOf(m)?(E=p[a],n.pssh||(delete p[a],n.pssh=new Uint8Array(i),n.keyId=s,(E=p[m]=E.then((function(){return r.generateRequestWithPreferredKeySession(e,t,i,"encrypted-event-key-match")}))).catch((function(e){return r.handleError(e)}))),1):void 0},S=0;S<y.length&&(0===(v=T())||1!==v);S++);if(!E){if(o!==l)return void r.log('Ignoring "'+n+'" with '+o+" init data for selected key-system "+l);E=p[m]=r.getKeySystemSelectionPromise([o]).then((function(e){var n,a=e.keySystem,o=e.mediaKeys;r.throwIfDestroyed();var l=new et("ISO-23001-7",m,null!=(n=ne(a))?n:"");return l.pssh=new Uint8Array(i),l.keyId=s,r.attemptSetMediaKeys(a,o).then((function(){r.throwIfDestroyed();var e=r.createMediaKeySessionContext({decryptdata:l,keySystem:a,mediaKeys:o});return r.generateRequestWithPreferredKeySession(e,t,i,"encrypted-event-no-match")}))})),E.catch((function(e){return r.handleError(e)}))}}else r.log("Unable to handle "+n+" with key-system "+l)}))}},this.onWaitingForKey=function(e){r.log('"'+e.type+'" event')},this.hls=t,this.config=t.config,this.registerListeners()}var t=e.prototype;return t.destroy=function(){this.unregisterListeners(),this.onMediaDetached();var e=this.config;e.requestMediaKeySystemAccessFunc=null,e.licenseXhrSetup=e.licenseResponseCallback=void 0,e.drmSystems=e.drmSystemOptions={},this.hls=this.config=this.keyIdToKeySessionPromise=null,this.onMediaEncrypted=this.onWaitingForKey=null},t.registerListeners=function(){this.hls.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),this.hls.on(S.MEDIA_DETACHED,this.onMediaDetached,this),this.hls.on(S.MANIFEST_LOADING,this.onManifestLoading,this),this.hls.on(S.MANIFEST_LOADED,this.onManifestLoaded,this)},t.unregisterListeners=function(){this.hls.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),this.hls.off(S.MEDIA_DETACHED,this.onMediaDetached,this),this.hls.off(S.MANIFEST_LOADING,this.onManifestLoading,this),this.hls.off(S.MANIFEST_LOADED,this.onManifestLoaded,this)},t.getLicenseServerUrl=function(e){var t=this.config,r=t.drmSystems,i=t.widevineLicenseUrl,n=r[e];return n?n.licenseUrl:e===q.WIDEVINE&&i?i:void 0},t.getLicenseServerUrlOrThrow=function(e){var t=this.getLicenseServerUrl(e);if(void 0===t)throw new Error('no license server URL configured for key-system "'+e+'"');return t},t.getServerCertificateUrl=function(e){var t=this.config.drmSystems[e];if(t)return t.serverCertificateUrl;this.log('No Server Certificate in config.drmSystems["'+e+'"]')},t.attemptKeySystemAccess=function(e){var t=this,r=this.hls.levels,i=function(e,t,r){return!!e&&r.indexOf(e)===t},n=r.map((function(e){return e.audioCodec})).filter(i),a=r.map((function(e){return e.videoCodec})).filter(i);return n.length+a.length===0&&a.push("avc1.42e01e"),new Promise((function(r,i){!function e(s){var o=s.shift();t.getMediaKeysPromise(o,n,a).then((function(e){return r({keySystem:o,mediaKeys:e})})).catch((function(t){s.length?e(s):i(t instanceof us?t:new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_NO_ACCESS,error:t,fatal:!0},t.message))}))}(e)}))},t.requestMediaKeySystemAccess=function(e,t){var r=this.config.requestMediaKeySystemAccessFunc;if("function"!=typeof r){var i="Configured requestMediaKeySystemAccess is not a function "+r;return null===oe&&"http:"===self.location.protocol&&(i="navigator.requestMediaKeySystemAccess is not available over insecure protocol "+location.protocol),Promise.reject(new Error(i))}return r(e,t)},t.getMediaKeysPromise=function(e,t,r){var i=this,n=function(e,t,r,i){var n;switch(e){case q.FAIRPLAY:n=["cenc","sinf"];break;case q.WIDEVINE:case q.PLAYREADY:n=["cenc"];break;case q.CLEARKEY:n=["cenc","keyids"];break;default:throw new Error("Unknown key-system: "+e)}return function(e,t,r,i){return[{initDataTypes:e,persistentState:i.persistentState||"optional",distinctiveIdentifier:i.distinctiveIdentifier||"optional",sessionTypes:i.sessionTypes||[i.sessionType||"temporary"],audioCapabilities:t.map((function(e){return{contentType:'audio/mp4; codecs="'+e+'"',robustness:i.audioRobustness||"",encryptionScheme:i.audioEncryptionScheme||null}})),videoCapabilities:r.map((function(e){return{contentType:'video/mp4; codecs="'+e+'"',robustness:i.videoRobustness||"",encryptionScheme:i.videoEncryptionScheme||null}}))}]}(n,t,r,i)}(e,t,r,this.config.drmSystemOptions),a=this.keySystemAccessPromises[e],s=null==a?void 0:a.keySystemAccess;if(!s){this.log('Requesting encrypted media "'+e+'" key-system access with config: '+JSON.stringify(n)),s=this.requestMediaKeySystemAccess(e,n);var o=this.keySystemAccessPromises[e]={keySystemAccess:s};return s.catch((function(t){i.log('Failed to obtain access to key-system "'+e+'": '+t)})),s.then((function(t){i.log('Access for key-system "'+t.keySystem+'" obtained');var r=i.fetchServerCertificate(e);return i.log('Create media-keys for "'+e+'"'),o.mediaKeys=t.createMediaKeys().then((function(t){return i.log('Media-keys created for "'+e+'"'),r.then((function(r){return r?i.setMediaKeysServerCertificate(t,e,r):t}))})),o.mediaKeys.catch((function(t){i.error('Failed to create media-keys for "'+e+'"}: '+t)})),o.mediaKeys}))}return s.then((function(){return a.mediaKeys}))},t.createMediaKeySessionContext=function(e){var t=e.decryptdata,r=e.keySystem,i=e.mediaKeys;this.log('Creating key-system session "'+r+'" keyId: '+De.hexDump(t.keyId||[]));var n=i.createSession(),a={decryptdata:t,keySystem:r,mediaKeys:i,mediaKeysSession:n,keyStatus:"status-pending"};return this.mediaKeySessions.push(a),a},t.renewKeySession=function(e){var t=e.decryptdata;if(t.pssh){var r=this.createMediaKeySessionContext(e),i=this.getKeyIdString(t);this.keyIdToKeySessionPromise[i]=this.generateRequestWithPreferredKeySession(r,"cenc",t.pssh,"expired")}else this.warn("Could not renew expired session. Missing pssh initData.");this.removeSession(e)},t.getKeyIdString=function(e){if(!e)throw new Error("Could not read keyId of undefined decryptdata");if(null===e.keyId)throw new Error("keyId is null");return De.hexDump(e.keyId)},t.updateKeySession=function(e,t){var r,i=e.mediaKeysSession;return this.log('Updating key-session "'+i.sessionId+'" for keyID '+De.hexDump((null==(r=e.decryptdata)?void 0:r.keyId)||[])+"\n      } (data length: "+(t?t.byteLength:t)+")"),i.update(t)},t.selectKeySystemFormat=function(e){var t=Object.keys(e.levelkeys||{});return this.keyFormatPromise||(this.log("Selecting key-system from fragment (sn: "+e.sn+" "+e.type+": "+e.level+") key formats "+t.join(", ")),this.keyFormatPromise=this.getKeyFormatPromise(t)),this.keyFormatPromise},t.getKeyFormatPromise=function(e){var t=this;return new Promise((function(r,i){var n=ae(t.config),a=e.map($).filter((function(e){return!!e&&-1!==n.indexOf(e)}));return t.getKeySystemSelectionPromise(a).then((function(e){var t=e.keySystem,n=ne(t);n?r(n):i(new Error('Unable to find format for key-system "'+t+'"'))})).catch(i)}))},t.loadKey=function(e){var t=this,r=e.keyInfo.decryptdata,i=this.getKeyIdString(r),n="(keyId: "+i+' format: "'+r.keyFormat+'" method: '+r.method+" uri: "+r.uri+")";this.log("Starting session for key "+n);var a=this.keyIdToKeySessionPromise[i];return a||(a=this.keyIdToKeySessionPromise[i]=this.getKeySystemForKeyPromise(r).then((function(i){var a=i.keySystem,s=i.mediaKeys;return t.throwIfDestroyed(),t.log("Handle encrypted media sn: "+e.frag.sn+" "+e.frag.type+": "+e.frag.level+" using key "+n),t.attemptSetMediaKeys(a,s).then((function(){t.throwIfDestroyed();var e=t.createMediaKeySessionContext({keySystem:a,mediaKeys:s,decryptdata:r});return t.generateRequestWithPreferredKeySession(e,"cenc",r.pssh,"playlist-key")}))}))).catch((function(e){return t.handleError(e)})),a},t.throwIfDestroyed=function(e){if(!this.hls)throw new Error("invalid state")},t.handleError=function(e){this.hls&&(this.error(e.message),e instanceof us?this.hls.trigger(S.ERROR,e.data):this.hls.trigger(S.ERROR,{type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_NO_KEYS,error:e,fatal:!0}))},t.getKeySystemForKeyPromise=function(e){var t=this.getKeyIdString(e),r=this.keyIdToKeySessionPromise[t];if(!r){var i=$(e.keyFormat),n=i?[i]:ae(this.config);return this.attemptKeySystemAccess(n)}return r},t.getKeySystemSelectionPromise=function(e){if(e.length||(e=ae(this.config)),0===e.length)throw new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_NO_CONFIGURED_LICENSE,fatal:!0},"Missing key-system license configuration options "+JSON.stringify({drmSystems:this.config.drmSystems}));return this.attemptKeySystemAccess(e)},t.attemptSetMediaKeys=function(e,t){var r=this,i=this.setMediaKeysQueue.slice();this.log('Setting media-keys for "'+e+'"');var n=Promise.all(i).then((function(){if(!r.media)throw new Error("Attempted to set mediaKeys without media element attached");return r.media.setMediaKeys(t)}));return this.setMediaKeysQueue.push(n),n.then((function(){r.log('Media-keys set for "'+e+'"'),i.push(n),r.setMediaKeysQueue=r.setMediaKeysQueue.filter((function(e){return-1===i.indexOf(e)}))}))},t.generateRequestWithPreferredKeySession=function(e,t,r,i){var n,a,s=this,o=null==(n=this.config.drmSystems)||null==(a=n[e.keySystem])?void 0:a.generateRequest;if(o)try{var l=o.call(this.hls,t,r,e);if(!l)throw new Error("Invalid response from configured generateRequest filter");t=l.initDataType,r=e.decryptdata.pssh=l.initData?new Uint8Array(l.initData):null}catch(e){var u;if(this.warn(e.message),null!=(u=this.hls)&&u.config.debug)throw e}if(null===r)return this.log('Skipping key-session request for "'+i+'" (no initData)'),Promise.resolve(e);var h=this.getKeyIdString(e.decryptdata);this.log('Generating key-session request for "'+i+'": '+h+" (init data type: "+t+" length: "+(r?r.byteLength:null)+")");var d=new Yn,c=e._onmessage=function(t){var r=e.mediaKeysSession;if(r){var i=t.messageType,n=t.message;s.log('"'+i+'" message event for session "'+r.sessionId+'" message size: '+n.byteLength),"license-request"===i||"license-renewal"===i?s.renewLicense(e,n).catch((function(e){s.handleError(e),d.emit("error",e)})):"license-release"===i?e.keySystem===q.FAIRPLAY&&(s.updateKeySession(e,W("acknowledged")),s.removeSession(e)):s.warn('unhandled media key message type "'+i+'"')}else d.emit("error",new Error("invalid state"))},f=e._onkeystatuseschange=function(t){if(e.mediaKeysSession){s.onKeyStatusChange(e);var r=e.keyStatus;d.emit("keyStatus",r),"expired"===r&&(s.warn(e.keySystem+" expired for key "+h),s.renewKeySession(e))}else d.emit("error",new Error("invalid state"))};e.mediaKeysSession.addEventListener("message",c),e.mediaKeysSession.addEventListener("keystatuseschange",f);var g=new Promise((function(e,t){d.on("error",t),d.on("keyStatus",(function(r){r.startsWith("usable")?e():"output-restricted"===r?t(new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED,fatal:!1},"HDCP level output restricted")):"internal-error"===r?t(new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_STATUS_INTERNAL_ERROR,fatal:!0},'key status changed to "'+r+'"')):"expired"===r?t(new Error("key expired while generating request")):s.warn('unhandled key status change "'+r+'"')}))}));return e.mediaKeysSession.generateRequest(t,r).then((function(){var t;s.log('Request generated for key-session "'+(null==(t=e.mediaKeysSession)?void 0:t.sessionId)+'" keyId: '+h)})).catch((function(e){throw new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_NO_SESSION,error:e,fatal:!1},"Error generating key-session request: "+e)})).then((function(){return g})).catch((function(t){throw d.removeAllListeners(),s.removeSession(e),t})).then((function(){return d.removeAllListeners(),e}))},t.onKeyStatusChange=function(e){var t=this;e.mediaKeysSession.keyStatuses.forEach((function(r,i){t.log('key status change "'+r+'" for keyStatuses keyId: '+De.hexDump("buffer"in i?new Uint8Array(i.buffer,i.byteOffset,i.byteLength):new Uint8Array(i))+" session keyId: "+De.hexDump(new Uint8Array(e.decryptdata.keyId||[]))+" uri: "+e.decryptdata.uri),e.keyStatus=r}))},t.fetchServerCertificate=function(e){var t=this.config,r=new(0,t.loader)(t),n=this.getServerCertificateUrl(e);return n?(this.log('Fetching server certificate for "'+e+'"'),new Promise((function(a,s){var o={responseType:"arraybuffer",url:n},l=t.certLoadPolicy.default,u={loadPolicy:l,timeout:l.maxLoadTimeMs,maxRetry:0,retryDelay:0,maxRetryDelay:0},h={onSuccess:function(e,t,r,i){a(e.data)},onError:function(t,r,a,l){s(new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED,fatal:!0,networkDetails:a,response:i({url:o.url,data:void 0},t)},'"'+e+'" certificate request failed ('+n+"). Status: "+t.code+" ("+t.text+")"))},onTimeout:function(t,r,i){s(new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED,fatal:!0,networkDetails:i,response:{url:o.url,data:void 0}},'"'+e+'" certificate request timed out ('+n+")"))},onAbort:function(e,t,r){s(new Error("aborted"))}};r.load(o,u,h)}))):Promise.resolve()},t.setMediaKeysServerCertificate=function(e,t,r){var i=this;return new Promise((function(n,a){e.setServerCertificate(r).then((function(a){i.log("setServerCertificate "+(a?"success":"not supported by CDM")+" ("+(null==r?void 0:r.byteLength)+') on "'+t+'"'),n(e)})).catch((function(e){a(new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED,error:e,fatal:!0},e.message))}))}))},t.renewLicense=function(e,t){var r=this;return this.requestLicense(e,new Uint8Array(t)).then((function(t){return r.updateKeySession(e,new Uint8Array(t)).catch((function(e){throw new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_SESSION_UPDATE_FAILED,error:e,fatal:!0},e.message)}))}))},t.unpackPlayReadyKeyMessage=function(e,t){var r=String.fromCharCode.apply(null,new Uint16Array(t.buffer));if(!r.includes("PlayReadyKeyMessage"))return e.setRequestHeader("Content-Type","text/xml; charset=utf-8"),t;var i=(new DOMParser).parseFromString(r,"application/xml"),n=i.querySelectorAll("HttpHeader");if(n.length>0)for(var a,s=0,o=n.length;s<o;s++){var l,u,h=null==(l=(a=n[s]).querySelector("name"))?void 0:l.textContent,d=null==(u=a.querySelector("value"))?void 0:u.textContent;h&&d&&e.setRequestHeader(h,d)}var c=i.querySelector("Challenge"),f=null==c?void 0:c.textContent;if(!f)throw new Error("Cannot find <Challenge> in key message");return W(atob(f))},t.setupLicenseXHR=function(e,t,r,i){var n=this,a=this.config.licenseXhrSetup;return a?Promise.resolve().then((function(){if(!r.decryptdata)throw new Error("Key removed");return a.call(n.hls,e,t,r,i)})).catch((function(s){if(!r.decryptdata)throw s;return e.open("POST",t,!0),a.call(n.hls,e,t,r,i)})).then((function(r){return e.readyState||e.open("POST",t,!0),{xhr:e,licenseChallenge:r||i}})):(e.open("POST",t,!0),Promise.resolve({xhr:e,licenseChallenge:i}))},t.requestLicense=function(e,t){var r=this,i=this.config.keyLoadPolicy.default;return new Promise((function(n,a){var s=r.getLicenseServerUrlOrThrow(e.keySystem);r.log("Sending license request to URL: "+s);var o=new XMLHttpRequest;o.responseType="arraybuffer",o.onreadystatechange=function(){if(!r.hls||!e.mediaKeysSession)return a(new Error("invalid state"));if(4===o.readyState)if(200===o.status){r._requestLicenseFailureCount=0;var l=o.response;r.log("License received "+(l instanceof ArrayBuffer?l.byteLength:l));var u=r.config.licenseResponseCallback;if(u)try{l=u.call(r.hls,o,s,e)}catch(e){r.error(e)}n(l)}else{var h=i.errorRetry,d=h?h.maxNumRetry:0;if(r._requestLicenseFailureCount++,r._requestLicenseFailureCount>d||o.status>=400&&o.status<500)a(new us({type:L.KEY_SYSTEM_ERROR,details:A.KEY_SYSTEM_LICENSE_REQUEST_FAILED,fatal:!0,networkDetails:o,response:{url:s,data:void 0,code:o.status,text:o.statusText}},"License Request XHR failed ("+s+"). Status: "+o.status+" ("+o.statusText+")"));else{var c=d-r._requestLicenseFailureCount+1;r.warn("Retrying license request, "+c+" attempts left"),r.requestLicense(e,t).then(n,a)}}},e.licenseXhr&&e.licenseXhr.readyState!==XMLHttpRequest.DONE&&e.licenseXhr.abort(),e.licenseXhr=o,r.setupLicenseXHR(o,s,e,t).then((function(t){var i=t.xhr,n=t.licenseChallenge;e.keySystem==q.PLAYREADY&&(n=r.unpackPlayReadyKeyMessage(i,n)),i.send(n)}))}))},t.onMediaAttached=function(e,t){if(this.config.emeEnabled){var r=t.media;this.media=r,r.removeEventListener("encrypted",this.onMediaEncrypted),r.removeEventListener("waitingforkey",this.onWaitingForKey),r.addEventListener("encrypted",this.onMediaEncrypted),r.addEventListener("waitingforkey",this.onWaitingForKey)}},t.onMediaDetached=function(){var t=this,r=this.media,i=this.mediaKeySessions;r&&(r.removeEventListener("encrypted",this.onMediaEncrypted),r.removeEventListener("waitingforkey",this.onWaitingForKey),this.media=null),this._requestLicenseFailureCount=0,this.setMediaKeysQueue=[],this.mediaKeySessions=[],this.keyIdToKeySessionPromise={},et.clearKeyUriToKeyIdMap();var n=i.length;e.CDMCleanupPromise=Promise.all(i.map((function(e){return t.removeSession(e)})).concat(null==r?void 0:r.setMediaKeys(null).catch((function(e){t.log("Could not clear media keys: "+e)})))).then((function(){n&&(t.log("finished closing key sessions and clearing media keys"),i.length=0)})).catch((function(e){t.log("Could not close sessions and clear media keys: "+e)}))},t.onManifestLoading=function(){this.keyFormatPromise=null},t.onManifestLoaded=function(e,t){var r=t.sessionKeys;if(r&&this.config.emeEnabled&&!this.keyFormatPromise){var i=r.reduce((function(e,t){return-1===e.indexOf(t.keyFormat)&&e.push(t.keyFormat),e}),[]);this.log("Selecting key-system from session-keys "+i.join(", ")),this.keyFormatPromise=this.getKeyFormatPromise(i)}},t.removeSession=function(e){var t=this,r=e.mediaKeysSession,i=e.licenseXhr;if(r){this.log("Remove licenses and keys and close session "+r.sessionId),e._onmessage&&(r.removeEventListener("message",e._onmessage),e._onmessage=void 0),e._onkeystatuseschange&&(r.removeEventListener("keystatuseschange",e._onkeystatuseschange),e._onkeystatuseschange=void 0),i&&i.readyState!==XMLHttpRequest.DONE&&i.abort(),e.mediaKeysSession=e.decryptdata=e.licenseXhr=void 0;var n=this.mediaKeySessions.indexOf(e);return n>-1&&this.mediaKeySessions.splice(n,1),r.remove().catch((function(e){t.log("Could not remove session: "+e)})).then((function(){return r.close()})).catch((function(e){t.log("Could not close session: "+e)}))}},e}();ns.CDMCleanupPromise=void 0;var as,ss,os,ls,us=function(e){function t(t,r){var i;return(i=e.call(this,r)||this).data=void 0,t.error||(t.error=new Error(r)),i.data=t,t.err=t.error,i}return l(t,e),t}(c(Error));!function(e){e.MANIFEST="m",e.AUDIO="a",e.VIDEO="v",e.MUXED="av",e.INIT="i",e.CAPTION="c",e.TIMED_TEXT="tt",e.KEY="k",e.OTHER="o"}(as||(as={})),function(e){e.DASH="d",e.HLS="h",e.SMOOTH="s",e.OTHER="o"}(ss||(ss={})),function(e){e.OBJECT="CMCD-Object",e.REQUEST="CMCD-Request",e.SESSION="CMCD-Session",e.STATUS="CMCD-Status"}(os||(os={}));var hs=((ls={})[os.OBJECT]=["br","d","ot","tb"],ls[os.REQUEST]=["bl","dl","mtp","nor","nrr","su"],ls[os.SESSION]=["cid","pr","sf","sid","st","v"],ls[os.STATUS]=["bs","rtp"],ls),ds=function e(t,r){this.value=void 0,this.params=void 0,Array.isArray(t)&&(t=t.map((function(t){return t instanceof e?t:new e(t)}))),this.value=t,this.params=r},cs=function(e){this.description=void 0,this.description=e},fs="Dict";function gs(e,t,r,i){return new Error("failed to "+e+' "'+(n=t,(Array.isArray(n)?JSON.stringify(n):n instanceof Map?"Map{}":n instanceof Set?"Set{}":"object"==typeof n?JSON.stringify(n):String(n))+'" as ')+r,{cause:i});var n}var vs="Bare Item",ms="Boolean",ps="Byte Sequence",ys="Decimal",Es="Integer",Ts=/[\x00-\x1f\x7f]+/,Ss="Token",Ls="Key";function As(e,t,r){return gs("serialize",e,t,r)}function Rs(e){if(!1===ArrayBuffer.isView(e))throw As(e,ps);return":"+(t=e,btoa(String.fromCharCode.apply(String,t))+":");var t}function ks(e){if(function(e){return e<-999999999999999||999999999999999<e}(e))throw As(e,Es);return e.toString()}function bs(e,t){if(e<0)return-bs(-e,t);var r=Math.pow(10,t);if(Math.abs(e*r%1-.5)<Number.EPSILON){var i=Math.floor(e*r);return(i%2==0?i:i+1)/r}return Math.round(e*r)/r}function Ds(e){var t=bs(e,3);if(Math.floor(Math.abs(t)).toString().length>12)throw As(e,ys);var r=t.toString();return r.includes(".")?r:r+".0"}var Is="String";function ws(e){var t,r=(t=e).description||t.toString().slice(7,-1);if(!1===/^([a-zA-Z*])([!#$%&'*+\-.^_`|~\w:/]*)$/.test(r))throw As(r,Ss);return r}function Cs(e){switch(typeof e){case"number":if(!y(e))throw As(e,vs);return Number.isInteger(e)?ks(e):Ds(e);case"string":return function(e){if(Ts.test(e))throw As(e,Is);return'"'+e.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"'}(e);case"symbol":return ws(e);case"boolean":return function(e){if("boolean"!=typeof e)throw As(e,ms);return e?"?1":"?0"}(e);case"object":if(e instanceof Date)return function(e){return"@"+ks(e.getTime()/1e3)}(e);if(e instanceof Uint8Array)return Rs(e);if(e instanceof cs)return ws(e);default:throw As(e,vs)}}function _s(e){if(!1===/^[a-z*][a-z0-9\-_.*]*$/.test(e))throw As(e,Ls);return e}function xs(e){return null==e?"":Object.entries(e).map((function(e){var t=e[0],r=e[1];return!0===r?";"+_s(t):";"+_s(t)+"="+Cs(r)})).join("")}function Ps(e){return e instanceof ds?""+Cs(e.value)+xs(e.params):Cs(e)}function Fs(e,t){var r;if(void 0===t&&(t={whitespace:!0}),"object"!=typeof e)throw As(e,fs);var i=e instanceof Map?e.entries():Object.entries(e),n=null!=(r=t)&&r.whitespace?" ":"";return Array.from(i).map((function(e){var t=e[0],r=e[1];r instanceof ds==0&&(r=new ds(r));var i,n=_s(t);return!0===r.value?n+=xs(r.params):(n+="=",Array.isArray(r.value)?n+="("+(i=r).value.map(Ps).join(" ")+")"+xs(i.params):n+=Ps(r)),n})).join(","+n)}var Ms=function(e){return"ot"===e||"sf"===e||"st"===e},Os=function(e){return"number"==typeof e?y(e):null!=e&&""!==e&&!1!==e},Ns=function(e){return Math.round(e)},Us=function(e){return 100*Ns(e/100)},Bs={br:Ns,d:Ns,bl:Us,dl:Us,mtp:Us,nor:function(e,t){return null!=t&&t.baseUrl&&(e=function(e,t){var r=new URL(e),i=new URL(t);if(r.origin!==i.origin)return e;for(var n=r.pathname.split("/").slice(1),a=i.pathname.split("/").slice(1,-1);n[0]===a[0];)n.shift(),a.shift();for(;a.length;)a.shift(),n.unshift("..");return n.join("/")}(e,t.baseUrl)),encodeURIComponent(e)},rtp:Us,tb:Ns};function Gs(e,t){return void 0===t&&(t={}),e?function(e,t){return Fs(e,t)}(function(e,t){var r={};if(null==e||"object"!=typeof e)return r;var i=Object.keys(e).sort(),n=o({},Bs,null==t?void 0:t.formatters),a=null==t?void 0:t.filter;return i.forEach((function(i){if(null==a||!a(i)){var s=e[i],o=n[i];o&&(s=o(s,t)),"v"===i&&1===s||"pr"==i&&1===s||Os(s)&&(Ms(i)&&"string"==typeof s&&(s=new cs(s)),r[i]=s)}})),r}(e,t),o({whitespace:!1},t)):""}function Ks(e,t,r){return o(e,function(e,t){var r;if(void 0===t&&(t={}),!e)return{};var i=Object.entries(e),n=Object.entries(hs).concat(Object.entries((null==(r=t)?void 0:r.customHeaderMap)||{})),a=i.reduce((function(e,t){var r,i=t[0],a=t[1],s=(null==(r=n.find((function(e){return e[1].includes(i)})))?void 0:r[0])||os.REQUEST;return null!=e[s]||(e[s]={}),e[s][i]=a,e}),{});return Object.entries(a).reduce((function(e,r){var i=r[0],n=r[1];return e[i]=Gs(n,t),e}),{})}(t,r))}var Hs="CMCD",Vs=/CMCD=[^&#]+/;function Ys(e,t,r){var i=function(e,t){if(void 0===t&&(t={}),!e)return"";var r=Gs(e,t);return Hs+"="+encodeURIComponent(r)}(t,r);if(!i)return e;if(Vs.test(e))return e.replace(Vs,i);var n=e.includes("?")?"&":"?";return""+e+n+i}var Ws=function(){function e(e){var t=this;this.hls=void 0,this.config=void 0,this.media=void 0,this.sid=void 0,this.cid=void 0,this.useHeaders=!1,this.includeKeys=void 0,this.initialized=!1,this.starved=!1,this.buffering=!0,this.audioBuffer=void 0,this.videoBuffer=void 0,this.onWaiting=function(){t.initialized&&(t.starved=!0),t.buffering=!0},this.onPlaying=function(){t.initialized||(t.initialized=!0),t.buffering=!1},this.applyPlaylistData=function(e){try{t.apply(e,{ot:as.MANIFEST,su:!t.initialized})}catch(e){w.warn("Could not generate manifest CMCD data.",e)}},this.applyFragmentData=function(e){try{var r=e.frag,i=t.hls.levels[r.level],n=t.getObjectType(r),a={d:1e3*r.duration,ot:n};n!==as.VIDEO&&n!==as.AUDIO&&n!=as.MUXED||(a.br=i.bitrate/1e3,a.tb=t.getTopBandwidth(n)/1e3,a.bl=t.getBufferLength(n)),t.apply(e,a)}catch(e){w.warn("Could not generate segment CMCD data.",e)}},this.hls=e;var r=this.config=e.config,i=r.cmcd;null!=i&&(r.pLoader=this.createPlaylistLoader(),r.fLoader=this.createFragmentLoader(),this.sid=i.sessionId||function(){try{return crypto.randomUUID()}catch(i){try{var e=URL.createObjectURL(new Blob),t=e.toString();return URL.revokeObjectURL(e),t.slice(t.lastIndexOf("/")+1)}catch(e){var r=(new Date).getTime();return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(function(e){var t=(r+16*Math.random())%16|0;return r=Math.floor(r/16),("x"==e?t:3&t|8).toString(16)}))}}}(),this.cid=i.contentId,this.useHeaders=!0===i.useHeaders,this.includeKeys=i.includeKeys,this.registerListeners())}var t=e.prototype;return t.registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.on(S.MEDIA_DETACHED,this.onMediaDetached,this),e.on(S.BUFFER_CREATED,this.onBufferCreated,this)},t.unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.off(S.MEDIA_DETACHED,this.onMediaDetached,this),e.off(S.BUFFER_CREATED,this.onBufferCreated,this)},t.destroy=function(){this.unregisterListeners(),this.onMediaDetached(),this.hls=this.config=this.audioBuffer=this.videoBuffer=null,this.onWaiting=this.onPlaying=null},t.onMediaAttached=function(e,t){this.media=t.media,this.media.addEventListener("waiting",this.onWaiting),this.media.addEventListener("playing",this.onPlaying)},t.onMediaDetached=function(){this.media&&(this.media.removeEventListener("waiting",this.onWaiting),this.media.removeEventListener("playing",this.onPlaying),this.media=null)},t.onBufferCreated=function(e,t){var r,i;this.audioBuffer=null==(r=t.tracks.audio)?void 0:r.buffer,this.videoBuffer=null==(i=t.tracks.video)?void 0:i.buffer},t.createData=function(){var e;return{v:1,sf:ss.HLS,sid:this.sid,cid:this.cid,pr:null==(e=this.media)?void 0:e.playbackRate,mtp:this.hls.bandwidthEstimate/1e3}},t.apply=function(e,t){void 0===t&&(t={}),o(t,this.createData());var r=t.ot===as.INIT||t.ot===as.VIDEO||t.ot===as.MUXED;this.starved&&r&&(t.bs=!0,t.su=!0,this.starved=!1),null==t.su&&(t.su=this.buffering);var i=this.includeKeys;i&&(t=Object.keys(t).reduce((function(e,r){return i.includes(r)&&(e[r]=t[r]),e}),{})),this.useHeaders?(e.headers||(e.headers={}),Ks(e.headers,t)):e.url=Ys(e.url,t)},t.getObjectType=function(e){var t=e.type;return"subtitle"===t?as.TIMED_TEXT:"initSegment"===e.sn?as.INIT:"audio"===t?as.AUDIO:"main"===t?this.hls.audioTracks.length?as.VIDEO:as.MUXED:void 0},t.getTopBandwidth=function(e){var t,r=0,i=this.hls;if(e===as.AUDIO)t=i.audioTracks;else{var n=i.maxAutoLevel,a=n>-1?n+1:i.levels.length;t=i.levels.slice(0,a)}for(var s,o=g(t);!(s=o()).done;){var l=s.value;l.bitrate>r&&(r=l.bitrate)}return r>0?r:NaN},t.getBufferLength=function(e){var t=this.hls.media,r=e===as.AUDIO?this.audioBuffer:this.videoBuffer;return r&&t?1e3*ii.bufferInfo(r,t.currentTime,this.config.maxBufferHole).len:NaN},t.createPlaylistLoader=function(){var e=this.config.pLoader,t=this.applyPlaylistData,r=e||this.config.loader;return function(){function e(e){this.loader=void 0,this.loader=new r(e)}var i=e.prototype;return i.destroy=function(){this.loader.destroy()},i.abort=function(){this.loader.abort()},i.load=function(e,r,i){t(e),this.loader.load(e,r,i)},s(e,[{key:"stats",get:function(){return this.loader.stats}},{key:"context",get:function(){return this.loader.context}}]),e}()},t.createFragmentLoader=function(){var e=this.config.fLoader,t=this.applyFragmentData,r=e||this.config.loader;return function(){function e(e){this.loader=void 0,this.loader=new r(e)}var i=e.prototype;return i.destroy=function(){this.loader.destroy()},i.abort=function(){this.loader.abort()},i.load=function(e,r,i){t(e),this.loader.load(e,r,i)},s(e,[{key:"stats",get:function(){return this.loader.stats}},{key:"context",get:function(){return this.loader.context}}]),e}()},e}(),js=function(){function e(e){this.hls=void 0,this.log=void 0,this.loader=null,this.uri=null,this.pathwayId=".",this.pathwayPriority=null,this.timeToLoad=300,this.reloadTimer=-1,this.updated=0,this.started=!1,this.enabled=!0,this.levels=null,this.audioTracks=null,this.subtitleTracks=null,this.penalizedPathways={},this.hls=e,this.log=w.log.bind(w,"[content-steering]:"),this.registerListeners()}var t=e.prototype;return t.registerListeners=function(){var e=this.hls;e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_LOADED,this.onManifestLoaded,this),e.on(S.MANIFEST_PARSED,this.onManifestParsed,this),e.on(S.ERROR,this.onError,this)},t.unregisterListeners=function(){var e=this.hls;e&&(e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_LOADED,this.onManifestLoaded,this),e.off(S.MANIFEST_PARSED,this.onManifestParsed,this),e.off(S.ERROR,this.onError,this))},t.startLoad=function(){if(this.started=!0,this.clearTimeout(),this.enabled&&this.uri){if(this.updated){var e=1e3*this.timeToLoad-(performance.now()-this.updated);if(e>0)return void this.scheduleRefresh(this.uri,e)}this.loadSteeringManifest(this.uri)}},t.stopLoad=function(){this.started=!1,this.loader&&(this.loader.destroy(),this.loader=null),this.clearTimeout()},t.clearTimeout=function(){-1!==this.reloadTimer&&(self.clearTimeout(this.reloadTimer),this.reloadTimer=-1)},t.destroy=function(){this.unregisterListeners(),this.stopLoad(),this.hls=null,this.levels=this.audioTracks=this.subtitleTracks=null},t.removeLevel=function(e){var t=this.levels;t&&(this.levels=t.filter((function(t){return t!==e})))},t.onManifestLoading=function(){this.stopLoad(),this.enabled=!0,this.timeToLoad=300,this.updated=0,this.uri=null,this.pathwayId=".",this.levels=this.audioTracks=this.subtitleTracks=null},t.onManifestLoaded=function(e,t){var r=t.contentSteering;null!==r&&(this.pathwayId=r.pathwayId,this.uri=r.uri,this.started&&this.startLoad())},t.onManifestParsed=function(e,t){this.audioTracks=t.audioTracks,this.subtitleTracks=t.subtitleTracks},t.onError=function(e,t){var r=t.errorAction;if((null==r?void 0:r.action)===Ir&&r.flags===xr){var i=this.levels,n=this.pathwayPriority,a=this.pathwayId;if(t.context){var s=t.context,o=s.groupId,l=s.pathwayId,u=s.type;o&&i?a=this.getPathwayForGroupId(o,u,a):l&&(a=l)}a in this.penalizedPathways||(this.penalizedPathways[a]=performance.now()),!n&&i&&(n=i.reduce((function(e,t){return-1===e.indexOf(t.pathwayId)&&e.push(t.pathwayId),e}),[])),n&&n.length>1&&(this.updatePathwayPriority(n),r.resolved=this.pathwayId!==a),r.resolved||w.warn("Could not resolve "+t.details+' ("'+t.error.message+'") with content-steering for Pathway: '+a+" levels: "+(i?i.length:i)+" priorities: "+JSON.stringify(n)+" penalized: "+JSON.stringify(this.penalizedPathways))}},t.filterParsedLevels=function(e){this.levels=e;var t=this.getLevelsForPathway(this.pathwayId);if(0===t.length){var r=e[0].pathwayId;this.log("No levels found in Pathway "+this.pathwayId+'. Setting initial Pathway to "'+r+'"'),t=this.getLevelsForPathway(r),this.pathwayId=r}return t.length!==e.length&&this.log("Found "+t.length+"/"+e.length+' levels in Pathway "'+this.pathwayId+'"'),t},t.getLevelsForPathway=function(e){return null===this.levels?[]:this.levels.filter((function(t){return e===t.pathwayId}))},t.updatePathwayPriority=function(e){var t;this.pathwayPriority=e;var r=this.penalizedPathways,i=performance.now();Object.keys(r).forEach((function(e){i-r[e]>3e5&&delete r[e]}));for(var n=0;n<e.length;n++){var a=e[n];if(!(a in r)){if(a===this.pathwayId)return;var s=this.hls.nextLoadLevel,o=this.hls.levels[s];if((t=this.getLevelsForPathway(a)).length>0){this.log('Setting Pathway to "'+a+'"'),this.pathwayId=a,pr(t),this.hls.trigger(S.LEVELS_UPDATED,{levels:t});var l=this.hls.levels[s];o&&l&&this.levels&&(l.attrs["STABLE-VARIANT-ID"]!==o.attrs["STABLE-VARIANT-ID"]&&l.bitrate!==o.bitrate&&this.log("Unstable Pathways change from bitrate "+o.bitrate+" to "+l.bitrate),this.hls.nextLoadLevel=s);break}}}},t.getPathwayForGroupId=function(e,t,r){for(var i=this.getLevelsForPathway(r).concat(this.levels||[]),n=0;n<i.length;n++)if(t===Pt&&i[n].hasAudioGroup(e)||t===Ft&&i[n].hasSubtitleGroup(e))return i[n].pathwayId;return r},t.clonePathways=function(e){var t=this,r=this.levels;if(r){var i={},n={};e.forEach((function(e){var a=e.ID,s=e["BASE-ID"],o=e["URI-REPLACEMENT"];if(!r.some((function(e){return e.pathwayId===a}))){var l=t.getLevelsForPathway(s).map((function(e){var t=new x(e.attrs);t["PATHWAY-ID"]=a;var r=t.AUDIO&&t.AUDIO+"_clone_"+a,s=t.SUBTITLES&&t.SUBTITLES+"_clone_"+a;r&&(i[t.AUDIO]=r,t.AUDIO=r),s&&(n[t.SUBTITLES]=s,t.SUBTITLES=s);var l=Xs(e.uri,t["STABLE-VARIANT-ID"],"PER-VARIANT-URIS",o),u=new lr({attrs:t,audioCodec:e.audioCodec,bitrate:e.bitrate,height:e.height,name:e.name,url:l,videoCodec:e.videoCodec,width:e.width});if(e.audioGroups)for(var h=1;h<e.audioGroups.length;h++)u.addGroupId("audio",e.audioGroups[h]+"_clone_"+a);if(e.subtitleGroups)for(var d=1;d<e.subtitleGroups.length;d++)u.addGroupId("text",e.subtitleGroups[d]+"_clone_"+a);return u}));r.push.apply(r,l),qs(t.audioTracks,i,o,a),qs(t.subtitleTracks,n,o,a)}}))}},t.loadSteeringManifest=function(e){var t,r=this,i=this.hls.config,n=i.loader;this.loader&&this.loader.destroy(),this.loader=new n(i);try{t=new self.URL(e)}catch(t){return this.enabled=!1,void this.log("Failed to parse Steering Manifest URI: "+e)}if("data:"!==t.protocol){var a=0|(this.hls.bandwidthEstimate||i.abrEwmaDefaultEstimate);t.searchParams.set("_HLS_pathway",this.pathwayId),t.searchParams.set("_HLS_throughput",""+a)}var s={responseType:"json",url:t.href},o=i.steeringManifestLoadPolicy.default,l=o.errorRetry||o.timeoutRetry||{},u={loadPolicy:o,timeout:o.maxLoadTimeMs,maxRetry:l.maxNumRetry||0,retryDelay:l.retryDelayMs||0,maxRetryDelay:l.maxRetryDelayMs||0},h={onSuccess:function(e,i,n,a){r.log('Loaded steering manifest: "'+t+'"');var s=e.data;if(1===s.VERSION){r.updated=performance.now(),r.timeToLoad=s.TTL;var o=s["RELOAD-URI"],l=s["PATHWAY-CLONES"],u=s["PATHWAY-PRIORITY"];if(o)try{r.uri=new self.URL(o,t).href}catch(e){return r.enabled=!1,void r.log("Failed to parse Steering Manifest RELOAD-URI: "+o)}r.scheduleRefresh(r.uri||n.url),l&&r.clonePathways(l);var h={steeringManifest:s,url:t.toString()};r.hls.trigger(S.STEERING_MANIFEST_LOADED,h),u&&r.updatePathwayPriority(u)}else r.log("Steering VERSION "+s.VERSION+" not supported!")},onError:function(e,t,i,n){if(r.log("Error loading steering manifest: "+e.code+" "+e.text+" ("+t.url+")"),r.stopLoad(),410===e.code)return r.enabled=!1,void r.log("Steering manifest "+t.url+" no longer available");var a=1e3*r.timeToLoad;if(429!==e.code)r.scheduleRefresh(r.uri||t.url,a);else{var s=r.loader;if("function"==typeof(null==s?void 0:s.getResponseHeader)){var o=s.getResponseHeader("Retry-After");o&&(a=1e3*parseFloat(o))}r.log("Steering manifest "+t.url+" rate limited")}},onTimeout:function(e,t,i){r.log("Timeout loading steering manifest ("+t.url+")"),r.scheduleRefresh(r.uri||t.url)}};this.log("Requesting steering manifest: "+t),this.loader.load(s,u,h)},t.scheduleRefresh=function(e,t){var r=this;void 0===t&&(t=1e3*this.timeToLoad),this.clearTimeout(),this.reloadTimer=self.setTimeout((function(){var t,i=null==(t=r.hls)?void 0:t.media;!i||i.ended?r.scheduleRefresh(e,1e3*r.timeToLoad):r.loadSteeringManifest(e)}),t)},e}();function qs(e,t,r,i){e&&Object.keys(t).forEach((function(n){var a=e.filter((function(e){return e.groupId===n})).map((function(e){var a=o({},e);return a.details=void 0,a.attrs=new x(a.attrs),a.url=a.attrs.URI=Xs(e.url,e.attrs["STABLE-RENDITION-ID"],"PER-RENDITION-URIS",r),a.groupId=a.attrs["GROUP-ID"]=t[n],a.attrs["PATHWAY-ID"]=i,a}));e.push.apply(e,a)}))}function Xs(e,t,r,i){var n,a=i.HOST,s=i.PARAMS,o=i[r];t&&(n=null==o?void 0:o[t])&&(e=n);var l=new self.URL(e);return a&&!n&&(l.host=a),s&&Object.keys(s).sort().forEach((function(e){e&&l.searchParams.set(e,s[e])})),l.href}var zs=/^age:\s*[\d.]+\s*$/im,Qs=function(){function e(e){this.xhrSetup=void 0,this.requestTimeout=void 0,this.retryTimeout=void 0,this.retryDelay=void 0,this.config=null,this.callbacks=null,this.context=null,this.loader=null,this.stats=void 0,this.xhrSetup=e&&e.xhrSetup||null,this.stats=new M,this.retryDelay=0}var t=e.prototype;return t.destroy=function(){this.callbacks=null,this.abortInternal(),this.loader=null,this.config=null,this.context=null,this.xhrSetup=null},t.abortInternal=function(){var e=this.loader;self.clearTimeout(this.requestTimeout),self.clearTimeout(this.retryTimeout),e&&(e.onreadystatechange=null,e.onprogress=null,4!==e.readyState&&(this.stats.aborted=!0,e.abort()))},t.abort=function(){var e;this.abortInternal(),null!=(e=this.callbacks)&&e.onAbort&&this.callbacks.onAbort(this.stats,this.context,this.loader)},t.load=function(e,t,r){if(this.stats.loading.start)throw new Error("Loader can only be used once.");this.stats.loading.start=self.performance.now(),this.context=e,this.config=t,this.callbacks=r,this.loadInternal()},t.loadInternal=function(){var e=this,t=this.config,r=this.context;if(t&&r){var i=this.loader=new self.XMLHttpRequest,n=this.stats;n.loading.first=0,n.loaded=0,n.aborted=!1;var a=this.xhrSetup;a?Promise.resolve().then((function(){if(e.loader===i&&!e.stats.aborted)return a(i,r.url)})).catch((function(t){if(e.loader===i&&!e.stats.aborted)return i.open("GET",r.url,!0),a(i,r.url)})).then((function(){e.loader!==i||e.stats.aborted||e.openAndSendXhr(i,r,t)})).catch((function(t){e.callbacks.onError({code:i.status,text:t.message},r,i,n)})):this.openAndSendXhr(i,r,t)}},t.openAndSendXhr=function(e,t,r){e.readyState||e.open("GET",t.url,!0);var i=t.headers,n=r.loadPolicy,a=n.maxTimeToFirstByteMs,s=n.maxLoadTimeMs;if(i)for(var o in i)e.setRequestHeader(o,i[o]);t.rangeEnd&&e.setRequestHeader("Range","bytes="+t.rangeStart+"-"+(t.rangeEnd-1)),e.onreadystatechange=this.readystatechange.bind(this),e.onprogress=this.loadprogress.bind(this),e.responseType=t.responseType,self.clearTimeout(this.requestTimeout),r.timeout=a&&y(a)?a:s,this.requestTimeout=self.setTimeout(this.loadtimeout.bind(this),r.timeout),e.send()},t.readystatechange=function(){var e=this.context,t=this.loader,r=this.stats;if(e&&t){var i=t.readyState,n=this.config;if(!r.aborted&&i>=2&&(0===r.loading.first&&(r.loading.first=Math.max(self.performance.now(),r.loading.start),n.timeout!==n.loadPolicy.maxLoadTimeMs&&(self.clearTimeout(this.requestTimeout),n.timeout=n.loadPolicy.maxLoadTimeMs,this.requestTimeout=self.setTimeout(this.loadtimeout.bind(this),n.loadPolicy.maxLoadTimeMs-(r.loading.first-r.loading.start)))),4===i)){self.clearTimeout(this.requestTimeout),t.onreadystatechange=null,t.onprogress=null;var a=t.status,s="text"===t.responseType?t.responseText:null;if(a>=200&&a<300){var o=null!=s?s:t.response;if(null!=o){r.loading.end=Math.max(self.performance.now(),r.loading.first);var l="arraybuffer"===t.responseType?o.byteLength:o.length;if(r.loaded=r.total=l,r.bwEstimate=8e3*r.total/(r.loading.end-r.loading.first),!this.callbacks)return;var u=this.callbacks.onProgress;if(u&&u(r,e,o,t),!this.callbacks)return;var h={url:t.responseURL,data:o,code:a};return void this.callbacks.onSuccess(h,r,e,t)}}var d=n.loadPolicy.errorRetry;Lr(d,r.retry,!1,{url:e.url,data:void 0,code:a})?this.retry(d):(w.error(a+" while loading "+e.url),this.callbacks.onError({code:a,text:t.statusText},e,t,r))}}},t.loadtimeout=function(){if(this.config){var e=this.config.loadPolicy.timeoutRetry;if(Lr(e,this.stats.retry,!0))this.retry(e);else{var t;w.warn("timeout while loading "+(null==(t=this.context)?void 0:t.url));var r=this.callbacks;r&&(this.abortInternal(),r.onTimeout(this.stats,this.context,this.loader))}}},t.retry=function(e){var t=this.context,r=this.stats;this.retryDelay=Tr(e,r.retry),r.retry++,w.warn((status?"HTTP Status "+status:"Timeout")+" while loading "+(null==t?void 0:t.url)+", retrying "+r.retry+"/"+e.maxNumRetry+" in "+this.retryDelay+"ms"),this.abortInternal(),this.loader=null,self.clearTimeout(this.retryTimeout),this.retryTimeout=self.setTimeout(this.loadInternal.bind(this),this.retryDelay)},t.loadprogress=function(e){var t=this.stats;t.loaded=e.loaded,e.lengthComputable&&(t.total=e.total)},t.getCacheAge=function(){var e=null;if(this.loader&&zs.test(this.loader.getAllResponseHeaders())){var t=this.loader.getResponseHeader("age");e=t?parseFloat(t):null}return e},t.getResponseHeader=function(e){return this.loader&&new RegExp("^"+e+":\\s*[\\d.]+\\s*$","im").test(this.loader.getAllResponseHeaders())?this.loader.getResponseHeader(e):null},e}(),Js=/(\d+)-(\d+)\/(\d+)/,$s=function(){function e(e){this.fetchSetup=void 0,this.requestTimeout=void 0,this.request=null,this.response=null,this.controller=void 0,this.context=null,this.config=null,this.callbacks=null,this.stats=void 0,this.loader=null,this.fetchSetup=e.fetchSetup||Zs,this.controller=new self.AbortController,this.stats=new M}var t=e.prototype;return t.destroy=function(){this.loader=this.callbacks=this.context=this.config=this.request=null,this.abortInternal(),this.response=null,this.fetchSetup=this.controller=this.stats=null},t.abortInternal=function(){this.controller&&!this.stats.loading.end&&(this.stats.aborted=!0,this.controller.abort())},t.abort=function(){var e;this.abortInternal(),null!=(e=this.callbacks)&&e.onAbort&&this.callbacks.onAbort(this.stats,this.context,this.response)},t.load=function(e,t,r){var i=this,n=this.stats;if(n.loading.start)throw new Error("Loader can only be used once.");n.loading.start=self.performance.now();var a=function(e,t){var r={method:"GET",mode:"cors",credentials:"same-origin",signal:t,headers:new self.Headers(o({},e.headers))};return e.rangeEnd&&r.headers.set("Range","bytes="+e.rangeStart+"-"+String(e.rangeEnd-1)),r}(e,this.controller.signal),s=r.onProgress,l="arraybuffer"===e.responseType,u=l?"byteLength":"length",h=t.loadPolicy,d=h.maxTimeToFirstByteMs,c=h.maxLoadTimeMs;this.context=e,this.config=t,this.callbacks=r,this.request=this.fetchSetup(e,a),self.clearTimeout(this.requestTimeout),t.timeout=d&&y(d)?d:c,this.requestTimeout=self.setTimeout((function(){i.abortInternal(),r.onTimeout(n,e,i.response)}),t.timeout),self.fetch(this.request).then((function(a){i.response=i.loader=a;var o=Math.max(self.performance.now(),n.loading.start);if(self.clearTimeout(i.requestTimeout),t.timeout=c,i.requestTimeout=self.setTimeout((function(){i.abortInternal(),r.onTimeout(n,e,i.response)}),c-(o-n.loading.start)),!a.ok){var u=a.status,h=a.statusText;throw new to(h||"fetch, bad network response",u,a)}return n.loading.first=o,n.total=function(e){var t=e.get("Content-Range");if(t){var r=function(e){var t=Js.exec(e);if(t)return parseInt(t[2])-parseInt(t[1])+1}(t);if(y(r))return r}var i=e.get("Content-Length");if(i)return parseInt(i)}(a.headers)||n.total,s&&y(t.highWaterMark)?i.loadProgressively(a,n,e,t.highWaterMark,s):l?a.arrayBuffer():"json"===e.responseType?a.json():a.text()})).then((function(a){var o=i.response;if(!o)throw new Error("loader destroyed");self.clearTimeout(i.requestTimeout),n.loading.end=Math.max(self.performance.now(),n.loading.first);var l=a[u];l&&(n.loaded=n.total=l);var h={url:o.url,data:a,code:o.status};s&&!y(t.highWaterMark)&&s(n,e,a,o),r.onSuccess(h,n,e,o)})).catch((function(t){if(self.clearTimeout(i.requestTimeout),!n.aborted){var a=t&&t.code||0,s=t?t.message:null;r.onError({code:a,text:s},e,t?t.details:null,n)}}))},t.getCacheAge=function(){var e=null;if(this.response){var t=this.response.headers.get("age");e=t?parseFloat(t):null}return e},t.getResponseHeader=function(e){return this.response?this.response.headers.get(e):null},t.loadProgressively=function(e,t,r,i,n){void 0===i&&(i=0);var a=new Pi,s=e.body.getReader();return function o(){return s.read().then((function(s){if(s.done)return a.dataLength&&n(t,r,a.flush(),e),Promise.resolve(new ArrayBuffer(0));var l=s.value,u=l.length;return t.loaded+=u,u<i||a.dataLength?(a.push(l),a.dataLength>=i&&n(t,r,a.flush(),e)):n(t,r,l,e),o()})).catch((function(){return Promise.reject()}))}()},e}();function Zs(e,t){return new self.Request(e.url,t)}var eo,to=function(e){function t(t,r,i){var n;return(n=e.call(this,t)||this).code=void 0,n.details=void 0,n.code=r,n.details=i,n}return l(t,e),t}(c(Error)),ro=/\s/,io=i(i({autoStartLoad:!0,startPosition:-1,defaultAudioCodec:void 0,debug:!1,capLevelOnFPSDrop:!1,capLevelToPlayerSize:!1,ignoreDevicePixelRatio:!1,preferManagedMediaSource:!0,initialLiveManifestSize:1,maxBufferLength:30,backBufferLength:1/0,frontBufferFlushThreshold:1/0,maxBufferSize:6e7,maxBufferHole:.1,highBufferWatchdogPeriod:2,nudgeOffset:.1,nudgeMaxRetry:3,maxFragLookUpTolerance:.25,liveSyncDurationCount:3,liveMaxLatencyDurationCount:1/0,liveSyncDuration:void 0,liveMaxLatencyDuration:void 0,maxLiveSyncPlaybackRate:1,liveDurationInfinity:!1,liveBackBufferLength:null,maxMaxBufferLength:600,enableWorker:!0,workerPath:null,enableSoftwareAES:!0,startLevel:void 0,startFragPrefetch:!1,fpsDroppedMonitoringPeriod:5e3,fpsDroppedMonitoringThreshold:.2,appendErrorMaxRetry:3,loader:Qs,fLoader:void 0,pLoader:void 0,xhrSetup:void 0,licenseXhrSetup:void 0,licenseResponseCallback:void 0,abrController:qr,bufferController:aa,capLevelController:ts,errorController:Fr,fpsController:rs,stretchShortVideoTrack:!1,maxAudioFramesDrift:1,forceKeyFrameOnDiscontinuity:!0,abrEwmaFastLive:3,abrEwmaSlowLive:9,abrEwmaFastVoD:3,abrEwmaSlowVoD:9,abrEwmaDefaultEstimate:5e5,abrEwmaDefaultEstimateMax:5e6,abrBandWidthFactor:.95,abrBandWidthUpFactor:.7,abrMaxWithRealBitrate:!1,maxStarvationDelay:4,maxLoadingDelay:4,minAutoBitrate:0,emeEnabled:!1,widevineLicenseUrl:void 0,drmSystems:{},drmSystemOptions:{},requestMediaKeySystemAccessFunc:oe,testBandwidth:!0,progressive:!1,lowLatencyMode:!0,cmcd:void 0,enableDateRangeMetadataCues:!0,enableEmsgMetadataCues:!0,enableID3MetadataCues:!0,useMediaCapabilities:!0,certLoadPolicy:{default:{maxTimeToFirstByteMs:8e3,maxLoadTimeMs:2e4,timeoutRetry:null,errorRetry:null}},keyLoadPolicy:{default:{maxTimeToFirstByteMs:8e3,maxLoadTimeMs:2e4,timeoutRetry:{maxNumRetry:1,retryDelayMs:1e3,maxRetryDelayMs:2e4,backoff:"linear"},errorRetry:{maxNumRetry:8,retryDelayMs:1e3,maxRetryDelayMs:2e4,backoff:"linear"}}},manifestLoadPolicy:{default:{maxTimeToFirstByteMs:1/0,maxLoadTimeMs:2e4,timeoutRetry:{maxNumRetry:2,retryDelayMs:0,maxRetryDelayMs:0},errorRetry:{maxNumRetry:1,retryDelayMs:1e3,maxRetryDelayMs:8e3}}},playlistLoadPolicy:{default:{maxTimeToFirstByteMs:1e4,maxLoadTimeMs:2e4,timeoutRetry:{maxNumRetry:2,retryDelayMs:0,maxRetryDelayMs:0},errorRetry:{maxNumRetry:2,retryDelayMs:1e3,maxRetryDelayMs:8e3}}},fragLoadPolicy:{default:{maxTimeToFirstByteMs:1e4,maxLoadTimeMs:12e4,timeoutRetry:{maxNumRetry:4,retryDelayMs:0,maxRetryDelayMs:0},errorRetry:{maxNumRetry:6,retryDelayMs:1e3,maxRetryDelayMs:8e3}}},steeringManifestLoadPolicy:{default:{maxTimeToFirstByteMs:1e4,maxLoadTimeMs:2e4,timeoutRetry:{maxNumRetry:2,retryDelayMs:0,maxRetryDelayMs:0},errorRetry:{maxNumRetry:1,retryDelayMs:1e3,maxRetryDelayMs:8e3}}},manifestLoadingTimeOut:1e4,manifestLoadingMaxRetry:1,manifestLoadingRetryDelay:1e3,manifestLoadingMaxRetryTimeout:64e3,levelLoadingTimeOut:1e4,levelLoadingMaxRetry:4,levelLoadingRetryDelay:1e3,levelLoadingMaxRetryTimeout:64e3,fragLoadingTimeOut:2e4,fragLoadingMaxRetry:6,fragLoadingRetryDelay:1e3,fragLoadingMaxRetryTimeout:64e3},{cueHandler:{newCue:function(e,t,r,i){for(var n,a,s,o,l,u=[],h=self.VTTCue||self.TextTrackCue,d=0;d<i.rows.length;d++)if(s=!0,o=0,l="",!(n=i.rows[d]).isEmpty()){for(var c,f=0;f<n.chars.length;f++)ro.test(n.chars[f].uchar)&&s?o++:(l+=n.chars[f].uchar,s=!1);n.cueStartTime=t,t===r&&(r+=1e-4),o>=16?o--:o++;var g=Fa(l.trim()),v=Ba(t,r,g);null!=e&&null!=(c=e.cues)&&c.getCueById(v)||((a=new h(t,r,g)).id=v,a.line=d+1,a.align="left",a.position=10+Math.min(80,10*Math.floor(8*o/32)),u.push(a))}return e&&u.length&&(u.sort((function(e,t){return"auto"===e.line||"auto"===t.line?0:e.line>8&&t.line>8?t.line-e.line:e.line-t.line})),u.forEach((function(t){return Ht(e,t)}))),u}},enableWebVTT:!0,enableIMSC1:!0,enableCEA708Captions:!0,captionsTextTrack1Label:"English",captionsTextTrack1LanguageCode:"en",captionsTextTrack2Label:"Spanish",captionsTextTrack2LanguageCode:"es",captionsTextTrack3Label:"Unknown CC",captionsTextTrack3LanguageCode:"",captionsTextTrack4Label:"Unknown CC",captionsTextTrack4LanguageCode:"",renderTextTracksNatively:!0}),{},{subtitleStreamController:ea,subtitleTrackController:ra,timelineController:$a,audioStreamController:zn,audioTrackController:Zn,emeController:ns,cmcdController:Ws,contentSteeringController:js});function no(e){return e&&"object"==typeof e?Array.isArray(e)?e.map(no):Object.keys(e).reduce((function(t,r){return t[r]=no(e[r]),t}),{}):e}function ao(e){var t=e.loader;t!==$s&&t!==Qs?(w.log("[config]: Custom loader detected, cannot enable progressive streaming"),e.progressive=!1):function(){if(self.fetch&&self.AbortController&&self.ReadableStream&&self.Request)try{return new self.ReadableStream({}),!0}catch(e){}return!1}()&&(e.loader=$s,e.progressive=!0,e.enableSoftwareAES=!0,w.log("[config]: Progressive streaming enabled, using FetchLoader"))}var so=function(e){function t(t,r){var i;return(i=e.call(this,t,"[level-controller]")||this)._levels=[],i._firstLevel=-1,i._maxAutoLevel=-1,i._startLevel=void 0,i.currentLevel=null,i.currentLevelIndex=-1,i.manualLevelIndex=-1,i.steering=void 0,i.onParsedComplete=void 0,i.steering=r,i._registerListeners(),i}l(t,e);var r=t.prototype;return r._registerListeners=function(){var e=this.hls;e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_LOADED,this.onManifestLoaded,this),e.on(S.LEVEL_LOADED,this.onLevelLoaded,this),e.on(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.on(S.FRAG_BUFFERED,this.onFragBuffered,this),e.on(S.ERROR,this.onError,this)},r._unregisterListeners=function(){var e=this.hls;e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_LOADED,this.onManifestLoaded,this),e.off(S.LEVEL_LOADED,this.onLevelLoaded,this),e.off(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.off(S.FRAG_BUFFERED,this.onFragBuffered,this),e.off(S.ERROR,this.onError,this)},r.destroy=function(){this._unregisterListeners(),this.steering=null,this.resetLevels(),e.prototype.destroy.call(this)},r.stopLoad=function(){this._levels.forEach((function(e){e.loadError=0,e.fragmentError=0})),e.prototype.stopLoad.call(this)},r.resetLevels=function(){this._startLevel=void 0,this.manualLevelIndex=-1,this.currentLevelIndex=-1,this.currentLevel=null,this._levels=[],this._maxAutoLevel=-1},r.onManifestLoading=function(e,t){this.resetLevels()},r.onManifestLoaded=function(e,t){var r=this.hls.config.preferManagedMediaSource,i=[],n={},a={},s=!1,o=!1,l=!1;t.levels.forEach((function(e){var t,u,h=e.attrs,d=e.audioCodec,c=e.videoCodec;-1!==(null==(t=d)?void 0:t.indexOf("mp4a.40.34"))&&(eo||(eo=/chrome|firefox/i.test(navigator.userAgent)),eo&&(e.audioCodec=d=void 0)),d&&(e.audioCodec=d=mt(d,r)),0===(null==(u=c)?void 0:u.indexOf("avc1"))&&(c=e.videoCodec=function(e){for(var t=e.split(","),r=0;r<t.length;r++){var i=t[r].split(".");if(i.length>2){var n=i.shift()+".";n+=parseInt(i.shift()).toString(16),n+=("000"+parseInt(i.shift()).toString(16)).slice(-4),t[r]=n}}return t.join(",")}(c));var f=e.width,g=e.height,v=e.unknownCodecs;if(s||(s=!(!f||!g)),o||(o=!!c),l||(l=!!d),!(null!=v&&v.length||d&&!ut(d,"audio",r)||c&&!ut(c,"video",r))){var m=h.CODECS,p=h["FRAME-RATE"],y=h["HDCP-LEVEL"],E=h["PATHWAY-ID"],T=h.RESOLUTION,S=h["VIDEO-RANGE"],L=(E||".")+"-"+e.bitrate+"-"+T+"-"+p+"-"+m+"-"+S+"-"+y;if(n[L])if(n[L].uri===e.url||e.attrs["PATHWAY-ID"])n[L].addGroupId("audio",h.AUDIO),n[L].addGroupId("text",h.SUBTITLES);else{var A=a[L]+=1;e.attrs["PATHWAY-ID"]=new Array(A+1).join(".");var R=new lr(e);n[L]=R,i.push(R)}else{var k=new lr(e);n[L]=k,a[L]=1,i.push(k)}}})),this.filterAndSortMediaOptions(i,t,s,o,l)},r.filterAndSortMediaOptions=function(e,t,r,i,n){var a=this,s=[],o=[],l=e;if((r||i)&&n&&(l=l.filter((function(e){var t,r=e.videoCodec,i=e.videoRange,n=e.width,a=e.height;return(!!r||!(!n||!a))&&!!(t=i)&&rr.indexOf(t)>-1}))),0!==l.length){if(t.audioTracks){var u=this.hls.config.preferManagedMediaSource;oo(s=t.audioTracks.filter((function(e){return!e.audioCodec||ut(e.audioCodec,"audio",u)})))}t.subtitles&&oo(o=t.subtitles);var h=l.slice(0);l.sort((function(e,t){if(e.attrs["HDCP-LEVEL"]!==t.attrs["HDCP-LEVEL"])return(e.attrs["HDCP-LEVEL"]||"")>(t.attrs["HDCP-LEVEL"]||"")?1:-1;if(r&&e.height!==t.height)return e.height-t.height;if(e.frameRate!==t.frameRate)return e.frameRate-t.frameRate;if(e.videoRange!==t.videoRange)return rr.indexOf(e.videoRange)-rr.indexOf(t.videoRange);if(e.videoCodec!==t.videoCodec){var i=ct(e.videoCodec),n=ct(t.videoCodec);if(i!==n)return n-i}if(e.uri===t.uri&&e.codecSet!==t.codecSet){var a=ft(e.codecSet),s=ft(t.codecSet);if(a!==s)return s-a}return e.averageBitrate!==t.averageBitrate?e.averageBitrate-t.averageBitrate:0}));var d=h[0];if(this.steering&&(l=this.steering.filterParsedLevels(l)).length!==h.length)for(var c=0;c<h.length;c++)if(h[c].pathwayId===l[0].pathwayId){d=h[c];break}this._levels=l;for(var f=0;f<l.length;f++)if(l[f]===d){var g;this._firstLevel=f;var v=d.bitrate,m=this.hls.bandwidthEstimate;if(this.log("manifest loaded, "+l.length+" level(s) found, first bitrate: "+v),void 0===(null==(g=this.hls.userConfig)?void 0:g.abrEwmaDefaultEstimate)){var p=Math.min(v,this.hls.config.abrEwmaDefaultEstimateMax);p>m&&m===io.abrEwmaDefaultEstimate&&(this.hls.bandwidthEstimate=p)}break}var y=n&&!i,E={levels:l,audioTracks:s,subtitleTracks:o,sessionData:t.sessionData,sessionKeys:t.sessionKeys,firstLevel:this._firstLevel,stats:t.stats,audio:n,video:i,altAudio:!y&&s.some((function(e){return!!e.url}))};this.hls.trigger(S.MANIFEST_PARSED,E),(this.hls.config.autoStartLoad||this.hls.forceStartLoad)&&this.hls.startLoad(this.hls.config.startPosition)}else Promise.resolve().then((function(){if(a.hls){t.levels.length&&a.warn("One or more CODECS in variant not supported: "+JSON.stringify(t.levels[0].attrs));var e=new Error("no level with compatible codecs found in manifest");a.hls.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.MANIFEST_INCOMPATIBLE_CODECS_ERROR,fatal:!0,url:t.url,error:e,reason:e.message})}}))},r.onError=function(e,t){!t.fatal&&t.context&&t.context.type===xt&&t.context.level===this.level&&this.checkRetry(t)},r.onFragBuffered=function(e,t){var r=t.frag;if(void 0!==r&&r.type===Mt){var i=r.elementaryStreams;if(!Object.keys(i).some((function(e){return!!i[e]})))return;var n=this._levels[r.level];null!=n&&n.loadError&&(this.log("Resetting level error count of "+n.loadError+" on frag buffered"),n.loadError=0)}},r.onLevelLoaded=function(e,t){var r,i,n=t.level,a=t.details,s=this._levels[n];if(!s)return this.warn("Invalid level index "+n),void(null!=(i=t.deliveryDirectives)&&i.skip&&(a.deltaUpdateFailed=!0));n===this.currentLevelIndex?(0===s.fragmentError&&(s.loadError=0),this.playlistLoaded(n,t,s.details)):null!=(r=t.deliveryDirectives)&&r.skip&&(a.deltaUpdateFailed=!0)},r.loadPlaylist=function(t){e.prototype.loadPlaylist.call(this);var r=this.currentLevelIndex,i=this.currentLevel;if(i&&this.shouldLoadPlaylist(i)){var n=i.uri;if(t)try{n=t.addDirectives(n)}catch(e){this.warn("Could not construct new URL with HLS Delivery Directives: "+e)}var a=i.attrs["PATHWAY-ID"];this.log("Loading level index "+r+(void 0!==(null==t?void 0:t.msn)?" at sn "+t.msn+" part "+t.part:"")+" with"+(a?" Pathway "+a:"")+" "+n),this.clearTimer(),this.hls.trigger(S.LEVEL_LOADING,{url:n,level:r,pathwayId:i.attrs["PATHWAY-ID"],id:0,deliveryDirectives:t||null})}},r.removeLevel=function(e){var t,r=this,i=this._levels.filter((function(t,i){return i!==e||(r.steering&&r.steering.removeLevel(t),t===r.currentLevel&&(r.currentLevel=null,r.currentLevelIndex=-1,t.details&&t.details.fragments.forEach((function(e){return e.level=-1}))),!1)}));pr(i),this._levels=i,this.currentLevelIndex>-1&&null!=(t=this.currentLevel)&&t.details&&(this.currentLevelIndex=this.currentLevel.details.fragments[0].level),this.hls.trigger(S.LEVELS_UPDATED,{levels:i})},r.onLevelsUpdated=function(e,t){var r=t.levels;this._levels=r},r.checkMaxAutoUpdated=function(){var e=this.hls,t=e.autoLevelCapping,r=e.maxAutoLevel,i=e.maxHdcpLevel;this._maxAutoLevel!==r&&(this._maxAutoLevel=r,this.hls.trigger(S.MAX_AUTO_LEVEL_UPDATED,{autoLevelCapping:t,levels:this.levels,maxAutoLevel:r,minAutoLevel:this.hls.minAutoLevel,maxHdcpLevel:i}))},s(t,[{key:"levels",get:function(){return 0===this._levels.length?null:this._levels}},{key:"level",get:function(){return this.currentLevelIndex},set:function(e){var t=this._levels;if(0!==t.length){if(e<0||e>=t.length){var r=new Error("invalid level idx"),i=e<0;if(this.hls.trigger(S.ERROR,{type:L.OTHER_ERROR,details:A.LEVEL_SWITCH_ERROR,level:e,fatal:i,error:r,reason:r.message}),i)return;e=Math.min(e,t.length-1)}var n=this.currentLevelIndex,a=this.currentLevel,s=a?a.attrs["PATHWAY-ID"]:void 0,o=t[e],l=o.attrs["PATHWAY-ID"];if(this.currentLevelIndex=e,this.currentLevel=o,n!==e||!o.details||!a||s!==l){this.log("Switching to level "+e+" ("+(o.height?o.height+"p ":"")+(o.videoRange?o.videoRange+" ":"")+(o.codecSet?o.codecSet+" ":"")+"@"+o.bitrate+")"+(l?" with Pathway "+l:"")+" from level "+n+(s?" with Pathway "+s:""));var u={level:e,attrs:o.attrs,details:o.details,bitrate:o.bitrate,averageBitrate:o.averageBitrate,maxBitrate:o.maxBitrate,realBitrate:o.realBitrate,width:o.width,height:o.height,codecSet:o.codecSet,audioCodec:o.audioCodec,videoCodec:o.videoCodec,audioGroups:o.audioGroups,subtitleGroups:o.subtitleGroups,loaded:o.loaded,loadError:o.loadError,fragmentError:o.fragmentError,name:o.name,id:o.id,uri:o.uri,url:o.url,urlId:0,audioGroupIds:o.audioGroupIds,textGroupIds:o.textGroupIds};this.hls.trigger(S.LEVEL_SWITCHING,u);var h=o.details;if(!h||h.live){var d=this.switchParams(o.uri,null==a?void 0:a.details,h);this.loadPlaylist(d)}}}}},{key:"manualLevel",get:function(){return this.manualLevelIndex},set:function(e){this.manualLevelIndex=e,void 0===this._startLevel&&(this._startLevel=e),-1!==e&&(this.level=e)}},{key:"firstLevel",get:function(){return this._firstLevel},set:function(e){this._firstLevel=e}},{key:"startLevel",get:function(){if(void 0===this._startLevel){var e=this.hls.config.startLevel;return void 0!==e?e:this.hls.firstAutoLevel}return this._startLevel},set:function(e){this._startLevel=e}},{key:"nextLoadLevel",get:function(){return-1!==this.manualLevelIndex?this.manualLevelIndex:this.hls.nextAutoLevel},set:function(e){this.level=e,-1===this.manualLevelIndex&&(this.hls.nextAutoLevel=e)}}]),t}(Mr);function oo(e){var t={};e.forEach((function(e){var r=e.groupId||"";e.id=t[r]=t[r]||0,t[r]++}))}var lo=function(){function e(e){this.config=void 0,this.keyUriToKeyInfo={},this.emeController=null,this.config=e}var t=e.prototype;return t.abort=function(e){for(var t in this.keyUriToKeyInfo){var r=this.keyUriToKeyInfo[t].loader;if(r){var i;if(e&&e!==(null==(i=r.context)?void 0:i.frag.type))return;r.abort()}}},t.detach=function(){for(var e in this.keyUriToKeyInfo){var t=this.keyUriToKeyInfo[e];(t.mediaKeySessionContext||t.decryptdata.isCommonEncryption)&&delete this.keyUriToKeyInfo[e]}},t.destroy=function(){for(var e in this.detach(),this.keyUriToKeyInfo){var t=this.keyUriToKeyInfo[e].loader;t&&t.destroy()}this.keyUriToKeyInfo={}},t.createKeyLoadError=function(e,t,r,i,n){return void 0===t&&(t=A.KEY_LOAD_ERROR),new gi({type:L.NETWORK_ERROR,details:t,fatal:!1,frag:e,response:n,error:r,networkDetails:i})},t.loadClear=function(e,t){var r=this;if(this.emeController&&this.config.emeEnabled)for(var i=e.sn,n=e.cc,a=function(){var e=t[s];if(n<=e.cc&&("initSegment"===i||"initSegment"===e.sn||i<e.sn))return r.emeController.selectKeySystemFormat(e).then((function(t){e.setKeyFormat(t)})),1},s=0;s<t.length&&!a();s++);},t.load=function(e){var t=this;return!e.decryptdata&&e.encrypted&&this.emeController&&this.config.emeEnabled?this.emeController.selectKeySystemFormat(e).then((function(r){return t.loadInternal(e,r)})):this.loadInternal(e)},t.loadInternal=function(e,t){var r,i;t&&e.setKeyFormat(t);var n=e.decryptdata;if(!n){var a=new Error(t?"Expected frag.decryptdata to be defined after setting format "+t:"Missing decryption data on fragment in onKeyLoading");return Promise.reject(this.createKeyLoadError(e,A.KEY_LOAD_ERROR,a))}var s=n.uri;if(!s)return Promise.reject(this.createKeyLoadError(e,A.KEY_LOAD_ERROR,new Error('Invalid key URI: "'+s+'"')));var o,l=this.keyUriToKeyInfo[s];if(null!=(r=l)&&r.decryptdata.key)return n.key=l.decryptdata.key,Promise.resolve({frag:e,keyInfo:l});if(null!=(i=l)&&i.keyLoadPromise)switch(null==(o=l.mediaKeySessionContext)?void 0:o.keyStatus){case void 0:case"status-pending":case"usable":case"usable-in-future":return l.keyLoadPromise.then((function(t){return n.key=t.keyInfo.decryptdata.key,{frag:e,keyInfo:l}}))}switch(l=this.keyUriToKeyInfo[s]={decryptdata:n,keyLoadPromise:null,loader:null,mediaKeySessionContext:null},n.method){case"ISO-23001-7":case"SAMPLE-AES":case"SAMPLE-AES-CENC":case"SAMPLE-AES-CTR":return"identity"===n.keyFormat?this.loadKeyHTTP(l,e):this.loadKeyEME(l,e);case"AES-128":return this.loadKeyHTTP(l,e);default:return Promise.reject(this.createKeyLoadError(e,A.KEY_LOAD_ERROR,new Error('Key supplied with unsupported METHOD: "'+n.method+'"')))}},t.loadKeyEME=function(e,t){var r={frag:t,keyInfo:e};if(this.emeController&&this.config.emeEnabled){var i=this.emeController.loadKey(r);if(i)return(e.keyLoadPromise=i.then((function(t){return e.mediaKeySessionContext=t,r}))).catch((function(t){throw e.keyLoadPromise=null,t}))}return Promise.resolve(r)},t.loadKeyHTTP=function(e,t){var r=this,n=this.config,a=new(0,n.loader)(n);return t.keyLoader=e.loader=a,e.keyLoadPromise=new Promise((function(s,o){var l={keyInfo:e,frag:t,responseType:"arraybuffer",url:e.decryptdata.uri},u=n.keyLoadPolicy.default,h={loadPolicy:u,timeout:u.maxLoadTimeMs,maxRetry:0,retryDelay:0,maxRetryDelay:0},d={onSuccess:function(e,t,i,n){var a=i.frag,l=i.keyInfo,u=i.url;if(!a.decryptdata||l!==r.keyUriToKeyInfo[u])return o(r.createKeyLoadError(a,A.KEY_LOAD_ERROR,new Error("after key load, decryptdata unset or changed"),n));l.decryptdata.key=a.decryptdata.key=new Uint8Array(e.data),a.keyLoader=null,l.loader=null,s({frag:a,keyInfo:l})},onError:function(e,n,a,s){r.resetLoader(n),o(r.createKeyLoadError(t,A.KEY_LOAD_ERROR,new Error("HTTP Error "+e.code+" loading key "+e.text),a,i({url:l.url,data:void 0},e)))},onTimeout:function(e,i,n){r.resetLoader(i),o(r.createKeyLoadError(t,A.KEY_LOAD_TIMEOUT,new Error("key loading timed out"),n))},onAbort:function(e,i,n){r.resetLoader(i),o(r.createKeyLoadError(t,A.INTERNAL_ABORTED,new Error("key loading aborted"),n))}};a.load(l,h,d)}))},t.resetLoader=function(e){var t=e.frag,r=e.keyInfo,i=e.url,n=r.loader;t.keyLoader===n&&(t.keyLoader=null,r.loader=null),delete this.keyUriToKeyInfo[i],n&&n.destroy()},e}();function uo(){return self.SourceBuffer||self.WebKitSourceBuffer}function ho(){if(!ot())return!1;var e=uo();return!e||e.prototype&&"function"==typeof e.prototype.appendBuffer&&"function"==typeof e.prototype.remove}var co=function(){function e(e,t,r,i){this.config=void 0,this.media=null,this.fragmentTracker=void 0,this.hls=void 0,this.nudgeRetry=0,this.stallReported=!1,this.stalled=null,this.moved=!1,this.seeking=!1,this.config=e,this.media=t,this.fragmentTracker=r,this.hls=i}var t=e.prototype;return t.destroy=function(){this.media=null,this.hls=this.fragmentTracker=null},t.poll=function(e,t){var r=this.config,i=this.media,n=this.stalled;if(null!==i){var a=i.currentTime,s=i.seeking,o=this.seeking&&!s,l=!this.seeking&&s;if(this.seeking=s,a===e)if(l||o)this.stalled=null;else if(i.paused&&!s||i.ended||0===i.playbackRate||!ii.getBuffered(i).length)this.nudgeRetry=0;else{var u=ii.bufferInfo(i,a,0),h=u.nextStart||0;if(s){var d=u.len>2,c=!h||t&&t.start<=a||h-a>2&&!this.fragmentTracker.getPartialFragment(a);if(d||c)return;this.moved=!1}if(!this.moved&&null!==this.stalled){var f;if(!(u.len>0||h))return;var g=Math.max(h,u.start||0)-a,v=this.hls.levels?this.hls.levels[this.hls.currentLevel]:null,m=(null==v||null==(f=v.details)?void 0:f.live)?2*v.details.targetduration:2,p=this.fragmentTracker.getPartialFragment(a);if(g>0&&(g<=m||p))return void(i.paused||this._trySkipBufferHole(p))}var y=self.performance.now();if(null!==n){var E=y-n;if(s||!(E>=250)||(this._reportStall(u),this.media)){var T=ii.bufferInfo(i,a,r.maxBufferHole);this._tryFixBufferStall(T,E)}}else this.stalled=y}else if(this.moved=!0,s||(this.nudgeRetry=0),null!==n){if(this.stallReported){var S=self.performance.now()-n;w.warn("playback not stuck anymore @"+a+", after "+Math.round(S)+"ms"),this.stallReported=!1}this.stalled=null}}},t._tryFixBufferStall=function(e,t){var r=this.config,i=this.fragmentTracker,n=this.media;if(null!==n){var a=n.currentTime,s=i.getPartialFragment(a);if(s&&(this._trySkipBufferHole(s)||!this.media))return;(e.len>r.maxBufferHole||e.nextStart&&e.nextStart-a<r.maxBufferHole)&&t>1e3*r.highBufferWatchdogPeriod&&(w.warn("Trying to nudge playhead over buffer-hole"),this.stalled=null,this._tryNudgeBuffer())}},t._reportStall=function(e){var t=this.hls,r=this.media;if(!this.stallReported&&r){this.stallReported=!0;var i=new Error("Playback stalling at @"+r.currentTime+" due to low buffer ("+JSON.stringify(e)+")");w.warn(i.message),t.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_STALLED_ERROR,fatal:!1,error:i,buffer:e.len})}},t._trySkipBufferHole=function(e){var t=this.config,r=this.hls,i=this.media;if(null===i)return 0;var n=i.currentTime,a=ii.bufferInfo(i,n,0),s=n<a.start?a.start:a.nextStart;if(s){var o=a.len<=t.maxBufferHole,l=a.len>0&&a.len<1&&i.readyState<3,u=s-n;if(u>0&&(o||l)){if(u>t.maxBufferHole){var h=this.fragmentTracker,d=!1;if(0===n){var c=h.getAppendedFrag(0,Mt);c&&s<c.end&&(d=!0)}if(!d){var f=e||h.getAppendedFrag(n,Mt);if(f){for(var g=!1,v=f.end;v<s;){var m=h.getPartialFragment(v);if(!m){g=!0;break}v+=m.duration}if(g)return 0}}}var p=Math.max(s+.05,n+.1);if(w.warn("skipping hole, adjusting currentTime from "+n+" to "+p),this.moved=!0,this.stalled=null,i.currentTime=p,e&&!e.gap){var y=new Error("fragment loaded with buffer holes, seeking from "+n+" to "+p);r.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_SEEK_OVER_HOLE,fatal:!1,error:y,reason:y.message,frag:e})}return p}}return 0},t._tryNudgeBuffer=function(){var e=this.config,t=this.hls,r=this.media,i=this.nudgeRetry;if(null!==r){var n=r.currentTime;if(this.nudgeRetry++,i<e.nudgeMaxRetry){var a=n+(i+1)*e.nudgeOffset,s=new Error("Nudging 'currentTime' from "+n+" to "+a);w.warn(s.message),r.currentTime=a,t.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_NUDGE_ON_STALL,error:s,fatal:!1})}else{var o=new Error("Playhead still not moving while enough data buffered @"+n+" after "+e.nudgeMaxRetry+" nudges");w.error(o.message),t.trigger(S.ERROR,{type:L.MEDIA_ERROR,details:A.BUFFER_STALLED_ERROR,error:o,fatal:!0})}}},e}(),fo=function(e){function t(t,r,i){var n;return(n=e.call(this,t,r,i,"[stream-controller]",Mt)||this).audioCodecSwap=!1,n.gapController=null,n.level=-1,n._forceStartLoad=!1,n.altAudio=!1,n.audioOnly=!1,n.fragPlaying=null,n.onvplaying=null,n.onvseeked=null,n.fragLastKbps=0,n.couldBacktrack=!1,n.backtrackFragment=null,n.audioCodecSwitch=!1,n.videoBuffer=null,n._registerListeners(),n}l(t,e);var r=t.prototype;return r._registerListeners=function(){var e=this.hls;e.on(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.on(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.on(S.MANIFEST_LOADING,this.onManifestLoading,this),e.on(S.MANIFEST_PARSED,this.onManifestParsed,this),e.on(S.LEVEL_LOADING,this.onLevelLoading,this),e.on(S.LEVEL_LOADED,this.onLevelLoaded,this),e.on(S.FRAG_LOAD_EMERGENCY_ABORTED,this.onFragLoadEmergencyAborted,this),e.on(S.ERROR,this.onError,this),e.on(S.AUDIO_TRACK_SWITCHING,this.onAudioTrackSwitching,this),e.on(S.AUDIO_TRACK_SWITCHED,this.onAudioTrackSwitched,this),e.on(S.BUFFER_CREATED,this.onBufferCreated,this),e.on(S.BUFFER_FLUSHED,this.onBufferFlushed,this),e.on(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.on(S.FRAG_BUFFERED,this.onFragBuffered,this)},r._unregisterListeners=function(){var e=this.hls;e.off(S.MEDIA_ATTACHED,this.onMediaAttached,this),e.off(S.MEDIA_DETACHING,this.onMediaDetaching,this),e.off(S.MANIFEST_LOADING,this.onManifestLoading,this),e.off(S.MANIFEST_PARSED,this.onManifestParsed,this),e.off(S.LEVEL_LOADED,this.onLevelLoaded,this),e.off(S.FRAG_LOAD_EMERGENCY_ABORTED,this.onFragLoadEmergencyAborted,this),e.off(S.ERROR,this.onError,this),e.off(S.AUDIO_TRACK_SWITCHING,this.onAudioTrackSwitching,this),e.off(S.AUDIO_TRACK_SWITCHED,this.onAudioTrackSwitched,this),e.off(S.BUFFER_CREATED,this.onBufferCreated,this),e.off(S.BUFFER_FLUSHED,this.onBufferFlushed,this),e.off(S.LEVELS_UPDATED,this.onLevelsUpdated,this),e.off(S.FRAG_BUFFERED,this.onFragBuffered,this)},r.onHandlerDestroying=function(){this._unregisterListeners(),e.prototype.onHandlerDestroying.call(this)},r.startLoad=function(e){if(this.levels){var t=this.lastCurrentTime,r=this.hls;if(this.stopLoad(),this.setInterval(100),this.level=-1,!this.startFragRequested){var i=r.startLevel;-1===i&&(r.config.testBandwidth&&this.levels.length>1?(i=0,this.bitrateTest=!0):i=r.firstAutoLevel),r.nextLoadLevel=i,this.level=r.loadLevel,this.loadedmetadata=!1}t>0&&-1===e&&(this.log("Override startPosition with lastCurrentTime @"+t.toFixed(3)),e=t),this.state=Si,this.nextLoadPosition=this.startPosition=this.lastCurrentTime=e,this.tick()}else this._forceStartLoad=!0,this.state=Ti},r.stopLoad=function(){this._forceStartLoad=!1,e.prototype.stopLoad.call(this)},r.doTick=function(){switch(this.state){case _i:var e=this.levels,t=this.level,r=null==e?void 0:e[t],i=null==r?void 0:r.details;if(i&&(!i.live||this.levelLastLoaded===r)){if(this.waitForCdnTuneIn(i))break;this.state=Si;break}if(this.hls.nextLoadLevel!==this.level){this.state=Si;break}break;case Ri:var n,a=self.performance.now(),s=this.retryDate;if(!s||a>=s||null!=(n=this.media)&&n.seeking){var o=this.levels,l=this.level,u=null==o?void 0:o[l];this.resetStartWhenNotLoaded(u||null),this.state=Si}}this.state===Si&&this.doTickIdle(),this.onTickEnd()},r.onTickEnd=function(){e.prototype.onTickEnd.call(this),this.checkBuffer(),this.checkFragmentChanged()},r.doTickIdle=function(){var e=this.hls,t=this.levelLastLoaded,r=this.levels,i=this.media;if(null!==t&&(i||!this.startFragRequested&&e.config.startFragPrefetch)&&(!this.altAudio||!this.audioOnly)){var n=this.buffering?e.nextLoadLevel:e.loadLevel;if(null!=r&&r[n]){var a=r[n],s=this.getMainFwdBufferInfo();if(null!==s){var o=this.getLevelDetails();if(o&&this._streamEnded(s,o)){var l={};return this.altAudio&&(l.type="video"),this.hls.trigger(S.BUFFER_EOS,l),void(this.state=Ii)}if(this.buffering){e.loadLevel!==n&&-1===e.manualLevel&&this.log("Adapting to level "+n+" from level "+this.level),this.level=e.nextLoadLevel=n;var u=a.details;if(!u||this.state===_i||u.live&&this.levelLastLoaded!==a)return this.level=n,void(this.state=_i);var h=s.len,d=this.getMaxBufferLength(a.maxBitrate);if(!(h>=d)){this.backtrackFragment&&this.backtrackFragment.start>s.end&&(this.backtrackFragment=null);var c=this.backtrackFragment?this.backtrackFragment.start:s.end,f=this.getNextFragment(c,u);if(this.couldBacktrack&&!this.fragPrevious&&f&&"initSegment"!==f.sn&&this.fragmentTracker.getState(f)!==$r){var g,v=(null!=(g=this.backtrackFragment)?g:f).sn-u.startSN,m=u.fragments[v-1];m&&f.cc===m.cc&&(f=m,this.fragmentTracker.removeFragment(m))}else this.backtrackFragment&&s.len&&(this.backtrackFragment=null);if(f&&this.isLoopLoading(f,c)){if(!f.gap){var p=this.audioOnly&&!this.altAudio?O:N,y=(p===N?this.videoBuffer:this.mediaBuffer)||this.media;y&&this.afterBufferFlushed(y,p,Mt)}f=this.getNextFragmentLoopLoading(f,u,s,Mt,d)}f&&(!f.initSegment||f.initSegment.data||this.bitrateTest||(f=f.initSegment),this.loadFragment(f,a,c))}}}}}},r.loadFragment=function(t,r,i){var n=this.fragmentTracker.getState(t);this.fragCurrent=t,n===zr||n===Jr?"initSegment"===t.sn?this._loadInitSegment(t,r):this.bitrateTest?(this.log("Fragment "+t.sn+" of level "+t.level+" is being downloaded to test bitrate and will not be buffered"),this._loadBitrateTestFrag(t,r)):(this.startFragRequested=!0,e.prototype.loadFragment.call(this,t,r,i)):this.clearTrackerIfNeeded(t)},r.getBufferedFrag=function(e){return this.fragmentTracker.getBufferedFrag(e,Mt)},r.followingBufferedFrag=function(e){return e?this.getBufferedFrag(e.end+.5):null},r.immediateLevelSwitch=function(){this.abortCurrentFrag(),this.flushMainBuffer(0,Number.POSITIVE_INFINITY)},r.nextLevelSwitch=function(){var e=this.levels,t=this.media;if(null!=t&&t.readyState){var r,i=this.getAppendedFrag(t.currentTime);i&&i.start>1&&this.flushMainBuffer(0,i.start-1);var n=this.getLevelDetails();if(null!=n&&n.live){var a=this.getMainFwdBufferInfo();if(!a||a.len<2*n.targetduration)return}if(!t.paused&&e){var s=e[this.hls.nextLoadLevel],o=this.fragLastKbps;r=o&&this.fragCurrent?this.fragCurrent.duration*s.maxBitrate/(1e3*o)+1:0}else r=0;var l=this.getBufferedFrag(t.currentTime+r);if(l){var u=this.followingBufferedFrag(l);if(u){this.abortCurrentFrag();var h=u.maxStartPTS?u.maxStartPTS:u.start,d=u.duration,c=Math.max(l.end,h+Math.min(Math.max(d-this.config.maxFragLookUpTolerance,d*(this.couldBacktrack?.5:.125)),d*(this.couldBacktrack?.75:.25)));this.flushMainBuffer(c,Number.POSITIVE_INFINITY)}}}},r.abortCurrentFrag=function(){var e=this.fragCurrent;switch(this.fragCurrent=null,this.backtrackFragment=null,e&&(e.abortRequests(),this.fragmentTracker.removeFragment(e)),this.state){case Li:case Ai:case Ri:case bi:case Di:this.state=Si}this.nextLoadPosition=this.getLoadPosition()},r.flushMainBuffer=function(t,r){e.prototype.flushMainBuffer.call(this,t,r,this.altAudio?"video":null)},r.onMediaAttached=function(t,r){e.prototype.onMediaAttached.call(this,t,r);var i=r.media;this.onvplaying=this.onMediaPlaying.bind(this),this.onvseeked=this.onMediaSeeked.bind(this),i.addEventListener("playing",this.onvplaying),i.addEventListener("seeked",this.onvseeked),this.gapController=new co(this.config,i,this.fragmentTracker,this.hls)},r.onMediaDetaching=function(){var t=this.media;t&&this.onvplaying&&this.onvseeked&&(t.removeEventListener("playing",this.onvplaying),t.removeEventListener("seeked",this.onvseeked),this.onvplaying=this.onvseeked=null,this.videoBuffer=null),this.fragPlaying=null,this.gapController&&(this.gapController.destroy(),this.gapController=null),e.prototype.onMediaDetaching.call(this)},r.onMediaPlaying=function(){this.tick()},r.onMediaSeeked=function(){var e=this.media,t=e?e.currentTime:null;y(t)&&this.log("Media seeked to "+t.toFixed(3));var r=this.getMainFwdBufferInfo();null!==r&&0!==r.len?this.tick():this.warn('Main forward buffer length on "seeked" event '+(r?r.len:"empty")+")")},r.onManifestLoading=function(){this.log("Trigger BUFFER_RESET"),this.hls.trigger(S.BUFFER_RESET,void 0),this.fragmentTracker.removeAllFragments(),this.couldBacktrack=!1,this.startPosition=this.lastCurrentTime=this.fragLastKbps=0,this.levels=this.fragPlaying=this.backtrackFragment=this.levelLastLoaded=null,this.altAudio=this.audioOnly=this.startFragRequested=!1},r.onManifestParsed=function(e,t){var r,i,n=!1,a=!1;t.levels.forEach((function(e){var t=e.audioCodec;t&&(n=n||-1!==t.indexOf("mp4a.40.2"),a=a||-1!==t.indexOf("mp4a.40.5"))})),this.audioCodecSwitch=n&&a&&!("function"==typeof(null==(i=uo())||null==(r=i.prototype)?void 0:r.changeType)),this.audioCodecSwitch&&this.log("Both AAC/HE-AAC audio found in levels; declaring level codec as HE-AAC"),this.levels=t.levels,this.startFragRequested=!1},r.onLevelLoading=function(e,t){var r=this.levels;if(r&&this.state===Si){var i=r[t.level];(!i.details||i.details.live&&this.levelLastLoaded!==i||this.waitForCdnTuneIn(i.details))&&(this.state=_i)}},r.onLevelLoaded=function(e,t){var r,i=this.levels,n=t.level,a=t.details,s=a.totalduration;if(i){this.log("Level "+n+" loaded ["+a.startSN+","+a.endSN+"]"+(a.lastPartSn?"[part-"+a.lastPartSn+"-"+a.lastPartIndex+"]":"")+", cc ["+a.startCC+", "+a.endCC+"] duration:"+s);var o=i[n],l=this.fragCurrent;!l||this.state!==Ai&&this.state!==Ri||l.level!==t.level&&l.loader&&this.abortCurrentFrag();var u=0;if(a.live||null!=(r=o.details)&&r.live){var h;if(this.checkLiveUpdate(a),a.deltaUpdateFailed)return;u=this.alignPlaylists(a,o.details,null==(h=this.levelLastLoaded)?void 0:h.details)}if(o.details=a,this.levelLastLoaded=o,this.hls.trigger(S.LEVEL_UPDATED,{details:a,level:n}),this.state===_i){if(this.waitForCdnTuneIn(a))return;this.state=Si}this.startFragRequested?a.live&&this.synchronizeToLiveEdge(a):this.setStartPosition(a,u),this.tick()}else this.warn("Levels were reset while loading level "+n)},r._handleFragmentLoadProgress=function(e){var t,r=e.frag,i=e.part,n=e.payload,a=this.levels;if(a){var s=a[r.level],o=s.details;if(!o)return this.warn("Dropping fragment "+r.sn+" of level "+r.level+" after level details were reset"),void this.fragmentTracker.removeFragment(r);var l=s.videoCodec,u=o.PTSKnown||!o.live,h=null==(t=r.initSegment)?void 0:t.data,d=this._getAudioCodec(s),c=this.transmuxer=this.transmuxer||new Xn(this.hls,Mt,this._handleTransmuxComplete.bind(this),this._handleTransmuxerFlush.bind(this)),f=i?i.index:-1,g=-1!==f,v=new ni(r.level,r.sn,r.stats.chunkCount,n.byteLength,f,g),m=this.initPTS[r.cc];c.push(n,h,d,l,r,i,o.totalduration,u,v,m)}else this.warn("Levels were reset while fragment load was in progress. Fragment "+r.sn+" of level "+r.level+" will not be buffered")},r.onAudioTrackSwitching=function(e,t){var r=this.altAudio;if(!t.url){if(this.mediaBuffer!==this.media){this.log("Switching on main audio, use media.buffered to schedule main fragment loading"),this.mediaBuffer=this.media;var i=this.fragCurrent;i&&(this.log("Switching to main audio track, cancel main fragment load"),i.abortRequests(),this.fragmentTracker.removeFragment(i)),this.resetTransmuxer(),this.resetLoadingState()}else this.audioOnly&&this.resetTransmuxer();var n=this.hls;r&&(n.trigger(S.BUFFER_FLUSHING,{startOffset:0,endOffset:Number.POSITIVE_INFINITY,type:null}),this.fragmentTracker.removeAllFragments()),n.trigger(S.AUDIO_TRACK_SWITCHED,t)}},r.onAudioTrackSwitched=function(e,t){var r=t.id,i=!!this.hls.audioTracks[r].url;if(i){var n=this.videoBuffer;n&&this.mediaBuffer!==n&&(this.log("Switching on alternate audio, use video.buffered to schedule main fragment loading"),this.mediaBuffer=n)}this.altAudio=i,this.tick()},r.onBufferCreated=function(e,t){var r,i,n=t.tracks,a=!1;for(var s in n){var o=n[s];if("main"===o.id){if(i=s,r=o,"video"===s){var l=n[s];l&&(this.videoBuffer=l.buffer)}}else a=!0}a&&r?(this.log("Alternate track found, use "+i+".buffered to schedule main fragment loading"),this.mediaBuffer=r.buffer):this.mediaBuffer=this.media},r.onFragBuffered=function(e,t){var r=t.frag,i=t.part;if(!r||r.type===Mt){if(this.fragContextChanged(r))return this.warn("Fragment "+r.sn+(i?" p: "+i.index:"")+" of level "+r.level+" finished buffering, but was aborted. state: "+this.state),void(this.state===Di&&(this.state=Si));var n=i?i.stats:r.stats;this.fragLastKbps=Math.round(8*n.total/(n.buffering.end-n.loading.first)),"initSegment"!==r.sn&&(this.fragPrevious=r),this.fragBufferedComplete(r,i)}},r.onError=function(e,t){var r;if(t.fatal)this.state=wi;else switch(t.details){case A.FRAG_GAP:case A.FRAG_PARSING_ERROR:case A.FRAG_DECRYPT_ERROR:case A.FRAG_LOAD_ERROR:case A.FRAG_LOAD_TIMEOUT:case A.KEY_LOAD_ERROR:case A.KEY_LOAD_TIMEOUT:this.onFragmentOrKeyLoadError(Mt,t);break;case A.LEVEL_LOAD_ERROR:case A.LEVEL_LOAD_TIMEOUT:case A.LEVEL_PARSING_ERROR:t.levelRetry||this.state!==_i||(null==(r=t.context)?void 0:r.type)!==xt||(this.state=Si);break;case A.BUFFER_APPEND_ERROR:case A.BUFFER_FULL_ERROR:if(!t.parent||"main"!==t.parent)return;if(t.details===A.BUFFER_APPEND_ERROR)return void this.resetLoadingState();this.reduceLengthAndFlushBuffer(t)&&this.flushMainBuffer(0,Number.POSITIVE_INFINITY);break;case A.INTERNAL_EXCEPTION:this.recoverWorkerError(t)}},r.checkBuffer=function(){var e=this.media,t=this.gapController;if(e&&t&&e.readyState){if(this.loadedmetadata||!ii.getBuffered(e).length){var r=this.state!==Si?this.fragCurrent:null;t.poll(this.lastCurrentTime,r)}this.lastCurrentTime=e.currentTime}},r.onFragLoadEmergencyAborted=function(){this.state=Si,this.loadedmetadata||(this.startFragRequested=!1,this.nextLoadPosition=this.startPosition),this.tickImmediate()},r.onBufferFlushed=function(e,t){var r=t.type;if(r!==O||this.audioOnly&&!this.altAudio){var i=(r===N?this.videoBuffer:this.mediaBuffer)||this.media;this.afterBufferFlushed(i,r,Mt),this.tick()}},r.onLevelsUpdated=function(e,t){this.level>-1&&this.fragCurrent&&(this.level=this.fragCurrent.level),this.levels=t.levels},r.swapAudioCodec=function(){this.audioCodecSwap=!this.audioCodecSwap},r.seekToStartPos=function(){var e=this.media;if(e){var t=e.currentTime,r=this.startPosition;if(r>=0&&t<r){if(e.seeking)return void this.log("could not seek to "+r+", already seeking at "+t);var i=ii.getBuffered(e),n=(i.length?i.start(0):0)-r;n>0&&(n<this.config.maxBufferHole||n<this.config.maxFragLookUpTolerance)&&(this.log("adjusting start position by "+n+" to match buffer start"),r+=n,this.startPosition=r),this.log("seek to target start position "+r+" from current time "+t),e.currentTime=r}}},r._getAudioCodec=function(e){var t=this.config.defaultAudioCodec||e.audioCodec;return this.audioCodecSwap&&t&&(this.log("Swapping audio codec"),t=-1!==t.indexOf("mp4a.40.5")?"mp4a.40.2":"mp4a.40.5"),t},r._loadBitrateTestFrag=function(e,t){var r=this;e.bitrateTest=!0,this._doFragLoad(e,t).then((function(i){var n=r.hls;if(i&&!r.fragContextChanged(e)){t.fragmentError=0,r.state=Si,r.startFragRequested=!1,r.bitrateTest=!1;var a=e.stats;a.parsing.start=a.parsing.end=a.buffering.start=a.buffering.end=self.performance.now(),n.trigger(S.FRAG_LOADED,i),e.bitrateTest=!1}}))},r._handleTransmuxComplete=function(e){var t,r="main",i=this.hls,n=e.remuxResult,a=e.chunkMeta,s=this.getCurrentContext(a);if(s){var o=s.frag,l=s.part,u=s.level,h=n.video,d=n.text,c=n.id3,f=n.initSegment,g=u.details,v=this.altAudio?void 0:n.audio;if(this.fragContextChanged(o))this.fragmentTracker.removeFragment(o);else{if(this.state=bi,f){if(null!=f&&f.tracks){var m=o.initSegment||o;this._bufferInitSegment(u,f.tracks,m,a),i.trigger(S.FRAG_PARSING_INIT_SEGMENT,{frag:m,id:r,tracks:f.tracks})}var p=f.initPTS,E=f.timescale;y(p)&&(this.initPTS[o.cc]={baseTime:p,timescale:E},i.trigger(S.INIT_PTS_FOUND,{frag:o,id:r,initPTS:p,timescale:E}))}if(h&&g&&"initSegment"!==o.sn){var T=g.fragments[o.sn-1-g.startSN],L=o.sn===g.startSN,A=!T||o.cc>T.cc;if(!1!==n.independent){var R=h.startPTS,k=h.endPTS,b=h.startDTS,D=h.endDTS;if(l)l.elementaryStreams[h.type]={startPTS:R,endPTS:k,startDTS:b,endDTS:D};else if(h.firstKeyFrame&&h.independent&&1===a.id&&!A&&(this.couldBacktrack=!0),h.dropped&&h.independent){var I=this.getMainFwdBufferInfo(),w=(I?I.end:this.getLoadPosition())+this.config.maxBufferHole,C=h.firstKeyFramePTS?h.firstKeyFramePTS:R;if(!L&&w<C-this.config.maxBufferHole&&!A)return void this.backtrack(o);A&&(o.gap=!0),o.setElementaryStreamInfo(h.type,o.start,k,o.start,D,!0)}else L&&R>2&&(o.gap=!0);o.setElementaryStreamInfo(h.type,R,k,b,D),this.backtrackFragment&&(this.backtrackFragment=o),this.bufferFragmentData(h,o,l,a,L||A)}else{if(!L&&!A)return void this.backtrack(o);o.gap=!0}}if(v){var _=v.startPTS,x=v.endPTS,P=v.startDTS,F=v.endDTS;l&&(l.elementaryStreams[O]={startPTS:_,endPTS:x,startDTS:P,endDTS:F}),o.setElementaryStreamInfo(O,_,x,P,F),this.bufferFragmentData(v,o,l,a)}if(g&&null!=c&&null!=(t=c.samples)&&t.length){var M={id:r,frag:o,details:g,samples:c.samples};i.trigger(S.FRAG_PARSING_METADATA,M)}if(g&&d){var N={id:r,frag:o,details:g,samples:d.samples};i.trigger(S.FRAG_PARSING_USERDATA,N)}}}else this.resetWhenMissingContext(a)},r._bufferInitSegment=function(e,t,r,i){var n=this;if(this.state===bi){this.audioOnly=!!t.audio&&!t.video,this.altAudio&&!this.audioOnly&&delete t.audio;var a=t.audio,s=t.video,o=t.audiovideo;if(a){var l=e.audioCodec,u=navigator.userAgent.toLowerCase();if(this.audioCodecSwitch){l&&(l=-1!==l.indexOf("mp4a.40.5")?"mp4a.40.2":"mp4a.40.5");var h=a.metadata;h&&"channelCount"in h&&1!==(h.channelCount||1)&&-1===u.indexOf("firefox")&&(l="mp4a.40.5")}l&&-1!==l.indexOf("mp4a.40.5")&&-1!==u.indexOf("android")&&"audio/mpeg"!==a.container&&(l="mp4a.40.2",this.log("Android: force audio codec to "+l)),e.audioCodec&&e.audioCodec!==l&&this.log('Swapping manifest audio codec "'+e.audioCodec+'" for "'+l+'"'),a.levelCodec=l,a.id="main",this.log("Init audio buffer, container:"+a.container+", codecs[selected/level/parsed]=["+(l||"")+"/"+(e.audioCodec||"")+"/"+a.codec+"]")}s&&(s.levelCodec=e.videoCodec,s.id="main",this.log("Init video buffer, container:"+s.container+", codecs[level/parsed]=["+(e.videoCodec||"")+"/"+s.codec+"]")),o&&this.log("Init audiovideo buffer, container:"+o.container+", codecs[level/parsed]=["+e.codecs+"/"+o.codec+"]"),this.hls.trigger(S.BUFFER_CODECS,t),Object.keys(t).forEach((function(e){var a=t[e].initSegment;null!=a&&a.byteLength&&n.hls.trigger(S.BUFFER_APPENDING,{type:e,data:a,frag:r,part:null,chunkMeta:i,parent:r.type})})),this.tickImmediate()}},r.getMainFwdBufferInfo=function(){return this.getFwdBufferInfo(this.mediaBuffer?this.mediaBuffer:this.media,Mt)},r.backtrack=function(e){this.couldBacktrack=!0,this.backtrackFragment=e,this.resetTransmuxer(),this.flushBufferGap(e),this.fragmentTracker.removeFragment(e),this.fragPrevious=null,this.nextLoadPosition=e.start,this.state=Si},r.checkFragmentChanged=function(){var e=this.media,t=null;if(e&&e.readyState>1&&!1===e.seeking){var r=e.currentTime;if(ii.isBuffered(e,r)?t=this.getAppendedFrag(r):ii.isBuffered(e,r+.1)&&(t=this.getAppendedFrag(r+.1)),t){this.backtrackFragment=null;var i=this.fragPlaying,n=t.level;i&&t.sn===i.sn&&i.level===n||(this.fragPlaying=t,this.hls.trigger(S.FRAG_CHANGED,{frag:t}),i&&i.level===n||this.hls.trigger(S.LEVEL_SWITCHED,{level:n}))}}},s(t,[{key:"nextLevel",get:function(){var e=this.nextBufferedFrag;return e?e.level:-1}},{key:"currentFrag",get:function(){var e=this.media;return e?this.fragPlaying||this.getAppendedFrag(e.currentTime):null}},{key:"currentProgramDateTime",get:function(){var e=this.media;if(e){var t=e.currentTime,r=this.currentFrag;if(r&&y(t)&&y(r.programDateTime)){var i=r.programDateTime+1e3*(t-r.start);return new Date(i)}}return null}},{key:"currentLevel",get:function(){var e=this.currentFrag;return e?e.level:-1}},{key:"nextBufferedFrag",get:function(){var e=this.currentFrag;return e?this.followingBufferedFrag(e):null}},{key:"forceStartLoad",get:function(){return this._forceStartLoad}}]),t}(xi),go=function(){function e(t){void 0===t&&(t={}),this.config=void 0,this.userConfig=void 0,this.coreComponents=void 0,this.networkControllers=void 0,this.started=!1,this._emitter=new Yn,this._autoLevelCapping=-1,this._maxHdcpLevel=null,this.abrController=void 0,this.bufferController=void 0,this.capLevelController=void 0,this.latencyController=void 0,this.levelController=void 0,this.streamController=void 0,this.audioTrackController=void 0,this.subtitleTrackController=void 0,this.emeController=void 0,this.cmcdController=void 0,this._media=null,this.url=null,this.triggeringException=void 0,I(t.debug||!1,"Hls instance");var r=this.config=function(e,t){if((t.liveSyncDurationCount||t.liveMaxLatencyDurationCount)&&(t.liveSyncDuration||t.liveMaxLatencyDuration))throw new Error("Illegal hls.js config: don't mix up liveSyncDurationCount/liveMaxLatencyDurationCount and liveSyncDuration/liveMaxLatencyDuration");if(void 0!==t.liveMaxLatencyDurationCount&&(void 0===t.liveSyncDurationCount||t.liveMaxLatencyDurationCount<=t.liveSyncDurationCount))throw new Error('Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"');if(void 0!==t.liveMaxLatencyDuration&&(void 0===t.liveSyncDuration||t.liveMaxLatencyDuration<=t.liveSyncDuration))throw new Error('Illegal hls.js config: "liveMaxLatencyDuration" must be greater than "liveSyncDuration"');var r=no(e),n=["TimeOut","MaxRetry","RetryDelay","MaxRetryTimeout"];return["manifest","level","frag"].forEach((function(e){var i=("level"===e?"playlist":e)+"LoadPolicy",a=void 0===t[i],s=[];n.forEach((function(n){var o=e+"Loading"+n,l=t[o];if(void 0!==l&&a){s.push(o);var u=r[i].default;switch(t[i]={default:u},n){case"TimeOut":u.maxLoadTimeMs=l,u.maxTimeToFirstByteMs=l;break;case"MaxRetry":u.errorRetry.maxNumRetry=l,u.timeoutRetry.maxNumRetry=l;break;case"RetryDelay":u.errorRetry.retryDelayMs=l,u.timeoutRetry.retryDelayMs=l;break;case"MaxRetryTimeout":u.errorRetry.maxRetryDelayMs=l,u.timeoutRetry.maxRetryDelayMs=l}}})),s.length&&w.warn('hls.js config: "'+s.join('", "')+'" setting(s) are deprecated, use "'+i+'": '+JSON.stringify(t[i]))})),i(i({},r),t)}(e.DefaultConfig,t);this.userConfig=t,r.progressive&&ao(r);var n=r.abrController,a=r.bufferController,s=r.capLevelController,o=r.errorController,l=r.fpsController,u=new o(this),h=this.abrController=new n(this),d=this.bufferController=new a(this),c=this.capLevelController=new s(this),f=new l(this),g=new Gt(this),v=new Zt(this),m=r.contentSteeringController,p=m?new m(this):null,y=this.levelController=new so(this,p),E=new Zr(this),T=new lo(this.config),L=this.streamController=new fo(this,E,T);c.setStreamController(L),f.setStreamController(L);var A=[g,y,L];p&&A.splice(1,0,p),this.networkControllers=A;var R=[h,d,c,f,v,E];this.audioTrackController=this.createController(r.audioTrackController,A);var k=r.audioStreamController;k&&A.push(new k(this,E,T)),this.subtitleTrackController=this.createController(r.subtitleTrackController,A);var b=r.subtitleStreamController;b&&A.push(new b(this,E,T)),this.createController(r.timelineController,R),T.emeController=this.emeController=this.createController(r.emeController,R),this.cmcdController=this.createController(r.cmcdController,R),this.latencyController=this.createController(er,R),this.coreComponents=R,A.push(u);var D=u.onErrorOut;"function"==typeof D&&this.on(S.ERROR,D,u)}e.isMSESupported=function(){return ho()},e.isSupported=function(){return function(){if(!ho())return!1;var e=ot();return"function"==typeof(null==e?void 0:e.isTypeSupported)&&(["avc1.42E01E,mp4a.40.2","av01.0.01M.08","vp09.00.50.08"].some((function(t){return e.isTypeSupported(dt(t,"video"))}))||["mp4a.40.2","fLaC"].some((function(t){return e.isTypeSupported(dt(t,"audio"))})))}()},e.getMediaSource=function(){return ot()};var t=e.prototype;return t.createController=function(e,t){if(e){var r=new e(this);return t&&t.push(r),r}return null},t.on=function(e,t,r){void 0===r&&(r=this),this._emitter.on(e,t,r)},t.once=function(e,t,r){void 0===r&&(r=this),this._emitter.once(e,t,r)},t.removeAllListeners=function(e){this._emitter.removeAllListeners(e)},t.off=function(e,t,r,i){void 0===r&&(r=this),this._emitter.off(e,t,r,i)},t.listeners=function(e){return this._emitter.listeners(e)},t.emit=function(e,t,r){return this._emitter.emit(e,t,r)},t.trigger=function(e,t){if(this.config.debug)return this.emit(e,e,t);try{return this.emit(e,e,t)}catch(t){if(w.error("An internal error happened while handling event "+e+'. Error message: "'+t.message+'". Here is a stacktrace:',t),!this.triggeringException){this.triggeringException=!0;var r=e===S.ERROR;this.trigger(S.ERROR,{type:L.OTHER_ERROR,details:A.INTERNAL_EXCEPTION,fatal:r,event:e,error:t}),this.triggeringException=!1}}return!1},t.listenerCount=function(e){return this._emitter.listenerCount(e)},t.destroy=function(){w.log("destroy"),this.trigger(S.DESTROYING,void 0),this.detachMedia(),this.removeAllListeners(),this._autoLevelCapping=-1,this.url=null,this.networkControllers.forEach((function(e){return e.destroy()})),this.networkControllers.length=0,this.coreComponents.forEach((function(e){return e.destroy()})),this.coreComponents.length=0;var e=this.config;e.xhrSetup=e.fetchSetup=void 0,this.userConfig=null},t.attachMedia=function(e){w.log("attachMedia"),this._media=e,this.trigger(S.MEDIA_ATTACHING,{media:e})},t.detachMedia=function(){w.log("detachMedia"),this.trigger(S.MEDIA_DETACHING,void 0),this._media=null},t.loadSource=function(e){this.stopLoad();var t=this.media,r=this.url,i=this.url=p.buildAbsoluteURL(self.location.href,e,{alwaysNormalize:!0});this._autoLevelCapping=-1,this._maxHdcpLevel=null,w.log("loadSource:"+i),t&&r&&(r!==i||this.bufferController.hasSourceTypes())&&(this.detachMedia(),this.attachMedia(t)),this.trigger(S.MANIFEST_LOADING,{url:e})},t.startLoad=function(e){void 0===e&&(e=-1),w.log("startLoad("+e+")"),this.started=!0,this.resumeBuffering();for(var t=0;t<this.networkControllers.length&&(this.networkControllers[t].startLoad(e),this.started&&this.networkControllers);t++);},t.stopLoad=function(){w.log("stopLoad"),this.started=!1;for(var e=0;e<this.networkControllers.length&&(this.networkControllers[e].stopLoad(),!this.started&&this.networkControllers);e++);},t.resumeBuffering=function(){w.log("resume buffering"),this.networkControllers.forEach((function(e){e.resumeBuffering&&e.resumeBuffering()}))},t.pauseBuffering=function(){w.log("pause buffering"),this.networkControllers.forEach((function(e){e.pauseBuffering&&e.pauseBuffering()}))},t.swapAudioCodec=function(){w.log("swapAudioCodec"),this.streamController.swapAudioCodec()},t.recoverMediaError=function(){w.log("recoverMediaError");var e=this._media;this.detachMedia(),e&&this.attachMedia(e)},t.removeLevel=function(e){this.levelController.removeLevel(e)},t.setAudioOption=function(e){var t;return null==(t=this.audioTrackController)?void 0:t.setAudioOption(e)},t.setSubtitleOption=function(e){var t;return null==(t=this.subtitleTrackController)||t.setSubtitleOption(e),null},s(e,[{key:"levels",get:function(){var e=this.levelController.levels;return e||[]}},{key:"currentLevel",get:function(){return this.streamController.currentLevel},set:function(e){w.log("set currentLevel:"+e),this.levelController.manualLevel=e,this.streamController.immediateLevelSwitch()}},{key:"nextLevel",get:function(){return this.streamController.nextLevel},set:function(e){w.log("set nextLevel:"+e),this.levelController.manualLevel=e,this.streamController.nextLevelSwitch()}},{key:"loadLevel",get:function(){return this.levelController.level},set:function(e){w.log("set loadLevel:"+e),this.levelController.manualLevel=e}},{key:"nextLoadLevel",get:function(){return this.levelController.nextLoadLevel},set:function(e){this.levelController.nextLoadLevel=e}},{key:"firstLevel",get:function(){return Math.max(this.levelController.firstLevel,this.minAutoLevel)},set:function(e){w.log("set firstLevel:"+e),this.levelController.firstLevel=e}},{key:"startLevel",get:function(){var e=this.levelController.startLevel;return-1===e&&this.abrController.forcedAutoLevel>-1?this.abrController.forcedAutoLevel:e},set:function(e){w.log("set startLevel:"+e),-1!==e&&(e=Math.max(e,this.minAutoLevel)),this.levelController.startLevel=e}},{key:"capLevelToPlayerSize",get:function(){return this.config.capLevelToPlayerSize},set:function(e){var t=!!e;t!==this.config.capLevelToPlayerSize&&(t?this.capLevelController.startCapping():(this.capLevelController.stopCapping(),this.autoLevelCapping=-1,this.streamController.nextLevelSwitch()),this.config.capLevelToPlayerSize=t)}},{key:"autoLevelCapping",get:function(){return this._autoLevelCapping},set:function(e){this._autoLevelCapping!==e&&(w.log("set autoLevelCapping:"+e),this._autoLevelCapping=e,this.levelController.checkMaxAutoUpdated())}},{key:"bandwidthEstimate",get:function(){var e=this.abrController.bwEstimator;return e?e.getEstimate():NaN},set:function(e){this.abrController.resetEstimator(e)}},{key:"ttfbEstimate",get:function(){var e=this.abrController.bwEstimator;return e?e.getEstimateTTFB():NaN}},{key:"maxHdcpLevel",get:function(){return this._maxHdcpLevel},set:function(e){(function(e){return tr.indexOf(e)>-1})(e)&&this._maxHdcpLevel!==e&&(this._maxHdcpLevel=e,this.levelController.checkMaxAutoUpdated())}},{key:"autoLevelEnabled",get:function(){return-1===this.levelController.manualLevel}},{key:"manualLevel",get:function(){return this.levelController.manualLevel}},{key:"minAutoLevel",get:function(){var e=this.levels,t=this.config.minAutoBitrate;if(!e)return 0;for(var r=e.length,i=0;i<r;i++)if(e[i].maxBitrate>=t)return i;return 0}},{key:"maxAutoLevel",get:function(){var e,t=this.levels,r=this.autoLevelCapping,i=this.maxHdcpLevel;if(e=-1===r&&null!=t&&t.length?t.length-1:r,i)for(var n=e;n--;){var a=t[n].attrs["HDCP-LEVEL"];if(a&&a<=i)return n}return e}},{key:"firstAutoLevel",get:function(){return this.abrController.firstAutoLevel}},{key:"nextAutoLevel",get:function(){return this.abrController.nextAutoLevel},set:function(e){this.abrController.nextAutoLevel=e}},{key:"playingDate",get:function(){return this.streamController.currentProgramDateTime}},{key:"mainForwardBufferInfo",get:function(){return this.streamController.getMainFwdBufferInfo()}},{key:"allAudioTracks",get:function(){var e=this.audioTrackController;return e?e.allAudioTracks:[]}},{key:"audioTracks",get:function(){var e=this.audioTrackController;return e?e.audioTracks:[]}},{key:"audioTrack",get:function(){var e=this.audioTrackController;return e?e.audioTrack:-1},set:function(e){var t=this.audioTrackController;t&&(t.audioTrack=e)}},{key:"allSubtitleTracks",get:function(){var e=this.subtitleTrackController;return e?e.allSubtitleTracks:[]}},{key:"subtitleTracks",get:function(){var e=this.subtitleTrackController;return e?e.subtitleTracks:[]}},{key:"subtitleTrack",get:function(){var e=this.subtitleTrackController;return e?e.subtitleTrack:-1},set:function(e){var t=this.subtitleTrackController;t&&(t.subtitleTrack=e)}},{key:"media",get:function(){return this._media}},{key:"subtitleDisplay",get:function(){var e=this.subtitleTrackController;return!!e&&e.subtitleDisplay},set:function(e){var t=this.subtitleTrackController;t&&(t.subtitleDisplay=e)}},{key:"lowLatencyMode",get:function(){return this.config.lowLatencyMode},set:function(e){this.config.lowLatencyMode=e}},{key:"liveSyncPosition",get:function(){return this.latencyController.liveSyncPosition}},{key:"latency",get:function(){return this.latencyController.latency}},{key:"maxLatency",get:function(){return this.latencyController.maxLatency}},{key:"targetLatency",get:function(){return this.latencyController.targetLatency}},{key:"drift",get:function(){return this.latencyController.drift}},{key:"forceStartLoad",get:function(){return this.streamController.forceStartLoad}}],[{key:"version",get:function(){return"1.5.20"}},{key:"Events",get:function(){return S}},{key:"ErrorTypes",get:function(){return L}},{key:"ErrorDetails",get:function(){return A}},{key:"DefaultConfig",get:function(){return e.defaultConfig?e.defaultConfig:io},set:function(t){e.defaultConfig=t}}]),e}();return go.defaultConfig=void 0,go},"object"==typeof exports&&"undefined"!=typeof module?module.exports=i():"function"==typeof define&&define.amd?define(i):(r="undefined"!=typeof globalThis?globalThis:r||self).Hls=i()}(!1);
//# sourceMappingURL=hls.min.js.map


(function () {
'use strict';
(() => {
  // src/dbg.js
  var W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  var stats = {};
  var hooks = {};
  var pendingHooks = [];
  function dbgInit() {
    if (true) return;
    W.__dbg = ["iife-start"];
    window.addEventListener("error", function(e) {
      if (!e.message && e.target) return;
      W.__dbg.push("ERR: " + (e.message || "unknown") + " @" + (e.lineno || "?"));
    }, true);
    W.__ACSV_TEST__ = {
      getStats: function() {
        return JSON.parse(JSON.stringify(stats));
      },
      stat: function(k, d) {
        stats[k] = (stats[k] || 0) + (d == null ? 1 : d);
      },
      set: function(k, v) {
        stats[k] = v;
      },
      // call('feed') 之类：调用模块注册的测试钩子
      call: function(name) {
        var fn = hooks[name];
        return fn ? fn.apply(null, Array.prototype.slice.call(arguments, 1)) : void 0;
      }
    };
    for (var i = 0; i < pendingHooks.length; i++) hooks[pendingHooks[i][0]] = pendingHooks[i][1];
    pendingHooks.length = 0;
    setInterval(function() {
      try {
        localStorage.setItem("acsv-stats", JSON.stringify({
          t: Date.now(),
          stats,
          dbg: (W.__dbg || []).slice(-60)
        }));
      } catch (e) {
      }
    }, 1e3);
  }
  function noop() {
  }
  var dbg = false ? function(label) {
    (W.__dbg = W.__dbg || []).push(label);
  } : noop;
  var stat = false ? function(k, d) {
    stats[k] = (stats[k] || 0) + (d == null ? 1 : d);
  } : noop;
  var set = false ? function(k, v) {
    stats[k] = v;
  } : noop;
  var testHook = false ? function(name, fn) {
    if (window.__ACSV_TEST__) hooks[name] = fn;
    else pendingHooks.push([name, fn]);
  } : noop;

  // src/cfg.js
  var CFG = {
    hash: "svfeed",
    lsSound: "acsv-sound-on",
    lsSource: "acsv-source",
    // 内容源记忆：sv=小视频 home=首页推荐
    lsDm: "acsv-dm-on",
    // 弹幕开关记忆
    lsQuality: "acsv-quality",
    // 清晰度记忆（推荐模式，存 qualityLabel）
    lsCodec: "acsv-codec",
    // 编码偏好记忆（推荐模式）：auto|avc|hevc
    lsBuf: "acsv-buf",
    // 缓冲档位记忆（推荐模式）：std|mid|max
    lsEmotRecent: "acsv_emot_recent_v1",
    // 表情面板最近使用（emoticon.js）
    lsUpd: "acsv-upd-v1",
    // 更新检查状态：{seen,notified,ignored,lastCheck}（release.js）
    accent: "#fd4c5d",
    home: {
      appVer: "6.31.1.1026",
      ua: "acvideo core/6.31.1.1026(OPPO;OPPO A83;7.1.1)",
      mkey: "AAHewK3eIAAyMTkwNTExNzYAAhAAMEP1uwSZbohCYAAAAJlXIdNAMQR5fM2F-KEOYN5wnGQA6_eLEvGiajzUp4_YnU8EjTm7gzNYhBv59oCCDhbdkmIwsXnF9PgS5ly8eQyjuXlcS7VpWG0QlK0HakVDamteMHNHIui0A8V4tmELqQ%3D%3D"
    },
    api: {
      feed: "https://m.acfun.cn/rest/mobile-direct/meow/feedList?count=20&firstPage=false",
      info: "https://m.acfun.cn/rest/mobile-direct/meow/info?meowId=",
      comment: "https://www.acfun.cn/rest/pc-direct/comment/list?sourceId=",
      commentSub: "https://www.acfun.cn/rest/pc-direct/comment/sublist",
      commentAdd: "https://www.acfun.cn/rest/pc-direct/comment/add",
      commentLikePc: "https://www.acfun.cn/rest/pc-direct/comment/",
      token: "https://id.app.acfun.cn/rest/web/token/get",
      interact: "https://api.kuaishouzt.com/rest/zt/interact/",
      follow: "https://www.acfun.cn/rest/pc-direct/relation/follow",
      emotion: "https://m.acfun.cn/rest/mobile-direct/emotion/getUserEmotion",
      upPage: "https://m.acfun.cn/upPage/",
      shareBase: "https://m.acfun.cn/sv/?mid=",
      userBase: "https://www.acfun.cn/u/",
      videoBase: "https://www.acfun.cn/v/ac",
      articleBase: "https://www.acfun.cn/a/ac",
      // ---- 私信分享（网页私信 = 快手 ImSdk over WebSocket，无 REST 发送端点） ----
      // imsdk CDN hash 随官方发版变化，运行时优先取页面 globalConfig.imsdkcdn，此为兜底
      imsdk: "https://static.yximgs.com/udata/pkg/acfun-im/ImSdk.eb6e95.js",
      // IM 图片资源官方下载域：内核换链产物指向远端配置下发的 apiAddress（sixinpic.kuaishou.com，
      // 实测对 acfun token 401）；官方页同资源走本域、参数不含 token 即 200（0.9.41 实测）
      imDownloadBase: "https://message.acfun.cn",
      userCard: "https://www.acfun.cn/rest/pc-direct/user/getUserCardList",
      defaultAvatar: "https://imgs.aixifan.com/style/image/defaultAvatar.jpg",
      logoSvg: "https://ali-imgs.acfun.cn/kos/nlav10360/static/common/widget/header/img/acfunlogo.11a9841251f31e1a3316.svg",
      // ---- APP 家族接口（api-new.app.acfun.cn，免登录读 + 域 Cookie 写） ----
      homeFeed: "https://api-new.app.acfun.cn/rest/app/selection/feed",
      dougaInfo: "https://api-new.app.acfun.cn/rest/app/douga/info",
      playInfo: "https://api-new.app.acfun.cn/rest/app/play/playInfo/cast",
      // ---- 收藏（www.acfun.cn PC 端收藏夹体系，网页 Cookie 鉴权） ----
      favoriteAdd: "https://www.acfun.cn/rest/pc-direct/favorite/resource/add",
      favoriteRemove: "https://www.acfun.cn/rest/pc-direct/favorite/resource/remove",
      favFolderList: "https://www.acfun.cn/rest/pc-direct/favorite/folder/list",
      favDougaList: "https://www.acfun.cn/rest/pc-direct/favorite/resource/dougaList",
      bananaPc: "https://www.acfun.cn/rest/pc-direct/banana/throwBanana",
      // ---- 视图面板（0.9.62，契约见 docs/api-research.md §4/§6 实测） ----
      history: "https://www.acfun.cn/rest/pc-direct/browse/history/list",
      rank: "https://www.acfun.cn/rest/pc-direct/rank/channel",
      navTree: "https://www.acfun.cn/rest/pc-direct/page/queryNavigators",
      // 站内搜索（0.9.72）：**非 JSON**——整页 SSR HTML（结果区 div.search-video），
      // 走 net.requestText + data.parseSearchItems；?pageNo= 实测无效（两页同一结果集），只做首屏
      search: "https://www.acfun.cn/search",
      // ---- 弹幕（www.acfun.cn 同域，网页 Cookie 鉴权） ----
      dmList: "https://www.acfun.cn/rest/pc-direct/new-danmaku/list",
      dmAdd: "https://www.acfun.cn/rest/pc-direct/new-danmaku/add",
      // hls.js 分发源（按序尝试）：jsdelivr 大陆常不可达（0.9.12 实测连续拉取失败），
      // npmmirror（阿里）优先；两源同版本，拉取文本后 Function 执行，无签名校验需求
      hlsCdns: [
        "https://registry.npmmirror.com/hls.js/1.5.20/files/dist/hls.min.js",
        "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js"
      ],
      // ---- 更新检查（0.9.60）：GitHub 官方 releases.atom（与 @downloadURL 同域——分发通道
      // 可达则它可达；无 API 限流）。正文直接用官方渲染 HTML，releasePage 供「前往更新」跳转
      ghRelAtom: "https://github.com/name-xxl/acfun-svfeed/releases.atom",
      releasePage: "https://github.com/name-xxl/acfun-svfeed/releases/latest"
    },
    feed: { bufferSize: 4 },
    // 滚动缓冲：当前条之后保持的余量（条数）
    homeFeedCfg: { count: 10 },
    page: { size: 10 },
    up: { maxChainPages: 20 },
    // 空间页自动链式加载页数上限（防几千条 UP 无感轰炸几百个请求）
    danmaku: {
      maxPages: 8,
      // 全量列表最多翻页数（每页 200 条）
      pageSize: 200,
      scrollSec: 8,
      // 滚动弹幕穿过全屏时长（速度基准）
      staySec: 4
      // 顶部/底部弹幕停留时长
    },
    stall: {
      // FROZEN 判定（rVFC 事件驱动）：超过 gapFactor×理论帧间隔无新帧、且时间轴仍在推进
      gapFactor: 3.5,
      minGapMs: 150,
      // 武装超时下限（ms）
      arriveFactor: 2.5,
      // 自校准系数：武装间隔取 理论帧间隔 与 近期实际到帧间隔×此值 的大者
      // （低帧率流/慢放态下「帧来得慢」不被误判成冻结；与判冻的 gapFactor 是两回事）
      fpsEmaA: 0.2,
      // 渲染帧率 EMA 平滑系数（逐帧采样）
      degWindowMs: 3e3,
      // DEGRADED（慢放）持续判定窗口
      degFpsRatio: 0.5,
      // EMA 帧率 < 源帧率×此值 → 慢放
      degDropRatio: 0.5,
      // droppedVideoFrames 占比阈值（辅助判定）
      healthyMs: 3e4,
      // 持续健康该时长后阶梯尝试数衰减 1（恢复"弹药"返还）
      fixGap: 2e3,
      // 两次自动恢复的最小间隔（0.9.10 起 2s：冻结判定本身已花 ≥1.3s 双窗确认，
      // 4s 曾让真冻结最坏 8~12s 才走到重挂，体感"冻结很久→转圈"）
      cap: 6,
      // home 模式单可见期累计自动恢复上限（回前台清零重计；期内自动降档不清，防走楼梯）
      svCap: 4,
      // sv 直链无档可降，跨重挂累计上限更低
      nudge: 0.1,
      // 无感顶针步长（秒）：前跳触发解码器重出帧
      visGraceMs: 3e3
      // 回前台保护期：合成器/解码器唤醒慢期间不进恢复阶梯（防最小化往返误判冻结降档）
    },
    // 编码偏好（推荐模式）：cast 接口档位不带编码字段，m3u8 是单变体 media playlist，
    // 编码只能从 m3u8 文件名嗅探（2026-09-28 实测：标记形如 h264_60/h264_6m，
    // 无标记档按 A 站历史编码推断为 avc）。默认 avc——HEVC 在部分 Chromium 无硬解，
    // 是 60fps 档卡帧的根源（看门狗降帧率阶梯同源）；hevc 档 label 加后缀便于辨认
    codec: {
      def: "avc",
      suffix: "·HEVC",
      // HEVC 档 label 后缀（纯 H.264 视频不加，避免视觉噪音）
      reHevc: /hevc|hvc1|hev1|h265/i
      // 嗅探 HEVC（h265 要求 h 前缀，防误伤 1080p_2650 之类码率数字）；未命中按 avc 推断
    },
    // 缓冲档位（推荐模式 hls.js 构造参数）。maxBufferSize 单位是字节
    // （0.9.1 前误写 120 当 MB，实为 120 字节，被 maxBufferLength 的时间上限掩盖）。
    // 0.9.41 降流量调优：60/180/480s → 10/20/30s（maxMax/Bytes 等比收缩；backBuffer
    // 保持原值——回退缓冲不产生前向流量，调小反而会让回拖进度条重新下载）
    buf: {
      def: "mid",
      presets: {
        std: { label: "标准", maxBufferLength: 10, maxMaxBufferLength: 20, maxBufferSize: 15e6, backBufferLength: 30 },
        mid: { label: "加大", maxBufferLength: 20, maxMaxBufferLength: 40, maxBufferSize: 3e7, backBufferLength: 30 },
        max: { label: "极限", maxBufferLength: 30, maxMaxBufferLength: 60, maxBufferSize: 45e6, backBufferLength: 60 }
      }
    },
    time: {
      ctlIdle: 2500,
      // 控制栏闲置隐藏
      hold: 350,
      // 长按右键进入 2x 的阈值
      toast: 1800,
      // toast 停留
      xhr: 15e3,
      // XHR 超时
      gm: 2e4,
      // GM 请求超时
      chainGap: 30,
      // 空间页链式加载间隔
      hotGap: 120,
      // 最热统计批次间隔
      seekStep: 5,
      // 左右键快进/快退秒数
      navWait: 6e3,
      // 导航注入兜底等待
      ghostIv: 5e3,
      // 幽灵视频扫描间隔（兜底，低频即可）
      watchReportMin: 3,
      // 观看历史上报门槛：离开时进度达到该秒数才计入历史（过滤闪滑）
      watchReport: 1e4,
      // 首报兜底：playing 后墙钟 10s 先保底入史（关标签页时离开上报送不出去）
      upd: 1e4,
      // release.atom 拉取超时
      updGap: 6e4
      // 两次更新检查最小间隔：防 Esc 频繁进出竖刷刷请求（mock 注入时绕过）
    },
    nav: {
      labels: ["首页", "番剧", "直播", "文章区", "鱼塘"],
      tries: 20,
      retryMs: 500,
      // 页面白名单：仅命中 pathname 的页面才跑导航注入/胶囊兜底。
      // 0.9.47 起收窄为首页——其余页面（独立布局/工具页/内容消费页）注入无意义或非目标场景，
      // 此前全站盲试会让 6 秒兜底胶囊出现在播放页等非首页处
      pages: [/^\/$/]
    },
    io: { ratio: 0.6 },
    fmt: { wanMin: 9999 },
    // ---- 子视图（0.9.62）：#svfeed/<view>/<arg>，左栏入口 + 面板参数 ----
    view: {
      narrow: 720,
      // 视口宽低于此值隐藏左栏（竖刷是移动式布局，面板无意义）
      dockW: 168,
      // 左栏展开宽（抖音式全高导航；scroller/info/视图 padding 与之绑定）
      pageSize: 20,
      // 观看历史/收藏夹每页
      me: {
        // 我的页（0.9.69 抖音式个人主页）
        gridMin: 280,
        // 网格卡最小列宽（列数随容器宽自适应，不写死断点；1920 下 5 列）
        gridGap: 16,
        // 网格间距
        // 封面比例=4:3：A 站**普通视频封面固定 4:3**（只有小视频是 3:4）——历史/收藏条目
        // 经契约层过滤后全是普通视频（panelItem 只收 resourceType=2+videoId），套 3:4 会把
        // 封面左右各裁掉一大块（连标题字都被切）。将来若混入小视频条目需按 kind 分档
        coverRatio: "4 / 3",
        cardTtl: 18e5,
        // 头部资料缓存（30min；视图每次进入重建 DOM，命中缓存免重复请求）
        skel: 12
        // 首屏骨架卡数（约一屏）
      },
      rankLimit: 100,
      // 榜单条数（原生全站日榜 100 条同款，rankLimit=100 实测生效）
      // 视图正文让位的最小视口宽（0.9.73）：抽屉占槽时视图正文右缘收窄到抽屉左缘，低于此宽
      // 退化为纯覆盖（与 comments.avoidMin 同款降级哲学）。推导=榜单行最小可用宽 ≈546
      // （封面 160+行左右 padding 32+gap 16+UP 卡 338）+ 正文左右内边距 206（dockW+14 与 24）
      // + 抽屉 380 ≈ 1132，向上取整；视图不能像视频那样缩放，阈值只能比 avoidMin 更严
      avoidW: 1140,
      // 抽屉避让下顶栏搜索框的隐藏阈值（视口宽，0.9.73）：顶栏收窄到抽屉左缘后，搜索框可用宽
      // = 剩余宽 − 右组预留 304（2×右组 128 + 2×间距 12 + 两侧 48）；低于「最小可用宽 160」
      // 即不可用 → 隐藏只留按钮组。推导=dockW 168 + 抽屉 380 + 304 + 160 ≈ 1012
      avoidTopW: 1012,
      search: {
        // 搜索视图（0.9.72 抖音式结果网格；封面 16:9 为搜索页原始比例）
        gridMin: 300,
        // 网格卡最小列宽（1920 下约 5-6 列，对齐抖音搜索页密度）
        gridGap: 16
      },
      periods: ["DAY", "THREE_DAYS", "WEEK"],
      // 榜期（原生：今日/三日/本周）
      periodNames: { DAY: "今日", THREE_DAYS: "三日", WEEK: "本周" },
      zones: [
        // 频道全集（对齐原生榜单页 tab 序；cid 实测 docs/api-research.md §6.2）：
        // 番剧不放（cid=155 仅 3 条杂项）、文章榜不放（89 条全 contentType=3，竖刷不支持）
        { id: 0, name: "全站综合" },
        { id: 1, name: "动画" },
        { id: 60, name: "娱乐" },
        { id: 201, name: "生活" },
        { id: 58, name: "音乐" },
        { id: 123, name: "舞蹈·偶像" },
        { id: 59, name: "游戏" },
        { id: 70, name: "科技" },
        { id: 68, name: "影视" },
        { id: 69, name: "体育" },
        { id: 125, name: "鱼塘" }
      ]
    },
    comments: {
      drawerW: 380,
      // 抽屉宽度（窄屏按比例收缩）
      drawerMaxWp: 0.88,
      // 抽屉最大占视口宽比例
      scaleMin: 0.3,
      // 视频区缩放下限
      avoidMin: 0.5,
      // 剩余空间占视口比低于此值时放弃避让改纯覆盖（视频不缩放原尺寸续播，抽屉近乎全遮）
      subCount: 20,
      // 楼中楼每页条数
      imgMax: 10 * 1024 * 1024,
      // 评论图片上传上限
      scrollPad: 80,
      // 无限滚动触发提前量（px）
      recentMax: 12
      // 最近使用表情保留数
    },
    rate: [0.5, 1, 1.5, 2],
    // 倍速循环档位
    win: { back: 1, fwd: 1 },
    // 渲染窗口：当前条向上 back/向下 fwd 张挂视频；slide DOM 与氛围背景在窗外更远一/两格回收
    im: {
      loadT: 12e3,
      // ImSdk 脚本加载超时（860KB，慢网放宽）
      connT1: 3500,
      // 等待连接的宽容期：widget 自带 3 次重试 + sync 自恢复，别抢跑
      connT2: 25e3,
      // 主动 connect() 后的总等待
      pollGap: 300,
      // 会话列表轮询间隔：连接后服务端 sync 需 1~2 拍
      pollMax: 15,
      // 会话轮询上限（约 4.5s，超时按空列表处理）
      sendT: 12e3,
      // 发送确认超时：官方失败无回调、链路层 10s 才超时——必须大于它，
      // 否则 SDK 的真实超时原因永远浮不出来（此前 8s 憋死过线索）
      maxLen: 1e3,
      // 官方单条字数上限（超限 sendMessage 同步返回 false）
      imgMax: 10 * 1024 * 1024,
      // 私信图片上限：与评论配图取同值（内核上传接口的真实上限未知，稳妥）
      imgSendT: 6e4,
      // 图片消息确认超时：含 SDK 内核上传图床耗时（大图慢网），远大于 sendT
      // 消息引用 wire 通道（2026-09-30 真机实测定案）：'extra'=文本消息 + proto extra
      // 字段藏 {acsvQuote} JSON，对方客户端看到「[引用] 摘要\n正文」可读文本；'reference'=
      // 原生 Reference 消息（contentType 12）——服务端接受（消息正常落地），但 AcFun APP
      // 端不渲染、提示「客户端不支持查看此消息」，故仅作保留通道（APP 后续支持了再切回）
      quoteWire: "extra",
      drawerListPoll: 1500,
      // 消息抽屉列表刷新间隔（打开期间；缓存读）
      drawerChatPoll: 1500,
      // 聊天视图新消息增量间隔（打开期间；推送进缓存后由它上屏）
      dayDivGap: 3e5,
      // 聊天时间分割线间隔：与上一条消息相隔超过该值插入时间分割（5 分钟）
      badgePoll: 5e3,
      // 顶栏未读徽标刷新间隔（仅缓存读）
      badgeDelay: 15e3
      // 徽标首次探测延迟：避免页面一打开就拉起 SDK
    },
    upload: {
      endpoint: "https://upload.kuaishouzt.com",
      // 评论图片分片上传图床
      tokenUrl: "https://www.acfun.cn/rest/pc-direct/image/upload/getToken",
      urlAfterUpload: "https://www.acfun.cn/rest/pc-direct/image/upload/getUrlAfterUpload",
      chunk: 1 << 20,
      // 分片大小（1MB）
      tokenT: 15e3,
      // getToken 超时
      chunkT: 6e4,
      // 单分片超时（二进制大，放宽）
      completeT: 3e4,
      // complete 超时
      urlT: 15e3
      // getUrlAfterUpload 超时
    }
  };
  CFG.exp = {};
  if (false) {
    try {
      CFG.exp = JSON.parse(localStorage.getItem("acsv-exp") || "{}") || {};
    } catch (e) {
    }
  }
  dbg("cfg-ok");

  // src/styles.js
  var IMGVIEW_CSS = ".acsv-imgview{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:acsv-fadein .18s ease}.acsv-imgview img{max-width:94%;max-height:94%;border-radius:6px;box-shadow:0 8px 48px rgba(0,0,0,.6);-webkit-user-select:none;user-select:none}@keyframes acsv-fadein{from{opacity:0}to{opacity:1}}";
  var RAW_CSS = '@font-face{font-family:acfun-frontend-next;src:url(//ali-imgs.acfun.cn/kos/nlav10360/static/img/acfun-frontend-next.90fc2dfc.woff) format("woff"),url(//ali-imgs.acfun.cn/kos/nlav10360/static/img/acfun-frontend-next.bdc44d05.ttf) format("truetype")}#acsv-root{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;user-select:none}.acsv-root *{box-sizing:border-box;margin:0;padding:0}.acsv-top{position:absolute;top:0;left:' + CFG.view.dockW + "px;right:0;height:var(--acsv-top-h);display:flex;align-items:center;padding:0 24px;background:linear-gradient(rgba(0,0,0,.6),transparent);z-index:30;pointer-events:none;transition:right .28s ease}.acsv-top *{pointer-events:auto}.acsv-top .acsv-sbox{position:absolute;left:50%;transform:translateX(-50%);width:min(480px,44%)}.acsv-top-right{margin-left:auto;display:flex;gap:10px}#acsv-root.acsv-with-comments .acsv-top{right:var(--acsv-dw,380px)}#acsv-root.acsv-with-comments .acsv-seg{display:none}#acsv-root.acsv-with-comments .acsv-top .acsv-sbox{width:min(480px,44%,calc(100% - 304px))}@media (max-width:" + (CFG.view.avoidTopW - 1) + 'px){#acsv-root.acsv-with-comments .acsv-top .acsv-sbox{display:none}}.acsv-top--view{background:#16161b;border-bottom:1px solid rgba(255,255,255,.08);z-index:57}.acsv-top--view .acsv-seg{display:none}.acsv-tbtn{width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;display:grid;place-items:center;font-size:16px;transition:transform .15s,background .15s}.acsv-tbtn:hover{transform:scale(1.08);background:rgba(255,255,255,.25)}.acsv-scroller{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none}.acsv-scroller::-webkit-scrollbar{display:none}.acsv-slide{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000}.acsv-video{display:block;width:100%;height:100%;object-fit:contain;cursor:pointer;z-index:5}.acsv-ambient{position:absolute;inset:-60px;z-index:0;background-size:cover;background-position:center;filter:blur(60px) brightness(.35) saturate(1.2);transform:scale(1.15)}.acsv-side{position:absolute;right:36px;bottom:96px;z-index:20;display:flex;flex-direction:column;align-items:center;gap:14px}.acsv-rail{width:56px;display:flex;flex-direction:column;align-items:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}.acsv-avatar{width:48px;height:48px;border-radius:50%;border:2px solid #fff;object-fit:cover;display:block;transition:transform .15s}.acsv-avwrap{position:relative;margin-bottom:18px}.acsv-followbtn{position:absolute;right:-2px;bottom:-4px;width:20px;height:20px;border-radius:50%;background:#fd4c5d;color:#fff;border:2px solid #111;font-size:13px;line-height:17px;text-align:center;cursor:pointer;font-weight:700;user-select:none;transition:transform .15s,background .15s;z-index:2}.acsv-followbtn:hover{transform:scale(1.15)}.acsv-followbtn.on{background:#555}.acsv-avatar:hover{transform:scale(1.08)}.acsv-rail-btn{width:56px;border:none;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;margin-bottom:18px;filter:drop-shadow(0 1px 4px rgba(0,0,0,.55))}.acsv-rail-btn svg{width:40px;height:40px;fill:#fff;transition:transform .15s,fill .15s}.acsv-rail-btn:hover svg{transform:scale(1.12)}.acsv-rail-btn.on svg{fill:var(--acsv-accent)}.acsv-rail-btn.thrown svg{fill:#ffb323}.acsv-rail-btn.bump svg{animation:acsv-bump .4s ease}@keyframes acsv-bump{0%{transform:scale(1)}40%{transform:scale(1.45)}100%{transform:scale(1)}}.acsv-count{font-size:13px;font-weight:500;line-height:16px;margin-top:4px;margin-bottom:0;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.7)}.acsv-info{position:absolute;left:24px;bottom:40px;z-index:15;max-width:min(56%,560px);color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7);transition:bottom .25s ease}.acsv-slide[data-ctl="1"] .acsv-info,.acsv-slide[data-paused="1"] .acsv-info{bottom:96px}.acsv-meta{font-size:15px;font-weight:600;line-height:21px;margin-bottom:5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}.acsv-meta .acsv-views{font-size:13px;font-weight:400;opacity:.85}.acsv-meta a{color:#fff;text-decoration:none}.acsv-meta a:hover{text-decoration:underline}.acsv-title{font-size:16px;font-weight:400;line-height:22px;max-height:66px;overflow:hidden;cursor:default}.acsv-arrows{display:flex;flex-direction:column;gap:10px}.acsv-arrow{width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.12);cursor:pointer;display:grid;place-items:center;backdrop-filter:blur(4px);transition:background .15s,transform .15s}.acsv-arrow svg{width:22px;height:22px;fill:#fff}.acsv-arrow:hover{background:rgba(255,255,255,.25);transform:scale(1.06)}.acsv-arrow:disabled{opacity:.3;cursor:default;transform:none}.acsv-controls{position:absolute;left:0;right:0;bottom:0;z-index:25;padding:26px 14px 8px;background:linear-gradient(transparent,rgba(0,0,0,.72));opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s,right .28s ease}.acsv-slide[data-ctl="1"] .acsv-controls,.acsv-slide[data-paused="1"] .acsv-controls{opacity:1;visibility:visible}.acsv-track{position:relative;height:4px;margin:0 4px 6px;border-radius:2px;background:rgba(255,255,255,.32);cursor:pointer;transition:height .15s}.acsv-track:hover,.acsv-track[data-drag="1"]{height:6px}.acsv-track-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#fd4c5d;border-radius:2px}.acsv-track-handle{position:absolute;top:50%;left:0;width:12px;height:12px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.5)}.acsv-track:hover .acsv-track-handle,.acsv-track[data-drag="1"] .acsv-track-handle{transform:translate(-50%,-50%) scale(1)}.acsv-bubble{position:absolute;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.82);padding:3px 8px;border-radius:6px;font-size:12px;display:none;white-space:nowrap}.acsv-bubble.show{display:block}.acsv-ctl-row{display:flex;align-items:center;gap:6px}.acsv-cbtn{border:none;background:none;color:#fff;cursor:pointer;height:32px;min-width:32px;padding:0 6px;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:13px;font-family:inherit;transition:background .15s;white-space:nowrap;flex:none}.acsv-cbtn:hover{background:rgba(255,255,255,.16)}.acsv-cbtn svg{width:20px;height:20px;fill:#fff}.acsv-cbtn.on{color:#fd4c5d}.acsv-cbtn.on svg{fill:#fd4c5d}.acsv-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}.acsv-cbtn.on .acsv-dot{background:#fd4c5d}.acsv-time{font-size:12px;color:#ddd;font-variant-numeric:tabular-nums;margin-left:4px;white-space:nowrap;flex:none}.acsv-icon-img{width:40px;height:40px;object-fit:contain;transition:transform .15s}.acsv-rail-btn:hover .acsv-icon-img{transform:scale(1.12)}.acsv-rail-btn.bump .acsv-icon-img{animation:acsv-bump .4s ease}.acsvg-icon-mask{display:block;width:40px;height:40px;background-color:#fff;-webkit-mask:var(--acsvg-icon) center/contain no-repeat;mask:var(--acsvg-icon) center/contain no-repeat;transition:transform .15s,background-color .15s}.acsv-rail-btn:hover .acsvg-icon-mask{transform:scale(1.12)}.acsv-rail-btn.on .acsvg-icon-mask{background-color:var(--acsv-accent)}.acsv-rail-btn.thrown .acsvg-icon-mask{background-color:#ffb323}.acsv-rail-btn.bump .acsvg-icon-mask{animation:acsv-bump .4s ease}.acsv-rail-btn.thrown{cursor:default}.acsv-drawer{position:absolute;top:0;right:0;bottom:0;width:var(--acsv-dw,380px);z-index:58;display:flex;flex-direction:column;background:rgba(22,22,27,.96);backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,.09);transform:translateX(100%);transition:transform .28s ease}.acsv-drawer.open{transform:translateX(0)}.acsv-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px;font-size:15px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.09);flex:none}.acsv-drawer-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:13px;line-height:1}.acsv-drawer-close:hover{background:rgba(255,255,255,.22)}.acsv-drawer-list{flex:1;overflow-y:auto;padding:6px 0 14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}.acsv-drawer-list::-webkit-scrollbar{width:5px}.acsv-drawer-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}.acsv-cinput{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.09);background:rgba(22,22,27,.98)}.acsv-cinput-emot{border:none;background:none;font-size:18px;cursor:pointer;flex:none;padding:2px;line-height:1}.acsv-cinput-emot:hover{transform:scale(1.12)}.acsv-cinput-text{flex:1;min-width:0;height:36px;border:none;background:rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:13px;padding:9px 12px;outline:none;font-family:inherit;resize:none}.acsv-cinput-text:focus{background:rgba(255,255,255,.16)}.acsv-cinput-send{flex:none;border:none;background:#fd4c5d;color:#fff;font-size:13px;padding:8px 16px;border-radius:999px;cursor:pointer;font-family:inherit}.acsv-cinput-send:hover{background:#ff6b7a}.acsv-emotpanel{position:absolute;left:0;right:0;bottom:57px;z-index:6;display:none;flex-direction:column;max-height:300px;padding:10px 10px 6px;background:rgba(22,22,27,.98);border-top:1px solid rgba(255,255,255,.1)}.acsv-emot-body{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}.acsv-emot-head{font-size:12px;color:#7a7f8a;padding:4px 2px 6px}.acsv-emot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:2px}.acsv-emot-item{border:none;background:none;padding:2px;cursor:pointer;line-height:0;border-radius:6px}.acsv-emot-item:hover{background:rgba(255,255,255,.08)}.acsv-emot-item img{width:100%;height:44px;object-fit:contain;pointer-events:none}.acsv-emot-foot{display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;background:rgba(255,255,255,.05);border-radius:8px}.acsv-emot-strip{display:flex;align-items:center;gap:8px;overflow-x:auto;flex:1;min-width:0;padding:2px;scrollbar-width:none}.acsv-emot-strip::-webkit-scrollbar{display:none}.acsv-emot-thumb{flex:none;width:32px;height:32px;padding:0;border:2px solid transparent;border-radius:8px;background:none;cursor:pointer;line-height:0}.acsv-emot-thumb img{width:100%;height:100%;object-fit:contain;pointer-events:none}.acsv-emot-thumb.on{border-color:#fd4c5d}.acsv-emot-page{flex:none;width:24px;height:24px;border:none;border-radius:50%;background:none;color:#999;cursor:pointer;font-size:14px;line-height:1}.acsv-emot-page:hover{background:rgba(255,255,255,.1);color:#fff}.acsv-cinput-emot svg{width:20px;height:20px;fill:#999;transition:fill .15s}.acsv-cinput-emot:hover svg{fill:#fd4c5d}.acsv-cinput-img{border:none;background:none;padding:2px;cursor:pointer;line-height:0}.acsv-cinput-img svg{width:20px;height:20px;fill:#999;transition:fill .15s}.acsv-cinput-img:hover svg{fill:#fd4c5d}.acsv-creplybtn,.acsv-cfwdbtn{cursor:pointer;color:#7a7f8a;font-size:12px;display:inline-flex;align-items:center;gap:3px}.acsv-creplybtn:hover,.acsv-cfwdbtn:hover{color:#9fd0ff}.acsv-citem{padding:10px 14px;display:flex;gap:10px;border-radius:10px;transition:background .15s}.acsv-citem:hover{background:rgba(255,255,255,.045)}.acsv-avlink{flex:none;display:block}.acsv-citem img.av{width:36px;height:36px;border-radius:50%;object-fit:cover;transition:transform .15s}.acsv-avlink:hover img.av{transform:scale(1.08)}.acsv-cbody{flex:1;min-width:0}.acsv-cname{font-size:13px;color:#9aa0ab;margin-bottom:4px;display:flex;align-items:center;gap:6px}.acsv-cname a{color:#9aa0ab;text-decoration:none}.acsv-cname a:hover{color:#e8eaed;text-decoration:underline}.acsv-cname .up{background:#fd4c5d;color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600}.acsv-ctext{font-size:14px;line-height:1.6;word-break:break-word;white-space:pre-wrap;color:#f0f1f3;user-select:text;-webkit-user-select:text}.acsv-cmeta{font-size:12px;color:#7a7f8a;margin-top:6px;display:flex;gap:12px;align-items:center}.acsv-clike{display:inline-flex;align-items:center;gap:3px;color:#7a7f8a}.acsvg-glyph{font-family:acfun-frontend-next,sans-serif;font-style:normal;font-size:11px;display:inline-block;width:12px;height:12px;line-height:12px;text-align:center;color:currentColor}.acsv-csub{margin:8px 0 2px;padding:4px 12px;background:rgba(255,255,255,.05);border-radius:10px}.acsv-csub .acsv-citem{padding:8px 0}.acsv-csub .acsv-citem:hover{background:none}.acsv-csub .acsv-citem img.av{width:26px;height:26px}.acsv-cmore{font-size:12px;color:#9fd0ff;text-decoration:none;display:inline-block;background:none;border:none;cursor:pointer;padding:0;font-family:inherit}.acsv-cmore:hover{text-decoration:underline}.acsv-hot-head{padding:10px 14px 4px;font-size:12px;color:#fd4c5d;font-weight:700;display:flex;align-items:center;gap:5px}.acsv-hot-divider{padding:12px 14px 4px;font-size:12px;color:#7a7f8a}.acsv-drawer-more{display:block;margin:12px auto;padding:8px 24px;border:1px solid rgba(255,255,255,.22);background:none;color:#ddd;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}.acsv-drawer-more:hover{background:rgba(255,255,255,.1)}.acsv-drawer-tip{padding:46px 0;text-align:center;color:#888;font-size:13px}.acsv-hint{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 16px;background:rgba(0,0,0,.72);border-radius:999px;font-size:13px;white-space:nowrap;animation:acsv-fadein .3s ease}.acsv-hint.hide{display:none}.acsv-hint-btn{border:none;background:#fd4c5d;color:#fff;font-size:12px;font-family:inherit;padding:6px 14px;border-radius:999px;cursor:pointer}.acsv-hint-btn:hover{background:#ff6b7a}.acsv-hint-x{border:none;background:none;color:#aaa;font-size:14px;cursor:pointer;padding:4px 8px;line-height:1}.acsv-hint-x:hover{color:#fff}.acsv-spinner{position:absolute;top:50%;left:50%;margin:-16px 0 0 -16px;width:32px;height:32px;z-index:8;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:acsv-spin .8s linear infinite;pointer-events:none}@keyframes acsv-spin{to{transform:rotate(360deg)}}.acsv-slide[data-state="loading"] .acsv-spinner{display:block}.acsv-spinner{display:none}.acsv-playicon{position:absolute;top:50%;left:50%;margin:-36px 0 0 -36px;z-index:9;width:72px;height:72px;border-radius:50%;background:rgba(0,0,0,.5);display:none;place-items:center;pointer-events:none}.acsv-playicon svg{width:34px;height:34px;fill:#fff;margin-left:4px}.acsv-slide[data-paused="1"] .acsv-playicon{display:grid}.acsv-errbox{position:absolute;inset:0;display:none;place-items:center;z-index:12;flex-direction:column;gap:12px;color:#bbb}.acsv-slide[data-state="error"] .acsv-errbox{display:grid}.acsv-retry{padding:8px 22px;border:none;border-radius:999px;background:#fd4c5d;color:#fff;cursor:pointer;font-size:13px}.acsv-toast{position:fixed;top:calc(var(--acsv-top-h) + 14px);left:50%;transform:translateX(-50%);z-index:2147483600;background:rgba(0,0,0,.78);color:#fff;padding:9px 18px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .25s;pointer-events:none}.acsv-toast.show{opacity:1}.acsv-fab{position:fixed;right:18px;bottom:18px;z-index:2147482990;background:#fd4c5d;color:#fff;border:none;border-radius:999px;padding:10px 16px;font-size:13px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}.acsv-space{margin:18px auto 40px;max-width:1160px;font-family:inherit}.acsv-space-head{display:flex;align-items:baseline;gap:8px;padding:0 4px 10px;border-bottom:2px solid #fd4c5d;margin-bottom:14px}.acsv-space-head h2{font-size:18px;color:#333;margin:0;font-weight:700}.acsv-space-head .n{color:#999;font-size:13px}.acsv-space-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}@media (max-width:1000px){.acsv-space-grid{grid-template-columns:repeat(3,1fr)}}@media (max-width:640px){.acsv-space-grid{grid-template-columns:repeat(2,1fr)}}.acsv-space-cell{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;aspect-ratio:3/4;background:#000;display:block}.acsv-space-cell img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s,opacity .2s;opacity:0}.acsv-space-cell img.ld{opacity:1}.acsv-space-cell:hover img{transform:scale(1.06)}.acsv-space-more{display:block;margin:16px auto;padding:8px 28px;border:1px solid #ddd;background:#fff;color:#666;border-radius:999px;cursor:pointer;font-size:13px;font-family:inherit}.acsv-space-more:hover{color:#fd4c5d;border-color:#fd4c5d}.acsv-space-tip{padding:30px 0;text-align:center;color:#999;font-size:13px}.acsv-video,.acsv-playicon,.acsv-errbox,.acsv-side{transition:transform .28s ease}#acsv-root.acsv-with-comments .acsv-video,#acsv-root.acsv-with-comments .acsv-playicon,#acsv-root.acsv-with-comments .acsv-errbox{transform:translateX(calc(var(--acsv-dw,380px) / -2)) scale(var(--acsv-cscale,1))}#acsv-root.acsv-with-comments .acsv-dmcanvas{transition:left .28s ease,top .28s ease,width .28s ease,height .28s ease}#acsv-root.acsv-with-comments .acsv-controls{right:var(--acsv-dw,380px)}#acsv-root.acsv-with-comments .acsv-side{transform:translateX(calc(var(--acsv-dw,380px) * -1))}@media (min-width:' + CFG.view.avoidW + 'px){#acsv-root.acsv-with-comments .acsv-view-body{right:var(--acsv-dw,380px)}}#acsv-root.acsv-with-comments .acsv-slide[data-panfit="1"]>.acsv-video,#acsv-root.acsv-with-comments .acsv-slide[data-panfit="1"]>.acsv-playicon,#acsv-root.acsv-with-comments .acsv-slide[data-panfit="1"]>.acsv-errbox{transform:translateX(calc(var(--acsv-dw,380px) / -2))}.acsv-slide>.acsv-spinner,.acsv-scroller>.acsv-spinner{transition:left .28s ease}#acsv-root.acsv-with-comments .acsv-slide>.acsv-spinner,#acsv-root.acsv-with-comments .acsv-scroller>.acsv-spinner{left:calc(50% - var(--acsv-dw,380px)/2)}.acsv-cbody .ubb-emotion{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}.acsv-cbody .ubb-imgc{display:block;max-width:min(240px,100%);max-height:220px;border-radius:8px;margin-top:6px;cursor:zoom-in}.acsv-cbody .ubb-at,.acsv-cbody .ubb-res{color:#9fd0ff;text-decoration:none}.acsv-cbody .ubb-at:hover,.acsv-cbody .ubb-res:hover{text-decoration:underline}' + IMGVIEW_CSS + '.acsv-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin:0 0 10px;position:relative}.acsv-progress-txt{font-size:12px;color:#999;margin-right:auto}.acsv-sort{position:relative;cursor:pointer;font-size:13px;color:#666;user-select:none;padding:4px 10px;border:1px solid #e5e5e5;border-radius:4px;background:#fff}.acsv-sort:hover{border-color:#fd4c5d;color:#fd4c5d}.acsv-sort .arrow{font-size:10px;margin-left:4px}.acsv-sort-menu{display:none;position:absolute;right:0;top:110%;z-index:30;min-width:100%;background:#fff;border:1px solid #eee;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.12);overflow:hidden}.acsv-sort.open .acsv-sort-menu{display:block}.acsv-sort-menu li{list-style:none;padding:8px 18px;white-space:nowrap}.acsv-sort-menu li:hover{background:#fdf0f1;color:#fd4c5d}.acsv-sort-menu li.on{color:#fd4c5d;font-weight:700}.acsv-pagebar{display:flex;justify-content:center;align-items:center;gap:6px;margin:18px 0 6px;flex-wrap:wrap}.acsv-pagebtn{min-width:32px;height:32px;padding:0 8px;border:1px solid #e0e0e0;background:#fff;color:#555;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s}.acsv-pagebtn:hover:not(:disabled):not(.cur){border-color:#fd4c5d;color:#fd4c5d}.acsv-pagebtn.cur{background:#fd4c5d;border-color:#fd4c5d;color:#fff;cursor:default}.acsv-pagebtn:disabled{color:#ccc;cursor:default;background:#f7f7f7}.acsv-pagebtn.dots{border:none;background:none;cursor:default}.acsv-dmcanvas{position:absolute;z-index:8;pointer-events:none}.acsv-seg{display:flex;align-items:center;background:rgba(255,255,255,.14);border-radius:999px;padding:3px;gap:2px}.acsv-seg-btn{border:none;background:none;color:#fff;opacity:.7;font-size:13px;font-family:inherit;padding:6px 16px;border-radius:999px;cursor:pointer;transition:background .15s,opacity .15s;white-space:nowrap}.acsv-seg-btn:hover{opacity:.9}.acsv-seg-btn.on{background:rgba(255,255,255,.24);opacity:1;font-weight:600}.acsv-cbtxt{font-size:12px;color:#ddd;margin-left:2px}.acsv-qwrap{position:relative;display:flex}.acsv-qmenu{position:absolute;right:0;bottom:calc(100% + 12px);z-index:35;min-width:88px;background:rgba(18,18,22,.92);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:2px;box-shadow:0 8px 28px rgba(0,0,0,.45)}.acsv-qitem{border:none;background:none;color:#ccc;font-size:13px;font-family:inherit;padding:7px 16px;border-radius:8px;cursor:pointer;text-align:center;white-space:nowrap}.acsv-qitem:hover{background:rgba(255,255,255,.12);color:#fff}.acsv-qitem.on{color:#fd4c5d;font-weight:700}.acsv-dmbox{display:flex;align-items:center;flex:1 1 auto;min-width:0;max-width:min(340px,38vw);height:32px;padding:0 4px 0 14px;overflow:hidden;background:rgba(255,255,255,.14);border-radius:999px;transition:background .15s}.acsv-dmbox:focus-within{background:rgba(255,255,255,.2)}.acsv-dm-input{flex:1;min-width:0;border:none;background:none;outline:none;color:#fff;font-size:13px;font-family:inherit}.acsv-dm-input::placeholder{color:rgba(255,255,255,.4)}.acsv-dm-send{flex:none;border:none;background:rgba(255,255,255,.22);color:#fff;font-size:12px;padding:5px 14px;border-radius:999px;cursor:pointer;font-family:inherit}.acsv-dm-send:hover{background:#fd4c5d}.acsv-clike{cursor:pointer}.acsv-clike:hover{color:#b9bec7}.acsv-clike.on{color:#fd4c5d}.acsv-cdm:not(.on){opacity:.55}.acsv-banpop{position:absolute;right:62px;top:-4px;z-index:30;display:flex;align-items:center;gap:2px;padding:7px 10px;background:rgba(22,22,27,.96);border:1px solid rgba(255,255,255,.12);border-radius:999px;}.acsv-banpop button{border:none;background:none;padding:2px;cursor:pointer;line-height:0;opacity:.9;transition:transform .12s}.acsv-banpop button:hover{opacity:1;transform:scale(1.18)}.acsv-banpop button img{width:26px;height:26px;display:block}.acsv-sharepop{position:absolute;right:66px;bottom:-6px;z-index:32;width:300px;max-height:min(430px,62vh);display:flex;flex-direction:column;background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.5);animation:acsv-fadein .18s ease}.acsv-sharepop-drawer{right:12px;bottom:57px}.acsv-share-head{flex:none;display:flex;align-items:center;padding:12px 14px 8px;font-size:14px;font-weight:600;color:#fff}.acsv-share-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}.acsv-share-close:hover{background:rgba(255,255,255,.22)}.acsv-share-searchwrap{flex:none;padding:0 12px 8px}.acsv-share-search{width:100%;height:32px;border:none;outline:none;background:rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:12px;padding:0 12px;font-family:inherit}.acsv-share-search::placeholder{color:rgba(255,255,255,.4)}.acsv-share-search:focus{background:rgba(255,255,255,.16)}.acsv-share-list{flex:1 1 auto;min-height:120px;overflow-y:auto;padding:2px 6px 6px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}.acsv-share-list::-webkit-scrollbar{width:5px}.acsv-share-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}.acsv-share-row{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px}.acsv-share-row:hover{background:rgba(255,255,255,.05)}.acsv-share-av{flex:none;width:38px;height:38px;border-radius:50%;object-fit:cover;display:block}.acsv-share-name{flex:1;min-width:0;font-size:13px;color:#f0f1f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}.acsv-share-unread{flex:none;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--acsv-accent);color:#fff;font-size:10px;line-height:16px;text-align:center;font-weight:600}.acsv-share-send{flex:none;border:none;background:var(--acsv-accent);color:#fff;font-size:12px;font-family:inherit;padding:5px 14px;border-radius:999px;cursor:pointer;transition:opacity .15s}.acsv-share-send:hover{opacity:.88}.acsv-share-send:disabled{opacity:.6;cursor:default}.acsv-share-send.done{background:rgba(255,255,255,.16);color:#9fe3a1;cursor:default}.acsv-share-send.chat{background:rgba(255,255,255,.14);color:#9fe3a1}.acsv-share-send.chat:hover{background:rgba(255,255,255,.2)}.acsv-share-tip{padding:30px 18px;text-align:center;color:#8b909a;font-size:12px;line-height:1.8;white-space:pre-line;display:flex;flex-direction:column;align-items:center;gap:8px}.acsv-share-spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:acsv-spin .8s linear infinite}.acsv-share-foot{flex:none;display:flex;gap:8px;padding:8px 12px 12px}.acsv-share-copy{flex:1;height:34px;border:none;border-radius:8px;cursor:pointer;background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-family:inherit}.acsv-share-copy:hover{background:rgba(255,255,255,.2)}.acsv-share-center{flex:none;display:grid;place-items:center;height:34px;padding:0 14px;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:12px;text-decoration:none}.acsv-share-center:hover{background:rgba(255,255,255,.2)}.acsv-msgdrawer{position:absolute;top:0;right:0;bottom:0;width:var(--acsv-dw,min(380px,88vw));z-index:58;display:flex;flex-direction:column;background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,.09);transform:translateX(100%);transition:transform .28s ease}.acsv-msgdrawer.open{transform:translateX(0)}.acsv-im-head{flex:none;display:flex;align-items:center;gap:8px;padding:14px 16px;font-size:15px;font-weight:600;color:#fff;border-bottom:1px solid rgba(255,255,255,.09)}.acsv-im-back{border:none;background:rgba(255,255,255,.1);color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;display:none}.acsv-im-back:hover{background:rgba(255,255,255,.22)}.acsv-im-close{margin-left:auto;border:none;background:rgba(255,255,255,.1);color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}.acsv-im-close:hover{background:rgba(255,255,255,.22)}.acsv-im-listview{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}.acsv-im-searchwrap{flex:none;padding:0 14px 10px}.acsv-im-search{width:100%;height:34px;border:none;outline:none;background:rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:13px;padding:0 12px;font-family:inherit}.acsv-im-search::placeholder{color:rgba(255,255,255,.4)}.acsv-im-search:focus{background:rgba(255,255,255,.16)}.acsv-im-list,.acsv-im-bubbles{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 8px 10px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}.acsv-im-bubbles{display:flex;flex-direction:column}.acsv-im-list::-webkit-scrollbar,.acsv-im-bubbles::-webkit-scrollbar{width:5px}.acsv-im-list::-webkit-scrollbar-thumb,.acsv-im-bubbles::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}.acsv-im-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px;cursor:pointer}.acsv-im-row:hover{background:rgba(255,255,255,.05)}.acsv-im-av{flex:none;width:42px;height:42px;border-radius:50%;object-fit:cover;display:block}.acsv-im-mid{flex:1;min-width:0}.acsv-im-name{font-size:13px;color:#f0f1f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}.acsv-im-preview{font-size:12px;color:#8b909a;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acsv-im-time{flex:none;font-size:11px;color:#7a7f8a;align-self:flex-start;margin-top:4px}.acsv-im-chatview{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}.acsv-im-bubble{max-width:78%;margin:4px 10px;padding:8px 12px;border-radius:14px;font-size:13px;line-height:1.6;word-break:break-word;color:#f0f1f3;background:rgba(255,255,255,.1);align-self:flex-start;user-select:text;-webkit-user-select:text;cursor:text}.acsv-im-bubble a{color:#9fd0ff}.acsv-im-bubble.mine{align-self:flex-end;background:#3e4a5a;color:#fff}.acsv-im-bubble.mine a{color:#9fd0ff}.acsv-im-bubble.pending{opacity:.55}.acsv-im-bubble.failed{background:rgba(255,255,255,.08);color:#ff8a93;cursor:pointer}.acsv-im-rowwrap{display:flex;align-items:center;gap:6px;align-self:flex-start;margin:4px 10px;max-width:96%}.acsv-im-rowwrap.mine{flex-direction:row-reverse;align-self:flex-end}.acsv-im-rowwrap .acsv-im-bubble{margin:0}.acsv-im-rowwrap.cardrow{width:min(294px,96%)}.acsv-im-rowwrap.cardrow .acsv-im-vcard{margin:0;align-self:auto;width:auto;flex:1 1 auto;min-width:0}.acsv-im-quotebtn{flex:none;width:24px;height:24px;border:none;border-radius:50%;background:rgba(255,255,255,.08);color:#8b909a;font-size:13px;line-height:1;padding:0;cursor:pointer;opacity:0;transition:opacity .12s}.acsv-im-rowwrap:hover .acsv-im-quotebtn,.acsv-im-quotebtn:focus{opacity:1}.acsv-im-quotebtn:hover{background:rgba(255,255,255,.18);color:#fff}.acsv-im-quote{margin:0 0 5px;padding:4px 8px;border-left:2px solid var(--acsv-accent);background:rgba(0,0,0,.16);border-radius:3px;font-size:12px;line-height:1.5;min-width:0}.acsv-im-quote.link{cursor:pointer}.acsv-im-quote.link:hover{background:rgba(0,0,0,.28)}.acsv-im-quote-preview{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,.72)}.acsv-quotechip{flex:none;display:flex;align-items:center;gap:8px;margin:8px 12px 0;padding:5px 8px 5px 12px;background:rgba(255,255,255,.08);border-radius:8px;font-size:12px;color:#b8bdc7}.acsv-quotechip-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acsv-quotechip-x{flex:none;border:none;background:transparent;color:#8b909a;cursor:pointer;font-size:12px;padding:2px 4px;font-family:inherit}.acsv-quotechip-x:hover{color:#fff}@keyframes acsv-im-flash{0%{box-shadow:0 0 0 2px var(--acsv-accent)}100%{box-shadow:0 0 0 2px transparent}}.acsv-im-flash{animation:acsv-im-flash 1.2s ease}.acsv-im-imgbubble{max-width:78%;margin:4px 10px;padding:4px;border-radius:14px;background:rgba(255,255,255,.06);align-self:flex-start;position:relative}.acsv-im-imgbubble.mine{align-self:flex-end}.acsv-im-rowwrap .acsv-im-imgbubble{margin:0}.acsv-im-imgbubble .acsv-im-imgimg{display:block;max-width:180px;border-radius:10px;cursor:zoom-in}.acsv-im-imgbubble.pending{opacity:.55}.acsv-im-imgbubble.pending::after{content:"";position:absolute;inset:0;border-radius:14px;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.08) 50%,transparent 65%);background-size:200% 100%;animation:acsv-im-shimmer 1.4s linear infinite;pointer-events:none}@keyframes acsv-im-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}.acsv-im-imgbubble.failed{background:rgba(255,255,255,.08);cursor:pointer}.acsv-emotimg{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}.acsv-im-btn{position:relative;font-style:normal}.acsv-im-btn svg{width:20px;height:20px;fill:#fff;display:block}.acsv-im-badge{position:absolute;top:-4px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--acsv-accent);color:#fff;font-size:10px;line-height:16px;text-align:center;font-weight:600}.acsv-im-daydiv{margin:10px 0 4px;text-align:center;font-size:11px;color:#7a7f8a}a.acsv-im-vcard,div.acsv-im-vcard{flex:none;display:block;width:min(260px,78%);margin:4px 10px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);cursor:pointer;text-decoration:none;transition:border-color .15s}.acsv-im-vcard:hover{border-color:rgba(255,255,255,.22)}.acsv-im-vcard.mine{align-self:flex-end}a.acsv-im-cshare,div.acsv-im-cshare{flex:none;display:block;width:min(260px,78%);margin:4px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);cursor:pointer;text-decoration:none;transition:border-color .15s}.acsv-im-cshare:hover{border-color:rgba(255,255,255,.22)}.acsv-im-cshare.mine{align-self:flex-end}.acsv-im-cshare-quote{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;padding:10px 12px 9px;border-left:3px solid var(--acsv-accent);margin:8px 0 2px 8px;font-size:13px;line-height:1.55;color:#f0f1f3;white-space:pre-wrap;word-break:break-word}.acsv-im-cshare-src{display:flex;align-items:center;gap:8px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.09);margin-top:6px}.acsv-im-cshare-cover{flex:none;width:64px;height:40px;object-fit:cover;border-radius:4px;background:rgba(255,255,255,.05)}.acsv-im-cshare-srctitle{flex:1;min-width:0;font-size:12px;color:#b8bdc7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acsv-im-cshare-quote .ubb-emotion{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}.acsv-im-cshare-quote .ubb-imgc{display:block;max-width:min(200px,100%);max-height:150px;border-radius:8px;margin-top:6px;cursor:zoom-in}.acsv-im-vcard-coverbox{position:relative}.acsv-im-vcard-cover{display:block;width:100%;height:auto;max-height:190px;object-fit:cover;object-position:center;background:rgba(255,255,255,.05)}.acsv-im-vcard-bar{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:5px;padding:16px 8px 5px;font-size:11px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.68));text-shadow:0 1px 2px rgba(0,0,0,.6)}.acsvg-cicon{display:inline-block;width:13px;height:13px;flex:none;background:currentColor;-webkit-mask:var(--acsvg-cicon) center/contain no-repeat;mask:var(--acsvg-cicon) center/contain no-repeat}.acsv-im-vcard-dur{margin-left:auto;font-variant-numeric:tabular-nums}.acsv-im-vcard-title{padding:7px 10px 9px;font-size:12px;line-height:1.5;color:#f0f1f3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.acsv-upd{position:absolute;inset:0;z-index:65;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;animation:acsv-upd-in .18s ease}@keyframes acsv-upd-in{from{opacity:0}to{opacity:1}}.acsv-upd-panel{width:min(560px,92vw);max-height:min(76vh,640px);display:flex;flex-direction:column;background:rgba(22,22,27,.97);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.5);overflow:hidden}.acsv-upd-head{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.09)}.acsv-upd-title{min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-size:15px;font-weight:600;color:#fff}.acsv-upd-sub{font-size:12px;font-weight:400;color:#8b909a}.acsv-upd-x{margin-left:auto;flex:none;border:none;background:rgba(255,255,255,.1);color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1}.acsv-upd-x:hover{background:rgba(255,255,255,.22)}.acsv-upd-body{flex:1 1 auto;min-height:64px;overflow-y:auto;padding:12px 18px 16px;user-select:text;-webkit-user-select:text;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;font-size:13px;line-height:1.7;color:#d6d9de}.acsv-upd-note{padding:28px 0;text-align:center;color:#8b909a;font-size:13px}.acsv-upd-body h1,.acsv-upd-body h2,.acsv-upd-body h3,.acsv-upd-body h4{color:#fff;font-size:15px;line-height:1.45;margin:14px 0 6px}.acsv-upd-body h1:first-child,.acsv-upd-body h2:first-child,.acsv-upd-body h3:first-child{margin-top:0}.acsv-upd-body p{margin:6px 0}.acsv-upd-body ul,.acsv-upd-body ol{margin:6px 0;padding-left:22px}.acsv-upd-body li{margin:3px 0}.acsv-upd-body a{color:#9fd0ff;text-decoration:none}.acsv-upd-body a:hover{text-decoration:underline}.acsv-upd-body code{background:rgba(255,255,255,.1);border-radius:4px;padding:1px 5px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}.acsv-upd-body pre{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;overflow-x:auto;margin:8px 0}.acsv-upd-body pre code{background:none;padding:0}.acsv-upd-body hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin:12px 0}.acsv-upd-body blockquote{margin:8px 0;padding:2px 10px;border-left:3px solid var(--acsv-accent);color:#b8bdc7}.acsv-upd-body img{max-width:100%;border-radius:6px}.acsv-upd-body table{border-collapse:collapse;margin:8px 0}.acsv-upd-body th,.acsv-upd-body td{border:1px solid rgba(255,255,255,.14);padding:4px 8px;font-size:12px}.acsv-upd-foot{flex:none;display:flex;gap:8px;justify-content:flex-end;padding:10px 16px 14px;border-top:1px solid rgba(255,255,255,.09)}.acsv-upd-foot:empty{display:none}.acsv-upd-act{border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:background .15s,opacity .15s}.acsv-upd-act:hover{background:rgba(255,255,255,.2)}.acsv-upd-act.primary{background:var(--acsv-accent)}.acsv-upd-act.primary:hover{background:var(--acsv-accent);opacity:.88}.acsv-upd-btn{position:relative}.acsv-upd-btn svg{width:20px;height:20px;fill:#fff;display:block}.acsv-upd-dot{position:absolute;top:-2px;right:-3px;width:9px;height:9px;border-radius:50%;background:var(--acsv-accent);box-shadow:0 0 0 2px rgba(22,22,27,.9)}.acsv-dock{position:absolute;left:0;top:0;bottom:0;width:' + CFG.view.dockW + "px;padding:10px 10px 20px;display:flex;flex-direction:column;gap:4px;z-index:56}.acsv-dock-logo{padding:2px 8px 10px}.acsv-dock-logo img{height:20px;display:block}.acsv-dock-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border:none;background:transparent;border-radius:10px;color:#d5d8df;font-size:15px;font-family:inherit;cursor:pointer;text-align:left;transition:background .15s,color .15s}.acsv-dock-item svg{width:20px;height:20px;fill:currentColor;display:block;flex:none}.acsv-dock-item:hover{background:rgba(255,255,255,.08);color:#fff}.acsv-dock-item.on{background:rgba(255,255,255,.14);color:#fff;font-weight:600}.acsv-dock-sep{height:1px;background:rgba(255,255,255,.09);margin:8px 6px}.acsv-scroller{margin-left:" + CFG.view.dockW + "px}#acsv-root:fullscreen .acsv-dock{display:none}#acsv-root:fullscreen .acsv-scroller{margin-left:0}.acsv-view{position:absolute;inset:0;z-index:55;display:none;background:#16161b;overflow:hidden}.acsv-view-held{position:absolute;inset:0;z-index:55;visibility:hidden;pointer-events:none;background:#16161b;overflow:hidden}.acsv-view-body{position:absolute;top:var(--acsv-top-h);bottom:0;left:0;right:0;overflow-y:auto;padding:6px 24px 30px " + (CFG.view.dockW + 14) + "px;transition:right .28s ease}.acsv-vbody-play{overflow:hidden;padding:0;left:" + CFG.view.dockW + "px}#acsv-root.acsv-with-comments .acsv-view-body.acsv-vbody-play{right:0}#acsv-root:fullscreen .acsv-vbody-play{left:0}.acsv-vsec{margin-bottom:26px}.acsv-vsec-title{font-size:16px;font-weight:600;color:#fff;margin:18px 0 10px}.acsv-vchips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.acsv-vchip{border:none;border-radius:16px;padding:5px 14px;font-size:13px;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.1);color:#cfd3da;transition:background .15s,color .15s}.acsv-vchip.on{background:var(--acsv-accent);color:#fff}.acsv-vchip.sm{padding:4px 10px;font-size:12px}.acsv-vlist{min-height:60px}.acsv-vrow{display:flex;gap:12px;align-items:center;padding:8px;border-radius:10px;cursor:pointer;transition:background .15s}.acsv-vrow:hover{background:rgba(255,255,255,.07)}.acsv-vrow-rank{width:24px;text-align:center;font-size:15px;font-weight:700;color:#8a90a0;flex:none}.acsv-vrow-rank.top{color:var(--acsv-accent)}.acsv-vrow-thumb{width:110px;height:66px;border-radius:8px;background:rgba(255,255,255,.06);flex:none;overflow:hidden;display:grid;place-items:center}.acsv-vrow-thumb img{width:100%;height:100%;object-fit:cover;display:block}.acsv-vrow-main{min-width:0;flex:1}.acsv-vrow-title{font-size:14px;color:#fff;line-height:20px;max-height:40px;overflow:hidden}.acsv-vrow-desc{font-size:12px;color:#aab0bc;line-height:17px;max-height:34px;overflow:hidden;margin-top:2px}.acsv-vrow-meta{font-size:12px;color:#8a90a0;margin-top:3px}.acsv-zone-wrap{max-width:1600px;margin:0 auto}.acsv-vrow.big{position:relative;align-items:stretch;gap:16px;padding:16px;overflow:hidden}.acsv-vrow.big .acsv-vrow-thumb{width:160px;height:90px;border-radius:0}.acsv-vrow.big .acsv-vrow-main{display:flex;flex-direction:column}.acsv-vrow.big .acsv-vrow-title{font-size:16px;font-weight:400;line-height:18px;max-height:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px}.acsv-vrow.big:hover .acsv-vrow-title{color:var(--acsv-accent)}.acsv-vrow.big .acsv-vrow-desc{font-size:12px;line-height:16px;white-space:pre-line;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;margin-top:0}.acsv-vrow.big .acsv-vrow-meta{display:flex;align-items:center;margin-top:auto;font-size:12px;line-height:12px}.acsv-vmeta-i{display:inline-flex;align-items:center;gap:6px;margin-right:6px}.acsv-vrow-meta .acsv-vmeta-i:first-child{margin-right:24px}.acsv-vmeta-i .acsvg-glyph{font-size:12px}.acsv-rlist-num{position:absolute;right:0;bottom:-8px;font-size:48px;font-weight:700;line-height:48px;color:rgba(255,255,255,.07);transform:rotate(10deg);font-style:normal;pointer-events:none}.acsv-upcard{padding:16px;box-sizing:border-box;border-left:1px solid rgba(255,255,255,.1)}.acsv-upcard-link{display:flex;gap:16px;color:inherit;text-decoration:none;height:100%}.acsv-upcard-info{min-width:0;display:flex;flex-direction:column;flex:1}.acsv-upcard-avatar{width:90px;height:90px;border-radius:50%;display:block;object-fit:cover;flex:none;align-self:flex-start}.acsv-upcard-name{font-size:14px;font-weight:600;color:var(--acsv-accent);line-height:21px;min-height:21px}.acsv-upcard-sign{font-size:12px;color:#aab0bc;line-height:16px;height:48px;overflow:hidden;margin:6px 0;word-break:break-all}.acsv-upcard-extra{display:flex;align-items:center;height:16px;line-height:16px;font-size:12px;color:#8a90a0;margin-top:auto}.acsv-upcard-extra .acsv-vmeta-i{margin-right:24px}.acsv-upcard-extra .acsvg-glyph{font-size:14px;width:14px;height:14px;line-height:14px}.acsv-rlist-head,.acsv-rlist-row{display:grid;grid-template-columns:minmax(0,1fr) 338px;gap:0}.acsv-rlist-head{padding:2px 16px 8px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:6px}.acsv-rlist-hcell{font-size:18px;font-weight:600;color:#fff;display:flex;align-items:baseline;gap:6px;border-left:3px solid var(--acsv-accent);padding-left:8px}.acsv-rlist-hen{font-size:10px;color:#8a90a0;font-weight:400}.acsv-rlist-row{padding:0;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.08)}@media (max-width:" + (CFG.view.narrow - 1) + "px){.acsv-rlist-head,.acsv-rlist-row{grid-template-columns:minmax(0,1fr)}}@media (max-width:" + (CFG.view.narrow - 1) + "px){.acsv-upcard{border-left:none;margin-top:6px}}.acsv-vempty{color:#8a90a0;font-size:13px;padding:14px 2px}.acsv-vtip{color:#8a90a0;font-size:12px;margin:-4px 0 10px}.acsv-vmore{display:block;margin:12px auto 0;border:none;border-radius:16px;padding:6px 20px;font-size:13px;font-family:inherit;cursor:pointer;background:rgba(255,255,255,.1);color:#cfd3da;transition:background .15s}.acsv-vmore:hover{background:rgba(255,255,255,.18)}.acsv-vmore[disabled]{opacity:.5;cursor:default}.acsv-mewrap{max-width:1600px;margin:0 auto}.acsv-mecard{display:flex;align-items:center;gap:20px;padding:22px 2px 18px}.acsv-mecard-av{width:96px;height:96px;border-radius:50%;flex:none;object-fit:cover;display:block;background:rgba(255,255,255,.06);border:2px solid rgba(255,255,255,.14)}.acsv-mecard-info{min-width:0;flex:1}.acsv-mecard-name{font-size:20px;font-weight:600;color:#fff;line-height:28px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.acsv-mecard-stats{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:10px}.acsv-mecard-stat{font-size:13px;color:#aab0bc}.acsv-mecard-stat b{font-size:15px;font-weight:600;color:#fff;margin-right:5px}.acsv-mecard-id{font-size:12px;color:#8a90a0;margin-top:9px}.acsv-mecard-sign{font-size:12px;color:#aab0bc;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.acsv-metabs{display:flex;gap:26px;padding:0 2px;border-bottom:1px solid rgba(255,255,255,.08)}.acsv-metab{border:none;background:none;padding:10px 2px;font-size:15px;font-family:inherit;cursor:pointer;color:#cfd3da;border-bottom:2px solid transparent;transition:color .15s,border-color .15s}.acsv-metab:hover{color:#fff}.acsv-metab.on{color:#fff;font-weight:600;border-bottom-color:var(--acsv-accent)}.acsv-mepanel{padding-top:16px}.acsv-mepanel .acsv-vchips{margin-bottom:14px}.acsv-megrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(" + CFG.view.me.gridMin + "px,1fr));gap:18px " + CFG.view.me.gridGap + "px}.acsv-gcell{cursor:pointer;min-width:0}.acsv-gcover{position:relative;width:100%;aspect-ratio:" + CFG.view.me.coverRatio + ";border-radius:10px;overflow:hidden;background:rgba(255,255,255,.06)}.acsv-gcover img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s}.acsv-gcell:hover .acsv-gcover img{transform:scale(1.05)}.acsv-gtag{position:absolute;left:8px;bottom:8px;max-width:calc(100% - 16px);padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acsv-gtitle{margin-top:8px;font-size:14px;line-height:20px;color:#fff;max-height:40px;overflow:hidden}.acsv-gcell:hover .acsv-gtitle{color:var(--acsv-accent)}.acsv-gmeta{margin-top:4px;font-size:12px;color:#8a90a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acsv-gskel{aspect-ratio:" + CFG.view.me.coverRatio + ";border-radius:10px;background-color:rgba(255,255,255,.05);background-image:linear-gradient(100deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.07) 50%,rgba(255,255,255,0) 60%);background-size:200% 100%;animation:acsv-skel 1.4s linear infinite}@keyframes acsv-skel{0%{background-position:120% 0}100%{background-position:-20% 0}}.acsv-sbox{display:flex;align-items:center;width:min(560px,100%);height:40px;padding:0 6px 0 16px;background:rgba(255,255,255,.1);border-radius:20px;transition:background .15s}.acsv-sbox:focus-within{background:rgba(255,255,255,.16)}.acsv-sbox input{flex:1;min-width:0;background:none;border:none;outline:none;color:#fff;font-size:14px;font-family:inherit}.acsv-sbox input::placeholder{color:rgba(255,255,255,.45)}.acsv-sbox input::-webkit-search-cancel-button{filter:invert(1);opacity:.5;cursor:pointer}.acsv-sbtn{width:30px;height:30px;flex:none;border:none;border-radius:50%;background:none;color:#fff;cursor:pointer;display:grid;place-items:center;transition:background .15s}.acsv-sbtn:hover{background:rgba(255,255,255,.18)}.acsv-sbtn .acsvg-glyph{font-size:16px}.acsv-sstate{color:#8a90a0;font-size:13px;padding:8px 2px}.acsv-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(" + CFG.view.search.gridMin + "px,1fr));gap:18px " + CFG.view.search.gridGap + "px}.acsv-sgrid .acsv-gcover{aspect-ratio:16 / 9}.acsv-gviews{display:inline-flex;align-items:center;gap:4px}.acsv-gviews .acsvg-glyph{font-size:12px}.acsv-gdur{position:absolute;right:8px;bottom:8px;padding:2px 8px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;line-height:18px}.acsv-gfoot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px;font-size:12px;color:#8a90a0}.acsv-gup{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.acsv-gtime{flex:none}.acsv-smfoot{display:inline-block;margin:18px 0 4px;color:#9fd0ff;font-size:13px;text-decoration:none}.acsv-smfoot:hover{text-decoration:underline}@media (max-width:" + (CFG.view.narrow - 1) + "px){.acsv-sgrid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px 10px}}.acsv-view-body{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}.acsv-view-body::-webkit-scrollbar{width:8px;height:8px}.acsv-view-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:4px}.acsv-view-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.3)}.acsv-view-body::-webkit-scrollbar-track{background:transparent}@media (max-width:" + (CFG.view.narrow - 1) + "px){.acsv-dock{display:none}.acsv-scroller{margin-left:0}.acsv-info{left:24px}.acsv-view-body{padding-left:20px}.acsv-vbody-play{padding:0;left:0}}@media (max-width:" + (CFG.view.narrow - 1) + "px){.acsv-top{left:0;padding:0 16px}.acsv-top .acsv-sbox{position:static;transform:none;width:auto;flex:1;min-width:0;margin:0 12px}}@media (max-width:" + (CFG.view.narrow - 1) + "px){.acsv-mecard{flex-direction:column;align-items:flex-start;gap:12px;padding:16px 2px 14px}.acsv-mecard-av{width:72px;height:72px}.acsv-megrid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px 10px}}";
  var CSS = ":root{--acsv-accent:" + CFG.accent + ";--acsv-top-h:72px}" + RAW_CSS.replace(/#fd4c5d/g, "var(--acsv-accent)");
  var ICONS = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    volOn: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    volOff: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    chevUp: '<svg viewBox="0 0 24 24"><path d="M12 8l-6 6 1.4 1.4L12 10.8l4.6 4.6L18 14z"/></svg>',
    chevDn: '<svg viewBox="0 0 24 24"><path d="M12 16l-6-6 1.4-1.4L12 13.2l4.6-4.6L18 10z"/></svg>',
    chevLt: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
    banana: '<svg viewBox="0 0 24 24"><path d="M21 18.2c-6.9 0-12.6-5-13.7-11.6C7.1 5.2 6 4.2 4.8 4.5 3.7 4.7 3 5.8 3.2 7 4.6 15.4 12 21.5 20.6 21c1.1-.1 1.9-1 1.9-2.1 0-.4-.6-.7-1.5-.7z"/></svg>',
    image: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
    smiley: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>',
    // 更新入口（0.9.60）：下载箭头入托盘（Material download）
    upd: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>'
  };
  var SITE_ICONS = {
    heart: "https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_zan@2x.3e69f4646decbd73fd17.png",
    comment: "https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_comment@2x.9d8f81ede8984dd9aa34.png",
    share: "https://ali-imgs.acfun.cn/kos/nlav10360/static/pages/shortVideo/img/icon_video_share@2x.f63773e510e6d3259acb.png"
  };
  var VIDEO_ICONS = {
    like: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/like/keyFrames/frame1.3039ed46b4f6639fa576.svg",
    favorite: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_follow.67c57d40c135d9f5036d.svg",
    banana: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_banana.d21040881e9721eb1fc8.svg",
    bananaOn: "https://ali-imgs.acfun.cn/kos/nlav10360/static/newVideo/widget/bread/img/icon_banana_hover.31b7f8940e072833fa9c.svg"
  };

  // src/state.js
  var root = null;
  var scroller = null;
  var commentDrawer = null;
  function setRoot(v) {
    root = v;
  }
  function setScroller(v) {
    scroller = v;
  }
  function setCommentDrawer(v) {
    commentDrawer = v;
  }
  var drawerSlot = null;
  function claimDrawer(id, close) {
    if (drawerSlot && drawerSlot.id !== id) drawerSlot.close();
    drawerSlot = { id, close };
  }
  function releaseDrawer(id) {
    if (drawerSlot && drawerSlot.id === id) drawerSlot = null;
  }
  function currentDrawer() {
    return drawerSlot;
  }
  function resetDrawerSlot() {
    drawerSlot = null;
  }
  function slideAt(idx) {
    return scroller && scroller.querySelector('.acsv-slide[data-idx="' + idx + '"]');
  }
  function stageVisible() {
    return !!(scroller && scroller.offsetParent !== null);
  }
  var videoTargetFn = null;
  function setVideoTarget(fn) {
    videoTargetFn = typeof fn === "function" ? fn : null;
  }
  function videoTarget() {
    return videoTargetFn;
  }

  // src/ui.js
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function elHtml(tag, cls, html) {
    var e = el(tag, cls);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function fmt(n) {
    n = Number(n) || 0;
    return n <= CFG.fmt.wanMin ? String(n) : (n / 1e4).toFixed(1) + "万";
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(Number(s) || 0));
    var m = Math.floor(s / 60), sec = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
  }
  var toastTimer = null;
  function toast(msg, ms) {
    if (!root) return;
    var t = root.querySelector(".acsv-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      t.classList.remove("show");
    }, ms || CFG.time.toast);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function() {
        return true;
      }, function() {
        return false;
      });
    }
    return new Promise(function(resolve) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
      }
      ta.remove();
      resolve(ok);
    });
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root && root.requestFullscreen) root.requestFullscreen();
  }
  function ensureStyle() {
    if (document.getElementById("acsv-style")) return;
    var st = el("style", null, CSS);
    st.id = "acsv-style";
    (document.head || document.documentElement).appendChild(st);
  }
  function singleFlight(load) {
    var val, busy = null;
    return {
      get: function() {
        if (val !== void 0) return Promise.resolve(val);
        if (busy) return busy;
        busy = load().then(
          function(v) {
            busy = null;
            val = v;
            return v;
          },
          function(e) {
            busy = null;
            throw e;
          }
        );
        return busy;
      },
      reset: function() {
        val = void 0;
      }
    };
  }
  function cookieVal(name) {
    var m = new RegExp("(?:^|;\\s*)" + name + "=([^;]*)").exec(document.cookie);
    return m ? m[1] : "";
  }
  function selfUid() {
    var m = /^(\d+)/.exec(cookieVal("auth_key"));
    return m ? m[1] : "";
  }
  function teardownVideo(v) {
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
  }
  function sweepSlideVideos(slide) {
    Array.prototype.forEach.call(slide.querySelectorAll("video"), teardownVideo);
  }

  // src/net.js
  function mockHit(url, body) {
    if (true) return null;
    var table = typeof window !== "undefined" && window.__ACSV_MOCK_FORM__;
    if (!table) return null;
    for (var k in table) {
      if (String(url).indexOf(k) !== -1) {
        var v = table[k];
        return Promise.resolve(typeof v === "function" ? v(body, url) : v);
      }
    }
    return null;
  }
  function gmRequest(opts) {
    return new Promise(function(resolve, reject) {
      if (typeof GM_xmlhttpRequest !== "function") return reject(new Error("no-gm"));
      GM_xmlhttpRequest({
        method: opts.method || "GET",
        url: opts.url,
        headers: opts.headers,
        data: opts.data,
        timeout: opts.timeout,
        responseType: opts.responseType === "arraybuffer" ? "arraybuffer" : void 0,
        onload: function(r) {
          if (opts.okStatus && (r.status < 200 || r.status >= 300))
            return reject(new Error("http-" + r.status));
          if (opts.responseType === "arraybuffer") return resolve(r.response);
          if (opts.responseType === "text") return resolve(r.responseText);
          try {
            resolve(JSON.parse(r.responseText));
          } catch (e) {
            reject(new Error("bad json"));
          }
        },
        onerror: function() {
          reject(new Error("network"));
        },
        ontimeout: function() {
          reject(new Error("timeout"));
        }
      });
    });
  }
  function requestText(url) {
    var mocked = mockHit(url);
    if (mocked) return mocked.then(function(v) {
      return typeof v === "string" ? v : String(v && v.html || "");
    });
    if (typeof GM_xmlhttpRequest === "function") {
      return gmRequest({ method: "GET", url, timeout: CFG.time.gm, responseType: "text", okStatus: true });
    }
    return new Promise(function(resolve, reject) {
      var x = new XMLHttpRequest();
      x.open("GET", url);
      x.withCredentials = true;
      x.timeout = CFG.time.xhr;
      x.onload = function() {
        if (x.status < 200 || x.status >= 300) return reject(new Error("http-" + x.status));
        resolve(x.responseText || "");
      };
      x.onerror = function() {
        reject(new Error("network"));
      };
      x.ontimeout = function() {
        reject(new Error("timeout"));
      };
      x.send(null);
    });
  }
  function request(url, method, headers, body) {
    var mocked = mockHit(url, body);
    if (mocked) return mocked;
    method = method || "POST";
    if (typeof GM_xmlhttpRequest === "function") {
      return gmRequest({ method, url, headers, data: body, timeout: CFG.time.gm });
    }
    return new Promise(function(resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(method, url);
      x.withCredentials = true;
      x.timeout = CFG.time.xhr;
      if (headers) {
        for (var k in headers) {
          try {
            x.setRequestHeader(k, headers[k]);
          } catch (e) {
          }
        }
      }
      x.onload = function() {
        try {
          resolve(JSON.parse(x.responseText));
        } catch (e) {
          reject(e);
        }
      };
      x.onerror = function() {
        reject(new Error("network"));
      };
      x.ontimeout = function() {
        reject(new Error("timeout"));
      };
      x.send(body || null);
    });
  }

  // src/data.js
  function normalize(raw) {
    var play = raw.playInfo || {};
    var urls = (play.videoUrls || []).map(function(u) {
      return u && u.url;
    }).filter(function(u) {
      return u && /^https?:/.test(u);
    });
    var covers = play.coverUrls && play.coverUrls.length ? play.coverUrls : play.firstFrameUrls || [];
    var user = raw.user || {};
    var counts = raw.meowCounts || {};
    return {
      kind: "sv",
      stype: 5,
      id: raw.meowId || 0,
      title: raw.meowTitle || raw.intro || "#AcFun小视频",
      userName: user.name || "未知用户",
      userId: user.userId || 0,
      head: user.headUrl || "",
      cover: covers.length ? covers[0].url : "",
      urls,
      urlIdx: 0,
      refreshed: false,
      // sv：直链 mp4、无弹幕/清晰度/投蕉/收藏，无需懒解析与观看上报
      cap: {
        hls: false,
        danmaku: false,
        quality: false,
        banana: false,
        favorite: false,
        lazyResolve: false,
        watchReport: false
      },
      like: counts.likeCount || 0,
      comment: counts.commentCount || 0,
      view: counts.viewCount || 0,
      // 与 home 契约对齐的零值字段：sv 不提供这些数据，但消费端可无分支地 fmt()
      banana: 0,
      fav: 0,
      share: 0,
      danmakuCount: 0,
      favorited: false,
      thrown: false,
      date: (raw.createTime || "").slice(0, 10),
      shareUrl: raw.shareUrl || CFG.api.shareBase + raw.meowId,
      liked: !!raw.isLike,
      localLike: false
    };
  }
  function normalizeHome(bc) {
    var user = bc.user || {};
    var visit = bc.visit || {};
    return {
      kind: "home",
      stype: 3,
      id: Number(bc.href) || 0,
      title: bc.title || "",
      userName: user.name || "未知用户",
      userId: Number(user.userId) || 0,
      head: user.headUrl || "",
      isFollowing: !!user.isFollowing,
      cover: bc.img && bc.img[0] || "",
      urls: [],
      urlIdx: 0,
      refreshed: false,
      // home：m3u8（hls.js）+ 弹幕 + 清晰度 + 投蕉/收藏；卡片懒解析；可上报观看历史
      cap: {
        hls: true,
        danmaku: true,
        quality: true,
        banana: true,
        favorite: true,
        lazyResolve: true,
        watchReport: true
      },
      // 懒解析状态：resolving 防并发（ensureResolved 在途复用同管）
      resolving: false,
      videoId: "",
      channel: null,
      qualities: null,
      qIdx: 0,
      like: 0,
      // 卡片不带点赞数，resolve 时由 douga/info 的 likeCount 回填
      banana: visit.bananas || 0,
      comment: visit.comments || 0,
      view: visit.views || 0,
      fav: 0,
      // 收藏数（resolve 回填 stowCount）
      share: 0,
      // 分享数（resolve 回填 shareCount）
      danmakuCount: 0,
      date: "",
      shareUrl: CFG.api.videoBase + (Number(bc.href) || ""),
      liked: false,
      favorited: false,
      thrown: false,
      // 是否已投过蕉（douga/info 的 isThrowBanana 回填；投蕉不可取消）
      localLike: false
    };
  }
  function panelItem(kind, raw) {
    if (!raw) return null;
    var it = { acId: 0, title: "", cover: "", progress: null, sub: "", kind };
    if (kind === "history") {
      if (raw.resourceType !== 2 || !raw.videoId) return null;
      it.acId = Number(raw.resourceId) || 0;
      it.title = raw.title || raw.dougaVideoTitle || "";
      it.cover = raw.cover || "";
      it.progress = raw.playedSeconds > 0 ? Number(raw.playedSeconds) : null;
      it.sub = raw.playedSecondsShow || "";
    } else if (kind === "fav") {
      it.acId = Number(raw.contentId) || 0;
      it.title = raw.contentTitle || "";
      it.cover = raw.contentImg || "";
      it.progress = raw.userPlayedSeconds > 0 ? Number(raw.userPlayedSeconds) : null;
      it.sub = raw.userName || "";
    } else if (kind === "rank") {
      if (raw.contentType !== 2) return null;
      it.acId = Number(raw.dougaId || raw.contentId) || 0;
      it.title = raw.contentTitle || "";
      it.cover = raw.videoCover || "";
      it.desc = String(raw.contentDesc || "").replace(/<br\s*\/?\s*>/gi, "\n").trim();
      var t = relTime(Number(raw.contributeTime) || 0);
      var ch = raw.channelName || (raw.channel || {}).name || (raw.channel || {}).channelName || "";
      it.meta = [
        { k: "view", t: String(Number(raw.viewCount) || 0) },
        { k: "comment", t: String(Number(raw.commentCount) || 0) },
        { k: "time", t: (t ? "发布于" + t : "") + (ch ? (t ? " / " : "") + ch + "频道" : "") }
      ];
      it.up = raw.userName ? {
        id: Number(raw.authorId || raw.userId) || 0,
        name: raw.userName,
        img: raw.userImg || "",
        fans: Number(raw.fansCount) || 0,
        contrib: Number(raw.contributionCount) || 0,
        fansText: fmtWan(raw.fansCount),
        contribText: fmtWan(raw.contributionCount),
        sign: String(raw.userSignature || "").replace(/<br\s*\/?\s*>/gi, " ").trim()
      } : null;
    } else {
      return null;
    }
    return it.acId && it.title ? it : null;
  }
  function meCardOf(j, uid) {
    var users = j && j.result === 0 && j.users || [];
    var u = null;
    for (var i = 0; i < users.length; i++) {
      if (String(users[i] && users[i].id) === String(uid)) {
        u = users[i];
        break;
      }
    }
    u = u || users[0];
    if (!u || !u.id) return null;
    return {
      uid: Number(u.id) || 0,
      name: u.name || "",
      avatar: u.headUrl || "",
      sign: String(u.signature || "").replace(/<br\s*\/?\s*>/gi, " ").trim(),
      contrib: u.contentCount != null ? Number(u.contentCount) || 0 : null,
      follow: u.following != null ? Number(u.following) || 0 : null,
      fans: u.followed != null ? Number(u.followed) || 0 : null
    };
  }
  function homeItemOf(acId, title, cover) {
    return normalizeHome({ href: String(acId), title: title || "", img: cover ? [cover] : [] });
  }
  function deepLinkOf(meow, douga, mid) {
    if (meow && meow.id && meow.urls && meow.urls.length) return { item: meow, source: "sv" };
    if (douga && douga.result === 0 && (douga.videoList || []).length) {
      return {
        item: homeItemOf(mid, String(douga.title || ""), String(douga.coverUrl || "")),
        source: "home"
      };
    }
    return null;
  }
  function relTime(ms, now) {
    var t = Number(ms) || 0;
    if (!t) return "";
    var n = Number(now) || Date.now();
    var diff = n - t;
    if (diff < 0 || isNaN(diff)) return "";
    var dt = new Date(t), nd = new Date(n);
    var hm = dt.getHours() + "时" + (dt.getMinutes() < 10 ? "0" : "") + dt.getMinutes() + "分";
    var dayDiff = Math.round(
      (new Date(nd.getFullYear(), nd.getMonth(), nd.getDate()) - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 864e5
    );
    if (dayDiff <= 0) {
      var min = Math.floor(diff / 6e4);
      if (min < 60) return Math.max(1, min) + "分钟前";
      return Math.floor(diff / 36e5) + "小时前";
    }
    if (dayDiff === 1) return "昨天" + hm;
    if (dayDiff === 2) return "前天" + hm;
    return dt.getMonth() + 1 + "月" + dt.getDate() + "日 " + hm;
  }
  function fmtWan(n) {
    var v = Number(n) || 0;
    if (v < 1e4) return String(v);
    return Math.round(v / 1e3) / 10 + "万";
  }
  var SEARCH_ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
  function searchDeent(s) {
    return String(s || "").replace(/&(amp|lt|gt|quot|#39);/g, function(m) {
      return SEARCH_ENT[m];
    });
  }
  function parseSearchItems(html) {
    var out = [];
    var seen = {};
    var t = String(html || "").replace(/\\"/g, '"');
    if (!t) return out;
    var parts = t.split('<div class="search-video"');
    for (var i = 1; i < parts.length; i++) {
      var seg = parts[i].slice(0, 4e3);
      var idM = seg.match(/href="\/v\/ac(\d+)"/);
      var acId = idM ? Number(idM[1]) || 0 : 0;
      if (!acId || seen[acId]) continue;
      var titleM = seg.match(/class="video__main__title"[\s\S]{0,600}?<a[^>]*>([^<]*)<\/a>/);
      var title = titleM ? searchDeent(titleM[1]).trim() : "";
      if (!title) continue;
      seen[acId] = 1;
      var coverM = seg.match(/<img src="([^"]+)"/);
      var durM = seg.match(/class="video__duration">([^<]*)</);
      var viewsM = seg.match(/class="info__view-count">([^<]*)</);
      var upM = seg.match(/class="user-name">([^<]*)</);
      var timeM = seg.match(/class="info__create-time">([^<]*)</);
      out.push({
        acId,
        title,
        cover: coverM ? searchDeent(coverM[1]) : "",
        dur: durM ? durM[1].trim() : "",
        // 播放数只取数字部分（原生文本「2037次播放」/「14.0万阅读」——后缀随分区变，统一剥掉）
        views: viewsM ? viewsM[1].replace(/(次播放|次观看|播放|阅读)$/, "").trim() : "",
        upName: upM ? searchDeent(upM[1]).trim() : "",
        dateText: timeM ? timeM[1].trim() : ""
      });
    }
    return out;
  }

  // src/quality.js
  function applyQuality(item) {
    if (!item.qualities || !item.qualities.length) return;
    var all = item.qualities;
    item._qualitiesAll = all;
    var pref = null;
    try {
      pref = localStorage.getItem(CFG.lsCodec);
    } catch (e) {
    }
    if (pref !== "auto" && pref !== "hevc") pref = CFG.codec.def;
    if (pref !== "auto") {
      var hit = all.filter(function(x) {
        return x.codec === pref;
      });
      item.qualities = hit.length ? hit : all;
    }
    if (CFG.exp.q30) {
      var lo = item.qualities.filter(function(x) {
        return !(x.fps > 30);
      });
      if (lo.length) item.qualities = lo;
    }
    var label = null;
    try {
      label = localStorage.getItem(CFG.lsQuality);
    } catch (e) {
    }
    var idx = 0;
    if (label) {
      for (var i = 0; i < item.qualities.length; i++) {
        if (item.qualities[i].label === label) {
          idx = i;
          break;
        }
      }
    }
    item.qIdx = idx;
    item.urls = item.qualities[idx].urls;
    item.urlIdx = 0;
  }
  function reapplyQuality(item) {
    if (!item || !item.qualities || !item.qualities.length) return false;
    if (item._qualitiesAll && item._qualitiesAll.length) item.qualities = item._qualitiesAll;
    applyQuality(item);
    return true;
  }

  // src/appapi.js
  var pcursor = "";
  var exhausted = false;
  var apiStFlight = singleFlight(function() {
    return postForm(CFG.api.token, "sid=acfun.midground.api").then(function(j) {
      if (j && j.result === 0 && j["acfun.midground.api_st"]) return j["acfun.midground.api_st"];
      throw new Error("token-denied");
    });
  });
  function ensureApiSt(force) {
    if (force) apiStFlight.reset();
    return apiStFlight.get();
  }
  var UDID = "acsv-" + Math.random().toString(36).slice(2) + Date.now();
  function homeHeaders(withAppVer) {
    var d = /* @__PURE__ */ new Date();
    function p(n) {
      return n < 10 ? "0" + n : "" + n;
    }
    var h = {
      "User-Agent": CFG.home.ua,
      "acPlatform": "ANDROID_PHONE",
      "deviceType": "1",
      "net": "WIFI",
      "productId": "2000",
      "udid": UDID,
      "resolution": "1080x1920",
      "market": "tencent",
      "requestTime": d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + ".000",
      "Content-Type": "application/x-www-form-urlencoded"
    };
    if (withAppVer) h["appVersion"] = CFG.home.appVer;
    return h;
  }
  function q(extra) {
    return "?product=ACFUN_APP&app_version=" + CFG.home.appVer + (extra || "");
  }
  function postForm(url, body) {
    var mocked = mockHit(url, body);
    if (mocked) return mocked;
    return fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }).then(function(r) {
      return r.json();
    });
  }
  function cardsOf(body) {
    var out = [];
    (body || []).forEach(function(block) {
      if (!block || block.schema === "carousels") return;
      (block.bodyContents || []).forEach(function(bc) {
        if (bc && bc.href && bc.resourceType === 2) out.push(bc);
      });
    });
    return out;
  }
  function intToHex(n) {
    n = Number(n);
    if (!n || n < 0) n = 16777215;
    return "#" + ("000000" + (n & 16777215).toString(16)).slice(-6);
  }
  var favFolderFlight = singleFlight(function() {
    return postForm(CFG.api.favFolderList, "").then(function(j) {
      var list = j && (j.dataList || j.data) || [];
      if (list.length && list[0].folderId != null) return String(list[0].folderId);
      throw new Error("no-fav-folder");
    });
  });
  function ensureFavFolder() {
    return favFolderFlight.get();
  }
  var AppAPI = {
    // ---- 首页推荐流 ----
    resetPager: function() {
      pcursor = "";
      exhausted = false;
    },
    homeFeed: function() {
      if (exhausted) return Promise.resolve([]);
      return request(
        CFG.api.homeFeed + q("&appMode=0"),
        "POST",
        homeHeaders(true),
        "mkey=" + CFG.home.mkey + "&pcursor=" + pcursor + "&count=" + CFG.homeFeedCfg.count
      ).then(function(j) {
        if (!j || j.result !== 0) {
          exhausted = true;
          return [];
        }
        pcursor = j.pcursor === void 0 || j.pcursor === null ? "" : String(j.pcursor);
        var list = cardsOf(j.body).map(normalizeHome);
        if (!list.length) exhausted = true;
        return list;
      }, function() {
        return [];
      });
    },
    // ---- 详情 / 播放 ----
    dougaInfo: function(acId) {
      return request(
        CFG.api.dougaInfo + q("&dougaId=" + acId + "&mkey=" + CFG.home.mkey),
        "GET",
        homeHeaders(false)
      );
    },
    playInfo: function(videoId, acId) {
      return request(CFG.api.playInfo + q("&videoId=" + videoId + "&resourceId=" + acId + "&resourceType=2&mkey=" + CFG.home.mkey), "GET", homeHeaders(false)).then(function(j) {
        var streams = j && j.playInfo && j.playInfo.streams || [];
        return streams.map(function(s) {
          var urls = (s.playUrls || []).map(function(u) {
            return /^http:/.test(u) ? u.replace(/^http:/, "https:") : u;
          }).filter(function(u) {
            return /^https?:/.test(u);
          });
          var hevc = CFG.codec.reHevc.test(urls[0] || "");
          var raw = String(s.qualityLabel || s.qualityType || "默认");
          return {
            res: parseInt(raw, 10) || 0,
            // 排序键：同分辨率档（60fps/30fps）值相同，稳定排序保接口先后
            label: raw + (hevc ? CFG.codec.suffix : ""),
            codec: hevc ? "hevc" : "avc",
            fps: s.fps || 0,
            // HealthMonitor 的理论帧间隔与降帧率判定用
            urls
          };
        }).filter(function(x) {
          return x.urls.length;
        }).sort(function(a, b) {
          return b.res - a.res;
        });
      }, function(e) {
        return [];
      });
    },
    // 懒解析链：douga/info（videoId/计数/初始状态）→ playInfo（分档直链）
    resolve: function(item) {
      var self = this;
      return this.dougaInfo(item.id).then(function(d) {
        if (!d || d.result !== 0 || !(d.videoList || []).length) return false;
        item.videoId = d.videoList[0].id;
        item.channel = d.channel || null;
        item.danmakuCount = d.danmakuCount || 0;
        item.liked = !!d.isLike;
        item.favorited = !!d.isFavorite;
        item.thrown = !!d.isThrowBanana;
        if (d.likeCount != null) item.like = d.likeCount;
        if (d.bananaCount != null) item.banana = d.bananaCount;
        if (d.commentCount != null) item.comment = d.commentCount;
        if (d.viewCount != null) item.view = d.viewCount;
        if (d.stowCount != null) item.fav = d.stowCount;
        if (d.shareCount != null) item.share = d.shareCount;
        if (d.createTime) item.date = String(d.createTime).slice(0, 10);
        else if (d.createTimeMillis) item.date = new Date(d.createTimeMillis).toISOString().slice(0, 10);
        var u = d.user || {};
        if (u.id) item.userId = Number(u.id) || item.userId;
        if (u.name) item.userName = u.name;
        item.isFollowing = !!u.isFollowing;
        return self.playInfo(item.videoId, item.id).then(function(qualities) {
          if (!qualities.length) return false;
          item.qualities = qualities;
          applyQuality(item);
          return item.urls.length > 0;
        });
      });
    },
    // 分享卡片详情：douga/info 一发拿全（title/coverUrl/durationMillis/计数，2026-09-29
    // 实测；coverUrls/image/cover 恒空，封面就在 coverUrl）。Promise 级缓存——同一 ac 号
    // 的多条分享消息只发一请求；失败即弃缓存，下条消息可重试（调用方降级纯文本）
    cardCache: {},
    dougaCard: function(acId) {
      var self = this;
      var key = String(acId);
      if (self.cardCache[key]) return self.cardCache[key];
      var p = this.dougaInfo(key).then(function(d) {
        if (!d || d.result !== 0 || !d.title) {
          delete self.cardCache[key];
          return null;
        }
        return {
          title: String(d.title || ""),
          cover: String(d.coverUrl || ""),
          durationSec: Math.round((Number(d.durationMillis) || 0) / 1e3),
          view: d.viewCountShow != null ? d.viewCountShow : d.viewCount || "",
          comment: d.commentCountShow != null ? d.commentCountShow : d.commentCount || "",
          danmaku: d.danmakuCountShow != null ? d.danmakuCountShow : d.danmakuCount || "",
          url: CFG.api.videoBase + key
        };
      }, function() {
        delete self.cardCache[key];
        return null;
      });
      self.cardCache[key] = p;
      return p;
    },
    // ---- 收藏（PC 端收藏夹体系） ----
    // 视频 resourceType=9（收藏体系专用枚举，acfunsdk 里显式做 2→9 映射），且必须
    // 落进收藏夹（addFolderIds/delFolderIds）。此前调的 APP 端 /rest/app/favorite
    // 不带收藏夹参数，服务端返回 result:0 但实际不入库——「提示成功却没收藏」的根源。
    // 网页 Cookie 即可鉴权（同域 fetch，无需 api_st），协议与 AcFunHelper/acfunsdk 一致
    setFavorite: function(acId, on) {
      return ensureFavFolder().then(function(fid) {
        return postForm(on ? CFG.api.favoriteAdd : CFG.api.favoriteRemove, on ? "resourceId=" + acId + "&resourceType=9&addFolderIds=" + fid : "resourceType=9&resourceId=" + acId + "&delFolderIds=" + fid);
      }).then(function(j) {
        return !!(j && j.result === 0);
      }, function() {
        return false;
      });
    },
    // ---- 投蕉（PC 端点，网页 Cookie 即可） ----
    // 推荐模式互动统一走 web 通道（收藏/关注/点赞/投蕉）。resourceType=2 与 APP 端同义
    // （acfunsdk AcVideo 的 resource_type 即 2）；count 1~5
    throwBanana: function(acId, count) {
      return postForm(
        CFG.api.bananaPc,
        "resourceId=" + acId + "&resourceType=2&count=" + (count > 0 ? count : 1)
      ).then(function(j) {
        return !!(j && j.result === 0);
      }, function() {
        return false;
      });
    },
    // 评论点赞：PC 端点（复用动态广场模块，网页 Cookie 即可，无需 token）
    commentLike: function(sourceId, sourceType, commentId, on) {
      return postForm(
        CFG.api.commentLikePc + (on ? "like" : "unlike"),
        "sourceId=" + sourceId + "&sourceType=" + sourceType + "&commentId=" + commentId
      ).then(function(j) {
        return !!(j && j.result === 0);
      }, function() {
        return false;
      });
    },
    // 发评论/回复（复用动态广场 postComment：replyToCommentId 传入则为回复楼中楼；
    // midgroundToken 由网页 Cookie 换取，未登录时直发让接口报错）；失败透传 error_msg
    postComment: function(sourceId, sourceType, content, replyToCommentId) {
      var base = "sourceId=" + sourceId + "&sourceType=" + sourceType + "&replyToCommentId=" + (replyToCommentId || 0) + "&content=" + encodeURIComponent(content);
      return ensureApiSt().then(function(st) {
        return postForm(CFG.api.commentAdd, base + "&midgroundToken=" + encodeURIComponent(st));
      }, function() {
        return postForm(CFG.api.commentAdd, base);
      }).then(function(j) {
        if (j && j.result === 0) return { ok: true, comment: j.comment || null };
        return { ok: false, msg: j && (j.error_msg || j.msg) || "" };
      }, function() {
        return { ok: false, msg: "网络错误" };
      });
    },
    // ---- 弹幕（www.acfun.cn 同域，网页 Cookie） ----
    // 注意：POST body 必须带表单 Content-Type，否则后端解析不到参数（result 21）
    // 全量分页拉取，返回按 position 升序的规整条目
    danmakuList: function(videoId) {
      var all = [];
      var FORM = { "Content-Type": "application/x-www-form-urlencoded" };
      var pages = 0;
      function page(p) {
        return request(
          CFG.api.dmList,
          "POST",
          FORM,
          "resourceId=" + videoId + "&resourceType=9&enableAdvanced=true&pcursor=" + p + "&count=" + CFG.danmaku.pageSize + "&sortType=1&asc=false"
        ).then(function(j) {
          if (!j || j.result !== 0) return all;
          (j.danmakus || []).forEach(function(m) {
            all.push({
              id: m.danmakuId,
              text: String(m.body || "").replace(/\s+/g, " "),
              at: Number(m.position) || 0,
              mode: Number(m.mode) || 1,
              color: intToHex(m.color),
              size: Number(m.size) || 25
            });
          });
          var next = j.pcursor;
          if (!next || next === "no_more" || next === "0" || ++pages >= CFG.danmaku.maxPages || all.length >= CFG.danmaku.maxPages * CFG.danmaku.pageSize) return all;
          return page(next);
        }, function() {
          return all;
        });
      }
      return page(1).then(function(list) {
        list.sort(function(a, b) {
          return a.at - b.at;
        });
        return list;
      });
    },
    danmakuAdd: function(item, text, positionMs) {
      var ch = item.channel || {};
      return postForm(
        CFG.api.dmAdd,
        "body=" + encodeURIComponent(text) + "&color=16777215&mode=1&size=25&position=" + Math.max(0, Math.round(positionMs)) + "&id=" + item.id + "&videoId=" + item.videoId + "&roleId=&subChannelId=" + (ch.parentId || 0) + "&subChannelName=" + encodeURIComponent(ch.parentName || "") + "&type=douga"
      ).then(function(j) {
        if (j && j.result === 0) return { ok: true };
        return { ok: false, msg: j && (j.error_msg || j.msg) || "" };
      }, function() {
        return { ok: false, msg: "网络错误" };
      });
    }
  };

  // src/api.js
  function mockData() {
    return window.__ACSV_MOCK__ || null;
  }
  function mockHome() {
    return window.__ACSV_MOCK_HOME__ || null;
  }
  var curSource = "sv";
  try {
    curSource = localStorage.getItem(CFG.lsSource) === "home" ? "home" : "sv";
  } catch (e) {
  }
  function getSource() {
    return curSource;
  }
  function setSource(s) {
    curSource = s === "home" ? "home" : "sv";
    if (curSource === "home") AppAPI.resetPager();
    try {
      localStorage.setItem(CFG.lsSource, curSource);
    } catch (e) {
    }
  }
  function resetHomePager() {
    if (curSource === "home") AppAPI.resetPager();
  }
  function ensureResolved(item) {
    if (!item.cap.lazyResolve) return Promise.resolve(true);
    if (item.urls.length) return Promise.resolve(true);
    if (item._resolveP) return item._resolveP;
    item.resolving = true;
    var p = API.refreshItem(item).then(function(ok) {
      if (item._resolveP === p) {
        item._resolveP = null;
        item.resolving = false;
      }
      return !!ok && item.urls.length > 0;
    }, function() {
      if (item._resolveP === p) {
        item._resolveP = null;
        item.resolving = false;
      }
      return false;
    });
    item._resolveP = p;
    return p;
  }
  var API = {
    feed: function() {
      if (curSource === "home") {
        var mh = mockHome();
        if (mh) return Promise.resolve(mh.map(normalizeHome));
        return AppAPI.homeFeed();
      }
      var mock = mockData();
      if (mock && mock.feed) {
        return Promise.resolve((mock.feed || []).filter(function(r) {
          return r && r.playInfo && r.playInfo.videoUrls && r.playInfo.videoUrls.length;
        }).map(normalize));
      }
      return request(CFG.api.feed).then(function(json) {
        return (json && json.meowFeed || []).map(normalize);
      });
    },
    // 小视频单条详情（深链置顶/空间页泵入/最热统计共用，home 模式不走）
    info: function(mid) {
      var mock = mockData();
      if (mock && mock.feed) {
        var raw = mock.feed.filter(function(r) {
          return String(r.meowId) === String(mid);
        })[0];
        return Promise.resolve(raw ? normalize(raw) : null);
      }
      return request(CFG.api.info + mid).then(function(json) {
        return json && json.meowFeed ? normalize(json.meowFeed) : null;
      });
    },
    // 深链解析（0.9.72）：地址栏 id 跨两个 id 空间——meowId（小视频）与 acId（推荐），
    // 详情各自落在 normalize / normalizeHome 的 id 上，故解析要按空间选端点。标记形态（src
    // 由 route.parseHash 给出）只打对应的一个；历史裸数字链接并行打两个、由 deepLinkOf 定
    // 优先级（meow 先：脚本主源，且 README 的分享格式基准）。任一失败只当未命中并返回 null
    // ——**不**回落随机流，由调用方出错误盒（旧行为：链接失效时用户只看到一屏随机内容）
    deepLink: function(mid, src) {
      var self = this;
      var meowP = src === "home" ? Promise.resolve(null) : self.info(mid).then(function(n) {
        return n || null;
      }, function() {
        return null;
      });
      var acP = src === "sv" ? Promise.resolve(null) : AppAPI.dougaInfo(mid).then(function(d) {
        return d || null;
      }, function() {
        return null;
      });
      return Promise.all([meowP, acP]).then(function(r) {
        return deepLinkOf(r[0], r[1], mid);
      });
    },
    // 直链过期/缺失时的补链：sv 重取详情，home 重跑解析
    refreshItem: function(item) {
      if (item.kind === "home") {
        var mh = mockHome();
        if (mh) {
          var raw = mh.filter(function(c) {
            return String(c.href) === String(item.id);
          })[0];
          var direct = window.__ACSV_MOCK_DIRECT__;
          if (!raw && direct && direct[String(item.id)]) raw = { mockUrl: window.__ACSV_TEST_WEBM__ || "" };
          if (raw) {
            var mu = raw.mockUrl;
            item.urls = mu ? [mu] : [];
            item.qualities = mu ? [{ label: "示例", urls: [mu] }, { label: "示例·备线", urls: [mu] }] : [];
            if (mu) item.cap.hls = false;
            item.videoId = "mock-" + item.id;
            item.fav = 12;
            item.share = 34;
            item.date = "2026-09-26";
            return Promise.resolve(!!mu);
          }
        }
        return AppAPI.resolve(item);
      }
      return this.info(item.id).then(function(p) {
        if (p && p.urls.length) {
          item.urls = p.urls;
          item.urlIdx = 0;
          return true;
        }
        return false;
      }, function() {
        return false;
      });
    }
  };

  // src/uppage.js
  var PAGE_SIZE = CFG.page.size;
  var UpVideos = {
    uid: 0,
    pcursor: null,
    total: 0,
    busy: false,
    done: false,
    failed: false,
    items: [],
    chainBusy: false,
    chainCapped: false,
    page: 1,
    sortBy: "newest",
    counts: {},
    countsFetched: 0,
    hotFetching: false,
    feedActive: false,
    feedCursor: 0,
    gridEl: null,
    pagebarEl: null,
    progressEl: null,
    sortWrapEl: null,
    countSpan: null
  };
  var M_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
  function gmGetText(url) {
    return gmRequest({
      method: "GET",
      url,
      timeout: CFG.time.gm,
      responseType: "text",
      headers: { "Referer": "https://m.acfun.cn/", "User-Agent": M_UA }
    });
  }
  function parseUpItems(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var out = [];
    var lis = doc.querySelectorAll("li[meow-id]");
    for (var i = 0; i < lis.length; i++) {
      var img = lis[i].querySelector("img");
      out.push({
        id: lis[i].getAttribute("meow-id"),
        cover: img ? img.getAttribute("src") : ""
      });
    }
    return out;
  }
  function extractSvInfo(text) {
    var m = text.match(/var shortVideoInfo\s*=\s*([\s\S]*?);/);
    if (!m || m[1].charAt(0) !== "{") return null;
    try {
      return JSON.parse(m[1]);
    } catch (e) {
      return null;
    }
  }
  function loadUpVideos(first) {
    var uid = UpVideos.uid;
    UpVideos.busy = true;
    var url = first ? CFG.api.upPage + uid : CFG.api.upPage + uid + "?page=" + UpVideos.pcursor + "&userId=" + uid + "&type=6&pcursor=" + UpVideos.pcursor + "&pagelets=short-video-list&ajaxpipe=1";
    return gmGetText(url).then(function(txt) {
      UpVideos.busy = false;
      var html = txt, pc = "no_more", svi;
      if (first) {
        svi = extractSvInfo(txt);
      } else {
        try {
          var j = JSON.parse(txt.replace(/\/\*<!-- fetch-stream -->\*\/\s*$/, ""));
          html = j && j.html || "";
          svi = extractSvInfo((j && j.scripts || []).join(""));
        } catch (e) {
          UpVideos.failed = true;
          return [];
        }
      }
      if (svi) {
        if (svi.totalCount) UpVideos.total = Number(svi.totalCount) || 0;
        if (svi.pcursor) pc = svi.pcursor;
      }
      var items = parseUpItems(html);
      if (pc === "no_more" || !items.length) {
        UpVideos.done = true;
        UpVideos.total = UpVideos.items.length + items.length;
      }
      UpVideos.pcursor = pc;
      return items;
    }, function() {
      UpVideos.busy = false;
      UpVideos.failed = true;
      return [];
    });
  }
  function appendUpCells(items, offset) {
    var grid = UpVideos.gridEl;
    if (!grid || !grid.isConnected) return;
    offset = offset || 0;
    items.forEach(function(it, k) {
      var cell = el("div", "acsv-space-cell");
      cell.title = "播放小视频";
      var img = el("img");
      img.referrerPolicy = "no-referrer";
      img.loading = "lazy";
      img.addEventListener("load", function() {
        img.classList.add("ld");
      });
      img.src = it.cover;
      cell.appendChild(img);
      cell.addEventListener("click", function() {
        UpVideos.feedActive = true;
        UpVideos.feedCursor = offset + k + 1;
        FeedStore.resetForList();
        location.hash = CFG.hash + "/v/" + it.id;
      });
      grid.appendChild(cell);
    });
  }
  function sortedUpItems() {
    var arr = UpVideos.items.slice();
    if (UpVideos.sortBy === "hotest") {
      var withCounts = arr.filter(function(it) {
        return UpVideos.counts[it.id] !== void 0;
      });
      var without = arr.filter(function(it) {
        return UpVideos.counts[it.id] === void 0;
      });
      withCounts.sort(function(a, b) {
        return (UpVideos.counts[b.id] || 0) - (UpVideos.counts[a.id] || 0);
      });
      return withCounts.concat(without);
    }
    return arr;
  }
  function renderUpPage() {
    var grid = UpVideos.gridEl;
    if (!grid || !grid.isConnected) return;
    var sorted = sortedUpItems();
    var pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (UpVideos.page > pages) UpVideos.page = pages;
    var slice = sorted.slice((UpVideos.page - 1) * PAGE_SIZE, UpVideos.page * PAGE_SIZE);
    grid.innerHTML = "";
    appendUpCells(slice, (UpVideos.page - 1) * PAGE_SIZE);
    renderUpPagebar(pages);
    renderUpProgress();
  }
  function renderUpPagebar(totalPagesLoaded) {
    var bar = UpVideos.pagebarEl;
    if (!bar) return;
    var totalPages = UpVideos.total ? Math.ceil(UpVideos.total / PAGE_SIZE) : totalPagesLoaded;
    var cur = UpVideos.page;
    bar.innerHTML = "";
    function btn(label, target, opts) {
      opts = opts || {};
      var b = el("button", "acsv-pagebtn" + (opts.cur ? " cur" : "") + (opts.dots ? " dots" : ""), label);
      if (opts.disabled) b.disabled = true;
      if (!opts.disabled && !opts.cur && !opts.dots) {
        b.addEventListener("click", function() {
          UpVideos.page = target;
          renderUpPage();
        });
      }
      bar.appendChild(b);
    }
    btn("‹", cur - 1, { disabled: cur <= 1 });
    var shown = {};
    var windowLo = Math.max(1, cur - 2), windowHi = Math.min(totalPages, cur + 2);
    [1, windowLo - 1, windowLo, windowHi + 1, totalPages].forEach(function(p2) {
      if (p2 >= 1 && p2 <= totalPages) shown[p2] = "jump";
    });
    for (var p = windowLo; p <= windowHi; p++) shown[p] = false;
    var keys = Object.keys(shown).map(Number).sort(function(a, b) {
      return a - b;
    });
    var prev = 0;
    keys.forEach(function(p2) {
      if (prev && p2 - prev > 1) btn("…", 0, { dots: true });
      var loaded = p2 <= totalPagesLoaded;
      btn(String(p2), p2, { cur: p2 === cur, disabled: !loaded });
      prev = p2;
    });
    btn("›", cur + 1, { disabled: cur >= totalPagesLoaded });
  }
  function renderUpProgress() {
    var elp = UpVideos.progressEl;
    if (!elp) return;
    if (UpVideos.countSpan && (UpVideos.total || UpVideos.done)) {
      UpVideos.countSpan.textContent = fmt(UpVideos.total);
    }
    var loaded = UpVideos.items.length;
    var base = "已加载 " + loaded + (UpVideos.total ? " / " + UpVideos.total : "");
    if (UpVideos.sortBy === "hotest" && !UpVideos.done) {
      elp.textContent = base + "（加载中，最热排序将在加载完成后准确）";
    } else if (UpVideos.sortBy === "hotest") {
      elp.textContent = loaded ? "热度统计 " + UpVideos.countsFetched + " / " + loaded : base;
    } else {
      elp.textContent = UpVideos.done ? "共 " + loaded + " 个" : UpVideos.failed && !loaded ? "加载失败（需在 Tampermonkey 下运行）" : UpVideos.chainCapped ? base + "（已达自动加载上限）" : base + "（后台加载中）";
    }
  }
  function startUpChain() {
    if (UpVideos.chainBusy) return;
    UpVideos.chainBusy = true;
    UpVideos.chainCapped = false;
    var pages = 0;
    (function step() {
      if (!UpVideos.chainBusy || UpVideos.done || pages >= CFG.up.maxChainPages) {
        UpVideos.chainCapped = !UpVideos.done && pages >= CFG.up.maxChainPages;
        UpVideos.chainBusy = false;
        renderUpProgress();
        return;
      }
      pages++;
      loadUpVideos(UpVideos.pcursor === null).then(function(items) {
        if (items.length) {
          UpVideos.items = UpVideos.items.concat(items);
          renderUpPage();
        }
        if (UpVideos.done || !items.length) {
          UpVideos.chainBusy = false;
          renderUpProgress();
          return;
        }
        setTimeout(step, CFG.time.chainGap);
      });
    })();
  }
  function ensureHotCounts() {
    if (UpVideos.hotFetching) return;
    UpVideos.hotFetching = true;
    (function step() {
      if (!UpVideos.hotFetching) return;
      var todo = UpVideos.items.filter(function(it) {
        return UpVideos.counts[it.id] === void 0;
      });
      if (!todo.length) {
        UpVideos.hotFetching = false;
        renderUpProgress();
        return;
      }
      var batch = todo.slice(0, 4);
      Promise.all(batch.map(function(it) {
        return API.info(it.id).then(function(n) {
          UpVideos.counts[it.id] = n && n.like || 0;
        }, function() {
          UpVideos.counts[it.id] = 0;
        });
      })).then(function() {
        UpVideos.countsFetched = Object.keys(UpVideos.counts).length;
        if (UpVideos.sortBy === "hotest") renderUpPage();
        renderUpProgress();
        setTimeout(step, CFG.time.hotGap);
      });
    })();
  }
  function injectSpaceVideos(uid) {
    if (document.getElementById("acsv-space-grid")) return;
    UpVideos.uid = Number(uid);
    UpVideos.pcursor = null;
    UpVideos.done = false;
    UpVideos.failed = false;
    UpVideos.chainCapped = false;
    UpVideos.total = 0;
    UpVideos.items = [];
    UpVideos.page = 1;
    UpVideos.sortBy = "newest";
    UpVideos.counts = {};
    UpVideos.countsFetched = 0;
    ensureStyle();
    var grid = el("div", "acsv-space-grid");
    grid.id = "acsv-space-grid";
    var pagebar = el("div", "acsv-pagebar");
    var progress = el("span", "acsv-progress-txt", "加载中…");
    var sort = el("div", "acsv-sort");
    sort.appendChild(el("span", "acsv-sort-cur", "最新"));
    sort.appendChild(el("i", "arrow", "▾"));
    var menu = el("ul", "acsv-sort-menu");
    [["newest", "最新"], ["hotest", "最热"]].forEach(function(p) {
      var li2 = el("li", p[0] === "newest" ? "on" : "", p[1]);
      li2.dataset.sort = p[0];
      li2.addEventListener("click", function(ev) {
        ev.stopPropagation();
        UpVideos.sortBy = p[0];
        sort.querySelector(".acsv-sort-cur").textContent = p[1];
        [...menu.children].forEach(function(m) {
          m.classList.toggle("on", m.dataset.sort === p[0]);
        });
        sort.classList.remove("open");
        UpVideos.page = 1;
        renderUpPage();
        if (p[0] === "hotest") ensureHotCounts();
      });
      menu.appendChild(li2);
    });
    sort.appendChild(menu);
    sort.addEventListener("click", function(ev) {
      ev.stopPropagation();
      sort.classList.toggle("open");
    });
    document.addEventListener("click", function() {
      sort.classList.remove("open");
    }, { once: false });
    var toolbar = el("div", "acsv-toolbar");
    toolbar.appendChild(progress);
    toolbar.appendChild(sort);
    UpVideos.gridEl = grid;
    UpVideos.pagebarEl = pagebar;
    UpVideos.progressEl = progress;
    var cl = document.querySelector(".ac-space-contribute-list");
    var tagsUl = cl && cl.querySelector("ul.tags");
    if (cl && tagsUl) {
      var albumLi = tagsUl.querySelector('li[data-index="album"]');
      var siteSortSpan = tagsUl.querySelector("#ac-space-contribute-sort");
      var siteSortLi = siteSortSpan ? siteSortSpan.closest("li") : null;
      var li = elHtml("li", null, "小视频<span>0</span>");
      li.dataset.index = "svideo";
      li.title = "该 UP 主的小视频";
      var panel = el("div", "tag-content");
      panel.appendChild(toolbar);
      panel.appendChild(grid);
      panel.appendChild(pagebar);
      li.addEventListener("click", function(ev) {
        ev.stopPropagation();
        if (siteSortLi) siteSortLi.style.display = "none";
        var lis = tagsUl.children;
        for (var i = 0; i < lis.length; i++) lis[i].classList.remove("active");
        li.classList.add("active");
        var panels = cl.querySelectorAll(":scope > .tag-content");
        for (var k = 0; k < panels.length; k++) panels[k].classList.remove("active");
        panel.classList.add("active");
      });
      tagsUl.addEventListener("click", function(ev) {
        var t = ev.target && ev.target.closest ? ev.target.closest("li[data-index]") : null;
        if (t && t.dataset.index !== "svideo" && siteSortLi) siteSortLi.style.display = "";
      });
      if (albumLi) albumLi.insertAdjacentElement("afterend", li);
      else tagsUl.appendChild(li);
      cl.appendChild(panel);
      UpVideos.countSpan = li.querySelector("span");
      startUpChain();
      return;
    }
    var space = document.getElementById("ac-space");
    var wp = space && (space.querySelector(".wp") || space);
    if (!wp) return;
    var sec = el("section", "acsv-space");
    sec.id = "acsv-space";
    var head = el("div", "acsv-space-head");
    head.appendChild(el("h2", null, "小视频"));
    head.appendChild(el("span", "n", "0"));
    sec.appendChild(head);
    sec.appendChild(toolbar);
    sec.appendChild(grid);
    sec.appendChild(pagebar);
    wp.appendChild(sec);
    UpVideos.countSpan = head.querySelector(".n");
    startUpChain();
  }
  function tryInjectSpace() {
    var mU = location.pathname.match(/^\/u\/(\d+)/);
    if (!mU) return;
    var tries = 0;
    var attempt = function() {
      if (document.getElementById("acsv-space") || document.getElementById("acsv-space-grid")) return;
      if (document.getElementById("ac-space")) {
        injectSpaceVideos(mU[1]);
        return;
      }
      if (tries++ < CFG.nav.tries) setTimeout(attempt, CFG.nav.retryMs);
    };
    attempt();
  }

  // src/feedstore.js
  function createFeedStore(env) {
    var store = {
      items: [],
      seen: {},
      loading: false,
      pumpBusy: false,
      current: 0,
      gen: 0,
      // 代际令牌：reset 自增；旧源在途请求的响应一律丢弃（防双源混流）
      changed: function() {
        if (env.onChange) env.onChange();
      },
      fetchMore: function() {
        var self = this;
        if (self.loading) return Promise.resolve();
        self.loading = true;
        var gen = self.gen;
        return env.api.feed().then(function(list) {
          if (gen !== self.gen) return;
          self.loading = false;
          dbg("fetch:list=" + list.length);
          list.forEach(function(n) {
            if (n.id && !self.seen[n.id] && (n.cap.lazyResolve || n.urls.length)) {
              self.seen[n.id] = 1;
              self.items.push(n);
            }
          });
          dbg("fetch:items=" + self.items.length);
          self.changed();
        }, function() {
          if (gen !== self.gen) return;
          self.loading = false;
        });
      },
      // 直链过期刷新：sv 换备用 CDN 或重取详情；home 重跑解析链
      refresh: function(item) {
        return env.api.refreshItem(item).then(function(ok) {
          if (ok && item.urls.length) {
            item.urlIdx = 0;
            return true;
          }
          return false;
        }, function() {
          return false;
        });
      },
      ensureMore: function() {
        var self = this;
        var ctx = env.getListContext();
        if (ctx) {
          self.pumpListContext(ctx);
          return Promise.resolve();
        }
        if (self.items.length === 0 || self.current >= self.items.length - CFG.feed.bufferSize) {
          return self.fetchMore();
        }
        return Promise.resolve();
      },
      // 按列表上下文顺序泵入下一条（逐个取详情，保持列表顺序）
      pumpListContext: function(ctx) {
        var self = this;
        if (!ctx || self.pumpBusy) return;
        self.pumpBusy = true;
        (function step() {
          if (env.getListContext() !== ctx) {
            self.pumpBusy = false;
            return;
          }
          while (ctx.feedCursor < ctx.items.length && self.seen[ctx.items[ctx.feedCursor].id]) {
            ctx.feedCursor++;
          }
          if (ctx.feedCursor >= ctx.items.length) {
            self.pumpBusy = false;
            if (ctx.done || ctx.failed) self.fetchMore().then(function() {
              env.onChange();
            });
            else setTimeout(function() {
              self.pumpListContext(ctx);
            }, CFG.time.chainGap);
            return;
          }
          var raw = ctx.items[ctx.feedCursor];
          var gen = self.gen;
          env.api.info(raw.id).then(function(n) {
            if (gen !== self.gen) return;
            if (n && n.id && n.urls.length && !self.seen[n.id]) {
              self.seen[n.id] = 1;
              self.items.push(n);
            }
            ctx.feedCursor++;
            self.pumpBusy = false;
            if (self.items.length - self.current < CFG.feed.bufferSize) self.pumpListContext(ctx);
            else env.onChange();
          }, function() {
            if (gen !== self.gen) return;
            ctx.feedCursor++;
            self.pumpBusy = false;
            self.pumpListContext(ctx);
          });
        })();
      },
      resetForList: function() {
        this.gen++;
        this.items = [];
        this.seen = {};
        this.current = 0;
        this.loading = false;
        this.pumpBusy = false;
      },
      // 内容源切换/进入竖刷页时的全量重置（resetForList 的别名，语义更明确）
      reset: function() {
        this.resetForList();
      }
    };
    return store;
  }
  var FeedStore = createFeedStore({
    api: {
      feed: function() {
        return API.feed();
      },
      info: function(id) {
        return API.info(id);
      },
      refreshItem: function(item) {
        return API.refreshItem(item);
      }
    },
    onChange: function() {
      if (scroller) renderWindow();
    },
    getListContext: function() {
      return UpVideos.feedActive ? UpVideos : null;
    }
  });
  testHook("feed", function() {
    return {
      current: FeedStore.current,
      gen: FeedStore.gen,
      items: FeedStore.items.map(function(it) {
        return {
          id: it.id,
          kind: it.kind,
          hasUrls: !!(it.urls && it.urls.length),
          resolving: !!it.resolving,
          qualities: it.qualities ? it.qualities.length : 0,
          qIdx: it.qIdx || 0,
          // 切档同步断言用：邻居条目是否跟随新偏好
          qLabel: it.qualities && it.qualities[it.qIdx] ? it.qualities[it.qIdx].label : null
        };
      })
    };
  });

  // src/route.js
  var routeRe = new RegExp("^" + CFG.hash + "(?:/(\\d+))?$");
  var markRe = new RegExp("^" + CFG.hash + "/([va])/(\\d+)$");
  var playRe = new RegExp("^" + CFG.hash + "/play/([va])/(\\d+)$");
  var viewRe = new RegExp("^" + CFG.hash + "/([a-z]+)(?:/([^/]+))?$");
  function decodeArg(s) {
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return s;
    }
  }
  function parseHash(h) {
    h = String(h == null ? "" : h).replace(/^#\/?/, "");
    var m = h.match(routeRe);
    var k = m ? null : h.match(markRe);
    var p = m || k ? null : h.match(playRe);
    var v = m || k || p ? null : h.match(viewRe);
    return {
      active: !!(m || k || p || v),
      mid: m && m[1] || k && k[2] || null,
      src: k && (k[1] === "a" ? "home" : "sv") || p && (p[1] === "a" ? "home" : "sv") || null,
      view: p ? "play" : v ? v[1] : null,
      viewArg: p ? p[2] : v && v[2] ? decodeArg(v[2]) : null
    };
  }
  function parseRoute() {
    var r = parseHash(location.hash);
    r.active = r.active || location.pathname === "/" + CFG.hash;
    return r;
  }
  function isFeedRoute() {
    return parseRoute().active;
  }
  var hashTimer = null;
  var hashPending = -1;
  var appliedMid = null;
  function getAppliedMid() {
    return appliedMid;
  }
  function setAppliedMid(m) {
    appliedMid = m == null ? null : String(m);
  }
  function cancelHashSync() {
    if (hashTimer) {
      clearTimeout(hashTimer);
      hashTimer = null;
    }
    hashPending = -1;
  }
  function syncHash(idx) {
    if (!root) return;
    hashPending = idx;
    if (hashTimer) return;
    hashTimer = setTimeout(function() {
      hashTimer = null;
      if (!root) return;
      if (parseRoute().view) return;
      var it = FeedStore.items[hashPending];
      if (!it) return;
      setAppliedMid(it.id);
      try {
        history.replaceState(
          null,
          "",
          location.pathname + location.search + "#" + CFG.hash + "/" + (it.kind === "home" ? "a" : "v") + "/" + it.id
        );
      } catch (e) {
      }
    }, 150);
  }

  // src/imicons.js
  var ICON_SVGS = {
    play: "https://ali-imgs.acfun.cn/kos/nlav10360/static/img/icon_view_player.4a9692bb.svg",
    // v/list60 播放计数
    comment: "https://ali-imgs.acfun.cn/kos/nlav10360/static/img/icon_message.e89cfe55.svg"
    // v/list60 评论计数
  };
  var GLYPHS = {
    play: "",
    // 播放（list201 计数遮罩同款）
    danmu: "",
    // 弹幕（list201 计数遮罩同款）
    message: "",
    // 消息气泡（站点头部「消息」图标；非评论）
    search: "",
    // 搜索
    clock: "",
    // 时钟（历史）
    star: "",
    // 星星（动态；顶部与历史相邻那颗，非收藏——0.9.24 误标勘正）
    banana: "",
    // 蕉
    share: "",
    // 分享/上传（站点头部）
    // 动态卡（member/feeds）互动区四件套（0.9.55/0.9.56 浏览器实测码点，acfun-frontend-next）
    feedRepost: "",
    // 分享/转发
    feedComment: "",
    // 评论
    feedLike: "",
    // 点赞（未点亮）
    feedLikeFill: "",
    // 点赞（点亮实心）
    phone: "",
    // 手机
    monitor: "",
    // 电脑
    tablet: "",
    // 平板
    grid: "",
    // 网格
    shop: "",
    // 商店
    game: "",
    // 游戏
    power: "",
    // 电源
    rank: "",
    // 排行/音柱
    arrowRight: "",
    // 右箭头
    arrowUp: "",
    // 上箭头
    // 榜单卡 meta 与 UP 卡数据位（0.9.69，原生 rank/list 浏览器实测码点；同 acfun-frontend-next
    // 字体已由 styles @font-face 注入）：rankView 与封面 hover 播放按钮同字；
    // 投稿数复用 share('\ue15b')（原生 up-card 同字）
    rankView: "",
    // 播放数（原生 video-card extra 首位）
    rankComment: "",
    // 评论数（原生 video-card extra 次位）
    rankTime: "",
    // 发布时间（原生 video-card extra 时钟）
    fans: ""
    // 粉丝数（原生 up-card 次数据位；音柱/人形字形实测渲染核对）
  };

  // src/immsg.js
  function msgContentType(m) {
    try {
      return m.rawMsg && m.rawMsg.contentType || 0;
    } catch (e) {
      return 0;
    }
  }
  function parseCard(m) {
    try {
      if (msgContentType(m) !== 10001) return null;
      var buf = m.rawMsg && m.rawMsg.content;
      if (!buf) return null;
      var j = JSON.parse(new TextDecoder("utf-8").decode(buf));
      if (!j || !Array.isArray(j.resourceBody) || !j.resourceBody.length) return null;
      return j;
    } catch (e) {
      return null;
    }
  }
  var QUOTE_EXTRA_KEY = "acsvQuote";
  var CMT_EXTRA_KEY = "acsvCmt";
  var RE_CMT_SHARE = /^@([^\n：]{1,40})：/;
  function isCommentShare(title) {
    return RE_CMT_SHARE.test(String(title || ""));
  }
  function commentShareAuthor(title) {
    var m = RE_CMT_SHARE.exec(String(title || ""));
    return m ? m[1] : "";
  }
  function commentShareWire(name, text) {
    return "@" + (name || "") + "：" + (text || "");
  }
  var RE_AC_URL = /https?:\/\/www\.acfun\.cn\/v\/ac(\d+)(?:\/?\?[^\s]*)?(?:#[^\s]*)?/i;
  var RE_TAIL_PUNCT = /[\s.,;:!?)\]】」』。、！？；：]+$/;
  var RE_HEAD_PUNCT = /^[\s.,;:!?(\[【「『。、！？；：]+/;
  function parseShare(text) {
    var t = String(text == null ? "" : text);
    var m = RE_AC_URL.exec(t);
    if (!m) return null;
    var url = m[0].replace(RE_TAIL_PUNCT, "");
    return {
      title: t.slice(0, m.index).trim().slice(0, 400),
      note: t.slice(m.index + m[0].length).replace(RE_HEAD_PUNCT, "").trim().slice(0, 300),
      acId: m[1],
      url
    };
  }
  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function fmtDur(sec) {
    var s = Math.round(Number(sec) || 0);
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
    return (h ? h + ":" + pad2(m) : String(m)) + ":" + pad2(s % 60);
  }
  function degradeText(m) {
    try {
      var raw = m.rawMsg || {};
      if (typeof raw.backupTips === "string" && raw.backupTips) {
        return raw.backupTips.replace(/<a[^>]*>/gi, " [").replace(/<\/a>/gi, "] ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
      }
    } catch (e) {
    }
    return "[暂不支持查看的消息，请前往客户端查看]";
  }
  function isQuotable(m, wire) {
    var ct = msgContentType(m);
    if (ct !== 0 && ct !== 1 && ct !== 10001 && ct !== 12) return false;
    return !(wire === "reference" && ct === 10001);
  }
  function quoteOf(m) {
    try {
      if (msgContentType(m) !== 12) return null;
      var o = m.originMsg;
      var seqId = "", preview = "";
      if (o) {
        try {
          var raw = o.rawMsg || {};
          if (raw.seqId !== void 0 && raw.seqId !== null) seqId = String(raw.seqId);
        } catch (e1) {
        }
        preview = previewOfMessage(o) || "";
      }
      return {
        seqId,
        preview: String(preview).slice(0, 60),
        text: String(typeof m.text === "string" ? m.text : msgTextOf(m))
      };
    } catch (e) {
      return null;
    }
  }
  function quoteExtraOf(m) {
    try {
      if (msgContentType(m) !== 0) return null;
      var extra = m.rawMsg && m.rawMsg.extra;
      if (!extra) return null;
      var q2 = (JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(extra))) || {})[QUOTE_EXTRA_KEY];
      if (!q2 || typeof q2.text !== "string") return null;
      return {
        seqId: q2.seqId != null ? String(q2.seqId) : "",
        preview: String(q2.preview || "").slice(0, 60),
        text: q2.text
      };
    } catch (e) {
      return null;
    }
  }
  function quoteWirePrefix(preview) {
    return "[引用] " + (preview || "原消息");
  }
  function quoteWireText(preview, text) {
    return quoteWirePrefix(preview) + "\n" + text;
  }
  function quoteWireTrimLen(contentText, q2) {
    try {
      var prefix = quoteWirePrefix(q2 && q2.preview);
      var t = String(contentText == null ? "" : contentText);
      if (t.indexOf(prefix) !== 0) return 0;
      var rest = t.slice(prefix.length);
      var ws = /^[\s\u00a0]+/.exec(rest);
      var body = rest.slice(ws ? ws[0].length : 0);
      return body === q2.text ? prefix.length + (ws ? ws[0].length : 0) : 0;
    } catch (e) {
      return 0;
    }
  }
  function cmtShareOf(m) {
    try {
      if (msgContentType(m) !== 0) return null;
      var extra = m.rawMsg && m.rawMsg.extra;
      if (!extra) return null;
      var q2 = (JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(extra))) || {})[CMT_EXTRA_KEY];
      if (!q2 || typeof q2.content !== "string") return null;
      return { ncid: q2.ncid != null ? String(q2.ncid) : "", content: q2.content };
    } catch (e) {
      return null;
    }
  }
  function msgTextOf(m) {
    try {
      if (typeof m.text === "string" && m.text) return m.text;
      if (typeof m.content === "string" && m.content) return m.content;
      if (m.content && typeof m.content.text === "string") return m.content.text;
      var raw = m.rawMsg || {};
      if (typeof raw.content === "string" && raw.content) return raw.content;
      if (raw.content && typeof raw.content.text === "string") return raw.content.text;
    } catch (e) {
    }
    return degradeText(m);
  }
  var RE_EMOT_CODE = /\[emot=\S+?\/\]/g;
  function plainPreview(s) {
    return String(s).replace(RE_EMOT_CODE, "[表情]");
  }
  function previewOfMessage(m) {
    try {
      var card = parseCard(m);
      if (card) {
        var res = card.resourceBody[0] || {};
        return "[作品卡片] " + String(res.title || card.prologue || "").slice(0, 30);
      }
      if (msgContentType(m) === 1) return "[图片]";
      var q2 = quoteOf(m) || quoteExtraOf(m);
      if (q2) return "[引用] " + plainPreview(q2.text).slice(0, 30);
      var txt = plainPreview(msgTextOf(m));
      var share = parseShare(txt);
      if (share) {
        return (isCommentShare(share.title) ? "[评论] " : "[分享] ") + (share.title ? plainPreview(share.title).slice(0, 30) : "推荐视频");
      }
      if (/https?:\/\/[^\s]*acfun\.cn/i.test(txt)) {
        var first = (txt.split("\n")[0] || "").trim();
        var title = /^https?:\/\//i.test(first) ? "" : first;
        return "[视频] " + (title ? title.slice(0, 30) : "分享了一个视频");
      }
      return txt.slice(0, 40);
    } catch (e) {
      return "";
    }
  }

  // src/overlay.js
  var stack = [];
  function overlayOpen(layer) {
    if (!layer || !layer.id || typeof layer.close !== "function") return;
    ensureKey();
    overlayClose(layer.id);
    stack.push({ id: layer.id, close: layer.close, modal: !!layer.modal });
  }
  function overlayClose(id) {
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].id !== id) continue;
      var layer = stack.splice(i, 1)[0];
      try {
        layer.close();
      } catch (e) {
      }
      return;
    }
  }
  function overlayTop() {
    return stack.length ? stack[stack.length - 1] : null;
  }
  function overlayTeardown() {
    while (stack.length) overlayClose(stack[stack.length - 1].id);
  }
  var keyBound = false;
  function onOverlayKey(ev) {
    if (ev.target === window) return;
    var top = overlayTop();
    if (!top || !top.modal) return;
    ev.stopPropagation();
    if (ev.key === "Escape") overlayClose(top.id);
  }
  function ensureKey() {
    if (keyBound) return;
    keyBound = true;
    window.addEventListener("keydown", onOverlayKey, true);
  }
  testHook("overlay", function() {
    return stack.map(function(l) {
      return l.id + (l.modal ? ":m" : "");
    });
  });

  // src/upload.js
  function gmPostJson(opts) {
    return gmRequest({
      method: "POST",
      url: opts.url,
      headers: opts.headers,
      data: opts.data,
      timeout: opts.timeout
    });
  }
  function uploadGetToken(file) {
    return gmPostJson({
      url: CFG.upload.tokenUrl,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "fileName=" + encodeURIComponent(file.name || "image.png"),
      timeout: CFG.upload.tokenT
    }).then(function(d) {
      if (!(d && d.result === 0 && d.info && d.info.token)) throw new Error("no-token");
      return d.info.token;
    });
  }
  function uploadChunks(token, file) {
    var endpoint = CFG.upload.endpoint;
    var total = file.size;
    function step(i) {
      if (i * CFG.upload.chunk >= total) return Promise.resolve();
      var start = i * CFG.upload.chunk;
      var end = Math.min(start + CFG.upload.chunk, total);
      return gmPostJson({
        url: endpoint + "/api/upload/fragment?upload_token=" + encodeURIComponent(token) + "&fragment_id=" + i,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Range": "bytes " + start + "-" + (end - 1) + "/" + total
        },
        data: file.slice(start, end),
        timeout: CFG.upload.chunkT
      }).then(function(d) {
        if (!d || d.result !== 1) throw new Error("chunk-" + i);
        return step(i + 1);
      });
    }
    return step(0);
  }
  function uploadComplete(token, chunks) {
    return gmPostJson({
      url: CFG.upload.endpoint + "/api/upload/complete?upload_token=" + encodeURIComponent(token) + "&fragment_count=" + chunks,
      timeout: CFG.upload.completeT
    }).then(function(d) {
      if (!d || d.result !== 1) throw new Error("complete");
    });
  }
  function uploadGetUrl(token) {
    return gmPostJson({
      url: CFG.upload.urlAfterUpload,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "token=" + encodeURIComponent(token) + "&bizFlag=web-comment-text",
      timeout: CFG.upload.urlT
    }).then(function(d) {
      if (!(d && d.result === 0 && d.url)) throw new Error("no-url");
      return d.url;
    });
  }
  function uploadImage(file) {
    var chunks = Math.max(1, Math.ceil(file.size / CFG.upload.chunk));
    return uploadGetToken(file).then(function(token) {
      return uploadChunks(token, file).then(function() {
        return token;
      });
    }).then(function(token) {
      return uploadComplete(token, chunks).then(function() {
        return token;
      });
    }).then(uploadGetUrl).then(function(url) {
      return url || null;
    }, function() {
      return null;
    });
  }

  // src/emoticon.js
  var EmotionMap = { loaded: false, loading: null, map: {}, packs: [] };
  function applyEmotPacks(flat) {
    var map = {};
    var packs = [];
    var byName = {};
    (flat || []).forEach(function(u) {
      if (!u || !u.emotionId || !u.emotionImageUrl) return;
      var big = u.emotionBigUrl || u.emotionImageUrl;
      map[u.emotionId] = { url: u.emotionImageUrl, big, name: u.emotionName || "", pkg: u.emotionPkgName || "" };
      var pack = byName[u.emotionPkgName];
      if (!pack) {
        pack = byName[u.emotionPkgName] = { name: u.emotionPkgName || "表情", items: [] };
        packs.push(pack);
      }
      pack.items.push({ id: u.emotionId, url: u.emotionImageUrl, big, name: u.emotionName || "" });
    });
    EmotionMap.map = map;
    EmotionMap.packs = packs;
    EmotionMap.loaded = true;
    return packs;
  }
  function emotify(html) {
    return html.replace(/\[emot=acfun,(\S+?)\/\]/g, function(_, id) {
      var it = EmotionMap.map && EmotionMap.map[id];
      return it && it.url ? '<img class="acsv-emotimg" src="' + it.url + '" referrerpolicy="no-referrer" alt="">' : "[表情]";
    }).replace(
      /\[emot=(\S+?),(\S+?)\/\]/g,
      '<img class="acsv-emotimg" src="//cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/$1/$2.gif" referrerpolicy="no-referrer" alt="">'
    );
  }
  var GM_EMOT_KEY = "acsvEmotPacks";
  var GM_EMOT_TTL = 7 * 24 * 3600 * 1e3;
  function gmEmotRead() {
    try {
      if (typeof GM_getValue !== "function") return null;
      var c = JSON.parse(GM_getValue(GM_EMOT_KEY, "null") || "null");
      if (!c || !Array.isArray(c.packs) || !c.packs.length) return null;
      if (Date.now() - c.ts > GM_EMOT_TTL) return null;
      return c.packs;
    } catch (e) {
      return null;
    }
  }
  function gmEmotWrite(flat) {
    try {
      if (typeof GM_setValue !== "function") return;
      GM_setValue(GM_EMOT_KEY, JSON.stringify({ ts: Date.now(), packs: flat }));
    } catch (e) {
    }
  }
  function ensureEmotionMap() {
    if (EmotionMap.loaded) return Promise.resolve();
    if (EmotionMap.loading) return EmotionMap.loading;
    EmotionMap.loading = new Promise(function(resolve) {
      try {
        var cached = JSON.parse(localStorage.getItem("emoticonList") || "null");
        if (Array.isArray(cached) && cached.length) {
          applyEmotPacks(cached);
          resolve();
          return;
        }
      } catch (e) {
      }
      var gmPacks = gmEmotRead();
      if (gmPacks) {
        applyEmotPacks(gmPacks);
        resolve();
        return;
      }
      request(CFG.api.emotion, "POST").then(function(j) {
        var flat = [];
        var pkgs = j && (j.emotionPackageList || j.data) || [];
        pkgs.forEach(function(p) {
          (p.emotions || []).forEach(function(e) {
            try {
              var url = e.emotionImageSmallUrl || e.smallImageInfo && e.smallImageInfo.thumbnailImageCdnUrl || e.smallImageInfo && e.smallImageInfo.thumbnailImage && e.smallImageInfo.thumbnailImage.cdnUrls && e.smallImageInfo.thumbnailImage.cdnUrls[0] && e.smallImageInfo.thumbnailImage.cdnUrls[0].url || "";
              var rawBig = typeof e.emotionImageBigUrl === "string" && e.emotionImageBigUrl || e.bigImageInfo && e.bigImageInfo.thumbnailImageCdnUrl || e.bigImageInfo && e.bigImageInfo.thumbnailImage && e.bigImageInfo.thumbnailImage.cdnUrls && e.bigImageInfo.thumbnailImage.cdnUrls[0] && e.bigImageInfo.thumbnailImage.cdnUrls[0].url || "";
              flat.push({
                emotionId: e.id,
                emotionPkgName: p.name,
                emotionImageUrl: url,
                emotionBigUrl: rawBig || url,
                emotionName: typeof e.name === "string" && e.name || ""
              });
            } catch (err) {
            }
          });
        });
        applyEmotPacks(flat);
        gmEmotWrite(flat);
        resolve();
      }, function() {
        EmotionMap.loading = null;
        resolve();
      });
    });
    return EmotionMap.loading;
  }
  function emotReadRecent() {
    try {
      var ids = JSON.parse(localStorage.getItem(CFG.lsEmotRecent) || "[]");
      if (Array.isArray(ids)) return ids.map(String).filter(Boolean).slice(0, CFG.comments.recentMax);
    } catch (e) {
    }
    return [];
  }
  function emotPick(id) {
    var ids = emotReadRecent().filter(function(x) {
      return x !== String(id);
    });
    ids.unshift(String(id));
    try {
      localStorage.setItem(CFG.lsEmotRecent, JSON.stringify(ids.slice(0, CFG.comments.recentMax)));
    } catch (e) {
    }
  }
  function emotFind(id) {
    var packs = EmotionMap.packs || [];
    for (var i = 0; i < packs.length; i++) {
      for (var k = 0; k < packs[i].items.length; k++) {
        if (String(packs[i].items[k].id) === String(id)) return packs[i].items[k];
      }
    }
    return null;
  }
  function renderEmotPanel(panel, insert) {
    panel.innerHTML = "";
    var packs = EmotionMap.packs || [];
    if (!packs.length) {
      panel.appendChild(el("div", "acsv-drawer-tip", "表情加载失败，请重试"));
      return;
    }
    function addEmot(grid, it) {
      var b = el("button", "acsv-emot-item");
      b.title = it.name || "[emot=acfun," + it.id + "/]";
      var img = el("img");
      img.src = it.url;
      img.referrerPolicy = "no-referrer";
      img.alt = "";
      img.loading = "lazy";
      b.appendChild(img);
      b.addEventListener("click", function(ev2) {
        ev2.stopPropagation();
        insert("[emot=acfun," + it.id + "/]");
        emotPick(it.id);
      });
      grid.appendChild(b);
    }
    function gridOf(items) {
      var grid = el("div", "acsv-emot-grid");
      items.forEach(function(it) {
        addEmot(grid, it);
      });
      return grid;
    }
    var recent = emotReadRecent().map(emotFind).filter(Boolean);
    var tabNames = [];
    if (recent.length) tabNames.push("最近使用");
    packs.forEach(function(p) {
      tabNames.push(p.name);
    });
    var tab = panel._tab && tabNames.indexOf(panel._tab) !== -1 ? panel._tab : tabNames[0];
    var body = el("div", "acsv-emot-body");
    body.appendChild(el("div", "acsv-emot-head", tab));
    if (tab === "最近使用") body.appendChild(gridOf(recent));
    else packs.forEach(function(p) {
      if (p.name === tab) body.appendChild(gridOf(p.items));
    });
    panel.appendChild(body);
    var foot = el("div", "acsv-emot-foot");
    var strip = el("div", "acsv-emot-strip");
    function thumb(tabName, imgUrl) {
      var tb = el("button", "acsv-emot-thumb" + (tab === tabName ? " on" : ""));
      tb.title = tabName;
      var ti = el("img");
      ti.src = imgUrl;
      ti.referrerPolicy = "no-referrer";
      ti.alt = "";
      tb.appendChild(ti);
      tb.addEventListener("click", function(ev2) {
        ev2.stopPropagation();
        panel._tab = tabName;
        renderEmotPanel(panel, insert);
      });
      strip.appendChild(tb);
    }
    if (recent.length) thumb("最近使用", recent[0].url);
    packs.forEach(function(p) {
      thumb(p.name, p.items[0].url);
    });
    var prev = el("button", "acsv-emot-page", "‹");
    var next = el("button", "acsv-emot-page", "›");
    prev.addEventListener("click", function(ev2) {
      ev2.stopPropagation();
      strip.scrollBy({ left: -120, behavior: "smooth" });
    });
    next.addEventListener("click", function(ev2) {
      ev2.stopPropagation();
      strip.scrollBy({ left: 120, behavior: "smooth" });
    });
    foot.appendChild(prev);
    foot.appendChild(strip);
    foot.appendChild(next);
    panel.appendChild(foot);
  }
  function insertAtCursor(inp, code) {
    var pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
    inp.value = inp.value.slice(0, pos) + code + inp.value.slice(pos);
    inp.focus();
    try {
      inp.setSelectionRange(pos + code.length, pos + code.length);
    } catch (e) {
    }
  }
  function mountEmotButton(btn, panel, textarea) {
    var built = false;
    btn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var show = panel.style.display !== "flex";
      panel.style.display = show ? "flex" : "none";
      function showPanel() {
        renderEmotPanel(panel, function(code) {
          insertAtCursor(textarea, code);
        });
      }
      if (show && !built) {
        built = true;
        panel.appendChild(el("div", "acsv-drawer-tip", "表情加载中…"));
        ensureEmotionMap().then(showPanel);
      } else if (show) {
        ensureEmotionMap().then(showPanel);
      }
    });
  }

  // src/ubb.js
  var IMG_CDN_OK = /^https?:\/\/([\w.-]+\.(aixifan\.com|acfun\.cn)|preview\.ndcsk\.com\/ksc2)\//;
  var URL_CHARS_OK = /^[\w\-./:?=&%]+$/;
  function renderCommentHtml(content) {
    var h = esc(content || "");
    h = h.replace(/\[emot=acfun,(\w+)\/\]/g, function(_, id) {
      var em = EmotionMap.map[id];
      var u = em ? typeof em === "string" ? em : em.url : null;
      var abs = u ? u.replace(/^\/\//, "https://") : u;
      if (u && IMG_CDN_OK.test(abs) && URL_CHARS_OK.test(abs)) {
        return '<img class="ubb-emotion" src="' + u + '" referrerpolicy="no-referrer">';
      }
      return "[表情]";
    });
    h = h.replace(/\[emot=(\w+),(\w+)\/\]/g, function(_, pkg, id) {
      return '<img class="ubb-emotion" src="https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/' + pkg + "/" + id + '.gif" referrerpolicy="no-referrer">';
    });
    h = h.replace(/\[img=[^\]]*\](https?:\/\/[^\["']+?)\[\/img\]/g, function(_, u) {
      return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
    });
    h = h.replace(/\[img\](https?:\/\/[^\["']+?)\[\/img\]/g, function(_, u) {
      return IMG_CDN_OK.test(u) ? '<img class="ubb-imgc" src="' + u + '" referrerpolicy="no-referrer">' : u;
    });
    h = h.replace(/\[at uid=(\d+)\]@?(.*?)\[\/at\]/g, function(_, uid, name) {
      return '<a class="ubb-at" href="' + CFG.api.userBase + uid + '" target="_blank" rel="noopener">@' + name + "</a>";
    });
    h = h.replace(/\[resource id=(\d+) type=(\d+)[^\]]*\]([\s\S]*?)\[\/resource\]/gi, function(_, id, type, inner) {
      var base = type === "2" ? CFG.api.videoBase : CFG.api.articleBase;
      return '<a class="ubb-res" href="' + base + id + '" target="_blank" rel="noopener">' + inner.replace(/<[^>]+>/g, "") + "</a>";
    });
    h = h.replace(/\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]*?)\[\/color\]/g, function(_, cv, inner) {
      return '<span style="color:' + cv + '">' + inner + "</span>";
    });
    return h;
  }
  function ubbImText(content) {
    var t = String(content || "");
    t = t.replace(/\[img=[^\]]*\]https?:\/\/[^\["']+?\[\/img\]/g, "[图片]");
    t = t.replace(/\[img\]https?:\/\/[^\["']+?\[\/img\]/g, "[图片]");
    t = t.replace(/\[at uid=\d+\]@?(.*?)\[\/at\]/g, "@$1");
    t = t.replace(/\[resource id=\d+ type=\d+[^\]]*\]([\s\S]*?)\[\/resource\]/gi, "$1");
    t = t.replace(/\[color=#[0-9a-fA-F]{3,8}\]([\s\S]*?)\[\/color\]/g, "$1");
    return t;
  }
  function ubbQuoteHtml(author, raw) {
    return esc("@" + (author || "") + "：") + renderCommentHtml(raw).replace(/<a\b[^>]*>/g, "<span>").replace(/<\/a>/g, "</span>");
  }

  // src/imgview.js
  var imgview = null;
  function closeImageViewer() {
    if (!imgview) return;
    var v = imgview;
    imgview = null;
    v.remove();
    overlayClose("imgview");
  }
  function openImageViewer(src) {
    closeImageViewer();
    if (!root || !src) return;
    imgview = el("div", "acsv-imgview");
    var img = el("img");
    img.src = src;
    img.referrerPolicy = "no-referrer";
    imgview.appendChild(img);
    imgview.addEventListener("click", closeImageViewer);
    root.appendChild(imgview);
    overlayOpen({ id: "imgview", modal: true, close: closeImageViewer });
  }

  // src/inputbar.js
  function buildInputBar(opts) {
    var box = el("div", "acsv-cinput");
    var emotBtn = elHtml("button", "acsv-cinput-emot", ICONS.smiley);
    emotBtn.title = "表情";
    box.appendChild(emotBtn);
    var imgBtn = null, fileInp = null;
    if (opts.img) {
      imgBtn = elHtml("button", "acsv-cinput-img", ICONS.image);
      imgBtn.title = opts.img.title || "插入图片";
      fileInp = el("input");
      fileInp.type = "file";
      fileInp.accept = "image/*";
      fileInp.style.display = "none";
      imgBtn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        fileInp.click();
      });
      fileInp.addEventListener("change", function() {
        var f = fileInp.files && fileInp.files[0];
        fileInp.value = "";
        if (f) opts.img.onFile(f);
      });
      box.appendChild(imgBtn);
      box.appendChild(fileInp);
    }
    var input = el("textarea", "acsv-cinput-text");
    input.rows = 1;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.maxLength) input.maxLength = opts.maxLength;
    box.appendChild(input);
    var send = el("button", "acsv-cinput-send", "发送");
    box.appendChild(send);
    box.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    function fitHeight() {
      input.style.height = "auto";
      input.style.height = Math.min(Math.max(input.scrollHeight, 36), 96) + "px";
    }
    input.addEventListener("input", fitHeight);
    input.addEventListener("keydown", function(ev) {
      ev.stopPropagation();
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        opts.onSend();
      } else if (ev.key === "Escape") {
        ev.stopPropagation();
        input.blur();
      }
    });
    send.addEventListener("click", function(ev) {
      ev.stopPropagation();
      opts.onSend();
    });
    return { box, emotBtn, input, send, imgBtn, fileInp, fitHeight };
  }
  function buildQuoteChip(onCancel, xTitle) {
    var box = el("div", "acsv-quotechip");
    box.style.display = "none";
    var label = el("span", "acsv-quotechip-label");
    var x = el("button", "acsv-quotechip-x", "✕");
    x.title = xTitle || "取消";
    x.addEventListener("click", function(ev) {
      ev.stopPropagation();
      onCancel();
    });
    box.appendChild(label);
    box.appendChild(x);
    return { box, label };
  }

  // src/imdrawer.js
  var ICON_PLAY = '<i class="acsvg-cicon" style="--acsvg-cicon:url(' + ICON_SVGS.play + ')"></i>';
  var ICON_COMMENT = '<i class="acsvg-cicon" style="--acsvg-cicon:url(' + ICON_SVGS.comment + ')"></i>';
  var drawer = null;
  var view = "";
  var cards = {};
  var badgeTimer = null;
  var badgeDelayTimer = null;
  function makePoller(fn, gap) {
    var t = null;
    function stop() {
      if (t) {
        clearInterval(t);
        t = null;
      }
    }
    return { start: function() {
      stop();
      t = setInterval(fn, gap);
    }, stop };
  }
  var listPoll = makePoller(function() {
    if (view !== "list") return listPoll.stop();
    refreshList();
  }, CFG.im.drawerListPoll);
  var chatPoll = makePoller(function() {
    if (!chat) return chatPoll.stop();
    ensureIm().then(function(inst) {
      if (!inst.connected) return;
      chatPollOnce(inst, false);
    }, function() {
    });
  }, CFG.im.drawerChatPoll);
  var chat = null;
  var lastImInst = null;
  var badgeEl = null;
  var mounted = false;
  function badgeText(n) {
    return n > 99 ? "99+" : n > 0 ? String(n) : "";
  }
  function msgFrom(m) {
    try {
      if (m.fromUserId != null) return String(m.fromUserId);
      if (m.rawMsg && m.rawMsg.fromUserId != null) return String(m.rawMsg.fromUserId);
    } catch (e) {
    }
    return "";
  }
  function msgTime(m) {
    try {
      if (m.date) return new Date(m.date).getTime() || 0;
      if (m.rawMsg && m.rawMsg.timestampMs) return Number(m.rawMsg.timestampMs) || 0;
    } catch (e) {
    }
    return 0;
  }
  function pad22(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function relTime2(ts) {
    if (!ts) return "";
    var d = Date.now() - ts;
    if (d < 6e4) return "刚刚";
    var now = /* @__PURE__ */ new Date(), t = new Date(ts);
    if (t.toDateString() === now.toDateString()) return pad22(t.getHours()) + ":" + pad22(t.getMinutes());
    if (t.toDateString() === new Date(now.getTime() - 864e5).toDateString()) return "昨天";
    if (d < 6048e5) return "周" + "日一二三四五六".charAt(t.getDay());
    return pad22(t.getMonth() + 1) + "-" + pad22(t.getDate());
  }
  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, function(u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + "</a>";
    });
  }
  function imTextHtml(s) {
    return emotify(linkify(s));
  }
  function ensureDrawerDom() {
    if (drawer || !root) return;
    var d = el("aside", "acsv-msgdrawer");
    var head = el("div", "acsv-im-head");
    var back = el("button", "acsv-im-back", "‹");
    back.title = "返回消息列表";
    back.style.display = "none";
    var title = el("span", "acsv-im-title", "私信");
    var close = el("button", "acsv-im-close", "✕");
    close.title = "关闭";
    close.addEventListener("click", function(ev) {
      ev.stopPropagation();
      closeDrawer();
    });
    back.addEventListener("click", function(ev) {
      ev.stopPropagation();
      showList();
    });
    head.appendChild(back);
    head.appendChild(title);
    head.appendChild(close);
    d.appendChild(head);
    var listView = el("div", "acsv-im-listview");
    var searchWrap = el("div", "acsv-im-searchwrap");
    var search = el("input", "acsv-im-search");
    search.placeholder = "搜索联系人";
    search.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    search.addEventListener("input", function() {
      renderList(search.value);
    });
    searchWrap.appendChild(search);
    listView.appendChild(searchWrap);
    var listBody = el("div", "acsv-im-list");
    listView.appendChild(listBody);
    d.appendChild(listView);
    var chatView = el("div", "acsv-im-chatview");
    chatView.style.display = "none";
    var bubbles = el("div", "acsv-im-bubbles");
    var quoteChip = buildQuoteChip(function() {
      setQuote(null);
    }, "取消引用");
    var inputBar2 = buildInputBar({
      img: { title: "发送图片", onFile: sendImageMsg },
      // 尺寸门禁在 sendImageMsg 内
      placeholder: "发个消息…",
      onSend: function() {
        var t = inputBar2.input.value.replace(/\s+$/, "");
        if (!t) return;
        inputBar2.input.value = "";
        inputBar2.fitHeight();
        sendChat(t);
      }
    });
    var input = inputBar2.input;
    chatView.appendChild(bubbles);
    chatView.appendChild(quoteChip.box);
    chatView.appendChild(inputBar2.box);
    d.appendChild(chatView);
    var emotPanel = el("div", "acsv-emotpanel");
    emotPanel.style.display = "none";
    d.appendChild(emotPanel);
    mountEmotButton(inputBar2.emotBtn, emotPanel, input);
    var mapCold = !EmotionMap.loaded;
    ensureEmotionMap().then(function() {
      if (!mapCold || !drawer || view !== "chat" || !chat) return;
      ensureIm().then(function(inst) {
        if (inst.connected) chatPollOnce(inst, true);
      }, function() {
      });
    });
    root.appendChild(d);
    drawer = {
      el: d,
      head,
      back,
      title,
      close,
      listView,
      search,
      listBody,
      chatView,
      bubbles,
      quoteChip,
      input,
      send: inputBar2.send
    };
  }
  function showList() {
    if (!drawer) return;
    chatPoll.stop();
    view = "list";
    drawer.back.style.display = "none";
    drawer.title.textContent = "私信";
    drawer.listView.style.display = "";
    drawer.chatView.style.display = "none";
    refreshList();
    listPoll.start();
  }
  function showChat(targetId) {
    if (!drawer) return;
    listPoll.stop();
    view = "chat";
    var card = cards[targetId] || {};
    drawer.back.style.display = "block";
    drawer.title.textContent = card.name || "用户 " + targetId;
    drawer.listView.style.display = "none";
    drawer.chatView.style.display = "";
    drawer.bubbles.innerHTML = "";
    chat = { targetId: String(targetId), name: card.name || "", session: null, lastCount: -1, seen: {}, lastDivTs: 0, quote: null, msgEls: {} };
    loadChat();
    drawer.input.value = "";
    setTimeout(function() {
      try {
        drawer.input.focus();
      } catch (e) {
      }
    }, 60);
    chatPoll.start();
  }
  var listSig = "";
  function sessionSig(ss) {
    return ss.map(function(s) {
      return [
        s.targetId,
        s.unread,
        s.t,
        s.last && (s.last.seqId || msgTime(s.last) || msgTextOf(s.last)) || ""
      ].join(":");
    }).join("|");
  }
  function refreshList() {
    ensureIm().then(function(inst) {
      return ensureConnected(inst).then(function() {
        var ss = [];
        try {
          ss = inst.kernel.getSessions() || [];
        } catch (e) {
        }
        ss = ss.map(function(s) {
          var last = s.lastMessage || null;
          try {
            var msgs = inst.kernel.getMessages(s) || [];
            if (msgs.length) last = msgs[msgs.length - 1];
          } catch (e) {
          }
          return {
            targetId: String(s.targetId),
            unread: Number(s.unreadCount) || 0,
            t: msgTime(last) || new Date(s.date || 0).getTime() || 0,
            last
          };
        }).filter(function(s) {
          return s.targetId && s.targetId !== selfUid();
        }).sort(function(a, b) {
          return b.t - a.t;
        });
        var ids = ss.map(function(s) {
          return Number(s.targetId);
        });
        var sig = sessionSig(ss) + "|" + ids.join(",");
        if (sig === listSig && drawer && drawer.listView.style.display !== "none") return;
        listSig = sig;
        return fetchCards(ids).then(function(m) {
          Object.keys(m).forEach(function(k) {
            cards[k] = m[k];
          });
          renderList("", ss);
        });
      });
    }).catch(function() {
      if (drawer && drawer.listBody && !drawer.listBody.children.length) {
        drawer.listBody.innerHTML = "";
        drawer.listBody.appendChild(el("div", "acsv-share-tip", "私信连接失败，请稍后再试\n可先复制链接去站内分享"));
      }
    });
  }
  function renderList(kw, ss) {
    if (!drawer) return;
    kw = String(kw || "").trim().toLowerCase();
    var rows = ss || lastListRows || [];
    if (ss) lastListRows = ss;
    var unreadTotal = 0;
    rows.forEach(function(r) {
      unreadTotal += r.unread || 0;
    });
    if (view === "list") drawer.title.textContent = "私信" + (unreadTotal > 0 ? " (" + unreadTotal + ")" : "");
    drawer.listBody.innerHTML = "";
    var shown = 0;
    rows.forEach(function(r) {
      var card = cards[r.targetId] || {};
      var name = card.name || "用户 " + r.targetId;
      if (kw && name.toLowerCase().indexOf(kw) < 0) return;
      shown++;
      var row = el("div", "acsv-im-row");
      row.dataset.tid = r.targetId;
      var av = el("img", "acsv-im-av");
      av.referrerPolicy = "no-referrer";
      av.src = (card.headUrl || CFG.api.defaultAvatar).split("?")[0];
      av.addEventListener("error", function() {
        av.src = CFG.api.defaultAvatar;
      });
      row.appendChild(av);
      var mid = el("div", "acsv-im-mid");
      var nm = el("div", "acsv-im-name");
      nm.innerHTML = esc(name) + (r.unread > 0 ? '<span class="acsv-share-unread">' + (r.unread > 99 ? "99+" : r.unread) + "</span>" : "");
      mid.appendChild(nm);
      var prev = el("div", "acsv-im-preview", previewOf(r));
      mid.appendChild(prev);
      row.appendChild(mid);
      var tm = el("div", "acsv-im-time", relTime2(r.t));
      row.appendChild(tm);
      row.addEventListener("click", function(ev) {
        ev.stopPropagation();
        showChat(r.targetId);
      });
      drawer.listBody.appendChild(row);
    });
    if (!shown) {
      drawer.listBody.appendChild(el(
        "div",
        "acsv-share-tip",
        kw ? "没有匹配的联系人" : "还没有聊过天的朋友\n先在 A 站 APP / 网页和 TA 私聊一句\n再回来把视频分享给 TA"
      ));
    }
  }
  var lastListRows = null;
  function previewOf(r) {
    return r.last ? previewOfMessage(r.last) : "";
  }
  function loadChat() {
    ensureIm().then(function(inst) {
      return ensureConnected(inst).then(function() {
        ensureTracer(inst);
        var ss = [];
        try {
          ss = inst.kernel.getSessions() || [];
        } catch (e) {
        }
        var sess = null;
        ss.some(function(s) {
          if (String(s.targetId) === chat.targetId) {
            sess = s;
            return true;
          }
          return false;
        });
        if (!sess) {
          return inst.kernel.openSession(0, chat.targetId).then(function() {
            var ss2 = inst.kernel.getSessions() || [];
            ss2.some(function(s) {
              if (String(s.targetId) === chat.targetId) {
                sess = s;
                return true;
              }
              return false;
            });
            chat.session = sess;
            chatPollOnce(inst, true);
            return null;
          }, function() {
            chat.session = null;
            return null;
          });
        }
        chat.session = sess;
        return chatPollOnce(inst, true);
      });
    }).catch(function() {
      if (drawer && drawer.bubbles && !drawer.bubbles.children.length) {
        drawer.bubbles.appendChild(el("div", "acsv-share-tip", "私信连接失败，请稍后再试\n可先复制链接去站内分享"));
      }
    });
  }
  function chatPollOnce(inst, reset) {
    lastImInst = inst;
    try {
      var k = inst.kernel;
      if (!chat.session) {
        var ss = k.getSessions() || [];
        ss.some(function(s) {
          if (String(s.targetId) === chat.targetId) {
            chat.session = s;
            return true;
          }
          return false;
        });
      }
      if (!chat.session) return;
      var msgs = k.getMessages(chat.session) || [];
      if (reset) {
        chat.seen = {};
        chat.msgEls = {};
        chat.lastCount = -1;
        drawer.bubbles.innerHTML = "";
      }
      var fresh = [];
      msgs.forEach(function(m) {
        var key = String(m.seqId !== void 0 && m.seqId || msgTime(m) || "h" + msgFrom(m) + ":" + msgTextOf(m));
        if (chat.seen[key]) return;
        chat.seen[key] = true;
        fresh.push({ m, key });
      });
      fresh.forEach(function(x) {
        appendBubble(x.m);
        var lastEl = drawer.bubbles.lastElementChild;
        if (lastEl) chat.msgEls[x.key] = lastEl;
      });
      if (fresh.length || reset) {
        drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
        try {
          if (chat.session && k.markSessionRead && chat.session.unreadCount !== void 0) k.markSessionRead(chat.session);
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }
  function dayLabel(ts) {
    var now = /* @__PURE__ */ new Date(), t = new Date(ts);
    var hm = pad22(t.getHours()) + ":" + pad22(t.getMinutes());
    if (t.toDateString() === now.toDateString()) return "今天 " + hm;
    if (t.toDateString() === new Date(now.getTime() - 864e5).toDateString()) return "昨天 " + hm;
    if (now.getTime() - ts < 6048e5) return "周" + "日一二三四五六".charAt(t.getDay()) + " " + hm;
    return pad22(t.getMonth() + 1) + "-" + pad22(t.getDate()) + " " + hm;
  }
  function maybeDayDiv(ts) {
    if (!ts || !drawer || !chat) return;
    if (!chat.lastDivTs || ts - chat.lastDivTs >= CFG.im.dayDivGap) {
      drawer.bubbles.appendChild(el("div", "acsv-im-daydiv", dayLabel(ts)));
    }
    chat.lastDivTs = ts;
  }
  function setQuote(q2) {
    if (chat) chat.quote = q2 || null;
    renderQuoteChip();
  }
  function renderQuoteChip() {
    if (!drawer) return;
    var chip = drawer.quoteChip, q2 = chat && chat.quote;
    if (!q2) {
      chip.box.style.display = "none";
      chip.label.textContent = "";
      drawer.input.placeholder = "发个消息…";
      return;
    }
    chip.box.style.display = "flex";
    chip.label.textContent = "引用：" + (q2.preview || "原消息");
    drawer.input.placeholder = "回复引用的内容…";
  }
  function quoteStrip(q2) {
    var s = el("div", "acsv-im-quote" + (q2.seqId ? " link" : ""));
    s.appendChild(el("div", "acsv-im-quote-preview", q2.preview || "[原消息]"));
    if (q2.seqId) {
      s.title = "点击查看原消息";
      s.addEventListener("click", function(ev) {
        ev.stopPropagation();
        locateMessage(q2.seqId);
      });
    }
    return s;
  }
  function locateMessage(seqId) {
    if (!drawer || !chat) return;
    var wrap = chat.msgEls[String(seqId)];
    if (!wrap || !wrap.isConnected) {
      toast("原消息不在已加载的记录里");
      return;
    }
    var t = wrap.querySelector(".acsv-im-bubble") || wrap.querySelector(".acsv-im-vcard") || wrap;
    try {
      t.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e1) {
      t.scrollIntoView();
    }
    t.classList.remove("acsv-im-flash");
    void t.offsetWidth;
    t.classList.add("acsv-im-flash");
    setTimeout(function() {
      t.classList.remove("acsv-im-flash");
    }, 1300);
  }
  function bubbleRow(b, mine, m, extraCls) {
    var wrap = el("div", "acsv-im-rowwrap" + (extraCls ? " " + extraCls : "") + (mine ? " mine" : ""));
    wrap.appendChild(b);
    if (m && isQuotable(m, CFG.im.quoteWire)) wrap.appendChild(quoteBtnEl(m));
    return wrap;
  }
  function quoteBtnEl(m) {
    var btn = el("button", "acsv-im-quotebtn", "↩");
    btn.title = "引用这条消息";
    btn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var raw = m.rawMsg || {};
      setQuote({
        seqId: raw.seqId !== void 0 && raw.seqId !== null ? String(raw.seqId) : "",
        preview: previewOfMessage(m) || msgTextOf(m).slice(0, 40),
        originMsg: m
      });
      try {
        drawer.input.focus();
      } catch (e) {
      }
    });
    return btn;
  }
  function appendBubble(m) {
    if (!drawer) return;
    maybeDayDiv(msgTime(m));
    var mine = msgFrom(m) === selfUid();
    var q2 = quoteOf(m) || quoteExtraOf(m);
    var b = el("div", "acsv-im-bubble" + (mine ? " mine" : ""));
    if (q2) {
      b.appendChild(quoteStrip(q2));
      var qtxt = el("div", "acsv-im-msgtext");
      qtxt.innerHTML = imTextHtml(q2.text);
      b.appendChild(qtxt);
      drawer.bubbles.appendChild(bubbleRow(b, mine, m));
      return;
    }
    if (msgContentType(m) === 1) return appendImageBubble(m, mine);
    var card = parseCard(m);
    if (card) return appendCardBubble(card, mine, m);
    var share = parseShare(msgTextOf(m));
    if (share) return appendShareBubble(share, mine, m, cmtShareOf(m));
    var txt = el("div", "acsv-im-msgtext");
    txt.innerHTML = imTextHtml(msgTextOf(m));
    b.appendChild(txt);
    drawer.bubbles.appendChild(bubbleRow(b, mine, m));
  }
  function appendImageBubble(m, mine) {
    if (!drawer) return;
    var w = Number(m.width) || 0, h = Number(m.height) || 0;
    var src = imageUrlOf(m);
    var b = el("div", "acsv-im-imgbubble" + (mine ? " mine" : ""));
    if (src) {
      var img = document.createElement("img");
      img.className = "acsv-im-imgimg";
      img.alt = "";
      if (w > 0 && h > 0) {
        img.style.width = Math.min(w, 180) + "px";
        img.style.aspectRatio = w + " / " + h;
      }
      b.appendChild(img);
      var cached = peekImImageBlob(src);
      if (cached) {
        img.src = cached;
      } else {
        b.classList.add("pending");
        imImgLazy(img, function() {
          fetchImImageBlob(src).then(function(blobUrl) {
            if (!img.isConnected) return;
            b.classList.remove("pending");
            if (blobUrl) img.src = blobUrl;
            else {
              img.remove();
              b.appendChild(document.createTextNode("[图片]"));
            }
          });
        });
      }
      b.addEventListener("click", function(ev) {
        var sel = window.getSelection ? window.getSelection() : null;
        if (sel && !sel.isCollapsed) return;
        ev.stopPropagation();
        fetchImImageBlob(src).then(function(blobUrl) {
          if (blobUrl) openImageViewer(blobUrl);
        });
      });
    } else {
      b.textContent = "[图片]";
    }
    drawer.bubbles.appendChild(bubbleRow(b, mine, m));
  }
  var imImgObs = null;
  function imImgLazy(img, load) {
    if (!imImgObs) {
      imImgObs = new IntersectionObserver(function(entries) {
        entries.forEach(function(en) {
          if (!en.isIntersecting) return;
          imImgObs.unobserve(en.target);
          var fn = en.target.__acsvImgLoad;
          if (fn) {
            en.target.__acsvImgLoad = null;
            fn();
          }
        });
      }, { rootMargin: "200px 0px" });
    }
    img.__acsvImgLoad = load;
    imImgObs.observe(img);
  }
  function imageUrlOf(m) {
    var ks = "";
    try {
      ks = m && (m.url || m.imageAttachment && m.imageAttachment.uri) || "";
    } catch (e0) {
    }
    if (!ks) ks = imageUriFromRaw(m);
    if (!ks) {
      console.warn("[acsv-im] 图片消息无 uri（decode 与 raw 均未恢复）");
      return "";
    }
    if (!/^ks:\/\//.test(ks)) return officialize(ks);
    try {
      var k = lastImInst && lastImInst.kernel;
      if (k && k.file && k.file.resourceUrlToHttpUrl) {
        var u = officialize(k.file.resourceUrlToHttpUrl(ks, false, Number(m.width) || 0, Number(m.height) || 0));
        if (u) return u;
      }
    } catch (e) {
    }
    try {
      var rid = ks.slice(5).replace(/\/\w+$/, "");
      if (!rid) {
        console.warn("[acsv-im] ks 资源串形态不识别:", ks.slice(0, 60));
        return "";
      }
      var ver = "";
      try {
        var cfgk = lastImInst && lastImInst.kernel && lastImInst.kernel.config;
        ver = cfgk && (cfgk.imsdkver || cfgk.sdkVersion) || "";
      } catch (e2) {
      }
      return CFG.api.imDownloadBase + "/rest/v2/app/download?resourceId=" + encodeURIComponent(rid) + "&userId=" + encodeURIComponent(selfUid()) + "&did=" + encodeURIComponent(cookieVal("_did") || "") + "&kpn=ACFUN_APP&platform=H5" + (ver ? "&imsdkver=" + encodeURIComponent(ver) : "");
    } catch (e3) {
      return "";
    }
  }
  function imageUriFromRaw(m) {
    try {
      var buf = m && m.rawMsg && m.rawMsg.content;
      if (!buf) return "";
      var u8 = new Uint8Array(buf), i = 0;
      if (u8[i++] !== 10) return "";
      var len = 0, shift = 0, b;
      do {
        b = u8[i++];
        len += (b & 127) * Math.pow(2, shift);
        shift += 7;
      } while (b & 128);
      if (!len || i + len > u8.length) return "";
      var s = "";
      for (var j = 0; j < len; j++) s += String.fromCharCode(u8[i + j]);
      return /^ks:\/\//.test(s) || /^https?:\/\//.test(s) ? s : "";
    } catch (e) {
      return "";
    }
  }
  function officialize(httpUrl) {
    try {
      if (!httpUrl || !/^https?:\/\//.test(httpUrl)) return "";
      var u = new URL(httpUrl);
      var rid = u.searchParams.get("resourceId");
      if (!rid) return "";
      var q2 = ["resourceId", "userId", "did", "kpn", "imsdkver", "platform"].map(function(k) {
        var v = u.searchParams.get(k);
        return v == null ? null : k + "=" + encodeURIComponent(v);
      }).filter(Boolean).join("&");
      return CFG.api.imDownloadBase + "/rest/v2/app/download?" + q2;
    } catch (e) {
      return "";
    }
  }
  function vcardEl(r, mine) {
    var cardEl = el(r.href ? "a" : "div", "acsv-im-vcard" + (mine ? " mine" : ""));
    if (r.href) {
      cardEl.href = r.href;
      cardEl.target = "_blank";
      cardEl.rel = "noopener";
    }
    var box = el("div", "acsv-im-vcard-coverbox");
    var cover = el("img", "acsv-im-vcard-cover");
    cover.alt = "";
    cover.referrerPolicy = "no-referrer";
    if (r.coverUrl) cover.src = r.coverUrl;
    else cover.style.visibility = "hidden";
    cover.addEventListener("error", function() {
      cover.style.visibility = "hidden";
    });
    box.appendChild(cover);
    var bar = el("div", "acsv-im-vcard-bar");
    bar.innerHTML = ICON_PLAY + '<span class="acsv-im-vcard-view">' + esc(r.viewCountShow || "") + "</span>" + ICON_COMMENT + '<span class="acsv-im-vcard-cmt">' + esc(r.commentCountShow || "") + '</span><span class="acsv-im-vcard-dur"' + (r.durationSec ? "" : ' style="display:none"') + ">" + (r.durationSec ? esc(fmtDur(r.durationSec)) : "") + "</span>";
    box.appendChild(bar);
    cardEl.appendChild(box);
    if (r.title) cardEl.appendChild(el("div", "acsv-im-vcard-title", r.title));
    return cardEl;
  }
  function appendCardBubble(card, mine, m) {
    if (card.prologue) {
      var pre = el("div", "acsv-im-bubble" + (mine ? " mine" : ""));
      pre.textContent = card.prologue;
      drawer.bubbles.appendChild(pre);
    }
    card.resourceBody.forEach(function(r) {
      drawer.bubbles.appendChild(bubbleRow(vcardEl({
        href: Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : "",
        coverUrl: r.coverUrl,
        viewCountShow: r.viewCountShow,
        commentCountShow: r.commentCountShow,
        durationSec: r.durationSec,
        title: r.title
      }, mine), mine, m, "cardrow"));
    });
  }
  function appendShareBubble(share, mine, m, cmt) {
    if (share.note) {
      var note = el("div", "acsv-im-bubble" + (mine ? " mine" : ""));
      note.textContent = share.note;
      drawer.bubbles.appendChild(note);
    }
    var isCmt = isCommentShare(share.title);
    var cardEl = isCmt ? cshareEl({
      href: share.url,
      text: share.title,
      html: cmt && cmt.content ? ubbQuoteHtml(commentShareAuthor(share.title), cmt.content) : ""
    }, mine) : vcardEl({ href: share.url, title: share.title }, mine);
    drawer.bubbles.appendChild(bubbleRow(cardEl, mine, m, "cardrow"));
    var bubbles = drawer.bubbles;
    var tid = chat && chat.targetId;
    AppAPI.dougaCard(share.acId).then(function(c) {
      if (!c || !cardEl.isConnected || !drawer || drawer.bubbles !== bubbles || !chat || chat.targetId !== tid) return;
      if (isCmt) patchCshare(cardEl, c);
      else patchVcard(cardEl, c);
      drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
    });
  }
  function patchVcard(cardEl, c) {
    var cover = cardEl.querySelector(".acsv-im-vcard-cover");
    if (cover && c.cover) {
      cover.src = c.cover;
      cover.style.visibility = "";
    }
    var view2 = cardEl.querySelector(".acsv-im-vcard-view");
    if (view2 && c.view != null) view2.textContent = c.view;
    var cmt = cardEl.querySelector(".acsv-im-vcard-cmt");
    if (cmt && c.comment != null) cmt.textContent = c.comment;
    var dur = cardEl.querySelector(".acsv-im-vcard-dur");
    if (dur && c.durationSec) {
      dur.textContent = fmtDur(c.durationSec);
      dur.style.display = "";
    }
    var tt = cardEl.querySelector(".acsv-im-vcard-title");
    if (tt && c.title) tt.textContent = c.title;
  }
  function cshareEl(r, mine) {
    var cardEl = el(r.href ? "a" : "div", "acsv-im-cshare" + (mine ? " mine" : ""));
    if (r.href) {
      cardEl.href = r.href;
      cardEl.target = "_blank";
      cardEl.rel = "noopener";
    }
    cardEl.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    var quote = el("div", "acsv-im-cshare-quote");
    if (r.html) {
      quote.innerHTML = r.html;
      quote.addEventListener("click", function(ev) {
        var im = ev.target && ev.target.closest ? ev.target.closest(".ubb-imgc") : null;
        if (!im) return;
        ev.preventDefault();
        ev.stopPropagation();
        openImageViewer(im.getAttribute("src") || "");
      });
    } else {
      quote.innerHTML = emotify(esc(r.text));
    }
    cardEl.appendChild(quote);
    var src = el("div", "acsv-im-cshare-src");
    var cover = el("img", "acsv-im-cshare-cover");
    cover.alt = "";
    cover.referrerPolicy = "no-referrer";
    cover.style.visibility = "hidden";
    cover.addEventListener("error", function() {
      cover.style.visibility = "hidden";
    });
    src.appendChild(cover);
    src.appendChild(el("div", "acsv-im-cshare-srctitle", "查看来源作品"));
    cardEl.appendChild(src);
    return cardEl;
  }
  function patchCshare(cardEl, c) {
    var cover = cardEl.querySelector(".acsv-im-cshare-cover");
    if (cover && c.cover) {
      cover.src = c.cover;
      cover.style.visibility = "";
    }
    var t = cardEl.querySelector(".acsv-im-cshare-srctitle");
    if (t && c.title) t.textContent = c.title;
  }
  function sendImageMsg(file) {
    var targetId = chat && chat.targetId;
    if (!targetId) return;
    if (file.size > CFG.im.imgMax) {
      toast("图片不能超过 " + Math.round(CFG.im.imgMax / 1024 / 1024) + "MB");
      return;
    }
    var localUrl = "";
    try {
      localUrl = URL.createObjectURL(file);
    } catch (e0) {
    }
    readSize(localUrl, function(w, h) {
      maybeDayDiv(Date.now());
      var b = el("div", "acsv-im-imgbubble mine pending");
      if (localUrl) {
        var ph = document.createElement("img");
        ph.className = "acsv-im-imgimg";
        ph.alt = "";
        ph.src = localUrl;
        if (w > 0 && h > 0) {
          ph.style.width = Math.min(w, 180) + "px";
          ph.style.aspectRatio = w + " / " + h;
        }
        b.appendChild(ph);
      } else {
        b.textContent = "[图片]";
      }
      var holder = el("div", "acsv-im-rowwrap mine");
      holder.appendChild(b);
      drawer.bubbles.appendChild(holder);
      drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
      function cleanup() {
        if (localUrl) {
          try {
            URL.revokeObjectURL(localUrl);
          } catch (e2) {
          }
        }
      }
      function onFail(err) {
        var stale = !chat || chat.targetId !== targetId;
        if (!stale && holder.isConnected) {
          b.classList.remove("pending");
          b.classList.add("failed");
          b.title = "发送失败，点击重试";
          b.addEventListener("click", function(ev) {
            ev.stopPropagation();
            holder.remove();
            cleanup();
            sendImageMsg(file);
          });
        }
        toast("图片发送失败：" + String(err && err.message || "").slice(0, 120), 8e3);
      }
      ensureIm().then(function(inst) {
        return ensureConnected(inst).then(function() {
          ensureTracer(inst);
          return sendImage(inst, Number(targetId), file, w, h);
        }).then(function() {
          if (!chat || chat.targetId !== targetId) {
            cleanup();
            return;
          }
          if (holder.isConnected) holder.remove();
          cleanup();
          chatPollOnce(inst, false);
        }, onFail);
      }, onFail);
    });
  }
  function readSize(url, cb) {
    if (!url) return cb(0, 0);
    var img = new Image();
    img.onload = function() {
      cb(img.naturalWidth || 0, img.naturalHeight || 0);
    };
    img.onerror = function() {
      cb(0, 0);
    };
    img.src = url;
  }
  function sendChat(text) {
    var targetId = chat && chat.targetId;
    if (!targetId) return;
    text = String(text).slice(0, CFG.im.maxLen);
    var quote = chat.quote || null;
    maybeDayDiv(Date.now());
    var b = el("div", "acsv-im-bubble mine pending");
    if (quote) b.appendChild(quoteStrip({ seqId: quote.seqId, preview: quote.preview }));
    var txt = el("div", "acsv-im-msgtext");
    txt.innerHTML = imTextHtml(text);
    b.appendChild(txt);
    var holder = el("div", "acsv-im-rowwrap mine");
    holder.appendChild(b);
    drawer.bubbles.appendChild(holder);
    drawer.bubbles.scrollTop = drawer.bubbles.scrollHeight;
    function onFail(err) {
      var stale = !chat || chat.targetId !== targetId;
      if (!stale && holder.isConnected) {
        b.classList.remove("pending");
        b.classList.add("failed");
        b.title = "发送失败，点击重试";
        b.addEventListener("click", function(ev) {
          ev.stopPropagation();
          holder.remove();
          drawer.input.value = text;
          if (quote && chat && !chat.quote) setQuote(quote);
          drawer.input.focus();
        });
      }
      toast("发送失败：" + String(err && err.message || "").slice(0, 120), 8e3);
    }
    ensureIm().then(function(inst) {
      return ensureConnected(inst).then(function() {
        ensureTracer(inst);
        return quote ? sendQuote(inst, Number(targetId), quote, text) : doSend(inst, Number(targetId), text).catch(function(err) {
          var pre = linkOk(inst) ? Promise.resolve() : ensureConnected(inst);
          return pre.then(function() {
            return forceSync(inst);
          }).then(function() {
            return doSend(inst, Number(targetId), text);
          });
        });
      }).then(function() {
        if (!chat || chat.targetId !== targetId) return;
        if (holder.isConnected) holder.remove();
        if (quote && chat.quote === quote) setQuote(null);
        chatPollOnce(inst, false);
      }, onFail);
    }, onFail);
  }
  testHook("imDrawerSmoke", function() {
    if (!root) setRoot(document.body);
    ensureDrawerDom();
    drawer.el.classList.add("open");
    return {
      drawerConnected: !!(drawer.el && drawer.el.isConnected),
      drawerOpen: drawer.el.classList.contains("open"),
      quoteChipIsNode: !!(drawer.quoteChip && drawer.quoteChip.box instanceof Element),
      quoteChipInDrawer: !!(drawer.quoteChip && drawer.quoteChip.box && drawer.quoteChip.box.isConnected),
      input: !!drawer.el.querySelector(".acsv-cinput-text"),
      send: !!drawer.el.querySelector(".acsv-cinput-send"),
      bubblesConnected: !!(drawer.bubbles && drawer.bubbles.isConnected)
    };
  });
  testHook("imOpenSmoke", function() {
    if (!root) setRoot(document.body);
    ensureDrawerDom();
    openDrawerCore();
    return {
      open: drawer.el.classList.contains("open"),
      withComments: root.classList.contains("acsv-with-comments"),
      drawerConnected: drawer.el.isConnected
    };
  });
  function openDrawerCore() {
    overlayOpen({ id: "im", close: closeDrawer });
    claimDrawer("im", closeDrawer);
    drawer.el.classList.add("open");
    syncCommentVars();
  }
  function openDrawer() {
    if (!isLogined()) {
      toast("私信需要先登录 AcFun 账号");
      return;
    }
    ensureDrawerDom();
    prewarmIm();
    openDrawerCore();
    showList();
  }
  function openChat(targetId) {
    if (!isLogined()) {
      toast("私信需要先登录 AcFun 账号");
      return;
    }
    ensureDrawerDom();
    prewarmIm();
    openDrawerCore();
    showChat(String(targetId));
  }
  function closeDrawer() {
    if (drawer) drawer.el.classList.remove("open");
    listPoll.stop();
    chatPoll.stop();
    view = "";
    releaseDrawer("im");
    overlayClose("im");
    syncCommentVars();
  }
  function teardownIm() {
    mounted = false;
    imShutdown();
    if (badgeDelayTimer) {
      clearTimeout(badgeDelayTimer);
      badgeDelayTimer = null;
    }
    if (badgeTimer) {
      clearInterval(badgeTimer);
      badgeTimer = null;
    }
    listPoll.stop();
    chatPoll.stop();
    releaseDrawer("im");
    drawer = null;
    view = "";
    chat = null;
    cards = {};
    listSig = "";
    lastListRows = null;
    badgeEl = null;
  }
  function mountBadge(btn, badge) {
    badgeEl = badge;
    mounted = true;
    var last = -1;
    function tick() {
      if (!mounted) return;
      if (!isLogined()) {
        setBadge(0);
        return;
      }
      ensureIm().then(function(inst) {
        if (!mounted || !inst.connected) return;
        var sum = 0;
        try {
          (inst.kernel.getSessions() || []).forEach(function(s) {
            sum += Number(s.unreadCount) || 0;
          });
        } catch (e) {
        }
        setBadge(sum);
      }, function() {
      });
    }
    function setBadge(n) {
      if (n === last) return;
      last = n;
      var txt = badgeText(n), show = n > 0 ? "" : "none";
      if (badgeEl) {
        badgeEl.textContent = txt;
        badgeEl.style.display = show;
      }
    }
    badgeTimer = setInterval(tick, CFG.im.badgePoll);
    badgeDelayTimer = setTimeout(function() {
      if (!mounted) return;
      tick();
      ensureIm().then(function(inst) {
        try {
          inst.on("unReadCountUpdate", function() {
            if (mounted) tick();
          });
        } catch (e) {
        }
      }, function() {
      });
    }, CFG.im.badgeDelay);
  }

  // src/imshare.js
  function pageWin() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }
  function logInstaller(G) {
    if (G.__acsvImLog) return;
    G.__acsvImLog = [];
    G.__acsvImErr = "";
    var ser = function(a) {
      if (a == null) return String(a);
      var t = typeof a;
      if (t === "string") return a;
      if (t === "number" || t === "boolean") return String(a);
      try {
        if (typeof a.toJSON === "function") return JSON.stringify(a.toJSON());
      } catch (e) {
      }
      if (a instanceof Error || a && a.message && a.stack) {
        return JSON.stringify({ name: a.name, message: a.message, code: a.code });
      }
      try {
        return JSON.stringify(a);
      } catch (e2) {
        return String(a);
      }
    };
    var push = function() {
      try {
        var parts = [], errJson = "";
        for (var i = 0; i < arguments.length; i++) {
          var s = ser(arguments[i]);
          parts.push(s);
          if (s && s.charAt(0) === "{") errJson = s;
        }
        var line = parts.join(" ");
        if (line.indexOf("[im-sdk]") > -1 || line.indexOf("信息发送") > -1 || line.indexOf("reject:") > -1) {
          if (errJson) G.__acsvImErr = errJson;
          G.__acsvImLog.push(line.slice(0, 2e3));
          if (G.__acsvImLog.length > 60) G.__acsvImLog.shift();
        }
      } catch (e) {
      }
    };
    G.localLog = {
      log: function() {
        push.apply(null, arguments);
        console.log.apply(console, arguments);
      },
      info: function() {
        push.apply(null, arguments);
        console.info.apply(console, arguments);
      },
      error: function() {
        push.apply(null, arguments);
        console.error.apply(console, arguments);
      }
    };
    try {
      ["log", "info", "error"].forEach(function(lv) {
        var orig = G.console[lv].bind(G.console);
        G.console[lv] = function() {
          push.apply(null, arguments);
          orig.apply(null, arguments);
        };
      });
    } catch (e) {
    }
  }
  function injectPageFn(installer, installed) {
    var w = pageWin();
    if (installed(w)) return false;
    try {
      installer(w);
    } catch (e) {
    }
    if (installed(w)) return false;
    try {
      var s = document.createElement("script");
      s.textContent = "(" + installer.toString() + ")(window);";
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (e2) {
    }
    return true;
  }
  function ensureLocalLog() {
    injectPageFn(logInstaller, function(w) {
      return w.localLog && w.__acsvImLog;
    });
  }
  function imLogMark() {
    try {
      return (pageWin().__acsvImLog || []).length;
    } catch (e) {
      return 0;
    }
  }
  function imLogVerdict(mark) {
    var buf = [];
    try {
      buf = pageWin().__acsvImLog || [];
    } catch (e) {
    }
    for (var i = mark; i < buf.length; i++) {
      var l = String(buf[i]);
      if (l.indexOf("信息发送成功") > -1) return { ok: true };
      if (l.indexOf("信息发送失败") > -1) return { ok: false, why: l };
    }
    return null;
  }
  function hadTracerCrash() {
    var w = pageWin(), buf = [];
    try {
      buf = w.__acsvImLog || [];
    } catch (e) {
    }
    for (var i = 0; i < buf.length; i++) {
      if (String(buf[i]).indexOf("reading 'context'") > -1) return true;
    }
    return false;
  }
  function weblogInstaller(G) {
    function makeSpan(opts) {
      var span = {
        context: opts && opts.context || { traceId: "acsv" + Date.now() },
        setTags: function() {
          return span;
        },
        end: function() {
        },
        createSubSpan: function(sub, o1, o2, parent) {
          return makeSpan({ context: parent || span.context });
        }
      };
      return span;
    }
    function safeStart(name, opts) {
      var sp = null;
      try {
        sp = G.__acsvOrigStart ? G.__acsvOrigStart.apply(this, arguments) : null;
      } catch (e) {
      }
      if (sp && sp.context !== void 0) return sp;
      return makeSpan(opts);
    }
    if (!G.weblog) {
      G.weblog = { startSpan: safeStart };
      return;
    }
    if (!G.__acsvOrigStart) {
      G.__acsvOrigStart = G.weblog.startSpan;
      G.weblog.startSpan = safeStart;
    }
  }
  function tracerOk() {
    try {
      var wl = pageWin().weblog;
      if (!wl || typeof wl.startSpan !== "function") return false;
      var sp = wl.startSpan("__acsv_probe__", {});
      return !!(sp && sp.context !== void 0);
    } catch (e) {
      return false;
    }
  }
  function ensureWeblogSync() {
    if (tracerOk()) return false;
    return injectPageFn(weblogInstaller, function() {
      return tracerOk();
    });
  }
  function isLogined() {
    return /^\d/.test(cookieVal("auth_key"));
  }
  function gmGetText2(url) {
    return gmRequest({ url, timeout: CFG.im.loadT, responseType: "text", okStatus: true });
  }
  function loadImSdk() {
    return new Promise(function(resolve, reject) {
      ensureLocalLog();
      ensureWeblogSync();
      var w = pageWin();
      var src = w.globalConfig && w.globalConfig.imsdkcdn || CFG.api.imsdk;
      if (src.indexOf("//") === 0) src = "https:" + src;
      var settled = false;
      function done(fn, val) {
        if (!settled) {
          settled = true;
          fn(val);
        }
      }
      function injectScript(url, onok, onfail) {
        var s = document.createElement("script");
        var timer = setTimeout(function() {
          clearTimeout(timer);
          s.remove();
          if (url.indexOf("blob:") === 0) URL.revokeObjectURL(url);
          onfail();
        }, CFG.im.loadT);
        s.onload = function() {
          clearTimeout(timer);
          var Ctor = pageWin().ImSdk;
          if (Ctor) onok(Ctor);
          else onfail();
        };
        s.onerror = function() {
          clearTimeout(timer);
          s.remove();
          if (url.indexOf("blob:") === 0) URL.revokeObjectURL(url);
          onfail();
        };
        s.src = url;
        (document.head || document.documentElement).appendChild(s);
      }
      function directLoad() {
        injectScript(
          src,
          function(Ctor) {
            done(resolve, Ctor);
          },
          function() {
            done(reject, new Error("imsdk-load-fail"));
          }
        );
      }
      gmGetText2(src).then(function(text) {
        var n = 0;
        text = text.replace('p=be.includes(e)&&(null==d?void 0:d.createSubSpan("Encode"', function(m) {
          n++;
          return 'p=!1&&(null==d?void 0:d.createSubSpan("Encode"';
        }).replace('f=be.includes(e)&&(null==d?void 0:d.createSubSpan("Transfer"', function(m) {
          n++;
          return 'f=!1&&(null==d?void 0:d.createSubSpan("Transfer"';
        });
        if (n < 2) {
          console.warn("[acsv-im] SDK 补丁失配（官方可能换了版），回退未修补加载");
          return directLoad();
        }
        var url = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
        injectScript(url, function(Ctor) {
          done(resolve, Ctor);
        }, function() {
          directLoad();
        });
      }, function() {
        directLoad();
      });
    });
  }
  var imPromise = null;
  function ensureIm() {
    if (imPromise) return imPromise;
    imPromise = loadImSdk().then(function(Ctor) {
      return new Ctor({ dev: false });
    }, function(e) {
      imPromise = null;
      throw e;
    });
    return imPromise;
  }
  function linkOk(inst) {
    try {
      var k = inst.kernel;
      if (!k) return false;
      var probes = [];
      if ("isConnected" in k) probes.push(k.isConnected === true);
      if ("linkState" in k) probes.push(k.linkState === "connected");
      if (k.api && "isConnected" in k.api) probes.push(k.api.isConnected === true);
      if (k.api && "linkState" in k.api) probes.push(k.api.linkState === "connected");
      if (!probes.length) return !!inst.connected;
      return probes.indexOf(true) > -1;
    } catch (e) {
      return false;
    }
  }
  function forceReconnect(inst) {
    try {
      inst.connected = false;
      inst.retryNum = 0;
      inst.connect();
    } catch (e) {
    }
  }
  function tracerInstaller(G) {
    if (!G.__acsvTracer) {
      var span = function(opts, parent) {
        var s = {
          context: opts && opts.context || parent || { traceId: "acsv" + Date.now() },
          setTags: function() {
            return s;
          },
          end: function() {
          },
          createSubSpan: function(n, parentCtx) {
            return span(opts, parentCtx || s.context);
          }
        };
        return s;
      };
      G.__acsvTracer = { startSpan: function(name, opts) {
        return span(opts);
      } };
    }
    try {
      var inst = G.ImSdk && G.ImSdk.instance;
      var zs = inst && inst.kernel && (inst.kernel.api || inst.kernel);
      var link = zs && zs.link;
      if (link && !link.tracer) link.tracer = G.__acsvTracer;
      if (link) {
        if (typeof link.log !== "function") link.log = function() {
        };
        if (typeof link.logPerformance !== "function") link.logPerformance = function() {
        };
      }
      G.__acsvTracerOk = !!(link && link.tracer);
    } catch (e) {
      G.__acsvTracerOk = false;
    }
  }
  function ensureTracer(inst) {
    injectPageFn(tracerInstaller, function(w2) {
      return w2.__acsvTracer && w2.__acsvTracerOk;
    });
    var w = pageWin();
    try {
      var k = inst.kernel || {};
      var zs = k.api || k;
      if (zs && zs.link && !zs.link.tracer && w.__acsvTracer) zs.link.tracer = w.__acsvTracer;
      if (zs && zs.link) {
        if (typeof zs.link.log !== "function") zs.link.log = function() {
        };
        if (typeof zs.link.logPerformance !== "function") zs.link.logPerformance = function() {
        };
      }
    } catch (e3) {
    }
  }
  var connGen = 0;
  function imShutdown() {
    connGen++;
  }
  function ensureConnected(inst) {
    if (inst.connected && linkOk(inst)) return Promise.resolve();
    return new Promise(function(resolve, reject) {
      var start = Date.now(), forced = false, gen = connGen;
      (function poll() {
        if (gen !== connGen) return reject(new Error("im-cancelled"));
        var ok = false;
        try {
          ok = !!inst.connected && linkOk(inst);
        } catch (e) {
        }
        if (ok) return resolve();
        var t = Date.now() - start;
        if (t > CFG.im.connT2) return reject(new Error("im-connect-fail"));
        if (!forced && t > CFG.im.connT1) {
          forced = true;
          forceReconnect(inst);
        }
        ensureTracer(inst);
        setTimeout(poll, 250);
      })();
    });
  }
  function getContacts(inst) {
    return new Promise(function(resolve) {
      var n = 0;
      (function poll() {
        var ss = [];
        try {
          ss = inst.kernel.getSessions() || [];
        } catch (e) {
        }
        if (ss.length) return resolve(mapSessions(ss));
        if (++n >= CFG.im.pollMax) return resolve([]);
        setTimeout(poll, CFG.im.pollGap);
      })();
    });
  }
  function mapSessions(ss) {
    return ss.map(function(s) {
      return {
        targetId: Number(s.targetId) || 0,
        unread: Number(s.unreadCount) || 0,
        t: new Date(s.lastMessage && s.lastMessage.date || s.date || 0).getTime() || 0
      };
    }).filter(function(c) {
      return c.targetId > 0;
    }).sort(function(a, b) {
      return b.t - a.t;
    });
  }
  function fetchCards(ids) {
    return postForm(CFG.api.userCard, "ids=" + ids.join(",")).then(function(j) {
      var map = {};
      (j && j.result === 0 && j.users || []).forEach(function(u) {
        map[u.id] = { name: u.name || "A站用户", headUrl: u.headUrl || "" };
      });
      return map;
    }, function() {
      return {};
    });
  }
  function doSend(inst, targetId, text) {
    var mark = imLogMark();
    return new Promise(function(resolve, reject) {
      var done = false;
      var timer = setTimeout(function() {
        finish(new Error("send-timeout"));
      }, CFG.im.sendT);
      function settle() {
        finish(null);
      }
      function finish(err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          inst.off("sendSucceed", onEvt);
        } catch (e) {
        }
        clearInterval(logPoll);
        if (err) reject(err);
        else resolve();
      }
      function onEvt(tid) {
        if (String(tid) === String(targetId)) settle();
      }
      try {
        inst.on("sendSucceed", onEvt);
      } catch (e) {
      }
      var logPoll = setInterval(function() {
        var v = imLogVerdict(mark);
        if (!v) return;
        finish(v.ok ? null : new Error(v.why || "send-fail"));
      }, 300);
      var r;
      try {
        if (inst.sendMessage.length >= 4) r = inst.sendMessage(targetId, text, 0, settle);
        else r = inst.sendMessage(targetId, text, settle);
      } catch (e) {
        finish(e);
        return;
      }
      if (r === false && !done) {
        finish(new Error("send-rejected"));
      }
    });
  }
  function forceSync(inst) {
    try {
      var k = inst.kernel;
      k.syncStatus.isSyncing = false;
      k.syncStatus.lastSyncDate = 0;
      k.sync();
    } catch (e) {
    }
    return new Promise(function(resolve) {
      var start = Date.now();
      (function poll() {
        var busy = false;
        try {
          busy = !!(inst.kernel && inst.kernel.syncStatus && inst.kernel.syncStatus.isSyncing);
        } catch (e) {
        }
        if (!busy || Date.now() - start > 6e3) return resolve();
        setTimeout(poll, 250);
      })();
    });
  }
  function resetSingleton(Ctor) {
    try {
      Ctor.instance = null;
      if (Ctor.instance) Ctor.instance = void 0;
      if (Ctor.instance) delete Ctor.instance;
    } catch (e) {
    }
  }
  function rebuildIm() {
    var p = loadImSdk().then(function(Ctor) {
      ensureWeblogSync();
      resetSingleton(Ctor);
      var inst = new Ctor({ dev: false });
      imPromise = Promise.resolve(inst);
      return ensureConnected(inst).then(function() {
        return inst;
      });
    }, function(e) {
      if (imPromise === p) imPromise = null;
      throw e;
    });
    imPromise = p;
    return p;
  }
  function withSendRecovery(inst, send) {
    return send(inst).catch(function() {
      var p;
      if (hadTracerCrash()) {
        console.warn("[acsv-im] 检测到 tracer 崩溃（weblog 缺失），重建 IM 实例后重试");
        p = rebuildIm();
      } else if (linkOk(inst)) {
        p = Promise.resolve(inst);
      } else {
        p = ensureConnected(inst).then(function() {
          return inst;
        });
      }
      return p.then(function(useInst) {
        ensureTracer(useInst);
        return forceSync(useInst).then(function() {
          return send(useInst);
        });
      });
    });
  }
  function sendOnce(inst, targetId, text) {
    return withSendRecovery(inst, function(i) {
      return doSend(i, targetId, text);
    });
  }
  function sendKernel(inst, msg, targetId, timeout) {
    var limit = timeout || CFG.im.sendT;
    return new Promise(function(resolve, reject) {
      var done = false, start = Date.now();
      function finish(err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err) reject(err);
        else resolve();
      }
      var timer = setTimeout(function() {
        finish(new Error("send-timeout"));
      }, limit);
      var r;
      try {
        r = inst.kernel.sendMessage(msg);
      } catch (e) {
        finish(e);
        return;
      }
      if (r && typeof r.then === "function") {
        r.then(function() {
        }, function(e) {
          finish(e || new Error("send-fail"));
        });
      }
      (function poll() {
        if (done) return;
        var csid = "";
        try {
          csid = String(msg.rawMsg && msg.rawMsg.clientSeqId || "");
        } catch (e1) {
        }
        if (csid) {
          var hit = false;
          try {
            var sess = null;
            (inst.kernel.getSessions() || []).some(function(s) {
              if (String(s.targetId) === String(targetId)) {
                sess = s;
                return true;
              }
              return false;
            });
            if (sess) {
              (inst.kernel.getMessages(sess) || []).some(function(m) {
                var raw = m.rawMsg || {};
                if (raw.clientSeqId !== void 0 && String(raw.clientSeqId) === csid) {
                  hit = true;
                  return true;
                }
                return false;
              });
            }
          } catch (e) {
          }
          if (hit) return finish(null);
        }
        if (Date.now() - start > limit) return finish(new Error("send-timeout"));
        setTimeout(poll, 300);
      })();
    });
  }
  function sendImage(inst, targetId, file, w, h) {
    return withSendRecovery(inst, function(i) {
      return new Promise(function(resolve, reject) {
        try {
          var map = i.kernel && i.kernel.messageConstructorMap;
          var Img = map && map[1];
          if (!Img || !Img.create) throw new Error("image-msg-class-missing");
          resolve(sendKernel(i, Img.create({
            image: file,
            width: w || 300,
            height: h || 300,
            targetType: 0,
            targetId: Number(targetId)
          }), targetId, CFG.im.imgSendT));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  var mgTokenP = null;
  function midgroundToken(refresh) {
    if (!mgTokenP || refresh) {
      mgTokenP = gmRequest({
        method: "POST",
        url: "https://id.app.acfun.cn/rest/web/token/get",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "sid=acfun.midground.api",
        timeout: CFG.time.gm
      }).then(function(j) {
        var t = j && j["acfun.midground.api_st"];
        if (!t) {
          mgTokenP = null;
          return "";
        }
        return String(t);
      }, function() {
        mgTokenP = null;
        return "";
      });
    }
    return mgTokenP;
  }
  var imgBlobCache = /* @__PURE__ */ new Map();
  var IMG_BLOB_CACHE_MAX = 30;
  function cacheBlobPut(url, blobUrl) {
    imgBlobCache.delete(url);
    imgBlobCache.set(url, blobUrl);
    while (imgBlobCache.size > IMG_BLOB_CACHE_MAX) {
      var k = imgBlobCache.keys().next().value;
      var u = imgBlobCache.get(k);
      imgBlobCache.delete(k);
      try {
        URL.revokeObjectURL(u);
      } catch (e0) {
      }
    }
  }
  var imgQ = [];
  var imgActive = 0;
  var IMG_Q_LIMIT = 3;
  function runQueuedImg(it) {
    it[0]().then(
      function(v) {
        imgActive--;
        pumpImgQ();
        it[1](v);
      },
      function(e) {
        imgActive--;
        pumpImgQ();
        it[2](e);
      }
    );
  }
  function pumpImgQ() {
    while (imgActive < IMG_Q_LIMIT && imgQ.length) runQueuedImg(imgQ.shift());
  }
  function enqueueImg(job) {
    return new Promise(function(resolve, reject) {
      imgQ.push([job, resolve, reject]);
      pumpImgQ();
    });
  }
  var imgInflight = /* @__PURE__ */ new Map();
  function imgCacheKey(url) {
    var m = /[?&]resourceId=([^&]+)/.exec(url);
    return m ? m[1] : url;
  }
  function peekImImageBlob(url) {
    var key = imgCacheKey(url);
    var hit = imgBlobCache.get(key);
    if (hit) cacheBlobPut(key, hit);
    return hit || null;
  }
  function fetchImImageBlob(url) {
    var key = imgCacheKey(url);
    var hit = imgBlobCache.get(key);
    if (hit) {
      cacheBlobPut(key, hit);
      return Promise.resolve(hit);
    }
    var flying = imgInflight.get(key);
    if (flying) return flying;
    function setMgCookie(tk) {
      if (!tk) return;
      try {
        document.cookie = "acfun.midground.api_st=" + tk + "; domain=.acfun.cn; path=/; max-age=86400; SameSite=None; Secure";
      } catch (e0) {
      }
    }
    function once(bust) {
      var u = bust ? url + (url.indexOf("?") > -1 ? "&" : "?") + "_=" + Date.now() : url;
      return enqueueImg(function() {
        return gmRequest({ url: u, timeout: CFG.time.gm, responseType: "arraybuffer", okStatus: true });
      });
    }
    function toBlob(buf) {
      try {
        return buf && buf.byteLength ? URL.createObjectURL(new Blob([buf])) : null;
      } catch (e) {
        return null;
      }
    }
    var p = midgroundToken(false).then(function(tk) {
      setMgCookie(tk);
      return once(false);
    }, function() {
      return once(false);
    }).then(toBlob, function() {
      return midgroundToken(true).then(function(tk) {
        setMgCookie(tk);
        return once(true);
      }, function() {
        return once(true);
      }).then(toBlob, function() {
        return null;
      });
    }).then(function(blobUrl) {
      imgInflight.delete(key);
      if (blobUrl) cacheBlobPut(key, blobUrl);
      return blobUrl;
    });
    imgInflight.set(key, p);
    return p;
  }
  function prewarmIm() {
    midgroundToken(false);
  }
  function sendQuote(inst, targetId, quote, text) {
    return withSendRecovery(inst, function(i) {
      return new Promise(function(resolve, reject) {
        try {
          var map = i.kernel && i.kernel.messageConstructorMap;
          if (CFG.im.quoteWire === "reference") {
            var Ref = map && map[12];
            if (!Ref || !Ref.create) throw new Error("reference-msg-class-missing");
            resolve(sendKernel(i, Ref.create({
              text,
              originMsg: quote.originMsg,
              targetType: 0,
              targetId: Number(targetId)
            }), targetId));
          } else {
            var Txt = map && map[0];
            if (!Txt || !Txt.create) throw new Error("text-msg-class-missing");
            var extra = null;
            try {
              var qExtra = {};
              qExtra[QUOTE_EXTRA_KEY] = { seqId: quote.seqId || "", preview: quote.preview || "", text };
              extra = new TextEncoder().encode(JSON.stringify(qExtra));
            } catch (e1) {
            }
            resolve(sendKernel(i, Txt.create({
              targetType: 0,
              targetId: Number(targetId),
              text: quoteWireText(quote.preview, text),
              // 拼接格式唯一定义处（immsg，原生页去重同源）
              extra
            }), targetId));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  function sendCmtShare(inst, targetId, payload, text) {
    return withSendRecovery(inst, function(i) {
      return new Promise(function(resolve, reject) {
        try {
          var map = i.kernel && i.kernel.messageConstructorMap;
          var Txt = map && map[0];
          if (!Txt || !Txt.create) throw new Error("text-msg-class-missing");
          var extra = null;
          try {
            var cExtra = {};
            cExtra[CMT_EXTRA_KEY] = payload;
            extra = new TextEncoder().encode(JSON.stringify(cExtra));
          } catch (e1) {
          }
          resolve(sendKernel(i, Txt.create({
            targetType: 0,
            targetId: Number(targetId),
            text,
            extra
          }), targetId));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  function openSharePanel(btn, item, opts) {
    opts = opts || {};
    var existed = document.querySelector(".acsv-sharepop");
    if (existed) {
      var reuse = existed._anchor === btn;
      existed.remove();
      if (reuse) return;
    }
    var pop = el("div", "acsv-sharepop");
    pop._anchor = btn;
    if (opts.popClass) pop.classList.add(opts.popClass);
    var head = el("div", "acsv-share-head");
    head.appendChild(el("span", null, opts.headText || "分享给朋友"));
    var closeBtn = el("button", "acsv-share-close", "✕");
    closeBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      pop.remove();
    });
    head.appendChild(closeBtn);
    pop.appendChild(head);
    var searchWrap = el("div", "acsv-share-searchwrap");
    var search = el("input", "acsv-share-search");
    search.placeholder = "搜索最近联系人";
    search.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    search.addEventListener("input", function() {
      filterRows(pop, search.value);
    });
    searchWrap.appendChild(search);
    pop.appendChild(searchWrap);
    var list = el("div", "acsv-share-list");
    pop.appendChild(list);
    var foot = el("div", "acsv-share-foot");
    var copyBtn = el("button", "acsv-share-copy", "复制链接");
    copyBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      copyText(item.shareUrl).then(function(ok) {
        toast(ok ? "已复制：" + item.shareUrl : "复制失败，请手动复制");
      });
    });
    var centerLink = el("a", "acsv-share-center", "消息中心");
    centerLink.href = "https://message.acfun.cn/im";
    centerLink.target = "_blank";
    foot.appendChild(copyBtn);
    foot.appendChild(centerLink);
    pop.appendChild(foot);
    var wrap = opts.host || btn.parentNode;
    if (!opts.host) wrap.style.position = "relative";
    wrap.appendChild(pop);
    setTimeout(function() {
      document.addEventListener("click", function onDoc(ev) {
        document.removeEventListener("click", onDoc);
        if (!pop.isConnected) return;
        if (pop.contains(ev.target) || btn.contains(ev.target)) return;
        pop.remove();
      });
    }, 0);
    if (!isLogined()) {
      list.appendChild(el("div", "acsv-share-tip", "私信需要先登录 AcFun 账号\n可先复制链接去站内分享"));
      return;
    }
    renderLoading(list, "正在连接私信…");
    ensureIm().then(function(inst) {
      return ensureConnected(inst).then(function() {
        return getContacts(inst).then(function(contacts) {
          if (!pop.isConnected) return;
          if (!contacts.length) {
            list.innerHTML = "";
            list.appendChild(el("div", "acsv-share-tip", "还没有聊过天的朋友\n先在 A 站 APP / 网页和 TA 私聊一句\n再回来把这条分享给 TA"));
            return;
          }
          renderRows(pop, list, contacts, item, inst);
        });
      });
    }).catch(function() {
      if (!pop.isConnected) return;
      list.innerHTML = "";
      list.appendChild(el("div", "acsv-share-tip", "私信连接失败，请稍后再试\n可先复制链接去站内分享"));
    });
  }
  function renderLoading(list, text) {
    list.innerHTML = "";
    var tip = el("div", "acsv-share-tip", text);
    tip.appendChild(el("div", "acsv-share-spin"));
    list.appendChild(tip);
  }
  function renderRows(pop, list, contacts, item, inst) {
    list.innerHTML = "";
    fetchCards(contacts.map(function(c) {
      return c.targetId;
    })).then(function(cards2) {
      if (!pop.isConnected) return;
      contacts.forEach(function(c) {
        var card = cards2[c.targetId] || {};
        var row = el("div", "acsv-share-row");
        row.dataset.name = (card.name || "").toLowerCase();
        row.dataset.tid = c.targetId;
        var av = el("img", "acsv-share-av");
        av.referrerPolicy = "no-referrer";
        av.src = (card.headUrl || CFG.api.defaultAvatar).split("?")[0];
        av.addEventListener("error", function() {
          av.src = CFG.api.defaultAvatar;
        });
        row.appendChild(av);
        var name = el("div", "acsv-share-name", card.name || "用户 " + c.targetId);
        if (c.unread > 0) {
          var dot = el("span", "acsv-share-unread", c.unread > 99 ? "99+" : String(c.unread));
          name.appendChild(dot);
        }
        row.appendChild(name);
        var send = el("button", "acsv-share-send", "分享");
        var shareText = String(item.title || "").slice(0, 400) + "\n" + item.shareUrl;
        send.addEventListener("click", function(ev) {
          ev.stopPropagation();
          if (send.disabled) return;
          send.disabled = true;
          send.textContent = "…";
          ensureConnected(inst).then(function() {
            return item.cmt ? sendCmtShare(inst, c.targetId, item.cmt, shareText.slice(0, CFG.im.maxLen)) : sendOnce(inst, c.targetId, shareText.slice(0, CFG.im.maxLen));
          }).then(function() {
            var chatBtn = el("button", "acsv-share-send chat", "捎句话");
            chatBtn.title = "打开与 " + (card.name || "好友") + " 的聊天，补充一句";
            chatBtn.addEventListener("click", function(ev2) {
              ev2.stopPropagation();
              openChat(c.targetId);
            });
            send.replaceWith(chatBtn);
            toast("已私信分享给 " + (card.name || "好友"));
          }, function(err) {
            send.disabled = false;
            send.textContent = "分享";
            var why = err && err.message || "";
            console.warn(
              "[acsv-im] 发送失败",
              why,
              "linkState=" + (inst.kernel && (inst.kernel.linkState || inst.kernel.isConnected) || "unknown")
            );
            toast(why.indexOf("send-timeout") === 0 || why.indexOf("send-rejected") === 0 ? "发送失败，请稍后再试" : "发送失败：" + why.slice(0, 200), 1e4);
          });
        });
        row.appendChild(send);
        list.appendChild(row);
      });
    });
  }
  function filterRows(pop, kw) {
    kw = String(kw || "").trim().toLowerCase();
    var rows = pop.querySelectorAll(".acsv-share-row");
    for (var i = 0; i < rows.length; i++) {
      var hit = !kw || (rows[i].dataset.name || "").indexOf(kw) > -1;
      rows[i].style.display = hit ? "" : "none";
    }
  }

  // src/comments.js
  var commentState = { sourceId: 0, stype: 5, shareUrl: "", page: 1, totalPage: 1, pcursor: "no_more", loading: false, replyTo: null, kind: "sv" };
  function isOpenComments() {
    return !!(commentDrawer && commentDrawer.el.classList.contains("open"));
  }
  function syncCommentVars() {
    if (!root) return;
    var vw = window.innerWidth;
    var dw = Math.min(CFG.comments.drawerW, vw * CFG.comments.drawerMaxWp);
    var ratio = (vw - dw) / vw;
    root.style.setProperty("--acsv-dw", dw + "px");
    root.style.setProperty("--acsv-cscale", String(Math.max(CFG.comments.scaleMin, ratio)));
    root.classList.toggle("acsv-with-comments", !!currentDrawer() && ratio >= CFG.comments.avoidMin);
  }
  window.addEventListener("resize", syncCommentVars);
  function closeComments() {
    if (commentDrawer) commentDrawer.el.classList.remove("open");
    releaseDrawer("comments");
    overlayClose("comments");
    if (root) syncCommentVars();
  }
  function openComments(sourceId, stype, shareUrl, kind) {
    if (!commentDrawer || !sourceId) return;
    overlayOpen({ id: "comments", close: closeComments });
    claimDrawer("comments", closeComments);
    commentDrawer.el.classList.add("open");
    if (root) syncCommentVars();
    commentState.stype = Number(stype) || 5;
    commentState.kind = kind === "home" ? "home" : "sv";
    commentState.shareUrl = shareUrl || CFG.api.shareBase + sourceId;
    ensureCommentInput();
    if (inputBar) inputBar.style.display = commentState.kind === "home" ? "flex" : "none";
    if (commentState.sourceId !== sourceId) {
      setReply(null);
      loadComments(sourceId, 1, false);
    } else if (!commentDrawer.list.children.length) {
      loadComments(sourceId, 1, false);
    }
  }
  function toggleItemComments(item) {
    if (isOpenComments() && commentState.sourceId === item.id) closeComments();
    else openComments(item.id, item.stype, item.shareUrl, item.kind);
  }
  function loadComments(sourceId, page, append) {
    if (!commentDrawer) return;
    commentState.loading = true;
    commentState.sourceId = sourceId;
    var reqId = sourceId;
    if (!append) {
      commentDrawer.list.innerHTML = "";
      commentDrawer.list.appendChild(el(
        "div",
        "acsv-spinner",
        null
      )).style.cssText = "position:static;margin:40px auto;display:block";
    }
    var p = window.__ACSV_MOCK__ ? Promise.resolve(mockComments()) : request(CFG.api.comment + sourceId + "&sourceType=" + commentState.stype + "&page=" + page + "&pivotCommentId=0&newPivotCommentId=&showHotComments=1", "GET");
    Promise.all([p, ensureEmotionMap()]).then(function(res) {
      if (reqId !== commentState.sourceId) return;
      var j = res[0];
      commentState.loading = false;
      var list = j && j.rootComments || [];
      commentState.page = j && j.curPage || page;
      commentState.totalPage = j && j.totalPage || 1;
      commentState.pcursor = j && j.pcursor || "no_more";
      commentState.count = j && j.commentCount != null ? j.commentCount : list.length;
      renderComments(list, append, j && j.subCommentsMap, j && j.hotComments || []);
    }, function() {
      if (reqId !== commentState.sourceId) return;
      commentState.loading = false;
      renderCommentTip("评论加载失败，请重试");
    });
  }
  function normalizeSubs(subMap, cid) {
    if (!subMap) return [];
    var v = subMap[String(cid)] || subMap[cid];
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (v.subComments) return v.subComments;
    return [];
  }
  function glyph(codepoint) {
    return el("i", "acsvg-glyph", codepoint);
  }
  function commentItem(c, subMap, sourceId) {
    var item = el("div", "acsv-citem");
    var homeUrl = c.userId ? CFG.api.userBase + c.userId : null;
    var avLink = el("a", "acsv-avlink");
    if (homeUrl) {
      avLink.href = homeUrl;
      avLink.target = "_blank";
      avLink.title = "访问 " + (c.userName || "") + " 的空间";
    }
    var av = el("img", "av");
    av.referrerPolicy = "no-referrer";
    var hu = c.headUrl;
    if (Array.isArray(hu)) hu = hu[0] && hu[0].url || "";
    else if (hu && typeof hu === "object") hu = hu.url || "";
    av.src = (typeof hu === "string" && hu ? hu : CFG.api.defaultAvatar).split("?")[0];
    avLink.appendChild(av);
    var body = el("div", "acsv-cbody");
    var name = el("div", "acsv-cname");
    if (homeUrl) {
      var na = el("a", null, c.userName || "AcFun用户");
      na.href = homeUrl;
      na.target = "_blank";
      name.appendChild(na);
    } else {
      name.appendChild(el("span", null, c.userName || "AcFun用户"));
    }
    if (c.isUp) name.appendChild(el("span", "up", "UP"));
    body.appendChild(name);
    var ctext = el("div", "acsv-ctext");
    ctext.innerHTML = renderCommentHtml(c.content);
    body.appendChild(ctext);
    var meta = el("div", "acsv-cmeta");
    meta.appendChild(el("span", null, c.postDate || ""));
    var like = null, replyBtn = null;
    var likeGlyph = function(on) {
      return glyph(on ? GLYPHS.feedLikeFill : GLYPHS.feedLike);
    };
    if (commentState.kind === "home") {
      var on0 = !!(c.isLike || c.localLike);
      like = el("span", "acsv-clike" + (on0 ? " on" : ""));
      like._g = likeGlyph(on0);
      like.appendChild(like._g);
      var likeN = el("span", null, fmt((c.likeCount || 0) + (c.localLike ? 1 : 0)));
      like.appendChild(likeN);
      like.title = "点赞评论";
      like._c = c;
      like._n = likeN;
      meta.appendChild(like);
      replyBtn = el("span", "acsv-creplybtn");
      replyBtn.appendChild(glyph(GLYPHS.feedComment));
      replyBtn.appendChild(document.createTextNode("回复"));
      replyBtn._target = { id: String(c.commentId), name: c.userName || "AcFun用户" };
      meta.appendChild(replyBtn);
      var fwdBtn = el("span", "acsv-cfwdbtn");
      fwdBtn.appendChild(glyph(GLYPHS.feedRepost));
      fwdBtn.appendChild(document.createTextNode("转发"));
      fwdBtn.title = "转发这条评论到私信";
      fwdBtn._target = { id: String(c.commentId), name: c.userName || "AcFun用户", content: c.content || "" };
      meta.appendChild(fwdBtn);
    } else {
      like = el("span", "acsv-clike");
      like.appendChild(likeGlyph(false));
      like.appendChild(el("span", null, fmt(c.likeCount)));
      meta.appendChild(like);
    }
    body.appendChild(meta);
    var subs = normalizeSubs(subMap, c.commentId);
    var subBox = null;
    if (subs.length) {
      subBox = el("div", "acsv-csub");
      subs.forEach(function(s) {
        subBox.appendChild(commentItem(s, null, sourceId));
      });
      body.appendChild(subBox);
    }
    if ((c.subCommentCount || 0) > subs.length) {
      expandSubComments(body, c, subBox);
    }
    item.appendChild(avLink);
    item.appendChild(body);
    return item;
  }
  function toggleCommentLike(like) {
    var c = like._c;
    if (!c || c.likeBusy) return;
    var on = !(c.isLike || c.localLike);
    c.likeBusy = true;
    c.localLike = on;
    like.classList.toggle("on", on);
    like._g.textContent = on ? GLYPHS.feedLikeFill : GLYPHS.feedLike;
    like._n.textContent = fmt((c.likeCount || 0) + (on ? 1 : 0));
    AppAPI.commentLike(commentState.sourceId, commentState.stype, c.commentId, on).then(function(ok) {
      c.likeBusy = false;
      if (ok) return;
      c.localLike = !on;
      like.classList.toggle("on", !on);
      like._g.textContent = on ? GLYPHS.feedLike : GLYPHS.feedLikeFill;
      like._n.textContent = fmt(c.likeCount || 0);
      toast("操作失败（未登录？）");
    });
  }
  function commentListClick(ev) {
    var like = ev.target.closest(".acsv-clike");
    if (like && like._c) {
      ev.stopPropagation();
      toggleCommentLike(like);
      return;
    }
    var rb = ev.target.closest(".acsv-creplybtn");
    if (rb && rb._target) {
      ev.stopPropagation();
      setReply(rb._target);
      if (inputBar) {
        var inp = inputBar.querySelector(".acsv-cinput-text");
        if (inp) inp.focus();
      }
      return;
    }
    var fw = ev.target.closest(".acsv-cfwdbtn");
    if (fw && fw._target && commentDrawer) {
      ev.stopPropagation();
      var t = fw._target;
      openSharePanel(fw, {
        title: commentShareWire(t.name, ubbImText(t.content)),
        shareUrl: commentState.shareUrl + "#ncid=" + t.id,
        cmt: { ncid: t.id, content: t.content }
      }, {
        host: commentDrawer.el,
        popClass: "acsv-sharepop-drawer",
        headText: "转发这条评论"
      });
      return;
    }
    var pic = ev.target.closest(".ubb-imgc");
    if (pic) {
      var sel = window.getSelection ? window.getSelection() : null;
      if (!sel || sel.isCollapsed) {
        ev.stopPropagation();
        openImageViewer(pic.getAttribute("src") || "");
      }
    }
  }
  function expandSubComments(body, c, subBox) {
    var more = el("button", "acsv-cmore", "展开 " + c.subCommentCount + " 条回复");
    var pcursor2 = "";
    var loaded = subBox ? subBox.querySelectorAll(".acsv-citem").length : 0;
    function appendSubs(arr) {
      if (!arr.length) return;
      if (!subBox) {
        subBox = el("div", "acsv-csub");
        body.insertBefore(subBox, more);
      }
      arr.forEach(function(s) {
        subBox.appendChild(commentItem(s, null, commentState.sourceId));
      });
    }
    more.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (more._busy) return;
      more._busy = true;
      more.textContent = "展开中…";
      request(CFG.api.commentSub + "?sourceId=" + commentState.sourceId + "&sourceType=" + commentState.stype + "&rootCommentId=" + c.commentId + "&pcursor=" + pcursor2 + "&count=" + CFG.comments.subCount, "GET").then(function(j) {
        more._busy = false;
        if (!j || j.result !== 0) {
          more.textContent = "展开失败，点击重试";
          return;
        }
        appendSubs(j.subComments || []);
        loaded += (j.subComments || []).length;
        pcursor2 = j.pcursor;
        if (!pcursor2 || pcursor2 === "no_more" || loaded >= (c.subCommentCount || 0)) more.remove();
        else more.textContent = "继续展开（剩 " + ((c.subCommentCount || 0) - loaded) + " 条）";
      }, function() {
        more._busy = false;
        more.textContent = "展开失败，点击重试";
      });
    });
    body.appendChild(more);
  }
  function renderComments(list, append, subMap, hot) {
    if (!commentDrawer) return;
    if (!append) commentDrawer.list.innerHTML = "";
    commentDrawer.title.textContent = "评论 " + fmt(commentState.count);
    if (!list.length && !append) {
      var empty = el("div", "acsv-drawer-tip", "还没有评论，去原页抢沙发 →");
      var a = el("a", "acsv-cmore");
      a.href = commentState.shareUrl;
      a.target = "_blank";
      a.textContent = "前往原页";
      empty.appendChild(document.createElement("br"));
      empty.appendChild(a);
      commentDrawer.list.appendChild(empty);
      return;
    }
    var seen = {};
    function push(c) {
      if (seen[c.commentId]) return;
      seen[c.commentId] = 1;
      commentDrawer.list.appendChild(commentItem(c, subMap, commentState.sourceId));
    }
    if (!append && hot && hot.length) {
      commentDrawer.list.appendChild(el("div", "acsv-hot-head", "热门评论"));
      hot.forEach(push);
      commentDrawer.list.appendChild(el("div", "acsv-hot-divider", "最新评论"));
    }
    list.forEach(push);
    if (commentState.page < commentState.totalPage && commentState.pcursor !== "no_more") {
      var more = el("button", "acsv-drawer-more", "加载更多评论");
      more.addEventListener("click", function() {
        more.remove();
        loadComments(commentState.sourceId, commentState.page + 1, true);
      });
      commentDrawer.list.appendChild(more);
    }
  }
  function renderCommentTip(text) {
    if (!commentDrawer) return;
    commentDrawer.list.innerHTML = "";
    commentDrawer.list.appendChild(el("div", "acsv-drawer-tip", text));
  }
  var inputBar = null;
  var replyChip = null;
  function setReply(target) {
    commentState.replyTo = target || null;
    if (!inputBar) return;
    var inp = inputBar.querySelector(".acsv-cinput-text");
    if (commentState.replyTo) {
      replyChip.box.style.display = "flex";
      replyChip.label.textContent = "回复：@" + commentState.replyTo.name;
      inp.placeholder = "回复 @" + commentState.replyTo.name + "…";
    } else {
      replyChip.box.style.display = "none";
      inp.placeholder = "评论一时爽，一直评论一直爽。";
    }
  }
  function sendCurrent() {
    var inp = inputBar.querySelector(".acsv-cinput-text");
    var send = inputBar.querySelector(".acsv-cinput-send");
    var text = (inp.value || "").trim();
    if (!text || inputBar._busy) return;
    inputBar._busy = true;
    send.textContent = "发送中…";
    var replyTo = commentState.replyTo;
    var forId = commentState.sourceId;
    AppAPI.postComment(commentState.sourceId, commentState.stype, text, replyTo ? replyTo.id : 0).then(function(r) {
      inputBar._busy = false;
      send.textContent = "发送";
      if (!r || !r.ok) {
        toast("发送失败" + (r && r.msg ? "：" + r.msg : "（未登录？）"));
        return;
      }
      toast(replyTo ? "回复成功" : "评论成功");
      inp.value = "";
      if (inputBar._fit) inputBar._fit();
      setReply(null);
      if (forId !== commentState.sourceId) return;
      if (insertLocalComment(r.comment, !!replyTo)) return;
      loadComments(commentState.sourceId, 1, false);
    });
  }
  function insertLocalComment(c, isReply) {
    if (!commentDrawer || isReply || !c || !c.commentId) return false;
    var list = commentDrawer.list;
    var tip = list.querySelector(".acsv-drawer-tip");
    if (tip) tip.remove();
    var node = commentItem(c, null, commentState.sourceId);
    var divider = list.querySelector(".acsv-hot-divider");
    if (divider) divider.insertAdjacentElement("afterend", node);
    else list.insertBefore(node, list.firstChild);
    commentState.count++;
    commentDrawer.title.textContent = "评论 " + fmt(commentState.count);
    return true;
  }
  function ensureCommentInput() {
    if (inputBar && inputBar.isConnected) return inputBar;
    replyChip = buildQuoteChip(function() {
      setReply(null);
    }, "取消回复");
    var bar = buildInputBar({
      img: {
        title: "插入图片",
        onFile: function(f) {
          if (f.size > CFG.comments.imgMax) {
            toast("图片不能超过 " + Math.round(CFG.comments.imgMax / 1024 / 1024) + "MB");
            return;
          }
          bar.imgBtn.textContent = "上传中";
          uploadImage(f).then(function(url) {
            bar.imgBtn.innerHTML = ICONS.image;
            if (!url) {
              toast("图片上传失败（需登录）");
              return;
            }
            toast("图片上传成功");
            insertAtCursor(bar.input, "[img=图片]" + url + "[/img]");
          });
        }
      },
      placeholder: "评论一时爽，一直评论一直爽。(˶‾᷄ ⁻̫ ‾᷅˵)",
      maxLength: 1e3,
      onSend: sendCurrent
    });
    inputBar = bar.box;
    inputBar.imgBtn = bar.imgBtn;
    inputBar._fit = bar.fitHeight;
    var inp = bar.input;
    var panel = el("div", "acsv-emotpanel");
    commentDrawer.el.appendChild(panel);
    commentDrawer.el.appendChild(replyChip.box);
    commentDrawer.el.appendChild(inputBar);
    commentDrawer.list.addEventListener("scroll", function() {
      var l = commentDrawer.list;
      if (commentState.loading || commentState.page >= commentState.totalPage || commentState.pcursor === "no_more") return;
      if (l.scrollTop + l.clientHeight >= l.scrollHeight - CFG.comments.scrollPad) {
        loadComments(commentState.sourceId, commentState.page + 1, true);
      }
    }, { passive: true });
    mountEmotButton(bar.emotBtn, panel, inp);
    return inputBar;
  }
  function mockComments() {
    return {
      commentCount: 4,
      curPage: 1,
      totalPage: 1,
      pcursor: "no_more",
      rootComments: [
        { commentId: "m1", userId: 123, userName: "香蕉君", headUrl: "", content: "这条视频太棒了（示例评论，仅本地预览显示）", postDate: "2026-09-01", likeCount: 233, isUp: false, subCommentCount: 1 },
        { commentId: "m2", userId: 456, userName: "UP主本人", headUrl: "", content: "感谢收看！", postDate: "2026-09-02", likeCount: 66, isUp: true, subCommentCount: 0 },
        { commentId: "m3", userId: 777, userName: "富文本示例", headUrl: "", content: "[color=#4f81bd]这条评论用 [color] 标签着了色，\n换行也保留；正文现在可以划选后右键复制。[/color]\n这段是着色范围外的普通文字。", postDate: "2026-09-03", likeCount: 12, isUp: false, subCommentCount: 0 },
        { commentId: "m4", userId: 888, userName: "配图示例", headUrl: "", content: "带配图的评论，点击图片可看大图：\n[img=图片]https://cdn.aixifan.com/dotnet/20130418/umeditor/dialogs/emotion/images/ac2/1.gif[/img]", postDate: "2026-09-04", likeCount: 5, isUp: false, subCommentCount: 0 }
      ],
      subCommentsMap: { m1: [{ commentId: "m1-1", userId: 789, userName: "路人甲", headUrl: "", content: "前排！", postDate: "2026-09-01", likeCount: 3, subCommentCount: 0 }] }
    };
  }
  testHook("comments", function() {
    return {
      sourceId: commentState.sourceId,
      stype: commentState.stype,
      kind: commentState.kind,
      open: isOpenComments()
    };
  });

  // src/dmcanvas.js
  function createLayer(slide, video) {
    var canvas = document.createElement("canvas");
    canvas.className = "acsv-dmcanvas";
    var ctx = canvas.getContext("2d");
    slide.insertBefore(canvas, slide.querySelector(".acsv-side"));
    var items = [];
    var raf = 0, running = false, lastAlign = 0;
    var cssW = 0, cssH = 0, dpr = 1;
    var laneH = 30, lastW = 0;
    var head = 0, lastT = -1;
    var devK = 1;
    var sprQueue = [], sprN = 0;
    var vfc = !!video.requestVideoFrameCallback;
    function align() {
      var vr = video.getBoundingClientRect();
      var sr = slide.getBoundingClientRect();
      var scale = sr.width && slide.offsetWidth ? sr.width / slide.offsetWidth : 1;
      var x = vr.left - sr.left, y = vr.top - sr.top;
      var w = vr.width, h = vr.height;
      var vw = video.videoWidth, vh = video.videoHeight;
      if (vw && vh && w > 8 && h > 8) {
        var s = Math.min(w / vw, h / vh);
        var pw = vw * s, ph = vh * s;
        x += (w - pw) / 2;
        y += (h - ph) / 2;
        w = pw;
        h = ph;
      }
      x /= scale;
      y /= scale;
      w /= scale;
      h /= scale;
      cssW = Math.round(w);
      cssH = Math.round(h);
      canvas.style.left = Math.round(x) + "px";
      canvas.style.top = Math.round(y) + "px";
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      dpr = window.devicePixelRatio || 1;
      devK = scale * dpr;
      var pw = Math.round(cssW * scale * dpr), ph = Math.round(cssH * scale * dpr);
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    }
    function fontPxOf(size) {
      return Math.max(12, Math.min(80, Math.round(size * cssH / 810)));
    }
    function measure(it) {
      var px = fontPxOf(it.size);
      var key = px + "|" + it.text;
      if (it._mk === key) return;
      it._px = px;
      ctx.font = px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
      it._w = Math.max(8, ctx.measureText(it.text).width);
      it._mk = key;
    }
    function spriteOf(it) {
      var bk = it._px + "|" + it.text + "|" + devK;
      if (it._bmp && it._bk === bk) return;
      var pad = Math.max(2, Math.ceil(it._px / 24) + 2);
      var lw = Math.ceil(it._w) + pad * 2;
      var lh = Math.ceil(it._px * 1.4) + pad * 2;
      var bmp = document.createElement("canvas");
      bmp.width = Math.max(1, Math.round(lw * devK));
      bmp.height = Math.max(1, Math.round(lh * devK));
      var bctx = bmp.getContext("2d");
      bctx.setTransform(devK, 0, 0, devK, 0, 0);
      bctx.font = it._px + 'px "Microsoft YaHei","PingFang SC",sans-serif';
      bctx.textAlign = "center";
      bctx.textBaseline = "middle";
      bctx.lineJoin = "round";
      bctx.lineWidth = Math.max(1, it._px / 12);
      bctx.strokeStyle = "rgba(0,0,0,.82)";
      bctx.strokeText(it.text, lw / 2, lh / 2);
      bctx.fillStyle = it.color;
      bctx.fillText(it.text, lw / 2, lh / 2);
      it._bmp = bmp;
      it._bk = bk;
      it._lw = lw;
      it._lh = lh;
      sprQueue.push(it);
      sprN++;
      if (sprQueue.length > 300) {
        var old = sprQueue.shift();
        if (old._bmp) {
          old._bmp = null;
          sprN--;
        }
      }
    }
    function assignLanes() {
      if (cssW < 10 || cssH < 10 || !items.length) return;
      var i, it;
      var maxPx = 0;
      for (i = 0; i < items.length; i++) {
        measure(items[i]);
        if (items[i]._px > maxPx) maxPx = items[i]._px;
        items[i]._dur = items[i].mode === 1 ? (cssW + items[i]._w) / cssW * CFG.danmaku.scrollSec * 1e3 : CFG.danmaku.staySec * 1e3;
      }
      laneH = Math.max(28, Math.round(maxPx * 1.4));
      var scrollLanes = Math.max(1, Math.floor(cssH * 0.72 / laneH));
      var sideLanes = Math.max(1, Math.floor(cssH * 0.6 / laneH));
      var busy = {};
      items.sort(function(a, b) {
        return a.at - b.at;
      });
      for (i = 0; i < items.length; i++) {
        it = items[i];
        var mode = it.mode === 4 || it.mode === 5 ? it.mode : 1;
        it.mode = mode;
        var arr = busy[mode] || (busy[mode] = []);
        var limit = mode === 1 ? scrollLanes : sideLanes;
        var pick = -1, minAt = Infinity, minIdx = 0;
        for (var l = 0; l < limit; l++) {
          var freeAt = arr[l] || 0;
          if (freeAt <= it.at) {
            pick = l;
            break;
          }
          if (freeAt < minAt) {
            minAt = freeAt;
            minIdx = l;
          }
        }
        if (pick < 0) pick = minIdx;
        it._lane = pick;
        if (mode === 1) {
          var speed = (cssW + it._w) / it._dur;
          arr[pick] = it.at + it._w / speed;
        } else {
          arr[pick] = it.at + it._dur;
        }
      }
      lastW = cssW;
    }
    function paint() {
      var t0 = 0, vis = 0;
      if (false) t0 = performance.now();
      var now = Date.now();
      if (now - lastAlign > 250) {
        lastAlign = now;
        align();
        if (Math.abs(cssW - lastW) > 60) assignLanes();
      }
      ctx.clearRect(0, 0, cssW, cssH);
      if (items.length && cssW >= 10) {
        var t = video.currentTime * 1e3;
        if (t < lastT) head = 0;
        lastT = t;
        while (head < items.length && items[head]._dur > 0 && t > items[head].at + items[head]._dur) {
          var gone = items[head];
          if (gone._bmp) {
            gone._bmp = null;
            sprN--;
          }
          head++;
        }
        for (var i = head; i < items.length; i++) {
          var it = items[i];
          if (it.at > t) break;
          if (t > it.at + it._dur) continue;
          var p = (t - it.at) / it._dur;
          var x, y;
          if (it.mode === 5) {
            x = cssW / 2;
            y = laneH * (it._lane + 0.9);
          } else if (it.mode === 4) {
            x = cssW / 2;
            y = cssH - laneH * (it._lane + 0.5);
          } else {
            x = cssW + it._w / 2 - p * (cssW + it._w);
            y = laneH * (it._lane + 1);
          }
          if (x < -it._w / 2 || x > cssW + it._w / 2) continue;
          spriteOf(it);
          ctx.drawImage(it._bmp, x - it._lw / 2, y - it._lh / 2, it._lw, it._lh);
          vis++;
        }
      }
      if (false) {
        stat("dm.frame");
        dmMs += performance.now() - t0;
        dmVisSum += vis;
        if (++dmFc >= 60) {
          set("dm.paintMs", +(dmMs / dmFc).toFixed(2));
          set("dm.visible", Math.round(dmVisSum / dmFc));
          set("dm.sprites", sprN);
          dmFc = 0;
          dmMs = 0;
          dmVisSum = 0;
        }
      }
    }
    function schedule() {
      if (!running) return;
      if (vfc) raf = video.requestVideoFrameCallback(frame);
      else raf = requestAnimationFrame(frame);
    }
    function frame() {
      if (!running) return;
      if (!vfc && video.paused) {
        schedule();
        return;
      }
      paint();
      schedule();
    }
    return {
      setItems: function(list) {
        items = (list || []).filter(function(m) {
          return m && m.text;
        });
        head = 0;
        lastT = -1;
        sprQueue = [];
        sprN = 0;
        if (running) {
          assignLanes();
          if (video.paused) paint();
        }
      },
      // 发送成功后的本地回显：按 at 有序插入（时间窗扫描依赖升序不变量，通常就落在队尾）
      addLocal: function(it) {
        var j = items.length;
        while (j > 0 && items[j - 1].at > it.at) j--;
        items.splice(j, 0, it);
        if (running) {
          assignLanes();
          if (video.paused) paint();
        }
      },
      start: function() {
        if (running) return;
        running = true;
        lastAlign = 0;
        lastW = 0;
        paint();
        schedule();
      },
      stop: function() {
        running = false;
        if (raf) {
          if (vfc) {
            try {
              video.cancelVideoFrameCallback(raf);
            } catch (e) {
            }
          } else cancelAnimationFrame(raf);
          raf = 0;
        }
        try {
          ctx.clearRect(0, 0, cssW, cssH);
        } catch (e) {
        }
      },
      destroy: function() {
        this.stop();
        if (canvas.parentNode) canvas.remove();
        var at = layers.indexOf(this);
        if (at >= 0) layers.splice(at, 1);
      }
    };
  }
  var layers = [];
  var DmCanvas = {
    create: function(slide, video) {
      var layer = createLayer(slide, video);
      layers.push(layer);
      return layer;
    },
    stopAll: function() {
      layers.forEach(function(l) {
        try {
          l.stop();
        } catch (e) {
        }
      });
      layers = [];
    }
  };
  testHook("dmcanvas", function() {
    return DmCanvas;
  });

  // src/danmaku.js
  var DM_CACHE_MAX = 30;
  var cache = /* @__PURE__ */ new Map();
  var enabled = true;
  try {
    enabled = localStorage.getItem(CFG.lsDm) !== "0";
  } catch (e) {
  }
  function dmEnabled() {
    return enabled;
  }
  function setDmEnabled(on) {
    enabled = !!on;
    try {
      localStorage.setItem(CFG.lsDm, on ? "1" : "0");
    } catch (e) {
    }
  }
  function fetchList(videoId) {
    var hit = cache.get(videoId);
    if (hit) {
      cache.delete(videoId);
      cache.set(videoId, hit);
      return hit;
    }
    var p = AppAPI.danmakuList(videoId).then(null, function() {
      cache.delete(videoId);
      return [];
    });
    cache.set(videoId, p);
    if (cache.size > DM_CACHE_MAX) cache.delete(cache.keys().next().value);
    return p;
  }
  function onPlaying(slide, item, video) {
    if (!slide || !item || !item.cap || !item.cap.danmaku || !item.videoId) return;
    if (!slide._dmLayer) slide._dmLayer = DmCanvas.create(slide, video);
    var layer = slide._dmLayer;
    if (!enabled) {
      layer.stop();
      return;
    }
    layer.start();
    fetchList(item.videoId).then(function(list) {
      layer.setItems(list);
    });
  }
  function stopAll() {
    DmCanvas.stopAll();
  }
  function createDmBox(item, videoOf) {
    var box = el("div", "acsv-dmbox");
    var input = el("input", "acsv-dm-input");
    input.type = "text";
    input.maxLength = 100;
    input.placeholder = "发个弹幕呗，嗷嗷";
    var send = el("button", "acsv-dm-send", "发送");
    box.appendChild(input);
    box.appendChild(send);
    box.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    var sending = false;
    function doSend2() {
      var video = videoOf();
      var text = (input.value || "").trim();
      if (!text || !item.videoId || sending || !video) return;
      sending = true;
      var at = video.currentTime * 1e3 + 200;
      AppAPI.danmakuAdd(item, text, at).then(function(r) {
        sending = false;
        if (!r || !r.ok) {
          toast("弹幕发送失败" + (r && r.msg ? "：" + r.msg : "（未登录？）"));
          return;
        }
        toast("弹幕已发送");
        input.value = "";
        var slide = video.closest && video.closest(".acsv-slide");
        if (slide && slide._dmLayer) {
          slide._dmLayer.addLocal({ text, at, mode: 1, color: "#ffffff", size: 25 });
        }
      });
    }
    input.addEventListener("keydown", function(ev) {
      ev.stopPropagation();
      if (ev.key === "Enter") doSend2();
      else if (ev.key === "Escape") {
        ev.stopPropagation();
        input.blur();
      }
    });
    send.addEventListener("click", function(ev) {
      ev.stopPropagation();
      doSend2();
    });
    return box;
  }

  // src/report.js
  var watchSentAt = {};
  function reportLeave(session, video, via, sec, retryN) {
    var item = session && session.item;
    if (!item || !item.cap || !item.cap.watchReport || !item.videoId || !video) return;
    if (typeof sec !== "number") sec = Math.floor(video.currentTime || 0);
    if (sec < CFG.time.watchReportMin) return;
    var key = item.id + ":" + item.videoId;
    if (watchSentAt[key] === sec) return;
    try {
      var w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      var wl = w.weblog;
      if (!wl || !wl.impr || !wl.sendImmediately) {
        if (via !== "pagehide" && (retryN || 0) < 3) {
          setTimeout(function() {
            reportLeave(session, video, via, sec, (retryN || 0) + 1);
          }, 1e3);
        }
        return;
      }
      wl.sendImmediately("CLICK", {
        action: "CLIENT_BROWSE_HISTORY",
        params: {
          req_id: wl.impr.getCurrentReqID ? wl.impr.getCurrentReqID() : void 0,
          group_id: wl.impr.getCurrentGroupID ? wl.impr.getCurrentGroupID() : void 0,
          atom_id: String(item.videoId),
          ac_id: String(item.id),
          album_id: "0",
          resourceTypeCode: 2,
          // 官方 video 页配置固定值
          playedSeconds: sec,
          videoId: Number(item.videoId) || 0,
          reportIdName: Number(item.id) || 0,
          resourceType: "video",
          dougaId: Number(item.id) || 0
        }
      });
      watchSentAt[key] = sec;
      stat("report-watch");
    } catch (e) {
      stat("report-watch-err");
    }
  }
  function reportLeaveCurrent(via) {
    try {
      if (!scroller || FeedStore.current < 0) return;
      var s = slideAt(FeedStore.current);
      if (s && s._session) reportLeave(s._session, s._session.video, via);
    } catch (e) {
    }
  }
  window.addEventListener("pagehide", function() {
    reportLeaveCurrent("pagehide");
  });
  document.addEventListener("visibilitychange", function() {
    if (document.hidden) reportLeaveCurrent("hidden");
  });

  // src/prewarm.js
  var prewarmTimer = null;
  function prewarm(idx) {
    if (prewarmTimer) clearTimeout(prewarmTimer);
    prewarmTimer = setTimeout(function() {
      prewarmTimer = null;
      if (!scroller || FeedStore.current !== idx) return;
      for (var i = idx + 1; i <= idx + 2; i++) {
        (function(it) {
          if (!it || !it.cap.lazyResolve || it.urls.length || it._resolveP) return;
          stat("prewarm");
          ensureResolved(it).then(function(ok) {
            if (!ok || !it.urls.length) return;
            try {
              preconnect(new URL(it.urls[0]).origin);
            } catch (e) {
            }
          });
        })(FeedStore.items[i]);
      }
    }, 500);
  }
  var preconnectSeen = {};
  var preconnectLinks = [];
  function preconnect(origin) {
    if (!origin || preconnectSeen[origin]) return;
    preconnectSeen[origin] = 1;
    if (preconnectLinks.length >= 6) return;
    var link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    preconnectLinks.push(link);
    stat("preconnect");
  }
  var PRECONNECT_SEED = ["https://tx-safety-video.acfun.cn", "https://ali-safety-video.acfun.cn"];
  function preconnectSeed() {
    PRECONNECT_SEED.forEach(preconnect);
  }

  // src/playback.js
  var pb = {
    soundOn: false,
    // 当前是否出声（localStorage 恢复，mount 时 resetForMount 刷新）
    firstGestureSeen: false,
    // 是否已发生过用户手势（浏览器自动播放策略：首次交互才能出声）
    autoplayNext: false,
    // 连播开关（关闭=单条循环）
    playRate: 1,
    // 全局倍速
    seekHold: { active: false, timer: null, prevRate: 1 },
    // →键 长按 2x 快进状态
    soundHintShown: false,
    // 静音提示只弹一次
    soundHintDismissed: false
  };
  function resetForMount() {
    pb.firstGestureSeen = false;
    pb.soundHintShown = false;
    try {
      pb.soundOn = localStorage.getItem(CFG.lsSound) === "1";
    } catch (e) {
      pb.soundOn = false;
    }
  }
  function cancelSeekHold() {
    if (pb.seekHold.timer) {
      clearTimeout(pb.seekHold.timer);
      pb.seekHold.timer = null;
    }
    if (pb.seekHold.active) {
      pb.seekHold.active = false;
      pb.playRate = pb.seekHold.prevRate;
    }
  }
  function currentVideo() {
    var tf = videoTarget();
    if (tf) return tf();
    var s = slideAt(FeedStore.current);
    return s && s.querySelector("video");
  }
  function offCurrent(s) {
    return !s || Number(s.dataset.idx) !== FeedStore.current;
  }
  function sweepVideos() {
    if (!scroller) return;
    Array.prototype.forEach.call(scroller.querySelectorAll("video"), function(v) {
      if (offCurrent(v.closest(".acsv-slide")) && !v.paused) v.pause();
    });
  }
  function playVideo(video) {
    var ps = video.closest && video.closest(".acsv-slide");
    if (ps) ps._userPaused = false;
    var p = video.play();
    if (p && p.catch) {
      p.catch(function() {
        var slide = video.closest(".acsv-slide");
        if (slide) slide.dataset.paused = "1";
      });
    }
  }
  function enableSound(video) {
    try {
      localStorage.setItem(CFG.lsSound, "1");
    } catch (e) {
    }
    pb.soundOn = true;
    if (video) {
      video.muted = false;
      video.volume = 1;
      playVideo(video);
    }
    refreshMuteIcons();
  }
  function toggleSound(video) {
    if (pb.soundOn) {
      pb.soundOn = false;
      try {
        localStorage.setItem(CFG.lsSound, "");
      } catch (e) {
      }
      if (video) video.muted = true;
    } else {
      enableSound(video);
    }
    refreshMuteIcons();
  }
  function togglePlayGesture(video) {
    if (!video) return;
    if (!pb.firstGestureSeen && !pb.soundOn) {
      pb.firstGestureSeen = true;
      enableSound(video);
      hideSoundHint();
      return;
    }
    pb.firstGestureSeen = true;
    if (video.paused) playVideo(video);
    else {
      video.pause();
      var ps = video.closest(".acsv-slide");
      if (ps) ps._userPaused = true;
      sweepVideos();
    }
  }
  function toggleMuteGesture(video) {
    pb.firstGestureSeen = true;
    toggleSound(video);
    if (video && pb.soundOn) playVideo(video);
    hideSoundHint();
  }
  function hideSoundHint() {
    var h = root && root.querySelector(".acsv-hint");
    if (h) h.classList.add("hide");
  }
  var soundHintEl = null;
  function showSoundHint(slide) {
    hideSoundHint();
    if (pb.soundHintShown || pb.soundHintDismissed || pb.soundOn || pb.firstGestureSeen) return;
    pb.soundHintShown = true;
    soundHintEl = el("div", "acsv-hint");
    soundHintEl.appendChild(el("span", null, "🔇 当前处于静音"));
    var btn = el("button", "acsv-hint-btn", "开启声音");
    btn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      pb.firstGestureSeen = true;
      var v = slide.querySelector("video");
      enableSound(v);
      if (v && pb.soundOn) playVideo(v);
      hideSoundHint();
    });
    var x = el("button", "acsv-hint-x", "✕");
    x.addEventListener("click", function(ev) {
      ev.stopPropagation();
      pb.soundHintDismissed = true;
      hideSoundHint();
    });
    soundHintEl.appendChild(btn);
    soundHintEl.appendChild(x);
    soundHintEl.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    slide.appendChild(soundHintEl);
  }
  function refreshMuteIcons() {
    if (!root) return;
    var bs = root.querySelectorAll(".acsv-cmute");
    Array.prototype.forEach.call(bs, function(b) {
      b.innerHTML = pb.soundOn ? ICONS.volOn : ICONS.volOff;
    });
  }

  // src/hls.js
  var loading = null;
  function nativeHls(video) {
    try {
      return !!video.canPlayType("application/vnd.apple.mpegurl");
    } catch (e) {
      return false;
    }
  }
  function ensureHls() {
    if (window.Hls && window.Hls.isSupported) return Promise.resolve(window.Hls);
    if (loading) return loading;
    loading = new Promise(function(resolve, reject) {
      var urls = CFG.api.hlsCdns;
      var i = 0;
      function ok() {
        if (window.Hls && window.Hls.isSupported) {
          set("hls.cdnIdx", i - 1);
          resolve(window.Hls);
        } else reject(new Error("hls-load-failed"));
      }
      function next() {
        if (i >= urls.length) return reject(new Error("hls-network"));
        var url = urls[i++];
        if (typeof GM_xmlhttpRequest === "function") {
          GM_xmlhttpRequest({
            method: "GET",
            url,
            timeout: CFG.time.gm,
            onload: function(r) {
              try {
                new Function(r.responseText)();
                ok();
              } catch (e) {
                next();
              }
            },
            onerror: next,
            ontimeout: next
          });
        } else {
          var s = document.createElement("script");
          s.src = url;
          s.onload = ok;
          s.onerror = next;
          (document.head || document.documentElement).appendChild(s);
        }
      }
      next();
    }).catch(function(e) {
      loading = null;
      throw e;
    });
    return loading;
  }

  // src/session.js
  function createSession(slide, item, idx, hooks3) {
    var S = {
      state: "idle",
      slide,
      item,
      idx,
      video: null,
      hooks: hooks3,
      monitor: null,
      // HealthMonitor（见文末）：FROZEN/DEGRADED 检测与恢复阶梯
      _hls: null,
      resumeAt: 0,
      // 重挂前的播放进度，playing 后 seek 回去（attachVideo 从槽位转入）
      _recovering: false,
      // 恢复链重入锁：video error 与 hls fatal 可能接连触发
      _waitTimer: null,
      setState: function(s) {
        if (this.state === s) return;
        this.state = s;
        if (s === "loading") slide.dataset.state = "loading";
        else if (s === "ready") {
          clearTimeout(this._waitTimer);
          slide.dataset.state = "ready";
          slide.dataset.paused = "0";
        } else if (s === "error") slide.dataset.state = "error";
        if (hooks3.onState) hooks3.onState(this, s);
      },
      start: function() {
        var self = this;
        this.setState("loading");
        if (item.cap.lazyResolve && !item.urls.length) {
          this.setState("resolving");
          ensureResolved(item).then(function(ok) {
            if (self.state === "disposed") return;
            if (ok && slide.isConnected) {
              if (hooks3.onResolved) hooks3.onResolved(self);
              self._attach();
            } else {
              self.setState("error");
            }
          });
          return;
        }
        if (item.cap.lazyResolve && hooks3.onResolved) hooks3.onResolved(this);
        this._attach();
      },
      _attach: function() {
        sweepSlideVideos(slide);
        var video = document.createElement("video");
        video.className = "acsv-video";
        hooks3.initVideo(video);
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.preload = "auto";
        this.video = video;
        this._wire(video);
        slide.insertBefore(video, slide.querySelector(".acsv-side"));
        this._attachSource(video);
        video.load();
        this.monitor = CFG.exp.noMonitor ? null : installHealthMonitor(this);
        if (this.idx === hooks3.currentIdx() && !slide._userPaused) hooks3.onAttachPlay(this, video);
      },
      // 按内容源挂播放源：sv=mp4 直链；home=m3u8（Safari 原生，其余走 hls.js）
      _attachSource: function(video) {
        var self = this;
        var item2 = this.item;
        this._destroyHls();
        var url = item2.urls[item2.urlIdx];
        if (!item2.cap.hls) {
          video.src = url;
          stat("attach.direct");
          return;
        }
        var noMse = !window.MediaSource && !window.WebKitMediaSource;
        if (nativeHls(video) && (noMse || CFG.exp.native)) {
          video.src = url;
          stat("attach.native");
          return;
        }
        ensureHls().then(function(Hls) {
          if (self.state === "disposed") return;
          if (!slide.isConnected || slide.querySelector("video") !== video) return;
          if (!Hls || !Hls.isSupported()) {
            video.src = url;
            stat("attach.unsupported");
            return;
          }
          self._destroyHls();
          var hls = new Hls(bufConfig());
          self._hls = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          stat("attach.hls");
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            if (self.state === "disposed") return;
            var q2 = item2.qualities && item2.qualities[item2.qIdx];
            if (q2) set("hls.levelCodec", q2.codec + (q2.fps ? "/" + q2.fps : ""));
            if (hls.levels && hls.levels.length > 1) {
              hls.currentLevel = hls.levels.length - 1;
              var top = hls.levels[hls.levels.length - 1];
              set("hls.levelCodec", top.attrs && top.attrs.CODECS || top.videoCodec || "multi?");
            }
          });
          hls.on(Hls.Events.ERROR, function(_, data) {
            if (data && data.fatal) self.recover();
          });
        }, function() {
          stat("attach.cdnFail");
          if (self.state !== "disposed") video.src = url;
        });
      },
      _destroyHls: function() {
        if (this._hls) {
          try {
            this._hls.destroy();
          } catch (e) {
          }
          this._hls = null;
        }
      },
      // 错误恢复统一链（video error 与 hls fatal 共用）：
      // 同档备用 CDN → 重跑解析（sv 重取详情 / home 重解析）→ error 态
      recover: function() {
        var self = this;
        var video = this.video;
        var item2 = this.item;
        if (!slide.isConnected || !video || !video.isConnected) return;
        if (this._recovering) return;
        if (document.hidden) {
          this._recoverPending = true;
          stat("recover.deferred");
          return;
        }
        this._recovering = true;
        this.state = "recovering";
        if (video.currentTime > 1) this.resumeAt = video.currentTime;
        if (item2.urlIdx < item2.urls.length - 1) {
          stat("recover.cdn");
          item2.urlIdx++;
          this._attachSource(video);
          video.load();
          if (self.idx === hooks3.currentIdx() && !self.slide._userPaused) hooks3.play(video);
          return;
        }
        if (!item2.refreshed) {
          stat("recover.resolve");
          item2.refreshed = true;
          if (item2.cap.lazyResolve) item2.urls = [];
          hooks3.refreshItem(item2).then(function(ok) {
            if (self.state === "disposed") return;
            if (ok && item2.urls.length) {
              item2.urlIdx = 0;
              self._attachSource(video);
              video.load();
              if (self.idx === hooks3.currentIdx() && !self.slide._userPaused) hooks3.play(video);
            } else {
              self.setState("error");
            }
          });
          return;
        }
        stat("recover.error");
        this.setState("error");
      },
      _wire: function(video) {
        var self = this;
        this._onVis = function() {
          if (self.state === "disposed" || document.hidden || !self._recoverPending) return;
          self._recoverPending = false;
          var v = self.video;
          if (!v || !v.isConnected) return;
          var t0 = v.currentTime;
          setTimeout(function() {
            if (self.state === "disposed" || self.video !== v || !v.isConnected) return;
            var stuck = !v.paused && !v.seeking && !v.ended && v.readyState >= 3 && v.currentTime <= t0;
            if (v.error || stuck) self.recover();
          }, 1500);
        };
        document.addEventListener("visibilitychange", this._onVis);
        video.addEventListener("playing", function() {
          if (self.state === "disposed") return;
          clearTimeout(self._waitTimer);
          self._recovering = false;
          slide.dataset.paused = "0";
          self.setState("ready");
          if (self.resumeAt) {
            try {
              video.currentTime = self.resumeAt;
            } catch (e) {
            }
            self.resumeAt = 0;
          }
          if (hooks3.onPlaying) hooks3.onPlaying(self, video);
        });
        video.addEventListener("pause", function() {
          if (self.state === "disposed") return;
          slide.dataset.paused = "1";
          if (hooks3.onPause) hooks3.onPause(self, video);
        });
        video.addEventListener("waiting", function() {
          clearTimeout(self._waitTimer);
          self._waitTimer = setTimeout(function() {
            if (self.state === "disposed") return;
            self.state = "buffering";
            slide.dataset.state = "loading";
          }, 300);
        });
        video.addEventListener("seeked", function() {
          if (self.state === "disposed" || self.state === "error") return;
          if (!video.paused && video.readyState >= 2) self.setState("ready");
        });
        video.addEventListener("loadedmetadata", function() {
          if (hooks3.onMeta) hooks3.onMeta(self, video);
        });
        video.addEventListener("timeupdate", function() {
          if (!video.isConnected) return;
          if (hooks3.onTime) hooks3.onTime(self, video);
        });
        video.addEventListener("ended", function() {
          if (self.state === "disposed") return;
          if (hooks3.onEnded) hooks3.onEnded(self);
        });
        video.addEventListener("error", function() {
          if (self.state === "disposed") return;
          self.recover();
        });
      },
      dispose: function() {
        if (this.state === "disposed") return;
        this.state = "disposed";
        if (this._waitTimer) {
          clearTimeout(this._waitTimer);
          this._waitTimer = null;
        }
        if (this._onVis) {
          document.removeEventListener("visibilitychange", this._onVis);
          this._onVis = null;
        }
        this._destroyHls();
        if (this.monitor) {
          this.monitor.stop();
          this.monitor = null;
        }
        if (slide._dmLayer) {
          slide._dmLayer.destroy();
          slide._dmLayer = null;
        }
        var video = this.video;
        if (video) {
          video.pause();
          video.removeAttribute("src");
          video.load();
          video.remove();
          this.video = null;
        }
        stat("session.dispose");
        if (hooks3.onDisposed) hooks3.onDisposed(this, video);
      }
    };
    return S;
  }
  function bufConfig() {
    var key = null;
    try {
      key = localStorage.getItem(CFG.lsBuf);
    } catch (e) {
    }
    var p = key && CFG.buf.presets[key] || CFG.buf.presets[CFG.buf.def];
    if (CFG.exp.smallBuf) p = CFG.buf.presets.std;
    return {
      enableWorker: !CFG.exp.noWorker,
      // exp.noWorker（仅 debug）：关转封装 worker，归因实验用
      startFragPrefetch: true,
      // attach 阶段预取首片
      nudgeMaxRetry: 10,
      // 内部推帧重试次数提高
      maxBufferLength: p.maxBufferLength,
      // 前向缓冲秒数：网络抖动/瞬时卡顿不易饿死
      maxMaxBufferLength: p.maxMaxBufferLength,
      maxBufferSize: p.maxBufferSize,
      // 缓冲内存上限（字节）
      backBufferLength: p.backBufferLength
      // 回看缓冲回收，压内存
    };
  }
  function installHealthMonitor(S) {
    var slide = S.slide, video = S.video, item = S.item;
    if (!video.requestVideoFrameCallback) return null;
    var st = {
      mediaT: -1,
      frames: -1,
      wall: 0,
      gapSec: 0.2,
      arrival: 0,
      probes: 0,
      dropped: null,
      totalFrames: null,
      ema: 0,
      samples: 0,
      degSince: 0,
      lastFix: 0,
      lastEvent: Date.now(),
      lastTF: null,
      protectUntil: 0,
      returnAt: 0,
      lastRebuffer: 0,
      stopped: false
    };
    var armTimer = null;
    function srcFps() {
      var q2 = item.qualities && item.qualities[item.qIdx];
      return q2 && q2.fps || 30;
    }
    function disarm() {
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
    }
    function armTimeout() {
      if (st.stopped || armTimer) return;
      st.gapSec = Math.max(
        CFG.stall.minGapMs,
        CFG.stall.gapFactor * 1e3 / srcFps(),
        st.arrival * CFG.stall.arriveFactor
      ) / 1e3;
      armTimer = setTimeout(onGap, st.gapSec * 1e3);
    }
    function arm() {
      if (st.stopped || armTimer) return;
      if (document.hidden || video.paused || video.seeking || video.ended || video.readyState < 2) return;
      armTimeout();
    }
    function dead() {
      return st.stopped || S.state === "disposed" || !slide.isConnected || !video.isConnected;
    }
    function stop() {
      st.stopped = true;
      disarm();
      if (st.keepIv) {
        clearInterval(st.keepIv);
        st.keepIv = null;
      }
      video.removeEventListener("playing", arm);
      video.removeEventListener("seeked", arm);
      document.removeEventListener("visibilitychange", visHandler);
    }
    st.keepIv = setInterval(function() {
      if (dead()) {
        stop();
        return;
      }
      arm();
    }, 1e3);
    function onGap() {
      armTimer = null;
      if (dead()) {
        stop();
        return;
      }
      if (document.hidden || video.paused || video.seeking || video.ended || video.readyState < 2) return;
      var adv = st.mediaT >= 0 ? video.currentTime - st.mediaT : -1;
      if (adv < st.gapSec * 0.3) {
        var now = Date.now();
        if (adv >= 0 && now - st.lastRebuffer > 5e3) {
          stat("stall.rebuffer");
          st.lastRebuffer = now;
        }
        st.mediaT = video.currentTime;
        st.probes = 0;
        if (armTimer) clearTimeout(armTimer);
        armTimer = setTimeout(onGap, 1e3);
        return;
      }
      st.probes = (st.probes || 0) + 1;
      if (st.probes < 2) {
        st.mediaT = video.currentTime;
        armTimeout();
        return;
      }
      if (Date.now() < st.protectUntil) {
        st.probes = 0;
        st.mediaT = video.currentTime;
        armTimer = setTimeout(onGap, 1e3);
        return;
      }
      st.probes = 0;
      var detectMs = st.wall ? Date.now() - st.wall : -1;
      recover(detectMs);
    }
    function recover(detectMs) {
      var now = Date.now();
      if (now - st.lastFix < CFG.stall.fixGap) {
        armTimeout();
        return;
      }
      st.lastFix = now;
      st.lastEvent = now;
      st.mediaT = -1;
      st.degSince = 0;
      S.state = "recovering";
      stat("stall.frozen");
      if (detectMs < 0) stat("stall.novfc");
      else stat(detectMs < 800 ? "stall.detectLt800" : "stall.detectSlow");
      var fixCap = item.cap.quality ? CFG.stall.cap : CFG.stall.svCap;
      if (item._freezeTries >= fixCap) {
        if (!item._freezeGaveUp) {
          item._freezeGaveUp = true;
          toast("视频持续卡顿，已停止自动恢复");
          stat("stall.giveup");
        }
        armTimeout();
        return;
      }
      item._freezeTries = (item._freezeTries || 0) + 1;
      var tfNow = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality().totalVideoFrames : -1;
      if (item._freezeTries === 1) {
        try {
          video.currentTime = Math.min(video.duration || 1e9, video.currentTime + CFG.stall.nudge);
        } catch (e) {
        }
        if (tfNow >= 0) st.lastTF = tfNow;
        armTimeout();
        return;
      }
      if (item._freezeTries === 2 && S._hls && S._hls.recoverMediaError) {
        try {
          S._hls.recoverMediaError();
        } catch (e) {
        }
        if (tfNow >= 0) st.lastTF = tfNow;
        armTimeout();
        return;
      }
      if (item._freezeTries >= 2 && tfNow >= 0 && st.lastTF != null && tfNow - st.lastTF > srcFps() * 2) {
        stat("stall.phantom");
        item._freezeTries = 0;
        st.lastTF = tfNow;
        st.lastFix = now;
        st.lastEvent = now;
        armTimeout();
        return;
      }
      if (tfNow >= 0) st.lastTF = tfNow;
      if (dropFpsRung("播放卡顿，已切换到 ", "stall.rung3")) return;
      if (canAutoQ()) {
        toast("播放卡顿，已自动切换到 " + item.qualities[item.qIdx + 1].label);
        stat("stall.rung4");
        S.hooks.qualitySwitch(S, item.qIdx + 1);
        return;
      }
      if (S._hls && S._hls.recoverMediaError && item._freezeTries % 2 === 0) {
        stat("stall.tailRme");
        try {
          S._hls.recoverMediaError();
        } catch (e) {
        }
        armTimeout();
        return;
      }
      stat("stall.tailReattach");
      S.slide._resumeAt = video.currentTime;
      S.hooks.reattach(S);
    }
    function canAutoQ() {
      return !item._qManual && item.cap.quality && item.qualities && item.qualities.length > 1 && item.qIdx < item.qualities.length - 1;
    }
    function dropFpsRung(toastHead, statKey) {
      if (!(canAutoQ() && /60(·|$)/.test(item.qualities[item.qIdx].label))) return false;
      var curLabel = item.qualities[item.qIdx].label;
      for (var q2 = item.qIdx + 1; q2 < item.qualities.length; q2++) {
        if (item.qualities[q2].label === curLabel.replace(/60(?=·|$)/, "")) {
          toast(toastHead + item.qualities[q2].label + "（同分辨率降帧率）");
          stat(statKey);
          S.hooks.qualitySwitch(S, q2);
          return true;
        }
      }
      return false;
    }
    function onDegraded() {
      if (Date.now() < st.protectUntil) return;
      stat("stall.degraded");
      var now = Date.now();
      if (now - st.lastFix < CFG.stall.fixGap) return;
      st.lastFix = now;
      st.lastEvent = now;
      st.degSince = 0;
      S.state = "recovering";
      if (dropFpsRung("持续掉帧，已降为 ", "stall.degradeDown")) return;
      if (!item._qManual) toast("画面持续掉帧，可尝试在清晰度菜单降低档位");
    }
    function onFrame(now, meta) {
      if (dead()) {
        stop();
        return;
      }
      video.requestVideoFrameCallback(onFrame);
      var m2 = meta;
      if (false) return;
      if (false) {
        if (++slowSkip & 3) return;
        slowFrames++;
        m2 = { presentedFrames: slowFrames, mediaTime: meta.mediaTime };
      }
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
      st.probes = 0;
      var wall = Date.now();
      if (st.returnAt) {
        set("vis.framesBackMs", wall - st.returnAt);
        st.returnAt = 0;
      }
      if (st.wall) {
        var dArr = wall - st.wall;
        if (dArr > 0 && dArr < 2e3) st.arrival = st.arrival ? st.arrival * 0.7 + dArr * 0.3 : dArr;
        var inst = (m2.presentedFrames - st.frames) * 1e3 / Math.max(1, wall - st.wall);
        if (isFinite(inst) && inst > 0 && inst <= 240) {
          st.ema = st.samples ? st.ema * (1 - CFG.stall.fpsEmaA) + inst * CFG.stall.fpsEmaA : inst;
          st.samples++;
        }
        var dropRatio = 0;
        if (video.getVideoPlaybackQuality) {
          var qv = video.getVideoPlaybackQuality();
          if (st.totalFrames != null) {
            var df = qv.droppedVideoFrames - st.dropped, tf = qv.totalVideoFrames - st.totalFrames;
            if (tf > 0) dropRatio = Math.max(0, df) / tf;
          }
          st.dropped = qv.droppedVideoFrames;
          st.totalFrames = qv.totalVideoFrames;
        }
        if (!video.paused && !video.seeking && st.samples >= 8) {
          var slowNow = st.ema < srcFps() * CFG.stall.degFpsRatio || dropRatio > CFG.stall.degDropRatio;
          if (slowNow) {
            if (!st.degSince) st.degSince = wall;
            else if (wall - st.degSince >= CFG.stall.degWindowMs) onDegraded();
          } else st.degSince = 0;
        }
        if (item._freezeTries > 0 && wall - st.lastEvent >= CFG.stall.healthyMs) {
          item._freezeTries--;
          stat("stall.decay");
          st.lastEvent = wall;
        }
      }
      st.frames = m2.presentedFrames;
      st.mediaT = m2.mediaTime;
      st.wall = wall;
      armTimeout();
    }
    var visHandler = function() {
      if (dead()) {
        stop();
        return;
      }
      if (document.hidden) {
        disarm();
        return;
      }
      st.mediaT = -1;
      st.samples = 0;
      st.ema = 0;
      st.degSince = 0;
      st.dropped = null;
      st.totalFrames = null;
      st.protectUntil = Date.now() + CFG.stall.visGraceMs;
      st.returnAt = Date.now();
      stat("vis.return");
      item._freezeTries = 0;
      item._freezeGaveUp = false;
      disarm();
      arm();
    };
    document.addEventListener("visibilitychange", visHandler);
    video.addEventListener("playing", arm);
    video.addEventListener("seeked", arm);
    video.requestVideoFrameCallback(onFrame);
    arm();
    return { stop };
  }
  var stallSim = "off";
  var slowFrames = 0;
  var slowSkip = 0;
  testHook("setStallSim", function(m) {
    stallSim = m || "off";
    slowFrames = 0;
    slowSkip = 0;
  });

  // src/attach.js
  var HOOKS = null;
  function setSessionHooks(h) {
    HOOKS = h;
  }
  function switchQuality(item, slide, qIdx, manual) {
    var video = slide.querySelector("video");
    if (!video || !item.qualities || !item.qualities[qIdx]) {
      if (!video && item.qualities) toast("视频还没就绪，稍候再试");
      return;
    }
    var t = video.currentTime || 0;
    item.qIdx = qIdx;
    item.urls = item.qualities[qIdx].urls;
    item.urlIdx = 0;
    item.refreshed = false;
    if (manual) item._freezeTries = 0;
    if (manual) item._qManual = true;
    if (manual) {
      try {
        localStorage.setItem(CFG.lsQuality, item.qualities[qIdx].label);
      } catch (e) {
      }
    }
    slide._resumeAt = t;
    if (slide._qBtn) slide._qBtn.textContent = item.qualities[qIdx].label;
    attachVideo(slide, item, Number(slide.dataset.idx));
    toast("清晰度：" + item.qualities[qIdx].label);
    if (manual) syncFwdQuality(slide);
  }
  function syncFwdQuality(slide) {
    try {
      if (slide.dataset.ovl === "1") return;
      var idx = Number(slide.dataset.idx);
      for (var k = 1; k <= 2; k++) reapplyQuality(FeedStore.items[idx + k]);
      var fwd = slideAt(idx + 1);
      var it = fwd && FeedStore.items[idx + 1];
      if (!fwd || !it || !it.qualities || !fwd._session) return;
      var fv = fwd.querySelector("video");
      if (fv && fv.currentTime > 1) fwd._resumeAt = fv.currentTime;
      fwd._session.dispose();
      fwd._session = null;
      attachVideo(fwd, it, idx + 1);
    } catch (e) {
    }
  }
  function attachVideo(slide, item, idx) {
    if (slide._session) {
      slide._session.dispose();
      slide._session = null;
    }
    sweepSlideVideos(slide);
    var session = createSession(slide, item, idx, HOOKS);
    slide._session = session;
    session.resumeAt = slide._resumeAt || 0;
    slide._resumeAt = 0;
    session.start();
  }

  // src/controls.js
  function showControls(slide) {
    if (slide.dataset.ctl !== "1") slide.dataset.ctl = "1";
    clearTimeout(slide._ctlTimer);
    slide._ctlTimer = setTimeout(function() {
      var v = slide.querySelector("video");
      if (v && !v.paused) slide.dataset.ctl = "";
    }, CFG.time.ctlIdle);
  }
  function buildControls(slide, idx, item) {
    var box = el("div", "acsv-controls");
    var track = el("div", "acsv-track");
    var fill = el("div", "acsv-track-fill");
    var handle = el("div", "acsv-track-handle");
    var bubble = el("div", "acsv-bubble");
    track.appendChild(fill);
    track.appendChild(handle);
    track.appendChild(bubble);
    var dragging = false;
    function videoOf() {
      return slide.querySelector("video");
    }
    function ratioAt(ev) {
      var r = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    }
    function preview(ratio, live) {
      if (live) {
        fill.style.width = ratio * 100 + "%";
        handle.style.left = ratio * 100 + "%";
      }
      var v = videoOf();
      if (v && v.duration) bubble.textContent = fmtTime(ratio * v.duration);
      bubble.style.left = ratio * 100 + "%";
      bubble.classList.add("show");
    }
    track.addEventListener("pointerdown", function(ev) {
      dragging = true;
      track.dataset.drag = "1";
      try {
        track.setPointerCapture(ev.pointerId);
      } catch (e) {
      }
      preview(ratioAt(ev), true);
      ev.preventDefault();
    });
    track.addEventListener("pointermove", function(ev) {
      preview(ratioAt(ev), dragging);
    });
    track.addEventListener("pointerleave", function() {
      if (!dragging) bubble.classList.remove("show");
    });
    track.addEventListener("pointerup", function(ev) {
      if (!dragging) return;
      dragging = false;
      track.dataset.drag = "";
      var v = videoOf();
      var ratio = ratioAt(ev);
      if (v && v.duration) v.currentTime = ratio * v.duration;
      bubble.classList.remove("show");
      showControls(slide);
    });
    track.addEventListener("pointercancel", function() {
      dragging = false;
      track.dataset.drag = "";
      bubble.classList.remove("show");
    });
    var row = el("div", "acsv-ctl-row");
    var playBtn = elHtml("button", "acsv-cbtn acsv-cplay", ICONS.pause);
    playBtn.title = "播放/暂停（空格）";
    playBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      togglePlayGesture(videoOf());
    });
    var timeLabel = el("span", "acsv-time", "00:00 / 00:00");
    var spacer = el("span");
    spacer.style.flex = "1";
    var autoBtn = elHtml("button", "acsv-cbtn acsv-cauto", '<span class="acsv-dot"></span>连播');
    autoBtn.title = "播完自动播放下一条（关闭则单条循环）";
    autoBtn.classList.toggle("on", pb.autoplayNext);
    autoBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      pb.autoplayNext = !pb.autoplayNext;
      autoBtn.classList.toggle("on", pb.autoplayNext);
      if (scroller) {
        var vs = scroller.querySelectorAll("video");
        Array.prototype.forEach.call(vs, function(v) {
          v.loop = !pb.autoplayNext;
        });
      }
      toast(pb.autoplayNext ? "连播已开启：播完自动下一条" : "连播已关闭：单条循环播放");
    });
    var rateWrap = buildMenu(
      function() {
        return "倍速 " + pb.playRate.toFixed(1) + "x";
      },
      function() {
        return CFG.rate.map(function(r) {
          return { t: r.toFixed(1) + "x", on: r === pb.playRate };
        });
      },
      function(i) {
        pb.playRate = CFG.rate[i];
        if (scroller) {
          var vs = scroller.querySelectorAll("video");
          Array.prototype.forEach.call(vs, function(v) {
            v.playbackRate = pb.playRate;
          });
        }
        toast("播放速度：" + pb.playRate + "x");
      },
      "切换播放速度"
    );
    var muteBtn = elHtml("button", "acsv-cbtn acsv-cmute", pb.soundOn ? ICONS.volOn : ICONS.volOff);
    muteBtn.title = "静音开关（M）";
    muteBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      toggleMuteGesture(videoOf());
    });
    var fsBtn = elHtml("button", "acsv-cbtn acsv-cfs", ICONS.fs);
    fsBtn.title = "全屏（F）";
    fsBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      toggleFullscreen();
    });
    function rebuildFwdNeighbor(slide2, dropCache) {
      try {
        if (slide2.dataset.ovl === "1") return;
        var idx2 = Number(slide2.dataset.idx);
        if (dropCache) {
          var it2 = FeedStore.items[idx2 + 2];
          if (it2 && it2.cap && it2.cap.hls) {
            it2.urls = [];
            it2.qualities = null;
            it2.refreshed = false;
          }
        }
        var fwd = slideAt(idx2 + 1);
        var it = fwd && FeedStore.items[idx2 + 1];
        if (!fwd || !it || !fwd._session || !it.cap || !it.cap.hls) return;
        if (dropCache) {
          it.urls = [];
          it.qualities = null;
          it.refreshed = false;
        }
        fwd._session.dispose();
        fwd._session = null;
        attachVideo(fwd, it, idx2 + 1);
      } catch (e) {
      }
    }
    var dmBtn = null, dmBox = null, qWrap = null, qBtn = null, qMenu = null, codecWrap = null, bufWrap = null;
    if (item && item.cap.danmaku) {
      dmBtn = el("button", "acsv-cbtn acsv-cdm" + (dmEnabled() ? " on" : ""), "弹");
      dmBtn.title = "弹幕开关";
      dmBtn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        setDmEnabled(!dmEnabled());
        dmBtn.classList.toggle("on", dmEnabled());
        var v = videoOf();
        var sl = v && v.closest(".acsv-slide");
        if (dmEnabled() && sl) onPlaying(sl, item, v);
        else if (sl && sl._dmLayer) sl._dmLayer.stop();
        toast(dmEnabled() ? "弹幕已开启" : "弹幕已关闭");
      });
      dmBox = createDmBox(item, videoOf);
    }
    if (item && item.cap.quality) {
      qWrap = el("span", "acsv-qwrap");
      qBtn = el("button", "acsv-cbtn acsv-cq", item.qualities ? item.qualities[item.qIdx].label : "自动");
      qBtn.title = "清晰度";
      qMenu = el("div", "acsv-qmenu");
      qBtn.addEventListener("click", function(ev) {
        ev.stopPropagation();
        if (!item.qualities) {
          toast("清晰度列表还没拿到，稍等");
          return;
        }
        if (qMenu.parentNode === qWrap) {
          qMenu.remove();
          return;
        }
        qMenu.innerHTML = "";
        item.qualities.forEach(function(q2, i) {
          var qi = el("button", "acsv-qitem" + (i === item.qIdx ? " on" : ""), q2.label);
          qi.addEventListener("click", function(ev2) {
            ev2.stopPropagation();
            qMenu.remove();
            if (i !== item.qIdx) switchQuality(item, slide, i, true);
          });
          qMenu.appendChild(qi);
        });
        qWrap.appendChild(qMenu);
      });
      slide._qBtn = qBtn;
      qWrap.appendChild(qBtn);
    }
    if (item && item.cap.hls) {
      codecWrap = buildMenu("编码", function() {
        var cur = codecPref();
        return [
          { t: "自动", on: cur === "auto" },
          { t: "H.264", on: cur === "avc" },
          { t: "HEVC", on: cur === "hevc" }
        ];
      }, function(i) {
        var keys = ["auto", "avc", "hevc"];
        try {
          localStorage.setItem(CFG.lsCodec, keys[i]);
        } catch (e) {
        }
        toast("编码偏好：" + ["自动", "H.264", "HEVC"][i]);
        var v = slide.querySelector("video");
        if (v && v.currentTime > 1) slide._resumeAt = v.currentTime;
        item.urls = [];
        item.qualities = null;
        item.refreshed = false;
        attachVideo(slide, item, Number(slide.dataset.idx));
        rebuildFwdNeighbor(slide, true);
      });
      bufWrap = buildMenu("缓冲", function() {
        var key = null;
        try {
          key = localStorage.getItem(CFG.lsBuf);
        } catch (e) {
        }
        if (!CFG.buf.presets[key]) key = CFG.buf.def;
        return Object.keys(CFG.buf.presets).map(function(k) {
          var p = CFG.buf.presets[k];
          return { t: p.label + " " + p.maxBufferLength + "s", on: k === key };
        });
      }, function(i) {
        var k = Object.keys(CFG.buf.presets)[i];
        var p = CFG.buf.presets[k];
        try {
          localStorage.setItem(CFG.lsBuf, k);
        } catch (e) {
        }
        toast("缓冲：" + p.label + "（前向 " + p.maxBufferLength + "s）");
        var v = slide.querySelector("video");
        if (v && v.currentTime > 1) slide._resumeAt = v.currentTime;
        attachVideo(slide, item, Number(slide.dataset.idx));
        rebuildFwdNeighbor(slide, false);
      });
    }
    row.appendChild(playBtn);
    row.appendChild(timeLabel);
    row.appendChild(spacer);
    if (dmBtn) row.appendChild(dmBtn);
    if (dmBox) row.appendChild(dmBox);
    if (qWrap) row.appendChild(qWrap);
    if (codecWrap) row.appendChild(codecWrap);
    if (bufWrap) row.appendChild(bufWrap);
    row.appendChild(autoBtn);
    row.appendChild(rateWrap);
    row.appendChild(muteBtn);
    row.appendChild(fsBtn);
    box.appendChild(track);
    box.appendChild(row);
    box.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    box.addEventListener("mousemove", function() {
      showControls(slide);
    });
    slide._ctlTime = timeLabel;
    slide._ctlPlayBtn = playBtn;
    slide._ctlFill = fill;
    slide._ctlHandle = handle;
    slide._ctlTrack = track;
    return box;
  }
  function updateArrows(slide) {
    if (!root) return;
    var ups = slide ? slide.querySelectorAll(".acsv-arrow-up") : root.querySelectorAll(".acsv-arrow-up");
    Array.prototype.forEach.call(ups, function(up) {
      up.style.display = FeedStore.current <= 0 ? "none" : "grid";
      up.disabled = FeedStore.current <= 0;
    });
  }
  function codecPref() {
    var v = null;
    try {
      v = localStorage.getItem(CFG.lsCodec);
    } catch (e) {
    }
    if (v !== "auto" && v !== "hevc") v = CFG.codec.def;
    return v;
  }
  function buildMenu(title, getEntries, onPick, tip) {
    var wrap = el("span", "acsv-qwrap");
    var btn = el("button", "acsv-cbtn acsv-cq");
    var labelText = function() {
      return typeof title === "function" ? title() : title;
    };
    btn.textContent = labelText();
    btn.title = tip || (typeof title === "function" ? "" : title);
    var menu = el("div", "acsv-qmenu");
    btn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (menu.parentNode === wrap) {
        menu.remove();
        return;
      }
      btn.textContent = labelText();
      menu.innerHTML = "";
      getEntries().forEach(function(en, i) {
        var it = el("button", "acsv-qitem" + (en.on ? " on" : ""), en.t);
        it.addEventListener("click", function(ev2) {
          ev2.stopPropagation();
          menu.remove();
          onPick(i);
          btn.textContent = labelText();
        });
        menu.appendChild(it);
      });
      wrap.appendChild(menu);
    });
    wrap.appendChild(btn);
    return wrap;
  }

  // src/interact.js
  function callInteract(st, item, add, webStyle) {
    return postForm(
      CFG.api.interact + (add ? "add" : "delete"),
      "objectId=" + item.id + "&objectType=2&interactType=1&subBiz=mainApp&kpn=ACFUN_APP" + (webStyle ? "&kpf=PC_WEB" : "") + "&acfun.midground.api_st=" + encodeURIComponent(st)
    ).then(function(j) {
      return !!(j && j.result === 1);
    });
  }
  function setRealLike(item, on) {
    var webStyle = item.kind === "home";
    return ensureApiSt().then(function(st) {
      return callInteract(st, item, on, webStyle);
    }, function() {
      return false;
    }).then(function(ok) {
      if (ok) return true;
      return ensureApiSt(true).then(function(st2) {
        return callInteract(st2, item, on, webStyle);
      }).catch(function() {
        return false;
      });
    });
  }
  function setRealFollow(item, on) {
    return postForm(
      CFG.api.follow,
      "toUserId=" + item.userId + "&action=" + (on ? 1 : 2) + "&groupId="
    ).then(function(j) {
      return !!(j && j.result === 0);
    }, function() {
      return false;
    });
  }
  function setRealFavorite(item, on) {
    return AppAPI.setFavorite(item.id, on);
  }
  function giveBanana(item, count) {
    return AppAPI.throwBanana(item.id, count);
  }

  // src/rail.js
  function withBusy(item, key, send, done) {
    if (item[key]) return;
    item[key] = true;
    send().then(
      function(ok) {
        item[key] = false;
        done(ok === true);
      },
      function() {
        item[key] = false;
        done(false);
      }
    );
  }
  function buildSideRail(slide, item, goTo) {
    var rail = el("div", "acsv-rail");
    if (item.head) {
      var avWrap = el("div", "acsv-avwrap");
      var a = el("a");
      a.href = item.userId ? CFG.api.userBase + item.userId : item.shareUrl;
      a.target = "_blank";
      var av = el("img", "acsv-avatar");
      av.referrerPolicy = "no-referrer";
      av.src = item.head.split("?")[0];
      av.title = item.userName;
      a.appendChild(av);
      avWrap.appendChild(a);
      if (item.userId) {
        var fb = el("div", "acsv-followbtn" + (item.isFollowing ? " on" : ""), item.isFollowing ? "✓" : "+");
        fb.title = item.isFollowing ? "点击取消关注" : "关注 UP 主";
        fb.addEventListener("click", function(ev) {
          ev.stopPropagation();
          var turnOn = !item.isFollowing;
          withBusy(item, "followBusy", function() {
            fb.textContent = "…";
            return setRealFollow(item, turnOn);
          }, function(ok) {
            if (ok) {
              item.isFollowing = turnOn;
              fb.textContent = turnOn ? "✓" : "+";
              fb.classList.toggle("on", turnOn);
              fb.title = turnOn ? "点击取消关注" : "关注 UP 主";
              toast(turnOn ? "已关注 @" + item.userName : "已取消关注 @" + item.userName);
            } else {
              fb.textContent = item.isFollowing ? "✓" : "+";
              toast("关注失败（未登录？）");
            }
          });
        });
        avWrap.appendChild(fb);
      }
      rail.appendChild(avWrap);
      slide._followSync = function() {
        if (!item.userId) return;
        fb.textContent = item.isFollowing ? "✓" : "+";
        fb.classList.toggle("on", item.isFollowing);
        fb.title = item.isFollowing ? "点击取消关注" : "关注 UP 主";
      };
    }
    function railBtn(icon, count, title, onclick) {
      var wrap = el("div");
      wrap.style.marginBottom = "25px";
      var b = el("button", "acsv-rail-btn");
      b.title = title;
      var imgEl = null, imgOn = null, imgOff = null;
      if (icon && icon.mask) {
        var mk = el("span", "acsvg-icon-mask");
        mk.style.setProperty("--acsvg-icon", 'url("' + icon.mask + '")');
        var probe = new Image();
        probe.onerror = function() {
          mk.remove();
          b.innerHTML = icon.svg || "";
        };
        probe.src = icon.mask;
        b.appendChild(mk);
      } else if (icon && icon.img) {
        imgEl = el("img", "acsv-icon-img");
        imgEl.alt = "";
        imgOff = icon.img;
        imgOn = icon.imgOn || null;
        imgEl.addEventListener("error", function() {
          b.innerHTML = icon.svg || "";
        });
        imgEl.src = icon.img;
        b.appendChild(imgEl);
      } else {
        b.innerHTML = icon;
      }
      b.addEventListener("click", function(ev) {
        ev.stopPropagation();
        onclick(b);
      });
      var c = el("div", "acsv-count", count);
      wrap.appendChild(b);
      wrap.appendChild(c);
      rail.appendChild(wrap);
      return { btn: b, count: c, imgEl, imgOn, imgOff };
    }
    var likeUI = railBtn({ mask: item.kind === "home" ? VIDEO_ICONS.like : SITE_ICONS.heart, svg: ICONS.heart }, fmt(item.like), "点赞", function(b) {
      var turnOn = !item.localLike;
      item.localLike = turnOn;
      item.like += turnOn ? 1 : -1;
      likeUI.count.textContent = fmt(item.like);
      b.classList.toggle("on", turnOn);
      b.classList.remove("bump");
      void b.offsetWidth;
      b.classList.add("bump");
      withBusy(item, "likeBusy", function() {
        return setRealLike(item, turnOn);
      }, function(ok) {
        if (ok) {
          item.liked = turnOn;
          toast(turnOn ? "已点赞" : "已取消点赞");
        } else {
          item.localLike = !turnOn;
          item.like += turnOn ? -1 : 1;
          likeUI.count.textContent = fmt(item.like);
          toast("点赞失败（未登录？）");
        }
        likeUI.btn.classList.toggle("on", item.liked || item.localLike);
      });
    });
    likeUI.btn.classList.toggle("on", item.liked || item.localLike);
    slide._likeSync = function() {
      var on = item.liked || item.localLike;
      likeUI.btn.classList.toggle("on", on);
      likeUI.count.textContent = fmt(item.like);
    };
    var cmtUI = railBtn({ img: SITE_ICONS.comment, svg: ICONS.comment }, fmt(item.comment), "展开/收起评论（C）", function() {
      toggleItemComments(item);
    });
    slide._cmtSync = function() {
      cmtUI.count.textContent = fmt(item.comment);
    };
    if (item.cap.banana) {
      var banUI = railBtn({ mask: VIDEO_ICONS.banana, svg: ICONS.banana }, fmt(item.banana), "投蕉", function(b) {
        if (item.thrown) {
          toast("已投过蕉啦，明天再来~");
          return;
        }
        toggleBanPop(slide, b, item);
      });
      slide._banSync = function() {
        banUI.count.textContent = fmt(item.banana);
        banUI.btn.classList.toggle("thrown", item.thrown);
        banUI.btn.title = item.thrown ? "今日已投过蕉啦" : "投蕉";
      };
    }
    if (item.cap.favorite) {
      var favUI = railBtn({ mask: VIDEO_ICONS.favorite, svg: ICONS.star }, fmt(item.fav), "收藏", function(b) {
        var turnOn = !item.favorited;
        b.classList.remove("bump");
        void b.offsetWidth;
        b.classList.add("bump");
        withBusy(item, "favBusy", function() {
          return setRealFavorite(item, turnOn);
        }, function(ok) {
          if (ok) {
            item.favorited = turnOn;
            toast(turnOn ? "已加入收藏" : "已取消收藏");
          } else {
            toast("收藏失败（未登录？）");
          }
          b.classList.toggle("on", item.favorited);
        });
      });
      favUI.btn.classList.toggle("on", item.favorited);
      slide._favSync = function() {
        favUI.count.textContent = fmt(item.fav);
        favUI.btn.classList.toggle("on", item.favorited);
      };
    }
    var shareUI = item.kind === "home" ? railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, fmt(item.share), "私信分享给朋友", function(b) {
      openSharePanel(b, item);
    }) : railBtn({ img: SITE_ICONS.share, svg: ICONS.share }, "分享", "私信分享给朋友", function(b) {
      openSharePanel(b, item);
    });
    if (item.kind === "home") slide._shareSync = function() {
      shareUI.count.textContent = fmt(item.share);
    };
    var side = el("div", "acsv-side");
    if (goTo) {
      var arrows = el("div", "acsv-arrows");
      var upBtn = elHtml("button", "acsv-arrow acsv-arrow-up", ICONS.chevUp);
      upBtn.title = "上一个（↑）";
      upBtn.addEventListener("click", function() {
        goTo(FeedStore.current - 1);
      });
      var downBtn = elHtml("button", "acsv-arrow acsv-arrow-down", ICONS.chevDn);
      downBtn.title = "下一个（↓）";
      downBtn.addEventListener("click", function() {
        goTo(FeedStore.current + 1);
      });
      arrows.appendChild(upBtn);
      arrows.appendChild(downBtn);
      side.appendChild(arrows);
    }
    side.appendChild(rail);
    slide.appendChild(side);
  }
  function toggleBanPop(slide, btn, item) {
    var existing = slide.querySelector(".acsv-banpop");
    if (existing) {
      existing.remove();
      return;
    }
    var pop = el("div", "acsv-banpop");
    var opts = [];
    var build = function(n2) {
      var ob = el("button");
      ob.title = "投 " + n2 + " 根香蕉";
      var img = el("img");
      img.alt = "";
      img.src = VIDEO_ICONS.banana;
      img.addEventListener("error", function() {
        ob.textContent = n2;
      });
      ob.appendChild(img);
      ob._img = img;
      ob.addEventListener("mouseenter", function() {
        opts.forEach(function(o, i) {
          o._img.src = i < n2 ? VIDEO_ICONS.bananaOn : VIDEO_ICONS.banana;
        });
      });
      ob.addEventListener("click", function(ev) {
        ev.stopPropagation();
        pop.remove();
        withBusy(item, "banBusy", function() {
          return giveBanana(item, n2);
        }, function(ok) {
          if (ok) {
            item.banana += n2;
            item.thrown = true;
            if (slide._banSync) slide._banSync();
            toast("投出 " + n2 + " 根香蕉");
          } else {
            toast("投蕉失败（未登录或今日已投完？）");
          }
        });
      });
      opts.push(ob);
      pop.appendChild(ob);
    };
    for (var n = 1; n <= 5; n++) build(n);
    pop.addEventListener("mouseleave", function() {
      opts.forEach(function(o) {
        o._img.src = VIDEO_ICONS.banana;
      });
    });
    btn.parentNode.style.position = "relative";
    btn.parentNode.appendChild(pop);
    setTimeout(function() {
      document.addEventListener("click", function onDoc() {
        document.removeEventListener("click", onDoc);
        if (!pop.isConnected) return;
        pop.remove();
      });
    }, 0);
  }
  function onHomeResolved(slide, item) {
    if (slide._likeSync) slide._likeSync();
    if (slide._favSync) slide._favSync();
    if (slide._banSync) slide._banSync();
    if (slide._cmtSync) slide._cmtSync();
    if (slide._shareSync) slide._shareSync();
    if (slide._followSync) slide._followSync();
    if (slide._qBtn) slide._qBtn.textContent = item.qualities ? item.qualities[item.qIdx].label : "自动";
    var ds = slide.querySelector(".acsv-meta .acsv-date");
    if (ds) ds.textContent = item.date || "";
  }

  // src/slide.js
  function buildSlide(item, idx, goTo) {
    var slide = el("section", "acsv-slide");
    slide.dataset.idx = idx;
    slide.dataset.state = "loading";
    if (item.cover) {
      var amb = el("div", "acsv-ambient");
      amb.style.backgroundImage = 'url("' + item.cover + '")';
      slide.appendChild(amb);
    }
    var spinner = el("div", "acsv-spinner");
    var playicon = elHtml("div", "acsv-playicon", ICONS.play);
    var errbox = el("div", "acsv-errbox");
    errbox.appendChild(el("p", null, "视频加载失败"));
    var retry = el("button", "acsv-retry", "重试");
    retry.addEventListener("click", function(ev) {
      ev.stopPropagation();
      item.urlIdx = 0;
      item.refreshed = false;
      if (item.cap.lazyResolve) item.urls = [];
      attachVideo(slide, item, idx);
    });
    errbox.appendChild(retry);
    slide.appendChild(spinner);
    slide.appendChild(playicon);
    slide.appendChild(errbox);
    slide.appendChild(buildControls(slide, idx, item));
    buildSideRail(slide, item, goTo);
    var info = el("div", "acsv-info");
    var meta = el("div", "acsv-meta");
    var up = item.userId ? '<a href="' + CFG.api.userBase + item.userId + '" target="_blank">@' + esc(item.userName) + "</a>" : "<span>@" + esc(item.userName) + "</span>";
    if (item.kind === "home") {
      meta.innerHTML = up + '<span class="acsv-date">' + esc(item.date || "") + "</span>";
    } else {
      meta.innerHTML = up + "<span>" + esc(item.date || "") + '</span><span class="acsv-views">' + fmt(item.view) + "次播放</span>";
    }
    info.appendChild(meta);
    info.appendChild(el("p", "acsv-title", item.title));
    slide.appendChild(info);
    slide.addEventListener("mousemove", function() {
      showControls(slide);
    });
    slide.addEventListener("click", onSlideTap);
    slide.addEventListener("scroll", function() {
      if (slide.scrollLeft !== 0) slide.scrollLeft = 0;
    });
    return slide;
  }
  function onSlideTap(ev) {
    var slide = ev.currentTarget;
    if (slide.dataset.ovl !== "1") {
      var idx = Number(slide.dataset.idx);
      if (idx !== FeedStore.current) return;
    }
    togglePlayGesture(slide.querySelector("video"));
  }
  function buildDrawer() {
    var drawer2 = el("aside", "acsv-drawer");
    var dhead = el("div", "acsv-drawer-head");
    var dtitle = el("span", null, "评论");
    var dclose = el("button", "acsv-drawer-close", "✕");
    dclose.title = "收起评论（Esc）";
    dclose.addEventListener("click", closeComments);
    dhead.appendChild(dtitle);
    dhead.appendChild(dclose);
    var dlist = el("div", "acsv-drawer-list");
    dlist.addEventListener("click", commentListClick);
    drawer2.appendChild(dhead);
    drawer2.appendChild(dlist);
    root.appendChild(drawer2);
    setCommentDrawer({ el: drawer2, title: dtitle, list: dlist });
  }

  // src/release.js
  function normVer(v) {
    var s = String(v == null ? "" : v).trim();
    if (/^v/i.test(s)) s = s.slice(1);
    var dash = s.indexOf("-");
    if (dash >= 0) s = s.slice(0, dash);
    return s;
  }
  function cmpVersion(a, b) {
    var A = normVer(a).split("."), B = normVer(b).split(".");
    for (var i = 0; i < Math.max(A.length, B.length); i++) {
      var x = parseInt(A[i], 10) || 0, y = parseInt(B[i], 10) || 0;
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }
  function xmlDec(s) {
    return String(s == null ? "" : s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }
  function parseRelAtom(text) {
    var out = [];
    var segs = String(text == null ? "" : text).split("<entry>");
    for (var i = 1; i < segs.length; i++) {
      var seg = segs[i];
      var tag = (seg.match(/releases\/tag\/([^<"\s]+)/) || [])[1];
      if (!tag) continue;
      var title = (seg.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1];
      var content = (seg.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1];
      out.push({ tag, title: xmlDec(title || ""), html: content != null ? xmlDec(content) : "" });
    }
    return out;
  }
  function latestEntry(entries) {
    var best = null;
    for (var i = 0; entries && i < entries.length; i++) {
      var e = entries[i];
      if (!e || !normVer(e.tag)) continue;
      if (!best || cmpVersion(e.tag, best.tag) > 0) best = e;
    }
    return best;
  }
  function findEntry(entries, ver) {
    for (var i = 0; entries && i < entries.length; i++) {
      if (entries[i] && cmpVersion(entries[i].tag, ver) === 0) return entries[i];
    }
    return void 0;
  }
  function decideUpd(state, curVer, latestVer) {
    var st = state && typeof state === "object" ? state : {};
    if (latestVer && cmpVersion(latestVer, curVer) > 0) {
      if (st.ignored && cmpVersion(st.ignored, latestVer) === 0) return "none";
      if (st.notified && cmpVersion(st.notified, latestVer) === 0) return "toast";
      return "popup";
    }
    if (!st.seen || cmpVersion(st.seen, curVer) !== 0) return "updated";
    return "none";
  }
  function mockAtom() {
    return window.__ACSV_MOCK_RELEASE__ || null;
  }
  function fetchAtom() {
    var mock = mockAtom();
    if (mock) return Promise.resolve(String(mock));
    return gmRequest({ url: CFG.api.ghRelAtom, timeout: CFG.time.upd, responseType: "text", okStatus: true });
  }
  function curVersion() {
    return normVer(true ? "0.9.74" : "");
  }
  var stateFallback = null;
  function readState() {
    var st = null;
    try {
      st = JSON.parse(localStorage.getItem(CFG.lsUpd) || "null");
    } catch (e) {
    }
    st = st && typeof st === "object" ? st : {};
    if (stateFallback) {
      for (var k in stateFallback) st[k] = stateFallback[k];
    }
    return st;
  }
  function writeState(st) {
    try {
      localStorage.setItem(CFG.lsUpd, JSON.stringify(st));
      stateFallback = null;
    } catch (e) {
      stateFallback = st;
    }
  }
  var modal = null;
  var knownLatest = "";
  function closeReleaseModal() {
    if (!modal) return;
    var m = modal;
    modal = null;
    m.remove();
    overlayClose("release");
  }
  function buildRich(html) {
    var rich = elHtml("div", "acsv-upd-md", html);
    Array.prototype.forEach.call(rich.querySelectorAll("a"), function(a) {
      a.target = "_blank";
      a.rel = "noopener";
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) === "/") a.setAttribute("href", "https://github.com" + href);
    });
    return rich;
  }
  function setModalContent(m, html, noteText) {
    var body = m.querySelector(".acsv-upd-body");
    if (!body) return;
    body.innerHTML = "";
    if (noteText) body.appendChild(el("p", "acsv-upd-note", noteText));
    else if (html) body.appendChild(buildRich(html));
    else body.appendChild(el("p", "acsv-upd-note", "该版本未填写更新说明"));
  }
  function setModalFoot(m, actions) {
    var foot = m.querySelector(".acsv-upd-foot");
    if (!foot) return;
    foot.innerHTML = "";
    Array.prototype.forEach.call(actions || [], function(act) {
      var b = el("button", "acsv-upd-act" + (act.primary ? " primary" : ""), act.label);
      b.addEventListener("click", function() {
        closeReleaseModal();
        if (act.fn) act.fn();
      });
      foot.appendChild(b);
    });
  }
  function openModal(opts) {
    closeReleaseModal();
    if (!root) return null;
    modal = el("div", "acsv-upd");
    var panel = el("div", "acsv-upd-panel");
    var head = el("div", "acsv-upd-head");
    var title = el("div", "acsv-upd-title");
    title.appendChild(el("span", "acsv-upd-h1", opts.title));
    if (opts.sub) title.appendChild(el("span", "acsv-upd-sub", opts.sub));
    head.appendChild(title);
    var x = el("button", "acsv-upd-x", "✕");
    x.addEventListener("click", closeReleaseModal);
    head.appendChild(x);
    panel.appendChild(head);
    panel.appendChild(el("div", "acsv-upd-body"));
    panel.appendChild(el("div", "acsv-upd-foot"));
    modal.appendChild(panel);
    modal.addEventListener("click", function(ev) {
      if (ev.target === modal) closeReleaseModal();
    });
    setModalContent(modal, opts.html, opts.note || (opts.html ? "" : "该版本未填写更新说明"));
    setModalFoot(modal, opts.actions);
    root.appendChild(modal);
    overlayOpen({ id: "release", modal: true, close: closeReleaseModal });
    return modal;
  }
  function refreshDot() {
    if (!root) return;
    var dot = root.querySelector(".acsv-upd-dot");
    if (!dot) return;
    var st = readState();
    var on = !!knownLatest && cmpVersion(knownLatest, curVersion()) > 0 && !(st.ignored && cmpVersion(st.ignored, knownLatest) === 0);
    dot.style.display = on ? "" : "none";
  }
  function releaseCheck() {
    if (!mockAtom()) {
      var st = readState();
      var now = Date.now();
      if (st.lastCheck && now - st.lastCheck < CFG.time.updGap) return;
      st.lastCheck = now;
      writeState(st);
    }
    stat("upd.check");
    fetchAtom().then(function(text) {
      var entries = parseRelAtom(text);
      var latest = latestEntry(entries);
      if (!latest) return;
      knownLatest = normVer(latest.tag);
      var curVer = curVersion();
      var act = decideUpd(readState(), curVer, knownLatest);
      if (act === "none") {
        refreshDot();
        return;
      }
      if (act === "toast") {
        refreshDot();
        toast("发现新版本 v" + knownLatest + "，顶栏「更新」可查看说明");
        return;
      }
      if (!root) return;
      if (act === "popup") {
        var st2 = readState();
        st2.notified = knownLatest;
        writeState(st2);
        refreshDot();
        openModal({
          title: "发现新版本 v" + knownLatest,
          sub: "当前 v" + curVer,
          html: latest.html,
          actions: [
            { label: "前往更新", primary: true, fn: function() {
              window.open(CFG.api.releasePage, "_blank");
            } },
            { label: "忽略此版本", fn: function() {
              var s3 = readState();
              s3.ignored = knownLatest;
              writeState(s3);
              refreshDot();
            } }
          ]
        });
      } else {
        var cur = findEntry(entries, curVer);
        var s4 = readState();
        s4.seen = curVer;
        writeState(s4);
        if (!cur) return;
        openModal({
          title: "v" + curVer + " 更新内容",
          sub: cur.title && cur.title !== curVer ? cur.title : "",
          html: cur.html,
          actions: [{ label: "知道了", primary: true }]
        });
      }
    }, function() {
      stat("upd.err");
      console.info("[acsv-upd] 检查失败（GitHub 不可达或未授权），本次跳过");
    });
  }
  function openReleaseNotes() {
    if (!root) return;
    var m = openModal({ title: "更新说明", note: "正在获取更新说明…" });
    stat("upd.check");
    fetchAtom().then(function(text) {
      if (modal !== m) return;
      var latest = latestEntry(parseRelAtom(text));
      if (!latest) return setModalContent(m, "", "没有获取到 release 信息");
      knownLatest = normVer(latest.tag);
      refreshDot();
      var newer = cmpVersion(knownLatest, curVersion()) > 0;
      var actions = [];
      if (newer) {
        actions.push({ label: "前往更新", primary: true, fn: function() {
          window.open(CFG.api.releasePage, "_blank");
        } });
        actions.push({ label: "忽略此版本", fn: function() {
          var s = readState();
          s.ignored = knownLatest;
          writeState(s);
          refreshDot();
        } });
      }
      actions.push({ label: "关闭" });
      setModalContent(m, latest.html);
      setModalFoot(m, actions);
    }, function() {
      stat("upd.err");
      if (modal !== m) return;
      setModalContent(m, "", "获取失败（网络不可达或未授权），稍后重试");
    });
  }
  function teardownRelease() {
    closeReleaseModal();
  }

  // src/sidebar.js
  var dockEl = null;
  var ENTRIES = [
    {
      id: "feed",
      label: "推荐",
      svg: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.2 10.9-6.1 3.5c-.5.3-1.1-.1-1.1-.7V8.3c0-.6.6-1 1.1-.7l6.1 3.5c.5.3.5 1 0 1.3z"/></svg>'
    },
    {
      id: "zone",
      label: "榜单",
      svg: '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z"/></svg>'
    },
    {
      sep: true
    },
    {
      id: "my",
      label: "我的",
      svg: '<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
    }
  ];
  function buildDock(parent) {
    if (dockEl) return;
    dockEl = el("div", "acsv-dock");
    var logo = el("div", "acsv-dock-logo");
    var img = el("img");
    img.src = CFG.api.logoSvg;
    img.alt = "AcFun";
    logo.appendChild(img);
    dockEl.appendChild(logo);
    dockEl.appendChild(el("div", "acsv-dock-sep"));
    ENTRIES.forEach(function(e) {
      if (e.sep) {
        dockEl.appendChild(el("div", "acsv-dock-sep"));
        return;
      }
      var b = el("button", "acsv-dock-item");
      b.dataset.view = e.id;
      b.title = e.label;
      b.innerHTML = e.svg + "<span>" + e.label + "</span>";
      b.addEventListener("click", function() {
        location.hash = e.id === "feed" ? CFG.hash : CFG.hash + "/" + e.id;
      });
      dockEl.appendChild(b);
    });
    parent.appendChild(dockEl);
    syncDock(null);
  }
  function syncDock(view2) {
    if (!dockEl) return;
    var cur = view2 != null ? view2 : parseRoute().view || "feed";
    Array.prototype.forEach.call(dockEl.querySelectorAll(".acsv-dock-item"), function(b) {
      b.classList.toggle("on", b.dataset.view === cur);
    });
  }
  function teardownDock() {
    if (dockEl) {
      dockEl.remove();
      dockEl = null;
    }
  }

  // src/topbar.js
  var barEl = null;
  var imBtnEl = null;
  var segSv = null;
  var segHome = null;
  var xBtn = null;
  var backBtn = null;
  var searchInput = null;
  var hooks2 = {};
  var searchHandler = null;
  function submitSearch() {
    if (!searchInput) return;
    var kw = String(searchInput.value || "").trim();
    if (searchHandler) {
      searchHandler(kw);
      return;
    }
    if (hooks2.onSearch) hooks2.onSearch(kw);
  }
  function setSearchHandler(fn) {
    searchHandler = typeof fn === "function" ? fn : null;
  }
  function focusSearch() {
    if (!searchInput) return;
    try {
      searchInput.focus();
    } catch (e) {
    }
  }
  function buildTopbar(parent, h) {
    if (barEl) return topbarRefs();
    hooks2 = h || {};
    barEl = el("div", "acsv-top");
    backBtn = el("button", "acsv-tbtn acsv-back-btn");
    backBtn.title = "返回";
    backBtn.innerHTML = ICONS.chevLt;
    backBtn.style.display = "none";
    backBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (hooks2.onBack) hooks2.onBack();
    });
    barEl.appendChild(backBtn);
    var pill = el("div", "acsv-sbox");
    searchInput = el("input");
    searchInput.type = "search";
    searchInput.placeholder = "搜索 A 站视频";
    searchInput.addEventListener("keydown", function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitSearch();
      } else if (ev.key === "Escape") searchInput.blur();
    });
    var sBtn = el("button", "acsv-sbtn");
    sBtn.title = "搜索";
    sBtn.appendChild(el("i", "acsvg-glyph", GLYPHS.search));
    sBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      submitSearch();
    });
    pill.appendChild(searchInput);
    pill.appendChild(sBtn);
    barEl.appendChild(pill);
    var tr = el("div", "acsv-top-right");
    segSv = el("button", "acsv-seg-btn", "小视频");
    segHome = el("button", "acsv-seg-btn", "推荐");
    segSv.title = "切换到小视频流";
    segHome.title = "切换到 APP 首页推荐流";
    segSv.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (hooks2.onSource) hooks2.onSource("sv");
    });
    segHome.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (hooks2.onSource) hooks2.onSource("home");
    });
    var seg = el("div", "acsv-seg");
    seg.appendChild(segSv);
    seg.appendChild(segHome);
    tr.appendChild(seg);
    var imBtn = el("button", "acsv-tbtn acsv-im-btn");
    imBtn.title = "私信";
    imBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg><span class="acsv-im-badge" style="display:none"></span>';
    imBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (hooks2.onDrawer) hooks2.onDrawer();
    });
    tr.appendChild(imBtn);
    var updBtn = el("button", "acsv-tbtn acsv-upd-btn");
    updBtn.title = "更新说明";
    updBtn.innerHTML = ICONS.upd + '<span class="acsv-upd-dot" style="display:none"></span>';
    updBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (hooks2.onRelease) hooks2.onRelease();
    });
    tr.appendChild(updBtn);
    xBtn = el("button", "acsv-tbtn", "✕");
    xBtn.addEventListener("click", function() {
      if (hooks2.onExit) hooks2.onExit();
    });
    tr.appendChild(xBtn);
    barEl.appendChild(tr);
    parent.appendChild(barEl);
    imBtnEl = imBtn;
    syncTopbarSeg();
    syncTopbar(null);
    return topbarRefs();
  }
  function topbarRefs() {
    return { el: barEl, imBtn: imBtnEl, searchInput, xBtn };
  }
  function syncTopbarSeg() {
    if (!segSv) return;
    var home = typeof hooks2.getSource === "function" && hooks2.getSource() === "home";
    segSv.classList.toggle("on", !home);
    segHome.classList.toggle("on", home);
  }
  function syncTopbar(view2, arg, opts) {
    if (!barEl) return;
    barEl.classList.toggle("acsv-top--view", !!view2);
    if (backBtn) backBtn.style.display = opts && opts.deep ? "" : "none";
    if (xBtn) xBtn.title = view2 ? "退出" : "退出（Esc）";
    if (view2 === "search" && searchInput) searchInput.value = arg == null ? "" : String(arg);
  }
  function teardownTopbar() {
    if (barEl) {
      barEl.remove();
      barEl = null;
    }
    imBtnEl = null;
    segSv = null;
    segHome = null;
    xBtn = null;
    backBtn = null;
    searchInput = null;
    hooks2 = {};
    searchHandler = null;
  }

  // src/views.js
  var registry = {};
  var current = null;
  var origins = [];
  var wasPlaying = false;
  function registerView(def) {
    if (def && def.id && typeof def.build === "function") registry[def.id] = def;
  }
  function currentView() {
    return current ? current.id : null;
  }
  var itemOpener = null;
  function setItemOpener(fn) {
    itemOpener = typeof fn === "function" ? fn : null;
  }
  function originView() {
    if (!origins.length) return null;
    return origins[origins.length - 1].view || "feed";
  }
  function pauseAllVideos() {
    if (!scroller) return;
    var vs = scroller.querySelectorAll("video");
    Array.prototype.forEach.call(vs, function(v) {
      if (!v.paused) v.pause();
    });
  }
  function resumeCurrentVideo() {
    if (!scroller) return;
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
    var v = slide && slide.querySelector("video");
    if (v && v.paused) {
      var p = v.play();
      if (p && p.catch) p.catch(function() {
      });
    }
  }
  function stageHide() {
    if (!scroller || scroller.style.display === "none") return;
    var slide = scroller.querySelector('.acsv-slide[data-idx="' + FeedStore.current + '"]');
    var v = slide && slide.querySelector("video");
    wasPlaying = !!(v && !v.paused);
    scroller.style.display = "none";
    if (root) root.classList.add("acsv-with-view");
    pauseAllVideos();
  }
  function stageShow(restore) {
    if (!scroller) return;
    scroller.style.display = "block";
    if (root) root.classList.remove("acsv-with-view");
    if (restore) resumeCurrentVideo();
    wasPlaying = false;
  }
  function destroyRec(rec) {
    if (!rec) return;
    if (rec.def.teardown) {
      try {
        rec.def.teardown();
      } catch (e) {
      }
    }
    if (rec.el) rec.el.remove();
  }
  function clearOrigins() {
    while (origins.length) {
      var o = origins.pop();
      if (o.rec) destroyRec(o.rec);
    }
  }
  function dropCurrent() {
    var rec = current;
    current = null;
    destroyRec(rec);
  }
  function closeView() {
    if (!current) return;
    if (current.def.deep) return backFromOrigin();
    if (location.hash !== "#" + CFG.hash) location.hash = CFG.hash;
  }
  function backFromOrigin() {
    var top = origins.length ? origins[origins.length - 1] : null;
    var to = top && top.view ? CFG.hash + "/" + top.view + (top.arg == null || top.arg === "" ? "" : "/" + encodeURIComponent(top.arg)) : CFG.hash;
    if (location.hash !== "#" + to) location.hash = to;
  }
  function holdOrigin(prev) {
    if (prev.def.suspend) {
      try {
        prev.def.suspend();
      } catch (e) {
      }
    }
    prev.el.className = "acsv-view-held";
    origins.push({ view: prev.id, arg: prev.arg, rec: prev });
  }
  function enterView(id, arg) {
    var def = registry[id];
    if (!def || !root) return false;
    var top = origins.length ? origins[origins.length - 1] : null;
    var back = !!(top && String(top.view || "") === String(id) && String(top.arg || "") === String(arg || ""));
    var rec = null;
    var replaced = false;
    if (back) {
      rec = top.rec;
      origins.pop();
    } else if (top && String(top.view || "") === String(id)) {
      destroyRec(top.rec);
      origins.pop();
      replaced = true;
    }
    var prev = current;
    current = null;
    var heldRec = null;
    if (prev && !back && !replaced && def.deep && !prev.def.volatile && prev.id !== id) {
      holdOrigin(prev);
      heldRec = prev;
    }
    if (prev && prev !== heldRec) destroyRec(prev);
    if (!def.deep) clearOrigins();
    overlayTeardown();
    if (rec) {
      rec.el.className = "acsv-view";
      rec.el.style.display = "block";
      if (rec.def.resume) {
        try {
          rec.def.resume();
        } catch (e2) {
        }
      }
      current = rec;
      overlayOpen({ id: "view", close: closeView });
      return true;
    }
    stageHide();
    var e = el("div", "acsv-view");
    var body = el("div", "acsv-view-body");
    e.appendChild(body);
    root.appendChild(e);
    e.style.display = "block";
    current = { id, arg, def, el: e };
    overlayOpen({ id: "view", close: closeView });
    def.build(body, arg);
    return true;
  }
  function exitView(restore) {
    dropCurrent();
    overlayTeardown();
    clearOrigins();
    stageShow(!!(restore && wasPlaying));
  }
  function syncRouteView() {
    if (!root) return;
    var r = parseRoute();
    var def = r.view ? registry[r.view] : null;
    if (def) {
      if (!current || current.id !== r.view || String(current.arg || "") !== String(r.viewArg || "")) {
        enterView(r.view, r.viewArg);
      }
    } else if (current) {
      exitView(true);
    }
    syncDock(def && def.deep ? originView() || "feed" : r.view);
    syncTopbar(r.view, r.viewArg, { deep: !!(def && def.deep) });
  }
  function teardownViews() {
    dropCurrent();
    clearOrigins();
    stageShow(false);
  }
  testHook("stage", function() {
    return {
      visible: !!(scroller && scroller.style.display !== "none"),
      wasPlaying,
      current: currentView(),
      origin: originView(),
      held: document.querySelectorAll(".acsv-view-held").length
    };
  });
  var META_GLYPH = { view: GLYPHS.rankView, comment: GLYPHS.rankComment, time: GLYPHS.rankTime };
  function rowOf(pi, rank) {
    var row = el("div", "acsv-vrow" + (pi.kind === "rank" ? " big" : ""));
    if (rank != null && pi.kind !== "rank") {
      row.appendChild(el("div", "acsv-vrow-rank" + (rank <= 3 ? " top" : ""), String(rank)));
    }
    if (rank != null && pi.kind === "rank") {
      row.appendChild(el("div", "acsv-rlist-num", String(rank)));
    }
    var thumb = el("div", "acsv-vrow-thumb");
    if (pi.cover) {
      var img = el("img");
      img.src = pi.cover;
      img.referrerPolicy = "no-referrer";
      img.loading = "lazy";
      thumb.appendChild(img);
    }
    row.appendChild(thumb);
    var main = el("div", "acsv-vrow-main");
    main.appendChild(el("div", "acsv-vrow-title", pi.title));
    if (pi.desc) main.appendChild(el("div", "acsv-vrow-desc", pi.desc));
    if (pi.kind === "rank" && pi.meta) {
      var meta = el("div", "acsv-vrow-meta");
      pi.meta.forEach(function(b) {
        var seg = el("span", "acsv-vmeta-i");
        seg.appendChild(el("i", "acsvg-glyph", META_GLYPH[b.k] || ""));
        if (b.t) seg.appendChild(document.createTextNode(b.t));
        meta.appendChild(seg);
      });
      main.appendChild(meta);
    } else {
      var bits = [];
      if (pi.sub) bits.push(pi.sub);
      if (pi.progress != null && pi.kind !== "history") bits.push("看到 " + fmtDur2(pi.progress));
      main.appendChild(el("div", "acsv-vrow-meta", bits.join(" · ")));
    }
    row.appendChild(main);
    row.addEventListener("click", function() {
      if (itemOpener) itemOpener(pi);
    });
    return row;
  }
  function gridCardOf(pi) {
    var cell = el("div", "acsv-gcell" + (pi.kind === "search" ? " acsv-scell" : ""));
    var cover = el("div", "acsv-gcover");
    if (pi.cover) {
      var img = el("img");
      img.src = pi.cover;
      img.referrerPolicy = "no-referrer";
      img.loading = "lazy";
      cover.appendChild(img);
    }
    var tag = pi.kind === "history" ? pi.sub : pi.progress != null ? "看到 " + fmtDur2(pi.progress) : "";
    if (tag) cover.appendChild(el("div", "acsv-gtag", tag));
    if (pi.views) {
      var vb = el("div", "acsv-gtag acsv-gviews");
      vb.appendChild(el("i", "acsvg-glyph", GLYPHS.rankView));
      vb.appendChild(document.createTextNode(pi.views));
      cover.appendChild(vb);
    }
    if (pi.dur) cover.appendChild(el("div", "acsv-gdur", pi.dur));
    cell.appendChild(cover);
    cell.appendChild(el("div", "acsv-gtitle", pi.title));
    var bits = [];
    if (pi.kind !== "history" && pi.sub) bits.push(pi.sub);
    if (pi.kind !== "history" && pi.progress != null) bits.push("看到 " + fmtDur2(pi.progress));
    if (bits.length) cell.appendChild(el("div", "acsv-gmeta", bits.join(" · ")));
    if (pi.upName || pi.dateText) {
      var foot = el("div", "acsv-gfoot");
      foot.appendChild(el("span", "acsv-gup", pi.upName ? "@" + pi.upName : ""));
      foot.appendChild(el("span", "acsv-gtime", pi.dateText || ""));
      cell.appendChild(foot);
    }
    cell.addEventListener("click", function() {
      if (itemOpener) itemOpener(pi);
    });
    return cell;
  }
  function upCardOf(pi) {
    var card = el("div", "acsv-upcard");
    var up = pi.up || {};
    var a = el("a", "acsv-upcard-link");
    a.href = CFG.api.userBase + (up.id || "");
    a.target = "_blank";
    a.rel = "noopener";
    var avatar = el("img", "acsv-upcard-avatar");
    avatar.src = up.img || CFG.api.defaultAvatar;
    avatar.referrerPolicy = "no-referrer";
    avatar.loading = "lazy";
    a.appendChild(avatar);
    var info = el("div", "acsv-upcard-info");
    info.appendChild(el("div", "acsv-upcard-name", up.name || ""));
    info.appendChild(el("p", "acsv-upcard-sign", up.sign || ""));
    var extra = el("div", "acsv-upcard-extra");
    var c1 = el("span", "acsv-vmeta-i");
    c1.appendChild(el("i", "acsvg-glyph", GLYPHS.share));
    c1.appendChild(document.createTextNode(up.contribText || "0"));
    var c2 = el("span", "acsv-vmeta-i");
    c2.appendChild(el("i", "acsvg-glyph", GLYPHS.fans));
    c2.appendChild(document.createTextNode(up.fansText || "0"));
    extra.appendChild(c1);
    extra.appendChild(c2);
    info.appendChild(extra);
    a.appendChild(info);
    card.appendChild(a);
    return card;
  }
  function moreBtn(onClick) {
    var b = el("button", "acsv-vmore", "加载更多");
    b.addEventListener("click", function() {
      if (b.disabled) return;
      b.disabled = true;
      b.textContent = "加载中…";
      onClick(b);
    });
    return b;
  }
  function fmtDur2(sec) {
    sec = Math.max(0, Number(sec) || 0);
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
  }
  testHook("view", function() {
    return currentView();
  });

  // src/playlayer.js
  var OVL_IDX = -1;
  var pending = null;
  var slideRef = null;
  var itemRef = null;
  function currentItem() {
    return itemRef;
  }
  function itemOfPanel(pi) {
    var item = homeItemOf(pi.acId, pi.title, pi.cover);
    var up = pi.up || {};
    if (up.img) item.head = up.img;
    if (up.name) item.userName = up.name;
    if (up.id) item.userId = up.id;
    return item;
  }
  function openPlayer(pi) {
    if (!pi || !pi.acId) return;
    pending = pi;
    location.hash = CFG.hash + "/play/a/" + pi.acId;
  }
  function mountSlide(body, item) {
    var slide = buildSlide(item, OVL_IDX, null);
    slide.dataset.ovl = "1";
    body.appendChild(slide);
    slideRef = slide;
    itemRef = item;
    setVideoTarget(function() {
      var v = slideRef && slideRef.querySelector("video");
      return v || null;
    });
    attachVideo(slide, item, OVL_IDX);
  }
  function buildErr(body, msg) {
    var box = el("div", "acsv-errbox");
    box.style.display = "grid";
    box.appendChild(el("p", null, msg));
    body.appendChild(box);
  }
  function buildPlayView(body, arg) {
    body.classList.add("acsv-vbody-play");
    var id = Number(arg) || 0;
    if (!id) {
      buildErr(body, "播放链接不完整（缺少视频 id）");
      return;
    }
    var st = pending;
    pending = null;
    if (st && String(st.acId) === String(id)) {
      mountSlide(body, itemOfPanel(st));
      return;
    }
    var spinner = el("div", "acsv-spinner");
    body.appendChild(spinner);
    (function load() {
      API.deepLink(id, parseRoute().src).then(function(hit) {
        if (!body.isConnected) return;
        spinner.remove();
        if (!hit) {
          buildErr(body, "视频加载失败");
          var b = el("button", "acsv-retry", "重试");
          b.addEventListener("click", function() {
            b.remove();
            body.appendChild(spinner);
            load();
          });
          body.appendChild(b);
          return;
        }
        mountSlide(body, hit.item);
      }, function() {
        if (!body.isConnected) return;
        spinner.remove();
        buildErr(body, "视频加载失败（网络不可达）");
      });
    })();
  }
  function teardownPlayView() {
    setVideoTarget(null);
    if (slideRef && slideRef._session) {
      slideRef._session.dispose();
      slideRef._session = null;
    }
    slideRef = null;
    itemRef = null;
    pending = null;
  }
  registerView({
    id: "play",
    build: buildPlayView,
    teardown: teardownPlayView,
    deep: true,
    // 深界面：关闭/返回=回来源链顶（打开它的那个列表/搜索页）
    volatile: true
    // 握播放会话/定时器：离开即真拆，绝不挂起（隐藏容器里继续出声绝不允许）
  });
  setItemOpener(openPlayer);

  // src/input.js
  var keyHandler = null;
  var keyUpHandler = null;
  var fsChangeHandler = null;
  var ghostIv = null;
  function setupInputHandlers(api) {
    keyHandler = function(ev) {
      if (!isFeedRoute() || !root) return;
      var top = overlayTop();
      if (top && top.modal) {
        if (ev.key === "Escape") overlayClose(top.id);
        return;
      }
      if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
      var inPlay = currentView() === "play";
      if (currentView()) {
        if (ev.key === "Escape" && overlayTop()) {
          overlayClose(overlayTop().id);
          return;
        }
        if (!inPlay) return;
      }
      var cur = FeedStore.current;
      switch (ev.key) {
        case "ArrowDown":
        case "PageDown":
        case "j":
          if (inPlay) {
            ev.preventDefault();
            break;
          }
          ev.preventDefault();
          api.scrollToIndex(cur + 1);
          break;
        case "ArrowUp":
        case "PageUp":
        case "k":
          if (inPlay) {
            ev.preventDefault();
            break;
          }
          ev.preventDefault();
          api.scrollToIndex(Math.max(0, cur - 1));
          break;
        case "ArrowLeft":
          ev.preventDefault();
          (function() {
            var v = currentVideo();
            if (v && v.duration) v.currentTime = Math.max(0, v.currentTime - CFG.time.seekStep);
          })();
          break;
        case "ArrowRight": {
          ev.preventDefault();
          if (ev.repeat || pb.seekHold.active || pb.seekHold.timer) break;
          pb.seekHold.timer = setTimeout(function() {
            pb.seekHold.timer = null;
            pb.seekHold.active = true;
            pb.seekHold.prevRate = pb.playRate;
            var v = currentVideo();
            if (v) v.playbackRate = 2;
            toast("2× 快进中");
          }, CFG.time.hold);
          break;
        }
        case " ":
          ev.preventDefault();
          if (ev.repeat) break;
          togglePlayGesture(currentVideo());
          break;
        case "m":
        case "M":
          if (ev.repeat) break;
          toggleMuteGesture(currentVideo());
          break;
        case "f":
        case "F":
          if (ev.repeat) break;
          toggleFullscreen();
          break;
        case "Escape": {
          var ov = overlayTop();
          if (ov) overlayClose(ov.id);
          else api.exitFeed();
          break;
        }
        case "c":
        case "C": {
          if (ev.repeat) break;
          var itC = inPlay ? currentItem() : FeedStore.items[cur];
          if (itC) toggleItemComments(itC);
          break;
        }
      }
    };
    keyUpHandler = function(ev) {
      if (ev.key !== "ArrowRight" || !root) return;
      var v = currentVideo();
      if (pb.seekHold.timer) {
        clearTimeout(pb.seekHold.timer);
        pb.seekHold.timer = null;
        if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + CFG.time.seekStep);
      } else if (pb.seekHold.active) {
        pb.seekHold.active = false;
        pb.playRate = pb.seekHold.prevRate;
        if (scroller) {
          var vs = scroller.querySelectorAll("video");
          Array.prototype.forEach.call(vs, function(x) {
            x.playbackRate = pb.playRate;
          });
        }
        toast("恢复 " + pb.playRate.toFixed(1) + "x");
      }
    };
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("keyup", keyUpHandler);
    fsChangeHandler = function() {
      if (!scroller) return;
      var slide = slideAt(FeedStore.current);
      if (slide) scroller.scrollTop = slide.offsetTop;
    };
    document.addEventListener("fullscreenchange", fsChangeHandler);
    ghostIv = setInterval(sweepVideos, CFG.time.ghostIv);
  }
  function teardownInputHandlers() {
    if (keyHandler) {
      window.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    if (keyUpHandler) {
      window.removeEventListener("keyup", keyUpHandler);
      keyUpHandler = null;
    }
    if (fsChangeHandler) {
      document.removeEventListener("fullscreenchange", fsChangeHandler);
      fsChangeHandler = null;
    }
    if (ghostIv) {
      clearInterval(ghostIv);
      ghostIv = null;
    }
  }

  // src/player.js
  var io = null;
  function makeIO() {
    return new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (en.isIntersecting && en.intersectionRatio >= CFG.io.ratio) {
          setActive(Number(en.target.dataset.idx));
        }
      });
    }, { root: scroller, threshold: [CFG.io.ratio] });
  }
  function panFitOf(video) {
    if (!video.videoWidth || !video.videoHeight) return false;
    var dw = Math.min(CFG.comments.drawerW, window.innerWidth * CFG.comments.drawerMaxWp);
    return video.videoWidth / video.videoHeight <= (window.innerWidth - dw) / window.innerHeight;
  }
  function syncPanFit(slide) {
    var v = slide.querySelector("video");
    if (v && panFitOf(v)) slide.dataset.panfit = "1";
    else slide.removeAttribute("data-panfit");
  }
  var resizeTimer = null;
  window.addEventListener("resize", function() {
    if (!scroller) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (!scroller) return;
      Array.prototype.forEach.call(scroller.querySelectorAll(".acsv-slide"), syncPanFit);
    }, 150);
  });
  var SESSION_HOOKS = {
    initVideo: function(video) {
      video.muted = !pb.soundOn;
      video.loop = !pb.autoplayNext;
      video.playbackRate = pb.seekHold.active ? 2 : pb.playRate;
    },
    // 播放层开着时"当前条"是层内那条（哨兵 idx）：session 的自动起播判定按它比对
    currentIdx: function() {
      return currentView() === "play" ? OVL_IDX : FeedStore.current;
    },
    onResolved: function(session) {
      onHomeResolved(session.slide, session.item);
    },
    // 会话驱动的起播（挂载/恢复链）：舞台被视图盖住时只挂不播——隐藏舞台起播＝幽灵音频
    // （视图态 `loadInitial` 晚到的实锤路径）；退出视图由 views.resumeCurrentVideo 恢复
    play: function(video) {
      if (videoStageVisible(video)) playVideo(video);
    },
    // HealthMonitor 恢复阶梯的降档动作（session.js 经 hooks 回接）
    qualitySwitch: function(session, qIdx) {
      switchQuality(session.item, session.slide, qIdx);
    },
    // 恢复链的重跑解析（mock/真实同路）与末端重挂
    refreshItem: function(item) {
      return FeedStore.refresh(item);
    },
    reattach: function(session) {
      attachVideo(session.slide, session.item, session.idx);
    },
    onAttachPlay: function(session, video) {
      if (!videoStageVisible(video)) return;
      playVideo(video);
      if (!pb.soundOn && !pb.firstGestureSeen) {
        var slide = video.closest(".acsv-slide");
        if (slide && !slide.querySelector(".acsv-hint")) showSoundHint(slide);
      }
    },
    onPlaying: function(session, video) {
      var slide = session.slide, item = session.item;
      if (slide._ctlPlayBtn) slide._ctlPlayBtn.innerHTML = ICONS.pause;
      showControls(slide);
      onPlaying(slide, item, video);
      clearTimeout(slide._watchTimer);
      slide._watchTimer = setTimeout(function() {
        slide._watchTimer = null;
        if (slide.isConnected && !video.paused && session.state !== "disposed") {
          reportLeave(session, video, "timer");
        }
      }, CFG.time.watchReport);
    },
    onPause: function(session, video) {
      if (session.slide._ctlPlayBtn) session.slide._ctlPlayBtn.innerHTML = ICONS.play;
    },
    onMeta: function(session, video) {
      syncPanFit(session.slide);
      if (session.slide._ctlTime) {
        session.slide._ctlTime.textContent = fmtTime(video.currentTime) + " / " + fmtTime(video.duration);
      }
    },
    onTime: function(session, video) {
      var slide = session.slide;
      if (!video.duration) return;
      var trackEl = slide._ctlTrack;
      var draggingNow = !!trackEl && trackEl.dataset.drag === "1";
      var pct = video.currentTime / video.duration * 100 + "%";
      if (!draggingNow) {
        if (slide._ctlFill) slide._ctlFill.style.width = pct;
        if (slide._ctlHandle) slide._ctlHandle.style.left = pct;
      }
      if (slide._ctlTime) {
        slide._ctlTime.textContent = fmtTime(video.currentTime) + " / " + fmtTime(video.duration);
      }
    },
    // 播完也是一次"离开"：先报最终进度再连播滚动（后续 dispose 重复触发由同秒位去重拦截）
    onEnded: function(session) {
      reportLeave(session, session.video, "ended");
      if (pb.autoplayNext && session.idx === FeedStore.current) scrollToIndex(session.idx + 1);
    },
    // 兜底路径：滑出渲染窗口/换清晰度重挂/切源/关闭信息流才走 dispose（相邻划走只 pause
    // 不 dispose，那条路由 setActive 负责）；video 已拆但引用仍持有最终 currentTime
    // （见 session.js dispose），在此上报离开时刻的观看进度
    onDisposed: function(session, video) {
      if (session.slide._watchTimer) {
        clearTimeout(session.slide._watchTimer);
        session.slide._watchTimer = null;
      }
      reportLeave(session, video, "dispose");
    }
  };
  function videoStageVisible(video) {
    return !!(video && video.offsetParent !== null);
  }
  setSessionHooks(SESSION_HOOKS);
  function renderWindow() {
    if (!scroller) return;
    var cur = FeedStore.current;
    var lo = Math.max(0, cur - CFG.win.back), hi = cur + CFG.win.fwd;
    for (var i = lo; i <= hi && i < FeedStore.items.length; i++) {
      var slide = slideAt(i);
      if (!slide) {
        slide = buildSlide(FeedStore.items[i], i, scrollToIndex);
        scroller.appendChild(slide);
        if (io) io.observe(slide);
      }
      if ((i === cur || i === cur + CFG.win.fwd) && !slide.querySelector("video") && slide.dataset.state !== "error") {
        attachVideo(slide, FeedStore.items[i], i);
      }
    }
    var slides = scroller.querySelectorAll(".acsv-slide");
    Array.prototype.forEach.call(slides, function(s) {
      var idx = Number(s.dataset.idx);
      if (idx < cur - CFG.win.back || idx > cur + CFG.win.fwd) {
        if (s._session) {
          s._session.dispose();
          s._session = null;
        }
        if (idx < cur - CFG.win.back - 1 || idx > cur + CFG.win.fwd + 2) {
          var c = s.querySelector(".acsv-ambient");
          if (c) c.remove();
        }
      }
    });
    var ordered = Array.prototype.slice.call(slides).sort(function(a, b) {
      return Number(a.dataset.idx) - Number(b.dataset.idx);
    });
    if (scroller.children.length !== ordered.length || Array.prototype.some.call(scroller.children, function(c, k) {
      return c !== ordered[k];
    })) {
      ordered.forEach(function(s) {
        scroller.appendChild(s);
      });
    }
    updateArrows(slideAt(cur));
  }
  function setActive(idx) {
    if (FeedStore.current !== idx) reportLeaveCurrent("swipe");
    syncHash(idx);
    FeedStore.current = idx;
    FeedStore.ensureMore().then(renderWindow);
    prewarm(idx);
    updateArrows(slideAt(idx));
    if (isOpenComments()) {
      var itC = FeedStore.items[idx];
      if (itC && commentState.sourceId !== itC.id) openComments(itC.id, itC.stype, itC.shareUrl, itC.kind);
    }
    for (var wi = Math.max(0, idx - CFG.win.back); wi <= idx + CFG.win.fwd && wi < FeedStore.items.length; wi++) {
      var ws = slideAt(wi);
      if (!ws || !offCurrent(ws)) continue;
      var wv = ws.querySelector("video");
      if (wv && !wv.paused) {
        wv.pause();
        if (ws._dmLayer) ws._dmLayer.stop();
      }
    }
    var curSlide = slideAt(idx);
    var cur = curSlide && curSlide.querySelector("video");
    if (cur) {
      cur.muted = !pb.soundOn;
      if (videoStageVisible(cur)) {
        if (!curSlide._userPaused) playVideo(cur);
        if (!pb.soundOn && !pb.firstGestureSeen) {
          if (!curSlide.querySelector(".acsv-hint")) showSoundHint(curSlide);
        }
      }
    }
  }
  var landTimer = null;
  function landAt(idx, near) {
    var slide = slideAt(idx);
    if (!slide) return;
    var target = slide.offsetTop;
    scroller.scrollTo({ top: target, behavior: near ? "smooth" : "auto" });
    setActive(idx);
    if (near) return;
    var tries = 2;
    (function settle() {
      if (!scroller || tries-- <= 0) return;
      var s = slideAt(idx);
      if (!s) return;
      var d = s.offsetTop - scroller.scrollTop;
      if (Math.abs(d) > 2 && Math.abs(d) < scroller.clientHeight / 2) scroller.scrollTop = s.offsetTop;
      requestAnimationFrame(settle);
    })();
  }
  function landWhenVisible(idx, near, tries) {
    if (!scroller) return;
    if (!stageVisible()) {
      if (tries <= 0) return;
      landTimer = setTimeout(function() {
        landTimer = null;
        landWhenVisible(idx, near, tries - 1);
      }, 16);
      return;
    }
    landAt(idx, near);
  }
  function scrollToIndex(idx) {
    if (!scroller) return;
    FeedStore.ensureMore().then(function() {
      if (!scroller) return;
      var near = Math.abs(idx - FeedStore.current) <= 1;
      if (!slideAt(idx) && idx < FeedStore.items.length) {
        if (FeedStore.current !== idx) reportLeaveCurrent("swipe");
        FeedStore.current = idx;
      }
      renderWindow();
      if (landTimer) {
        clearTimeout(landTimer);
        landTimer = null;
      }
      if (!stageVisible()) return landWhenVisible(idx, near, 60);
      landAt(idx, near);
    });
  }
  function clearSpinner() {
    if (!scroller) return;
    var sp = scroller.querySelector(".acsv-spinner");
    if (sp) sp.remove();
  }
  function showLoadError(msg, retry) {
    if (!scroller) return;
    clearSpinner();
    var box = el("div", "acsv-errbox");
    box.style.display = "grid";
    box.appendChild(el("p", null, msg));
    var b = el("button", "acsv-retry", "重试");
    b.addEventListener("click", function() {
      box.remove();
      FeedStore.reset();
      if (!scroller) return;
      scroller.appendChild(el("div", "acsv-spinner"));
      retry();
    });
    box.appendChild(b);
    scroller.appendChild(box);
  }
  function loadInitial() {
    FeedStore.ensureMore().then(function() {
      if (!scroller) return;
      if (!FeedStore.items.length) {
        showLoadError("内容加载失败，请检查网络后重试", loadInitial);
        return;
      }
      clearSpinner();
      renderWindow();
      var slide = slideAt(FeedStore.current);
      if (slide) scroller.scrollTop = slide.offsetTop;
      setActive(FeedStore.current);
    });
  }
  function resetStream() {
    if (!scroller) return;
    Array.prototype.forEach.call(scroller.querySelectorAll(".acsv-slide"), function(sl) {
      if (sl._session) {
        sl._session.dispose();
        sl._session = null;
      }
    });
    scroller.innerHTML = "";
    scroller.scrollTop = 0;
    if (io) io.disconnect();
    io = makeIO();
  }
  function loadDeepLink(mid, src) {
    setAppliedMid(mid);
    cancelHashSync();
    FeedStore.reset();
    resetStream();
    if (scroller) scroller.appendChild(el("div", "acsv-spinner"));
    API.deepLink(mid, src).then(function(hit) {
      if (!scroller) return;
      if (!hit) {
        showLoadError("链接的视频加载失败，请重试", function() {
          loadDeepLink(mid, src);
        });
        return;
      }
      setSource(hit.source);
      updateSegUI();
      FeedStore.reset();
      FeedStore.items.push(hit.item);
      FeedStore.seen[hit.item.id] = 1;
      FeedStore.current = 0;
      clearSpinner();
      renderWindow();
      setActive(0);
    });
  }
  function mount() {
    dbg("mount-enter");
    if (root) return;
    ensureStyle();
    preconnectSeed();
    resetForMount();
    setRoot(el("div"));
    root.id = "acsv-root";
    root.className = "acsv-root";
    var tb = buildTopbar(root, {
      onSearch: navSearch,
      // ✕ 单一意义（0.9.74 用户裁决）：退出脚本回首页——视图出口是 dock（常驻）+ Esc，
      // 深界面另有顶栏「向左返回」（onBack → 来源链顶）
      onExit: exitFeed,
      onBack: backFromOrigin,
      onSource: switchSource,
      onDrawer: openDrawer,
      onRelease: openReleaseNotes,
      getSource
    });
    setScroller(el("div", "acsv-scroller"));
    root.appendChild(scroller);
    buildDrawer();
    syncCommentVars();
    root.appendChild(el("div", "acsv-toast"));
    scroller.appendChild(el("div", "acsv-spinner"));
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.appendChild(root);
    buildDock(root);
    mountBadge(tb.imBtn, tb.imBtn.querySelector(".acsv-im-badge"));
    dbg("root-appended");
    releaseCheck();
    io = makeIO();
    setupInputHandlers({ scrollToIndex, exitFeed });
    var route = parseRoute();
    if (route.mid) {
      loadDeepLink(route.mid, route.src);
    } else {
      resetHomePager();
      UpVideos.feedActive = false;
      setAppliedMid(null);
      FeedStore.reset();
      loadInitial();
    }
  }
  function unmount() {
    if (!root) return;
    cancelHashSync();
    setAppliedMid(null);
    if (io) {
      io.disconnect();
      io = null;
    }
    teardownInputHandlers();
    cancelSeekHold();
    stopAll();
    teardownIm();
    teardownRelease();
    resetDrawerSlot();
    teardownTopbar();
    teardownDock();
    teardownViews();
    overlayTeardown();
    Array.prototype.forEach.call(root.querySelectorAll(".acsv-slide"), function(s) {
      if (s._session) {
        s._session.dispose();
        s._session = null;
      }
    });
    var vs = root.querySelectorAll("video");
    Array.prototype.forEach.call(vs, function(v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
    root.remove();
    setRoot(null);
    setScroller(null);
    setCommentDrawer(null);
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  function updateSegUI() {
    syncTopbarSeg();
  }
  function navSearch(kw) {
    var base = CFG.hash + "/search";
    location.hash = kw ? base + "/" + encodeURIComponent(kw) : base;
  }
  function switchSource(s) {
    if (!scroller || getSource() === s) return;
    setSource(s);
    updateSegUI();
    closeComments();
    stopAll();
    resetStream();
    FeedStore.reset();
    loadInitial();
  }
  function exitFeed() {
    unmount();
    if (isFeedRoute()) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  function syncRouteFeed() {
    if (!root) return;
    var r = parseRoute();
    if (r.view || !r.mid) return;
    if (String(r.mid) === String(getAppliedMid())) return;
    for (var i = 0; i < FeedStore.items.length; i++) {
      if (String(FeedStore.items[i].id) === String(r.mid)) {
        setAppliedMid(r.mid);
        scrollToIndex(i);
        return;
      }
    }
    loadDeepLink(r.mid, r.src);
  }
  function toggle() {
    dbg("toggle:" + (isFeedRoute() ? "feed" : "off"));
    if (isFeedRoute()) {
      mount();
      syncRouteFeed();
      syncRouteView();
    } else {
      teardownViews();
      unmount();
    }
    dbg("toggle-done");
  }
  testHook("scrollTo", function(idx) {
    scrollToIndex(idx);
  });

  // src/nav.js
  var NAV_LABELS = CFG.nav.labels;
  function tryInjectNav() {
    if (document.querySelector("[data-acsv-nav]")) return true;
    var links = document.querySelectorAll(
      "#pagelet_navigation a, #pagelet_header a, header a, .normal-nav a, .guide-list a, nav a"
    );
    var target = null, label = "";
    for (var i = 0; i < links.length; i++) {
      var t = (links[i].textContent || "").trim();
      if (NAV_LABELS.indexOf(t) !== -1) {
        target = links[i];
        label = t;
        break;
      }
    }
    if (!target) return false;
    var li = target.closest("li") || target.parentElement;
    if (!li || !li.parentNode) return false;
    var clone = li.cloneNode(true);
    var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
    var node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.trim() === label) {
        node.nodeValue = "小视频";
        break;
      }
    }
    var anchors = clone.querySelectorAll("a");
    var a = anchors.length ? anchors[anchors.length - 1] : clone.querySelector("a");
    if (!a) a = clone;
    a.href = "#" + CFG.hash;
    a.removeAttribute("target");
    if (a.classList) a.classList.remove("active");
    a.title = "AcFun 小视频 · 竖刷模式（油猴脚本）";
    clone.setAttribute("data-acsv-nav", "1");
    clone.querySelectorAll("*").forEach(function(n) {
      n.removeAttribute("id");
    });
    li.parentNode.insertBefore(clone, li.nextSibling);
    return true;
  }
  var navObserver = null;
  function watchNav() {
    var ok = false;
    for (var i = 0; i < CFG.nav.pages.length; i++) {
      if (CFG.nav.pages[i].test(location.pathname)) {
        ok = true;
        break;
      }
    }
    if (!ok) return;
    if (tryInjectNav()) return;
    navObserver = new MutationObserver(function() {
      if (tryInjectNav()) {
        navObserver.disconnect();
        navObserver = null;
      }
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() {
      if (navObserver) {
        navObserver.disconnect();
        navObserver = null;
      }
      if (document.getElementById("acsv-fab") || document.querySelector("[data-acsv-nav]")) return;
      var fab = el("button", "acsv-fab", "▶ AcFun 小视频");
      fab.id = "acsv-fab";
      fab.addEventListener("click", function() {
        location.hash = CFG.hash;
      });
      document.body.appendChild(fab);
    }, CFG.time.navWait);
  }

  // src/imnative.js
  var UNSUPPORTED = "不支持查看此消息，请前往最新版客户端查看。";
  var SHADOW_CSS = ":host{display:block}.prologue{margin:0 0 6px;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap}.item{display:block;width:228px;max-width:100%;margin:4px 0;border:1px solid #e7e7e7;border-radius:8px;background:#fff;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .15s}.item:hover{border-color:#fd4c5d}a.item:hover .title{color:#fd4c5d}.coverbox{display:block;position:relative}.cover{display:block;width:100%;height:126px;object-fit:cover;background:#f2f2f2}.meta{display:flex;align-items:center;gap:4px;padding:5px 8px;font-size:11px;color:#999}.meta .icon{display:inline-block;width:12px;height:12px;flex:none;background:currentColor;-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}.dur{margin-left:auto;font-variant-numeric:tabular-nums}.title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;padding:0 9px 9px;font-size:12px;line-height:1.45;color:#333}.qstrip{display:block;margin:0 0 6px;padding:4px 8px;border-left:2px solid #fd4c5d;background:rgba(0,0,0,.045);border-radius:3px;font-size:12px;color:#666;line-height:1.5;min-width:0}.qstrip.link{cursor:pointer}.qstrip.link:hover{background:rgba(0,0,0,.08)}.qstrip .p{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qbody{display:block;margin:0;font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap}.cshare{display:block;width:228px;max-width:100%;margin:4px 0;border:1px solid #e7e7e7;border-radius:8px;background:#fff;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .15s}a.cshare:hover{border-color:#fd4c5d}.cshare .quote{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;padding:8px 10px;border-left:2px solid #fd4c5d;font-size:13px;line-height:1.55;color:#333;white-space:pre-wrap;word-break:break-word}.cshare .quote .acsv-emotimg{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}.cshare .quote .ubb-emotion{display:inline-block;max-height:34px;max-width:68px;vertical-align:middle;margin:1px 2px}.cshare .quote .ubb-imgc{display:block;max-width:min(200px,100%);max-height:150px;border-radius:8px;margin-top:6px;cursor:zoom-in}.cshare .src{display:flex;align-items:center;gap:8px;padding:7px 9px;border-top:1px solid #efefef}.cshare .srcimg{flex:none;width:56px;height:36px;object-fit:cover;border-radius:4px;background:#f2f2f2}.cshare .srct{flex:1;min-width:0;font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}";
  var mo = null;
  var moTimer = null;
  function bootNativeIm() {
    console.info("[acsv-im] 原生页增强挂载 v0.9.74：分享卡走 DOM-only，内核探活中");
    watch();
    ensureEmotionMap();
    var n = 0;
    (function waitKernel() {
      if (kernel()) {
        console.info("[acsv-im] 页面 ImSdk 内核就位，占位替换已解锁");
        enhance();
        return;
      }
      setTimeout(waitKernel, ++n > 120 ? 1e3 : 250);
    })();
  }
  function watch() {
    if (mo) return;
    try {
      mo = new MutationObserver(function() {
        clearTimeout(moTimer);
        moTimer = setTimeout(enhance, 200);
      });
      mo.observe(
        document.querySelector(".container-im") || document.body,
        { childList: true, subtree: true }
      );
    } catch (e) {
    }
  }
  function kernel() {
    try {
      var uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      var sdk = uw && uw.ImSdk || window.ImSdk;
      return sdk && sdk.instance && sdk.instance.kernel || null;
    } catch (e) {
      return null;
    }
  }
  function enhance() {
    try {
      enhanceChat();
    } catch (e) {
    }
    try {
      enhanceList();
    } catch (e) {
    }
  }
  function enhanceChat() {
    var msgCache = {};
    document.querySelectorAll(".chat-content-item .message").forEach(function(msgEl) {
      if (msgEl.getAttribute("data-acsv")) return;
      var content = msgEl.querySelector(".content");
      if (!content) return;
      var text = content.textContent.trim();
      if (text === UNSUPPORTED) {
        var msg = pairMessage(msgEl, msgCache);
        if (!msg) return;
        msgEl.setAttribute("data-acsv", "1");
        var card = parseCard(msg);
        if (card) renderCard(content, card);
        else if (renderQuote(content, msg)) {
        } else {
          var tip = degradeText(msg);
          if (tip && tip !== UNSUPPORTED) content.textContent = tip;
        }
        return;
      }
      if (!msgEl.getAttribute("data-acsv-quote")) {
        var m2 = pairMessage(msgEl, msgCache);
        if (m2) {
          msgEl.setAttribute("data-acsv-quote", "1");
          var q2x = quoteExtraOf(m2);
          var q2 = quoteOf(m2) || q2x;
          if (q2 && (q2.preview || q2.seqId)) {
            var trimLen = quoteWireTrimLen(content.textContent, q2);
            if (trimLen > 0) {
              if (stripLeadingContent(content, trimLen)) {
                console.info("[acsv-im] 引用正文剥离 wire 前缀 " + trimLen + " 字");
              } else {
                console.info("[acsv-im] 引用正文 DOM 跨界，放弃剥离保留原文：" + bodySample(content));
              }
            } else if (q2x) {
              console.info("[acsv-im] 引用正文未识别拼接形态，保留原文：" + bodySample(content));
            }
            prependQuoteStrip(content, q2);
            return;
          }
        }
      }
      tryShareCard(msgEl, content, msgCache);
    });
  }
  function pairMessage(msgEl, msgCache) {
    var k = kernel();
    if (!k) return null;
    var thread = msgEl.closest(".chat-content-item");
    var tid = thread ? String(thread.getAttribute("data-id") || "").replace(/^0_/, "") : "";
    if (!tid) return null;
    if (!msgCache[tid]) {
      var sess = null;
      try {
        (k.getSessions() || []).some(function(s) {
          if (String(s.targetId) === tid) {
            sess = s;
            return true;
          }
          return false;
        });
      } catch (e) {
      }
      var by = {};
      if (sess) {
        try {
          (k.getMessages(sess) || []).forEach(function(m) {
            var raw = m.rawMsg || {};
            if (raw.seqId !== void 0) by[String(raw.seqId)] = m;
            if (raw.id) by["id:" + raw.id] = m;
          });
        } catch (e) {
        }
      }
      msgCache[tid] = by;
    }
    return msgCache[tid]["id:" + msgEl.getAttribute("data-id")] || msgCache[tid][String(msgEl.getAttribute("data-seq-id"))] || null;
  }
  function enhanceList() {
    var k = kernel();
    var byUid = null;
    document.querySelectorAll(".chat-nav-item[data-user-id]").forEach(function(nav) {
      var span = nav.querySelector(".content-last-message");
      if (!span || span.getAttribute("data-acsv")) return;
      if (span.textContent.trim() !== UNSUPPORTED) {
        if (!span.getAttribute("data-acsv-share")) {
          var sh = parseShare(span.textContent);
          if (sh) {
            span.setAttribute("data-acsv-share", "1");
            span.textContent = (isCommentShare(sh.title) ? "[评论] " : "[分享] ") + (sh.title ? sh.title.slice(0, 30) : "推荐视频");
          }
        }
        return;
      }
      if (!k) return;
      if (!byUid) {
        byUid = {};
        (k.getSessions() || []).forEach(function(s) {
          byUid[String(s.targetId)] = s;
        });
      }
      var sess = byUid[nav.getAttribute("data-user-id")];
      var last = sess && sess.lastMessage;
      if (!last) return;
      span.setAttribute("data-acsv", "1");
      var ct = msgContentType(last);
      if (ct === 10001 || ct === 12) {
        var prev = previewOfMessage(last);
        if (prev) span.textContent = prev;
      } else {
        var tip = degradeText(last);
        if (tip && tip !== UNSUPPORTED) span.textContent = tip;
      }
    });
  }
  function renderCard(content, card) {
    content.textContent = "";
    appendShadow(content, card.resourceBody.map(function(r) {
      return cardItem(r);
    }), card.prologue);
  }
  function enrichShare(share, mount2) {
    AppAPI.dougaCard(share.acId).then(function(c) {
      if (!c) {
        console.warn("[acsv-im] 分享卡详情拉取失败 ac" + share.acId + "（保持纯文本）");
        return;
      }
      mount2(c);
    });
  }
  function tryShareCard(msgEl, content, msgCache) {
    if (msgEl.getAttribute("data-acsv-share")) return;
    var raw = msgEl.getAttribute("data-text") || "";
    var plain = content.textContent;
    var share = parseShare(raw) || parseShare(plain);
    if (!share) {
      if (!/acfun\.cn/i.test(raw) && !/acfun\.cn/i.test(plain)) return;
      var msg = pairMessage(msgEl, msgCache);
      if (msg) share = parseShare(msgTextOf(msg));
    }
    if (!share) return;
    msgEl.setAttribute("data-acsv-share", "1");
    console.info("[acsv-im] 识别到分享消息 ac" + share.acId + "，拉取卡片详情");
    enrichShare(share, function(c) {
      if (!content.isConnected) return;
      if (isCommentShare(share.title)) {
        content.textContent = share.note || "";
        var cmt = cmtShareOf(pairMessage(msgEl, msgCache));
        var it = cshareItem(
          share.title,
          share.url,
          cmt ? ubbQuoteHtml(commentShareAuthor(share.title), cmt.content) : ""
        );
        if (c.cover) it.img.src = c.cover;
        if (c.title) it.srct.textContent = c.title;
        appendShadow(content, [it.item]);
        return;
      }
      content.textContent = share.note;
      appendShadow(content, [cardItem({
        coverUrl: c.cover,
        viewCountShow: c.view,
        commentCountShow: c.comment,
        durationSec: c.durationSec,
        title: c.title || share.title
      }, share.url)]);
    });
  }
  function appendShadow(content, items, prologue) {
    var sh = attachShadowRoot(content);
    content.appendChild(sh.host);
    if (prologue) sh.root.appendChild(el("div", "prologue", prologue));
    items.forEach(function(item) {
      sh.root.appendChild(item);
    });
  }
  function attachShadowRoot(content) {
    var host = document.createElement("div");
    var root2 = host.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = SHADOW_CSS;
    root2.appendChild(style);
    return { host, root: root2 };
  }
  function quoteStripEl(q2) {
    var s = el("div", "qstrip" + (q2.seqId ? " link" : ""));
    s.appendChild(el("span", "p", q2.preview || "[原消息]"));
    if (q2.seqId) {
      s.addEventListener("click", function(ev) {
        ev.stopPropagation();
        try {
          var t = document.querySelector('.chat-content-item .message[data-seq-id="' + String(q2.seqId).replace(/"/g, "") + '"]');
          if (t) t.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch (e) {
        }
      });
    }
    return s;
  }
  function renderQuote(content, msg) {
    var q2 = quoteOf(msg) || quoteExtraOf(msg);
    if (!q2) return false;
    content.textContent = "";
    var sh = attachShadowRoot(content);
    content.appendChild(sh.host);
    sh.root.appendChild(quoteStripEl(q2));
    sh.root.appendChild(el("div", "qbody", q2.text));
    return true;
  }
  function prependQuoteStrip(content, q2) {
    var sh = attachShadowRoot(content);
    sh.root.appendChild(quoteStripEl(q2));
    content.insertBefore(sh.host, content.firstChild);
  }
  function bodySample(content) {
    return JSON.stringify(String(content.textContent || "").slice(0, 80));
  }
  function stripLeadingContent(content, trimLen) {
    while (content.childNodes.length === 1 && content.firstChild.nodeType === 1 && content.firstChild.textContent === content.textContent) {
      content = content.firstChild;
    }
    var kids = Array.prototype.slice.call(content.childNodes);
    var acc = 0, i, k, n;
    for (i = 0; i < kids.length; i++) {
      if (acc >= trimLen) break;
      k = kids[i];
      n = (k.nodeType === 3 ? k.nodeValue : k.textContent) || "";
      if (acc + n.length > trimLen && k.nodeType !== 3) return false;
      acc += n.length;
    }
    acc = 0;
    for (i = 0; i < kids.length && acc <= trimLen; i++) {
      k = kids[i];
      n = (k.nodeType === 3 ? k.nodeValue : k.textContent) || "";
      if (acc === trimLen) {
        if (n !== "") break;
        content.removeChild(k);
        continue;
      }
      if (acc + n.length > trimLen) {
        k.nodeValue = k.nodeValue.slice(trimLen - acc);
        acc = trimLen;
      } else {
        content.removeChild(k);
        acc += n.length;
      }
    }
    return true;
  }
  function cardItem(r, hrefOverride) {
    var href = hrefOverride || (Number(r.resourceType) === 2 && r.resourceId ? CFG.api.videoBase + r.resourceId : "");
    var a = el(href ? "a" : "div", "item");
    if (href) {
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
    }
    var box = el("span", "coverbox");
    var img = el("img", "cover");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = r.coverUrl || "";
    img.addEventListener("error", function() {
      img.style.display = "none";
    });
    box.appendChild(img);
    var meta = el("span", "meta");
    var playIcon = el("i", "icon");
    playIcon.style.setProperty("--i", 'url("' + ICON_SVGS.play + '")');
    meta.appendChild(playIcon);
    meta.appendChild(el("span", null, r.viewCountShow || ""));
    var commentIcon = el("i", "icon");
    commentIcon.style.setProperty("--i", 'url("' + ICON_SVGS.comment + '")');
    meta.appendChild(commentIcon);
    meta.appendChild(el("span", null, r.commentCountShow || ""));
    if (r.durationSec) meta.appendChild(el("span", "dur", fmtDur(r.durationSec)));
    box.appendChild(meta);
    a.appendChild(box);
    if (r.title) a.appendChild(el("span", "title", r.title));
    a.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    return a;
  }
  function cshareItem(text, href, html) {
    var a = el(href ? "a" : "div", "cshare");
    if (href) {
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
    }
    var quote = el("span", "quote");
    quote.innerHTML = html || emotify(esc(text));
    quote.addEventListener("click", function(ev) {
      var im = ev.target && ev.target.closest ? ev.target.closest(".ubb-imgc") : null;
      if (!im) return;
      ev.preventDefault();
      ev.stopPropagation();
      openImageViewer(im.getAttribute("src") || "");
    });
    a.appendChild(quote);
    var src = el("span", "src");
    var img = el("img", "srcimg");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.style.display = "none";
    img.addEventListener("load", function() {
      img.style.display = "";
    });
    img.addEventListener("error", function() {
      img.style.display = "none";
    });
    src.appendChild(img);
    var srct = el("span", "srct", "查看来源作品");
    src.appendChild(srct);
    a.appendChild(src);
    a.addEventListener("click", function(ev) {
      ev.stopPropagation();
    });
    return { item: a, img, srct };
  }

  // src/mypage.js
  var meCache = null;
  function rowList(parent, cls) {
    var list = el("div", "acsv-vlist acsv-megrid " + cls);
    parent.appendChild(list);
    return list;
  }
  function skeleton(listEl) {
    var nodes = [];
    for (var i = 0; i < CFG.view.me.skel; i++) {
      var d = el("div", "acsv-gskel");
      nodes.push(d);
      listEl.appendChild(d);
    }
    return function() {
      nodes.forEach(function(d2) {
        if (d2.parentNode) d2.parentNode.removeChild(d2);
      });
    };
  }
  function buildMeCard(slot) {
    var uid = selfUid();
    if (!uid) return;
    if (meCache && Date.now() - meCache.at < CFG.view.me.cardTtl) {
      render(meCache.card);
      return;
    }
    postForm(CFG.api.userCard, "ids=" + uid).then(function(j) {
      var card = meCardOf(j, uid);
      if (!card) return;
      meCache = { at: Date.now(), card };
      if (!slot.isConnected || slot.firstChild) return;
      render(card);
    }, function() {
    });
    function render(card) {
      var box = el("div", "acsv-mecard");
      if (card.avatar) {
        var av = el("img", "acsv-mecard-av");
        av.src = card.avatar;
        av.referrerPolicy = "no-referrer";
        av.loading = "lazy";
        box.appendChild(av);
      } else {
        box.appendChild(el("div", "acsv-mecard-av"));
      }
      var info = el("div", "acsv-mecard-info");
      info.appendChild(el("div", "acsv-mecard-name", card.name || ""));
      var stats2 = el("div", "acsv-mecard-stats");
      addStat(stats2, card.follow, "关注");
      addStat(stats2, card.fans, "粉丝");
      addStat(stats2, card.contrib, "投稿");
      if (stats2.firstChild) info.appendChild(stats2);
      info.appendChild(el("div", "acsv-mecard-id", "UID：" + card.uid));
      if (card.sign) info.appendChild(el("div", "acsv-mecard-sign", card.sign));
      box.appendChild(info);
      slot.appendChild(box);
    }
    function addStat(host, num, label) {
      if (num == null) return;
      var s = el("div", "acsv-mecard-stat");
      s.appendChild(el("b", "", fmt(num)));
      s.appendChild(document.createTextNode(label));
      host.appendChild(s);
    }
  }
  function buildHistory(panel) {
    var list = rowList(panel, "hist");
    var btn = moreBtn(load);
    panel.appendChild(btn);
    var pageNo = 0;
    function load(b) {
      var gone = skeleton(list);
      postForm(
        CFG.api.history,
        "pageNo=" + (pageNo + 1) + "&pageSize=" + CFG.view.pageSize + "&resourceTypes=1&resourceTypes=2"
      ).then(function(j) {
        gone();
        if (!list.isConnected) return;
        if (b) {
          b.disabled = false;
          b.textContent = "加载更多";
        }
        var rows = [];
        (j && j.histories || []).forEach(function(raw) {
          var pi = panelItem("history", raw);
          if (pi) rows.push(pi);
        });
        pageNo++;
        rows.forEach(function(pi) {
          list.appendChild(gridCardOf(pi));
        });
        if (rows.length < CFG.view.pageSize && b) b.style.display = "none";
        if (!rows.length && pageNo === 1) list.appendChild(el("div", "acsv-vempty", "暂无观看记录"));
      }, function() {
        gone();
        if (!list.isConnected) return;
        if (b) {
          b.disabled = false;
          b.textContent = "加载失败，点击重试";
        } else if (pageNo === 0) list.appendChild(el("div", "acsv-vempty", "加载失败，稍后重试"));
      });
    }
    load(null);
  }
  function buildFav(panel) {
    var chips = el("div", "acsv-vchips");
    var list = rowList(panel, "fav");
    var btn = moreBtn(null);
    panel.appendChild(btn);
    var folderId = null, page = 0;
    btn.addEventListener("click", function() {
      if (folderId) load(null);
    });
    var gone = skeleton(list);
    postForm(CFG.api.favFolderList, "").then(function(j) {
      gone();
      if (!list.isConnected) return;
      var folders = j && (j.dataList || j.data) || [];
      if (!folders.length) {
        panel.insertBefore(el("div", "acsv-vempty", "还没有收藏夹"), list);
        btn.style.display = "none";
        return;
      }
      folders.forEach(function(f, i) {
        var c = el(
          "button",
          "acsv-vchip" + (i === 0 ? " on" : ""),
          (f.name || "收藏夹") + (f.resourceCount != null ? " " + f.resourceCount : "")
        );
        c.addEventListener("click", function() {
          if (folderId === f.folderId) return;
          Array.prototype.forEach.call(chips.children, function(x) {
            x.classList.remove("on");
          });
          c.classList.add("on");
          folderId = f.folderId;
          page = 0;
          list.innerHTML = "";
          btn.style.display = "";
          btn.textContent = "加载更多";
          load(null);
        });
        chips.appendChild(c);
        if (i === 0) folderId = f.folderId;
      });
      panel.insertBefore(chips, list);
      if (folderId) load(null);
    }, function() {
      gone();
      if (!list.isConnected) return;
      panel.insertBefore(el("div", "acsv-vempty", "收藏夹加载失败"), list);
      btn.style.display = "none";
    });
    function load(b) {
      postForm(
        CFG.api.favDougaList,
        "folderId=" + folderId + "&page=" + (page + 1) + "&perpage=" + CFG.view.pageSize
      ).then(function(j) {
        if (!list.isConnected) return;
        page++;
        if (b) {
          b.disabled = false;
          b.textContent = "加载更多";
        }
        var rows = [];
        (j && j.favoriteList || []).forEach(function(raw) {
          var pi = panelItem("fav", raw);
          if (pi) rows.push(pi);
        });
        rows.forEach(function(pi) {
          list.appendChild(gridCardOf(pi));
        });
        if (j && rows.length < CFG.view.pageSize || !rows.length) btn.style.display = "none";
        if (!rows.length && page === 1) list.appendChild(el("div", "acsv-vempty", "这个夹还没有收藏"));
      }, function() {
        if (!list.isConnected) return;
        if (b) {
          b.disabled = false;
          b.textContent = "加载失败，点击重试";
        }
      });
    }
  }
  function buildMyView(body) {
    var wrap = el("div", "acsv-mewrap");
    body.appendChild(wrap);
    var cardSlot = el("div", "acsv-mecard-slot");
    wrap.appendChild(cardSlot);
    buildMeCard(cardSlot);
    var tabRow = el("div", "acsv-metabs");
    wrap.appendChild(tabRow);
    var panelHist = el("div", "acsv-mepanel");
    var panelFav = el("div", "acsv-mepanel");
    panelHist.setAttribute("data-tab", "hist");
    panelFav.setAttribute("data-tab", "fav");
    panelFav.style.display = "none";
    wrap.appendChild(panelHist);
    wrap.appendChild(panelFav);
    var panels = {
      hist: { el: panelHist, build: buildHistory, inited: false, name: "观看历史" },
      fav: { el: panelFav, build: buildFav, inited: false, name: "收藏夹" }
    };
    Object.keys(panels).forEach(function(id) {
      var b = el("button", "acsv-metab", panels[id].name);
      b.type = "button";
      b.setAttribute("data-tab", id);
      b.addEventListener("click", function() {
        select(id);
      });
      tabRow.appendChild(b);
    });
    function select(id) {
      Object.keys(panels).forEach(function(k) {
        panels[k].el.style.display = k === id ? "" : "none";
      });
      Array.prototype.forEach.call(tabRow.children, function(b) {
        b.classList.toggle("on", b.getAttribute("data-tab") === id);
      });
      var p = panels[id];
      if (!p.inited) {
        p.inited = true;
        p.build(p.el);
      }
    }
    select("hist");
  }
  registerView({ id: "my", build: buildMyView });

  // src/zone.js
  var navTreeFlight = singleFlight(function() {
    return postForm(CFG.api.navTree, "").then(function(nv) {
      return nv && nv.data ? nv.data : [];
    }, function() {
      return [];
    });
  });
  function subChannelsOf(tree, name) {
    var hit = null;
    (function walk(list) {
      (list || []).forEach(function(n) {
        if (hit) return;
        if (n.navName === name) hit = n;
        else walk(n.children);
      });
    })(tree);
    return hit && hit.children ? hit.children.map(function(c) {
      return { id: c.cid, name: c.navName };
    }).filter(function(c) {
      return c.id;
    }) : [];
  }
  function buildZoneView(body) {
    var wrap = el("div", "acsv-zone-wrap");
    var zoneChips = el("div", "acsv-vchips");
    var subChips = el("div", "acsv-vchips");
    var periodChips = el("div", "acsv-vchips");
    var tip = el("div", "acsv-vtip");
    wrap.appendChild(zoneChips);
    wrap.appendChild(subChips);
    wrap.appendChild(periodChips);
    wrap.appendChild(tip);
    var head = el("div", "acsv-rlist-head");
    var hc1 = el("div", "acsv-rlist-hcell");
    hc1.appendChild(el("span", "acsv-rlist-hcn", "榜单"));
    hc1.appendChild(el("span", "acsv-rlist-hen", "Rank"));
    var hc2 = el("div", "acsv-rlist-hcell");
    hc2.appendChild(el("span", "acsv-rlist-hcn", "Up主"));
    hc2.appendChild(el("span", "acsv-rlist-hen", "Author"));
    head.appendChild(hc1);
    head.appendChild(hc2);
    wrap.appendChild(head);
    var list = el("div", "acsv-rlist");
    wrap.appendChild(list);
    body.appendChild(wrap);
    var curZone = CFG.view.zones[0];
    var curSub = null;
    var curPeriod = CFG.view.periods[0];
    function fillSubChips() {
      subChips.innerHTML = "";
      navTreeFlight.get().then(function(tree) {
        var subs = subChannelsOf(tree, curZone.name);
        if (!subs.length) return;
        var mk = function(label, sub, on) {
          var c = el("button", "acsv-vchip sm" + (on ? " on" : ""), label);
          c.addEventListener("click", function() {
            if (curSub === sub) return;
            Array.prototype.forEach.call(subChips.children, function(x) {
              x.classList.remove("on");
            });
            c.classList.add("on");
            curSub = sub;
            load();
          });
          subChips.appendChild(c);
        };
        mk("全部", null, true);
        subs.forEach(function(s) {
          mk(s.name, s.id, false);
        });
      });
    }
    function load() {
      list.innerHTML = "";
      list.appendChild(el("div", "acsv-vempty", "加载中…"));
      request(CFG.api.rank + "?channelId=" + curZone.id + "&subChannelId=" + (curSub == null ? "" : curSub) + "&rankLimit=" + CFG.view.rankLimit + "&rankPeriod=" + curPeriod, "GET").then(function(j) {
        var rows = [];
        (j && j.rankList || []).forEach(function(raw, i) {
          var pi = panelItem("rank", raw);
          if (pi) rows.push({ pi, rank: i + 1 });
        });
        list.innerHTML = "";
        if (!rows.length) {
          list.appendChild(el("div", "acsv-vempty", "该分区暂无榜单数据"));
          return;
        }
        rows.forEach(function(r) {
          var pair = el("div", "acsv-rlist-row");
          pair.appendChild(rowOf(r.pi, r.rank));
          pair.appendChild(upCardOf(r.pi));
          list.appendChild(pair);
        });
      }, function() {
        list.innerHTML = "";
        list.appendChild(el("div", "acsv-vempty", "加载失败（网络不可达）"));
      });
    }
    function syncTip() {
      tip.textContent = curZone.name + " / 依综合指数排序，每日更新一次";
    }
    CFG.view.zones.forEach(function(z, i) {
      var c = el("button", "acsv-vchip" + (i === 0 ? " on" : ""), z.name);
      c.addEventListener("click", function() {
        if (curZone.id === z.id) return;
        Array.prototype.forEach.call(zoneChips.children, function(x) {
          x.classList.remove("on");
        });
        c.classList.add("on");
        curZone = z;
        curSub = null;
        syncTip();
        fillSubChips();
        load();
      });
      zoneChips.appendChild(c);
    });
    CFG.view.periods.forEach(function(p, i) {
      var c = el("button", "acsv-vchip sm" + (i === 0 ? " on" : ""), CFG.view.periodNames[p] || p);
      c.addEventListener("click", function() {
        if (curPeriod === p) return;
        Array.prototype.forEach.call(periodChips.children, function(x) {
          x.classList.remove("on");
        });
        c.classList.add("on");
        curPeriod = p;
        load();
      });
      periodChips.appendChild(c);
    });
    syncTip();
    fillSubChips();
    load();
  }
  registerView({ id: "zone", build: buildZoneView });

  // src/searchview.js
  var seq = 0;
  var activeSubmit = null;
  function runSearch(kw, ui) {
    kw = String(kw || "").trim();
    if (!kw) {
      ui.grid.innerHTML = "";
      ui.foot.innerHTML = "";
      ui.setState("输入关键词，搜索 A 站视频");
      return;
    }
    var my = ++seq;
    ui.grid.innerHTML = "";
    ui.foot.innerHTML = "";
    ui.setState("搜索中…");
    var url = CFG.api.search + "?keyword=" + encodeURIComponent(kw);
    requestText(url).then(function(html) {
      if (my !== seq) return;
      var items = parseSearchItems(html);
      if (!items.length) {
        ui.setState("没有找到相关视频");
        return;
      }
      ui.setState("");
      items.forEach(function(it) {
        ui.grid.appendChild(gridCardOf({
          acId: it.acId,
          title: it.title,
          cover: it.cover,
          kind: "search",
          dur: it.dur,
          views: it.views,
          upName: it.upName,
          dateText: it.dateText
        }));
      });
      var a = el("a", "acsv-smfoot", "去 A 站搜索页看全部 ›");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      ui.foot.appendChild(a);
    }, function() {
      if (my !== seq) return;
      ui.setState("搜索失败（网络不可达），回车可重试");
    });
  }
  function buildSearchView(body, arg) {
    var state = el("div", "acsv-sstate");
    var grid = el("div", "acsv-sgrid");
    var foot = el("div", "acsv-sfoot");
    body.appendChild(state);
    body.appendChild(grid);
    body.appendChild(foot);
    var ui = {
      grid,
      foot,
      setState: function(txt) {
        state.textContent = txt || "";
        state.style.display = txt ? "" : "none";
      }
    };
    function submit(kw) {
      var target = CFG.hash + "/search" + (kw ? "/" + encodeURIComponent(kw) : "");
      if (location.hash === "#" + target) {
        runSearch(kw, ui);
        return;
      }
      location.hash = target;
    }
    setSearchHandler(submit);
    activeSubmit = submit;
    var kw0 = String(arg || "").trim();
    runSearch(kw0, ui);
    if (!kw0) focusSearch();
  }
  function teardownSearchView() {
    activeSubmit = null;
    setSearchHandler(null);
  }
  registerView({
    id: "search",
    build: buildSearchView,
    teardown: teardownSearchView,
    // 深界面（0.9.74）：关闭/返回=回来源界面（挂起链顶）；被播放层盖住时作为来源视图挂起
    deep: true,
    // 顶栏输入框是常驻单例：挂起期（DOM 还在、输入框归别人用）必须交还默认提交，
    // 否则本视图的闭包会劫持离开后写下的 Enter——复原时再接管回来
    suspend: function() {
      setSearchHandler(null);
    },
    resume: function() {
      if (activeSubmit) setSearchHandler(activeSubmit);
    }
  });

  // src/boot.js
  if (location.hostname === "message.acfun.cn") {
    setRoot(document.body);
    ivSt = document.createElement("style");
    ivSt.textContent = IMGVIEW_CSS;
    document.head.appendChild(ivSt);
    bootNativeIm();
  } else {
    dbgInit();
    ensureStyle();
    toggle();
    window.addEventListener("hashchange", toggle);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watchNav);
    } else {
      watchNav();
    }
    tryInjectSpace();
  }
  var ivSt;
})();

})();
