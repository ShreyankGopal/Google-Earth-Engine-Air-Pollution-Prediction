
print('NO2 min/max', No2.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 30
}));

print('CO min/max', CO.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 30
}));
print('PM min/max', PM25.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 30
}));

var pm25_norm = PM25.unitScale(22.034616470336914, 24.68147850036621); // assuming max 150 μg/m³
var no2_norm = No2.unitScale(0.00008745598090189346, 0.00011314401382718216);   // adjust based on your values
var co_norm = CO.unitScale(0.00008745598090189346, 0.00011314401382718216);     // adjust accordingly
var pollutionIndex = pm25_norm.multiply(0.5)
  .add(no2_norm.multiply(0.3))
  .add(co_norm.multiply(0.2))
  .rename('Pollution_Index_Weighted')
  .clip(hyd);

print('Pollution', pollutionIndex.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: hyd,
  scale: 1000
}));
var pollutionNorm = pollutionIndex.unitScale(487.4030441520627, 506.43386389308546);
Map.addLayer(pollutionNorm, {
  min: 0,
  max: 1,
  palette: [
    'ffffff',  // white
    'dddddd',
    'bbbbbb',
    '999999',
    '777777',
    '555555',
    '333333',
    '111111',
    '000000'   // black (darkest)
  ]
}, 'Pollution Index (Grayscale)');
Map.addLayer(UD.clip(hyd),{
  palette: [
    '#005bff',
    '#11ff00',
    '#9eff00',
    '#e5ff00',
    '#ffaf00',
    '#ff4500'   // black (darkest)
  ]
});
Map.addLayer(NDVI, {palette: [
  'blue',     // Water
  'white',    // Bare land
  'yellow',   // Sparse veg
  'lightgreen',
  'green',
  'darkgreen' // Dense forest
]}, 'NDVI');
Map.addLayer(LST, {
  min:33, max:59,
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
Map.addLayer(RH, {min: 55, max: 57, palette: ['blue', 'green', 'yellow', 'red']}, 'Relative Humidity');
var ndviNorm=NDVI.unitScale(-0.05133, 0.5018);
var lstNorm=LST.unitScale(33.03106,58.42);
var rhNorm=RH.unitScale(55.125462992270364,56.64265022607632);
var udNorm=UD.unitScale(0,1);
var proximityNorm=proximity.unitScale(0,840);
// var stacked = pollutionNorm
//   .addBands(ndviNorm)
//   .addBands(lstNorm)
//   .addBands(udNorm)
//   .addBands(rhNorm)
//   .addBands(proximityNorm)
//   .rename(['PollutionIndex', 'NDVI', 'LST', 'UD', 'RH','proximity']);
var stacked = ndviNorm
  .addBands(lstNorm)
  .addBands(udNorm)
  .addBands(rhNorm)
  .addBands(proximityNorm)
  .rename(['NDVI', 'LST', 'UD', 'RH','proximity']);
  
  
var bins = ee.Image(0)
  .where(pollutionNorm.lt(0.33), 0)
  .where(pollutionNorm.gte(0.33).and(pollutionNorm.lt(0.66)), 1)
  .where(pollutionNorm.gte(0.66), 2)
  .rename('pollutionClass');

var trainingData = stacked
  .addBands(bins)
  .sample({
    region: hyd,
    scale: 10,
    numPixels: 10000,
    seed: 42,
    geometries: true
  });
Export.table.toDrive({
  collection: trainingData,
  description: 'Pollution_Training_Stacked',
  fileFormat: 'CSV'
});
var split = 0.7;
var withRandom = trainingData.randomColumn('random');
var train = withRandom.filter(ee.Filter.lt('random', split));
var test = withRandom.filter(ee.Filter.gte('random', split));
// var classifier = ee.Classifier.smileRandomForest(50).train({
//   features: train,
//   classProperty: 'pollutionClass',
//   inputProperties: ['NDVI', 'LST', 'UD', 'RH','proximity']
// });
var classifier = ee.Classifier.smileGradientTreeBoost(200).train({
  features: train,
  classProperty: 'pollutionClass',
  inputProperties: ['NDVI', 'LST', 'UD', 'RH', 'proximity']
});
var classified = stacked.classify(classifier);
var testAccuracy = test.classify(classifier);
var confusionMatrix = testAccuracy.errorMatrix('pollutionClass', 'classification');
print('Confusion Matrix:', confusionMatrix);
print('Accuracy:', confusionMatrix.accuracy());
print('Kappa:', confusionMatrix.kappa());
// function getMacroF1(cm) {
//   var matrix = ee.Array(cm.array());
//   var numClasses = matrix.length().get([0]);
  
//   // Extract True Positives (diagonal), Precision, Recall
//   var f1s = ee.List.sequence(0, numClasses.subtract(1)).map(function(i) {
//     i = ee.Number(i);
//     var TP = matrix.get([i, i]);
//     var row = matrix.slice(1, 0, numClasses).slice(0, i, i.add(1)).project([1]);
//     var col = matrix.slice(0, 0, numClasses).slice(1, i, i.add(1)).project([1]);
    
//     var FN = row.reduce(ee.Reducer.sum(), [0]).subtract(TP);
//     var FP = col.reduce(ee.Reducer.sum(), [0]).subtract(TP);
    
//     var precision = TP.divide(TP.add(FP));
//     var recall = TP.divide(TP.add(FN));
    
//     var f1 = (2*precision*recall)/(precision+recall);
    
//     return f1;
//   });

//   var f1Avg = ee.Array(f1s).reduce(ee.Reducer.mean(), [0]);
//   return f1Avg;
// }
// print('F1 Score (Macro):', getMacroF1(confusionMatrix));
Map.centerObject(hyd,10);
Map.addLayer(classified.clip(hyd), {
  min: 0,
  max: 2,
  palette: ['white', 'gray', 'black']
}, 'Pollution Hotspots Prediction');
