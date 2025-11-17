var no2 = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
            .select('NO2_column_number_density')
            .filterDate('2024-04-01', '2024-06-30')
            .filterBounds(hyd)
            .mean();

// Filter CO
var co = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_CO')
           .select('CO_column_number_density')
           .filterDate('2024-04-01', '2024-06-30')
           .filterBounds(hyd)
           .mean();

// PM2.5 from CAMS
var pm25_raw = ee.ImageCollection('ECMWF/CAMS/NRT')
              .select('particulate_matter_d_less_than_25_um_surface')
              .filterDate('2024-04-01', '2024-06-30')
              .filterBounds(hyd)
              .mean();
var pm25=pm25_raw.multiply(1e9).rename('PM25_scaled');

// Center map and display
Map.centerObject(hyd, 9);
Map.addLayer(no2.clip(hyd), {min: 0, max: 0.0002, palette: ['black', 'purple', 'red', 'yellow']}, 'NO2');
Map.addLayer(co.clip(hyd), {min: 0, max: 0.05, palette: ['blue', 'green', 'yellow', 'red']}, 'CO');
Map.addLayer(pm25.clip(hyd), {min: 0, max: 150, palette: ['white', 'yellow', 'orange', 'red']}, 'PM2.5');

var reprojectedNo2 = no2
  .reproject({
    crs: 'EPSG:32644',  // or match your base layer CRS
    scale: 30          // your desired export resolution
  });
  var reprojectedCo = co
  .reproject({
    crs: 'EPSG:32644',  // or match your base layer CRS
    scale: 30          // your desired export resolution
  });
  var reprojectedPM = pm25
  .reproject({
    crs: 'EPSG:32644',  // or match your base layer CRS
    scale: 30          // your desired export resolution
  });
Export.image.toAsset({
  image: reprojectedCo,
  description: 'Export_NO2_HYD',
  assetId: 'users/your_username/NO2_HYD_April2024',
  region: hyd.geometry(),
  scale: 30,
  maxPixels: 1e13
});
Export.image.toAsset({
  image: reprojectedNo2,
  description: 'Export_CO_HYD',
  assetId: 'users/your_username/CO_HYD_April2024',
  region: hyd.geometry(),
  scale: 30,
  maxPixels: 1e13
});

Export.image.toAsset({
  image: reprojectedPM,
  description: 'Export_PM25_HYD',
  assetId: 'users/your_username/PM25_HYD_April2024',
  region: hyd.geometry(),
  scale: 30,
  maxPixels: 1e13
});
