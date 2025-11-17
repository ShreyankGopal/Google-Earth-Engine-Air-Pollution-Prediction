var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
            .filterDate('2024-04-01', '2024-06-30')
            .select(['temperature_2m', 'dewpoint_temperature_2m'])
            .filterBounds(hyd);
var era5_celsius = era5.map(function(image) {
  var tempC = image.select('temperature_2m').subtract(273.15).rename('tempC');
  var dewPointC = image.select('dewpoint_temperature_2m').subtract(273.15).rename('dewPointC');
  return image.addBands([tempC, dewPointC]);
});
var rhCollection = era5_celsius.map(function(image) {
  var tempC = image.select('tempC');
  var dewPointC = image.select('dewPointC');
  var rh = dewPointC.expression(
    '100 * (exp((17.625 * Td) / (243.04 + Td)) / exp((17.625 * T) / (243.04 + T)))',
    {
      'Td': dewPointC,
      'T': tempC
    }).rename('RH');
  return image.addBands(rh);
});
var rhImage = rhCollection.select('RH').mean().clip(hyd);
print('rh min/max', rhImage.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 500
}));
Map.centerObject(hyd, 10);
Map.addLayer(rhImage, {min: 55, max: 57, palette: ['blue', 'green', 'yellow', 'red']}, 'Relative Humidity');
Export.image.toAsset({
    image: rhImage,
    description: 'RH_Export',
    assetId: 'projects/ee-shreyankgbhat/assets/Hyderabad_data/RH_2024', // Change to your asset path
    scale: 100, 
    region: hyd,
    maxPixels: 1e13
});
