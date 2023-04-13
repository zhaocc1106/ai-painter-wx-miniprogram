// compoents/aiModels/classifier/classifier.js
// Auto painter模型推理库

/* 加载tensorflow库 */
const tf = require('@tensorflow/tfjs-core')
const tfLayers = require('@tensorflow/tfjs-layers');
var plugin = requirePlugin('tfjsPlugin');

/* 常量 */
const MODEL_URL = 'https://6169-ai-painter-6g4jfmfl19cfbe8f-1302478925.tcb.qcloud.la/quick-draw-classifier/model.json'
const CLASSES_NAME_CLOUD_ID = 'cloud://ai-painter-6g4jfmfl19cfbe8f.6169-ai-painter-6g4jfmfl19cfbe8f-1302478925/quick-draw-classifier/classes_names_zh'

/* 全局变量 */
let model = null; // 模型
let classNames = null; // 记录所有的类型名

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
 * @returns true for success, false for failed.
 */
async function loadModels() {
  if (model != null) {
    return true;
  }

  console.log('Loading models...');
  // tf.tensor([1, 2]).print();

  /* 下载并读取类型名文件 */
  wx.cloud.init();
  wx.cloud.downloadFile({
    fileID: CLASSES_NAME_CLOUD_ID,
    success: res => {
      // console.log(res.tempFilePath);
      wx.getFileSystemManager().readFile({
        filePath: res.tempFilePath,
        encoding: 'utf-8',
        success(res) {
          if (res.data) {
            classNames = res.data.split('\r\n');
            console.log(classNames);
          }
        },
        fail(err) {
          console.log('读取classes_name失败:', err.errMsg);
        }
      });
    },
    fail: err => {
      console.log('下载classes_name失败: ' + err.errMsg);
    }
  });

  // console.time('LoadModel');

  /* 加载模型 */
  const fileStorageHandler = plugin.fileStorageIO('classifier', wx.getFileSystemManager());

  try {
    model = await tfLayers.loadLayersModel(fileStorageHandler); // 先尝试本地加载模型文件
  } catch (err) {
    console.log('Load model from local failed: ' + err);
    try {
      model = await tfLayers.loadLayersModel(MODEL_URL); // 本地加载失败，从云顿加载模型文件
      // model.save(fileStorageHandler); // 模型文件保存到本地
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  /* 预热模型 */
  let warmupStroke = [
    [0., 0., 0.]
  ];
  // await classify(warmupStroke);
  let strokeTensor = await tensorPreprocess(warmupStroke);
  let pred = await model.predict(strokeTensor);
  let predArr = await pred.dataSync();
  pred.dispose();
  model.resetStates();

  // console.timeEnd('LoadModel');
  return true;
}

/**
 * get indices of the top probs
 */
function findIndicesOfMax(inp, count) {
  let outp = [];
  for (let i = 0; i < inp.length; i++) {
    outp.push(i); // add index to output array
    if (outp.length > count) {
      outp.sort(function (a, b) {
        return inp[b] - inp[a];
      }); // descending sort the output array
      outp.pop(); // remove the last index (index of smallest element in output array)
    }
  }
  return outp;
}

/**
 * find the top 5 predictions
 */
function findTopValues(inp, count) {
  let outp = [];
  let indices = findIndicesOfMax(inp, count);
  // show 5 greatest scores
  for (let i = 0; i < indices.length; i++) {
    outp[i] = inp[indices[i]];
  }
  return outp;
}

/**
 * get the the class names
 */
function getClassNames(indices) {
  let outp = [];
  for (let i = 0; i < indices.length; i++) {
    outp[i] = classNames[indices[i]];
  }
  return outp;
}

/**
 * 对笔画进行分类
 * @param {Array} predictStroke 笔画
 * @param {function} succCb 成功的回调函数，参数obj包含两个属性，probs代表所有类型概率，names代表所有类型名
 * @param {function} failCb 失败的回调函数，参数obj包含一个属性，errInfo代表错误描述
 */
async function classify(predictStroke, succCb, failCb) {
  if (model === null) {
    console.log('Model unloaded!');
    if (failCb) {
      failCb('Model unloaded!');
    }
  }

  model.resetStates();
  // Predict the class name index.
  let strokeTensor = await tensorPreprocess(predictStroke);
  let pred = await model.predict(strokeTensor);
  await pred.data().then(predArr => {
    pred.dispose();
    // find the top 5 predictions
    const indices = findIndicesOfMax(predArr, 5);
    // console.log('The predict indices:');
    // console.log(indices);
    const probs = findTopValues(predArr, 5);
    // console.log('The predict probabilities:');
    // console.log(probs);
    const names = getClassNames(indices);
    // console.log('The predict names:');
    // console.log(names);
    if (succCb) {
      succCb({
        probs: probs,
        names: names
      });
    }
  });
}

/**
 * 重置classifier，主要是重置RNN状态。
 */
async function resetClassifier() {
  if (model !== undefined) {
    model.resetStates();
  }
}

let classifier = {
  loadModels: loadModels,
  classify: classify,
  resetClassifier: resetClassifier,
};

module.exports = classifier;