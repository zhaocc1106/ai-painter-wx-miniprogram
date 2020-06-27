// compoents/aiModels/classifier/classifier.js
// Auto painter模型推理库

/* 加载tensorflow库 */
const tf = require('@tensorflow/tfjs-core')
const tfLayers = require('@tensorflow/tfjs-layers');
const {
  time
} = require('@tensorflow/tfjs-core');

/* 常量 */
const MODEL_URL = 'https://6169-ai-painter-7q1db-1302478925.tcb.qcloud.la/quick-draw-classifier/model.json'
const CLASSES_NAME_CLOUD_ID = 'cloud://ai-painter-7q1db.6169-ai-painter-7q1db-1302478925/quick-draw-classifier/classes_names_zh'

/* 全局变量 */
let model = undefined; // 模型
let classNames = null; // 记录所有的类型名

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
async function loadModels(globalData) {
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

  console.time('LoadModel');

  /* 加载模型，预热模型 */
  model = await tfLayers.loadLayersModel(MODEL_URL, stateful=true);
  let warmupStroke = [
    [0., 0., 0.]
  ];
  // await classify(warmupStroke);
  let predTf = model.predict(tensorPreprocess(warmupStroke));
  pred = await predTf.dataSync();
  predTf.dispose();
  model.resetStates();

  console.timeEnd('LoadModel');
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
 * @param {*} predictStroke 笔画
 * @returns top5分类名与概率大小
 */
async function classify(predictStroke) {
  if (model === undefined) {
    console.log('Model unloaded!');
    return null;
  }

  // console.log('predictStroke: ' + predictStroke);

  model.resetStates();
  // Predict the class name index.
  let pred = model.predict(tensorPreprocess(predictStroke));
  let predArr = pred.dataSync();
  // console.log(predArr.sort().reverse());
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
  return {probs: probs, names: names}
}

/**
 * 重置classifier，主要是重置RNN状态。
 */
async function resetClassifier() {
  if (model !== undefined) {
    model.resetStates();
  }
}

autoPainter = {
  loadModels: loadModels,
  classify: classify,
  resetClassifier: resetClassifier,
};

module.exports = autoPainter;