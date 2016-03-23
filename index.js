var GoogleMaps = require('google-maps')
	, Noise = require('noisejs').Noise;

// config
GoogleMaps.KEY = 'AIzaSyCuKjnJWCoUMRLbVFNEkJoFVD0I73u_xJo';

var _noise = new Noise(Math.random());

var _container = document.createElement('div')
	, _map;

_container.id = 'map-container';

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

  var movementRadius = 100;
  var latLngRadius = .1;

  function randomPan() {
  	var center = _map.getCenter();
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
  	return (1 - (Math.random()*2)) * movementRadius;
  	// return _noise.simplex2(x, y, (new Date()).getTime()) * movementRadius;
  }

  function randomLatLng(x) {
  	// return (1 - (Math.random()*2)) * movementRadius;
  	return (_noise.simplex2(x, (new Date()).getTime()) * latLngRadius) + x;
  }

  window.setInterval(randomPan, 100);
});