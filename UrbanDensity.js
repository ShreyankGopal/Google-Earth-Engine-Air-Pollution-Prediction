

// Date to filter
var start = '2024-04-01';
var end = '2024-06-30';

// Create a cloud less composite
// Function to cloud mask
function cloudMask(image){
  var qa = image.select('QA_PIXEL');
  var dilated = 1 << 1;
  var cirrus = 1 << 2;
  var cloud = 1 << 3;
  var shadow = 1 << 4;
  var mask = qa.bitwiseAnd(dilated).eq(0)
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return image.updateMask(mask)
    .select(['SR_B.*'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7']) // Select only important bands
    .multiply(0.0000275).add(-0.2); // Scale image to 0 - 1  
}

// Composite an image
var image = l9.filterDate(start, end)
  .filterBounds(Hyderabad_shapefile)
  .map(cloudMask) // Apply cloud mask function
  .median()
  .clip(Hyderabad_shapefile); // Clip to study area

// Show the image
Map.addLayer(image, { min: [0.1, 0.05, 0.025], max: [0.4, 0.3, 0.25], bands: ['B5', 'B6', 'B7'] }, 'Image');

// Generate some spectral indices
// Bandmap
var bandMap = {
  NIR: image.select('B5'),
  SWIR1: image.select('B6'),
  SWIR2: image.select('B7')
};

// Generate NDBI and NBR2
var ndbi = image.expression('NDBI = (SWIR1 - NIR) / (SWIR1 + NIR)', bandMap);
Map.addLayer(ndbi, { min: -1, max: 1, palette: ['blue', 'white', 'red'] }, 'NDBI');

var nbr2 = image.expression('NBR2 = (SWIR1 - SWIR2) / (SWIR1 + SWIR2)', bandMap);
Map.addLayer(nbr2, { min: -1, max: 1, palette: ['blue', 'white', 'red'] }, 'NBR2');

// Generate built-up area
var built = ndbi.gte(-0.1).and(nbr2.lte(0.2));
Map.addLayer(built.selfMask(), { palette: 'red' }, 'Built-up');
Map.centerObject(Hyderabad_shapefile)
// Mapping urban density using convolution
var urbanDensity = built.focalMean(3) // using 3 pixel neighbour as input
  .reproject('EPSG:4326', null, 30); // reproject to 30 meter pixel again
Map.addLayer(urbanDensity, { min: 0, max: 1, palette: ['black', 'purple', 'blue', 'cyan', 'green', 'yellow', 'red'] }, 'Urban density');
var reprojected = urbanDensity
  .reproject({
    crs: 'EPSG:32644',  // or match your base layer CRS
    scale: 30          // your desired export resolution
  });
print('ud', urbanDensity.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: Hyderabad_shapefile,
  scale: 30
}));
Export.image.toAsset({
  image: reprojected,
  description: 'ExportUrbanDensityToAssets',
  assetId: 'projects/ee-shreyankgbhat/assets/Hyderabad_data/UrbanDensityHyd',
  region: Hyderabad_shapefile.geometry(),
  scale: 30,
  maxPixels: 1e13
});
