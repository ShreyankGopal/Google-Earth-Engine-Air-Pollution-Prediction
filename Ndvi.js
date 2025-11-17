// Define your region of interest (replace with your geometry)
//var roi = ee.Geometry.Rectangle([xmin, ymin, xmax, ymax]); // Add your coordinates

// Load Landsat 8 Surface Reflectance Tier 1
var landsat8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(hyd)
    .filterDate('2024-04-01', '2024-06-30') // Adjust date range
    .filter(ee.Filter.lt('CLOUD_COVER', 10)) // Filter clouds (<10%)
    .sort('CLOUD_COVER')
    .first()
    .clip(hyd); // Get least cloudy image

// Function to calculate NDVI (B5 = NIR, B4 = Red)
var calculateNDVI = function(image) {
    var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
    return image.addBands(ndvi);
};

// Function to calculate LST (Land Surface Temperature)
var calculateLST = function(image) {
    // Extract thermal band (B10) and scale to Kelvin
    var thermal = image.select('ST_B10').multiply(0.00341802).add(149.0);
    
    // Convert Kelvin to Celsius
    var lst = thermal.subtract(273.15).rename('LST');
    return image.addBands(lst);
};

// Apply calculations
var processed = calculateLST(calculateNDVI(landsat8));

// Select just the NDVI and LST bands
var ndvi = processed.select('NDVI');
var lst = processed.select('LST');
print('ndvi', ndvi.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 30
}));
print('lst', lst.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 30
}));

// Display results

Map.addLayer(ndvi, {min: -1, max: 1, palette: [
  'blue',     // Water
  'white',    // Bare land
  'yellow',   // Sparse veg
  'lightgreen',
  'green',
  'darkgreen' // Dense forest
]}, 'NDVI');
Map.addLayer(lst, {
  min: 10,
  max: 50,
  palette: [
    '0000FF', // Blue (coolest)
    '0066FF',
    '00CCFF',
    '00FF99',
    '66FF66',
    'FFFF66',
    'FFCC33',
    'FF6600',
    'FF0000'  // Red (hottest)
  ]
}, 'LST (°C)');

// Export NDVI to Asset
Export.image.toAsset({
    image: ndvi,
    description: 'NDVI_Export',
    assetId: 'projects/ee-shreyankgbhat/assets/Hyderabad_data/NDVI_2024', // Change to your asset path
    scale: 30,
    region: hyd,
    maxPixels: 1e13
});

// Export LST to Asset
Export.image.toAsset({
    image: lst,
    description: 'LST_Export',
    assetId: 'projects/ee-shreyankgbhat/assets/Hyderabad_data/LST_2024', // Change to your asset path
    scale: 100, // Lower resolution for thermal band
    region: hyd,
    maxPixels: 1e13
});

print('NDVI Image:', ndvi);
print('LST Image:', lst);
