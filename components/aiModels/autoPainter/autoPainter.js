// compoents/aiModels/autoPainter/autoPainter.js
// Auto painter模型推理库

/* 加载tensorflow库 */
const tf = require('@tensorflow/tfjs-core')
const tfLayers = require('@tensorflow/tfjs-layers');

/* 全局常量 */
const MAX_LEN = {
  // 'flower': 352,
  // 'butterfly': 246,
  // 'apple': 189,
  // 'house': 201,
  // 'sun': 291,
  // 'tree': 579
  'flower': 100,
  'butterfly': 100,
  'apple': 100,
  'house': 100,
  'sun': 100,
  'tree': 100
}
const MODELS_URL = {
  'flower': 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/auto-painter/flower/model.json',
  'butterfly': 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/auto-painter/butterfly/model.json',
  'apple': 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/auto-painter/apple/model.json',
  'house': 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/auto-painter/house/model.json',
  'sun': 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/auto-painter/sun/model.json',
  'tree': 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/auto-painter/tree/model.json'
}

/* 全局变量 */
// 所有的模型
let models = {
  'flower': null,
  'butterfly': null,
  'apple': null,
  'sun': null
};
let curModelType = 'apple'; // 当前模型类型

/**
 * 数组转成tensor
 */
async function tensorPreprocess(inks) {
  return tf.tidy(() => {
    //convert to a tensor
    let tensor = tf.tensor(inks);
    return tensor.expandDims(0);
  })
}

/**
 * 加载模型
 * @param {string} modelType 模型类型
 * @returns true for success, false for failed.
 */
async function loadModels(modelType) {
  if (modelType) {
    curModelType = modelType;
  }
  
  if (models[curModelType]) { // 模型已加载
    return true;
  }

  console.time('LoadModel');
  console.log('Loading models...');

  /* 加载并预热模型 */
  try {
    models[curModelType] = await tfLayers.loadLayersModel(MODELS_URL[curModelType]);
  } catch (err) {
    console.log(err);
    return false;
  }
  let warmupStroke = [
    [0., 0., 0., 0.]
  ];
  let strokeTensor = await tensorPreprocess(warmupStroke);
  let pred = await models[curModelType].predict(strokeTensor);
  let predArr = await pred.dataSync();
  console.log(predArr);
  pred.dispose();

  console.timeEnd('LoadModel');
  return true;
}

/**
 * 根据当前起始笔画预测并生成后续笔画
 * @param {Array} beginStroke 起始笔画
 * @returns 二维数组代表预测的后续笔画
 */
async function generate(beginStroke) {
  if (models[curModelType] === null) {
    console.log("Model unloaded.!");
    return null;
  }
  console.time('Generate');

  // The initial inks len.
  const initialLen = beginStroke.length;
  console.log("The initial inks len: " + initialLen);
  // Enter the initial inks.
  models[curModelType].resetStates();
  let strokeTensor = await tensorPreprocess(beginStroke);
  let predTf = await models[curModelType].predict(strokeTensor);
  let pred = await predTf.dataSync();
  predTf.dispose();
  // Find the last ink.
  const index = (initialLen - 1) * 4;
  let pred_ = [pred[index], pred[index + 1], pred[index + 2], pred[index + 3]];
  // Save the new ink.
  beginStroke.push(pred_);
  // Pred the left inks.
  let inp = null;
  do {
    // Use the last ink as input.
    inp = [beginStroke[beginStroke.length - 1]];
    // Enter the initial inks.
    let inpTensor = await tensorPreprocess(inp);
    predTf = await models[curModelType].predict(inpTensor);
    pred = await predTf.dataSync();
    predTf.dispose();
    // Find he last ink.
    pred_ = [pred[0], pred[1], pred[2], pred[3]];
    // Save the new ink.
    beginStroke.push(pred_);
  } while (pred[3] < 0.5 && beginStroke.length <= MAX_LEN[curModelType] - initialLen);
  // console.log(beginStroke);
  // Pop the initial inks.
  let followStroke = beginStroke.splice(initialLen, beginStroke.length - initialLen);

  console.timeEnd('Generate');
  return followStroke;
}

let autoPainter = {
  loadModels: loadModels,
  generate: generate,
};

module.exports = autoPainter;