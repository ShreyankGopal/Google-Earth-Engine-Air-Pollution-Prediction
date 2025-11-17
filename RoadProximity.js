var hyd_roads=Roads.filterBounds(hyd);
var roadsHyd = hyd_roads.filterBounds(hyd).map(function(f) {
  return f.set('value', 1);
});
var roadMask = roadsHyd
  .reduceToImage({
    properties: ['value'],
    reducer: ee.Reducer.first()
  })
  .gt(0)       // convert to binary (0 or 1)
  .selfMask(); // mask out non-road pixels  // removes zeros, keeps 1s

// 3. Compute distance to nearest road (in meters)
var distanceToRoad = roadMask.fastDistanceTransform().sqrt()
  .multiply(30)
  .clip(hyd)// Convert from pixels to meters (assuming 30m resolution)
  .rename('Distance_to_Road');

var distanceToRoadProjected = distanceToRoad.reproject({
  crs: 'EPSG:4326',
  scale: 30
});
print('distance', distanceToRoadProjected.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 30
}));
// 4. Visualize
Map.centerObject(hyd, 10);
Map.addLayer(roadMask, {palette: ['gray']}, 'Road Mask');
Map.addLayer(distanceToRoadProjected, {
  min: 0,
  max: 840,  // adjust this range to your desired display
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
}, 'Distance to Road');

// 5. Display
Export.image.toAsset({
  image: distanceToRoadProjected,
  description: 'ExportUrbanDensityToAssets',
  assetId: 'projects/ee-shreyankgbhat/assets/Hyderabad_data/ProximityToRoads',
  region: hyd.geometry(),
  scale: 30,
  maxPixels: 1e13
});
Map.addLayer(hyd_roads);
