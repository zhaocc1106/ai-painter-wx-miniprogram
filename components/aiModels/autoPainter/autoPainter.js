// compoents/aiModels/autoPainter/autoPainter.js
// Auto painter模型推理库

/* 加载tensorflow库 */
const tf = require('@tensorflow/tfjs-core')
const tfLayers = require('@tensorflow/tfjs-layers');


/* 全局变量 */
let flowerModel = null; // 花模型
let sunModel = null; // 太阳模型

/**
 * 数组转成tensor
 */
function tensorPreprocess(inks) {
  return tf.tidy(() => {
    //convert to a tensor
    let tensor = tf.tensor(inks);
    return tensor.expandDims(0);
  })
}

/**
 * 加载模型
 */
async function loadModels() {
  console.log('Loading models...');
  console.log(new Date());
  tf.tensor([1, 2]).print();
  flowerModel = await tfLayers.loadLayersModel('https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/quick-draw-classifier/model.json?sign=8916bd078510a1ee86714c48760fd3fe&t=1592966971');
  sunModel = await tfLayers.loadLayersModel('https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/quick-draw-classifier/model.json?sign=8916bd078510a1ee86714c48760fd3fe&t=1592966971');
  console.log(new Date());

  /* 预热模型 */
  let warmupStroke = [
    [0., 0., 0.]
  ];
  let predTf = flowerModel.predict(tensorPreprocess(warmupStroke));
  pred = await predTf.dataSync();
  console.log(pred);
  predTf.dispose();
  console.log(new Date());
  predTf = sunModel.predict(tensorPreprocess(warmupStroke));
  pred = await predTf.dataSync();
  console.log(pred);
  predTf.dispose();
  console.log(new Date());
}

autoPainter = {
  loadModels: loadModels,
};

module.exports = autoPainter;