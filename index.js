var GoogleMaps = require('google-maps')
	, Noise = require('noisejs').Noise
	, dat = require('exdat')
  , glMatrix = require('gl-matrix')
  , raf = require('raf')
  , KeyListner = require('key-listener');

var vec2 = glMatrix.vec2
  , mat2 = mat2 = glMatrix.mat2

// config
GoogleMaps.KEY = 'AIzaSyCuKjnJWCoUMRLbVFNEkJoFVD0I73u_xJo';

var _noise = new Noise(Math.random());

var _container = document.createElement('div')
	, _map
	, _gui
	, _interval;

_container.id = 'map-container';

var _keyHandler = new KeyListner();

var _params = {
	maxMovementDist : 0.01
  , maxMovementDeg: 10
	, movementDelay: 100
	, flipped: false
	, wandering: true
  , flyingCursor: true
  , enlargeCursor: false
}


var _position = vec2.create();
var _movementVec = vec2.create();
var _scaledMovement = vec2.create();

var _cursorImg = new Image();
_cursorImg.src = "assets/cursor.png";
_cursorImg.id = "cursor";

// set initial movement vector
vec2.set(_movementVec, 1, 0);

// Normalizes the coords that tiles repeat across the x axis (horizontally)
// like the standard Google map tiles.
function getNormalizedCoord(coord, zoom) {
  var y = coord.y;
  var x = coord.x;

  // tile range in one direction range is dependent on zoom level
  // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
  var tileRange = 1 << zoom;

  // don't repeat across y-axis (vertically)
  if (y < 0 || y >= tileRange) {
    return null;
  }

  // repeat across x-axis
  if (x < 0 || x >= tileRange) {
    x = (x % tileRange + tileRange) % tileRange;
  }

  return {x: x, y: y};
}

GoogleMaps.load(function(google) {

	// add container
	document.body.appendChild(_container);
  document.body.appendChild(_cursorImg);

	// create moon map type
  var moonMapType = new google.maps.ImageMapType({
    getTileUrl: function(coord, zoom) {
        var normalizedCoord = getNormalizedCoord(coord, zoom);
        if (!normalizedCoord) {
          return null;
        }
        var bound = Math.pow(2, zoom);
        return '//mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw' +
            '/' + zoom + '/' + normalizedCoord.x + '/' +
            (bound - normalizedCoord.y - 1) + '.jpg';
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 9,
    minZoom: 0,
    radius: 1738000,
    name: 'Moon'
  });

	// create map
	_map = new google.maps.Map(_container, {
    center: {lat: 0, lng: 0}
    , zoom: 9
    , disableDefaultUI: true
    , mapTypeControlOptions: {
    	mapTypeIds: ['moon']
    }
	});

  _map.mapTypes.set('moon', moonMapType);
  _map.setMapTypeId('moon');

  // var maxMovementDist  = 500;
  var latLngRadius = .1;

  function randomPan() {
  	var center = _map.getCenter();
    console.log('current position', center.lat(), center.lng());
  	_map.panBy(randomRadius(center.lat(), center.lng()), randomRadius(center.lng(), center.lat()));
  }

  function randomCenter() {
  	var center = _map.getCenter();
  	_map.setCenter({
  		lat: randomLatLng(center.lat()),
  		lng: randomLatLng(center.lng())
  	});
  }

  function randomRadius(x, y) {
  	return (1 - (Math.random()*2)) * _params.maxMovementDist ;
  	// return _noise.simplex2(x, y, (new Date()).getTime()) * maxMovementDist ;
  }

  function randomLatLng(x) {
  	// return (1 - (Math.random()*2)) * maxMovementDist ;
  	return (_noise.simplex2(x, (new Date()).getTime()) * latLngRadius) + x;
  }

  // ok, here's what i think needs to happen. there needs to be a single vector
  // for movement. every tick that movement vector is rotated slightly.
  // then the map center position (LatLng) is transformed into a vector, and added to
  // the movement vector. next the pos vector is transformed back into LatLng
  // and then set as the new center
  
  // also: use requestAnimationFrame for movement rather than setTimeout

  function vectorMovement() {
    // vec2.add(_position, _position, createRotatedVector(_position, deg2Rad(5)));
    var rotationDeg = (Math.random()*(_params.maxMovementDeg*2)) - _params.maxMovementDeg;
    rotateVec2(_movementVec, _movementVec, deg2Rad(rotationDeg));
    vec2.scale(_scaledMovement, _movementVec, _params.maxMovementDist);
    vec2.add(_position, _position, _scaledMovement);

    if(_params.flyingCursor) {
      var rotation = (Math.PI/2) - Math.atan2(_movementVec[0], _movementVec[1]);
      setCssTransform(_cursorImg, "rotate("+rotation+"rad)");
    }

    // console.log('movement vec', vec2.len(_position), vec2.len(_scaledMovement), vec2.len(_movementVec));
    _map.setCenter(vec2ToLatLng(_position));
  }


  function rotateVec2(out, v, rad) {
    // console.log('createRotatedVector', v, rad);
    var m = mat2.create()
      , v2 = vec2.create();

    // radians
    mat2.rotate(m, m, rad);

    vec2.transformMat2(out, v, m);

    return out;
  }

  function deg2Rad(deg) {
    return deg * Math.PI / 180;
  }

  function getRandomVector(min, max) {
    var v = vec2.create();
    vec2.set(
      v
      , min + (Math.random()*(max-min))
      , min + (Math.random()*(max-min))
    );

    return v;
  }

  function vec2ToLatLng(v) {
    return new google.maps.LatLng(v[0], v[1]);
  }

  function setCssTransform(el, val) {
    var props = [
      'webkitTransform'
      , 'transform'
    ]

    props.forEach(function(p){
      el.style[p] = val;
    });

    return el;
  }


	_gui = new dat.GUI();
	_gui.add(_params, 'maxMovementDist', 0, 1);
  _gui.add(_params, 'maxMovementDeg', 0, 180);
	_gui.add(_params, 'movementDelay', 0, 5000).onChange(function(v) {
		stop();
		start();
	});
	_gui.add(_params, 'flipped').onChange(function(v) {
		_container.classList.toggle('flipped');
	});
	_gui.add(_params, 'wandering').onChange(function(v) {
		if(v) {
			start();
		}
	});
  _gui.add(_params, 'flyingCursor').onChange(function(v) {
    _cursorImg.style.display = v ? 'block' : 'none';
  });

  _gui.add(_params, 'enlargeCursor').onChange(function(v) {
    _cursorImg.src = v ? 'assets/cursor2x.png' : 'assets/cursor.png';
  });

  _gui.domElement.classList.toggle('hidden');


  _keyHandler.addListener(document, 'g', function() {
    // console.log('g key!', _gui.domElement);
    _gui.domElement.classList.toggle('hidden');
  });



	function start() {
    raf(function tick() {
      vectorMovement();
      if(_params.wandering) raf(tick);
    });
	}

 	if(_params.wandering) {
 		start();
 	}

});