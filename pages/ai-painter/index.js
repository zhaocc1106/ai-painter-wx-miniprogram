// pages/ai-painter/index.js

const app = getApp();

const autoPainter = require('../../components/aiModels/autoPainter/autoPainter.js');
const fetchWechat = require('fetch-wechat');
const tf = require('@tensorflow/tfjs-core');
const cpu = require('@tensorflow/tfjs-backend-cpu');
const webgl = require('@tensorflow/tfjs-backend-webgl');
const plugin = requirePlugin('tfjsPlugin');

// 不同图像尺寸大小
const DRAW_SIZE = [
  [61.25, 61.25],
  [122.5, 122.5],
  [183.75, 183.75],
  [255, 255]
];
const DRAW_PREC = 0.02;

var drawInfos = []
var startX = 0
var startY = 0
var bgColor = "white"
var begin = false
var curDrawArr = []
var lastCoord = null; // 记录画笔上一个坐标
let beginPosition = null; // 记录后续笔画的其实坐标
var predictStroke = []; // 用于预测的笔画偏移量数组
var predicting = false; // 正在预测

Page({
  /**
   * 页面的初始数据
   */
  data: {
    levelId: 0,
    status: "正在努力加载模型ᕙ༼ ͝°益° ༽ᕗ",
    hidden: true, // 是否隐藏生成海报的canvas
    bgColor: bgColor,
    currentColor: 'black',
    avatarUrl: "",
    curSizeIndex: 1,
    imgSizeArr: [1, 5, 10, 20],
    curWidthIndex: 0,
    lineWidthArr: [3, 5, 10, 20],
    avaliableColors: ["black", "red", "blue", "gray", "#ff4081",
      "#009681", "#259b24", "green", "#0000CD", "#1E90FF", "#ADD8E6", "#FAEBD7", "#FFF0F5", // orange
      '#FFEBA3', '#FFDE7A', '#FFCE52', '#FFBB29', '#FFA500', '#D98600', '#B36800', '#8C4D00', '#663500',
      // red
      '#FFAFA3', '#FF887A', '#FF5D52', '#FF3029', '#FF0000', '#D90007', '#B3000C', '#8C000E', '#66000E',
      // green
      '#7BB372', '#58A650', '#389931', '#1A8C16', '#008000', '#005903', '#003303',
      // yellow
      '#FFF27A', '#FFF352', '#FFF829', '#FFFF00', '#D2D900', '#A7B300', '#7E8C00', '#586600',
      // cyan
      '#A3FFF3', '#7AFFF2', '#52FFF3', '#29FFF8', '#00FFFF', '#00D2D9', '#00A7B3', '#007E8C', '#005866',
      // blue
      '#A3AFFF', '#7A88FF', '#525DFF', '#2930FF', '#0000FF', '#0700D9', '#0C00B3', '#0E008C', '#0E0066',
      // Violet
      '#FAB1F7', '#EE82EE', '#C463C7', '#9B48A1', '#73317A', '#4D2154',
      "black"
    ],
    avaliableModels: [{
        name: 'apple',
        value: '苹果',
        checked: true
      },
      {
        name: 'flower',
        value: '花朵',
        checked: false
      },
      {
        name: 'butterfly',
        value: '蝴蝶',
        checked: false
      },
      {
        name: 'sun',
        value: '太阳',
        checked: false
      },
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.showShareMenu({
      withShareTicket: true
    });

    plugin.configPlugin({
      // polyfill fetch function
      fetchFunc: fetchWechat.fetchFunc(),
      // inject tfjs runtime
      tf,
      // inject backend
      webgl,
      // provide webgl canvas
      canvas: wx.createOffscreenCanvas()
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.context = wx.createCanvasContext("firstCanvas");
    this.init();
    this.fillBackground(this.context);
    this.draw();

    wx.showLoading({
      title: '加载模型...',
      mask: true,
    });
    autoPainter.loadModels().then((res) => {
      wx.hideLoading();
      if (res) {
        this.setData({
          status: '给我一个起始笔画吧，' + (Math.random() > 0.5 ? '不要太长哦！(⊙ᗜ⊙)' : '短一些会更好！(⊙ᗜ⊙)')
        });
        this.setCurrentColor(this.data.avaliableColors[Math.floor((Math.random() * this.data.avaliableColors.length))]);
        wx.showToast({
          title: '加载完成',
        })
      } else {
        this.setData({
          status: '模型加载超时（´□｀川）'
        });
        wx.showModal({
          title: '加载失败',
          content: '选择其他模型试试吧',
          showCancel: false,
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function (res) {

  },

  /*--------------------- UI事件 --------------------------------------------------- */
  // 绘制开始 手指开始按到屏幕上
  touchStart: function (e) {
    if (predicting) {
      return;
    }

    this.lineBegin(e.touches[0].x, e.touches[0].y);
    this.recordPredictStroke(e.touches[0].x, e.touches[0].y);
    this.draw(true);
    curDrawArr.push({
      x: e.touches[0].x,
      y: e.touches[0].y
    });
  },

  // 绘制中 手指在屏幕上移动
  touchMove: function (e) {
    if (predicting) {
      return;
    }

    if (begin) {
      this.lineAddPoint(e.touches[0].x, e.touches[0].y);
      this.recordPredictStroke(e.touches[0].x, e.touches[0].y);
      this.draw(true);
      curDrawArr.push({
        x: e.touches[0].x,
        y: e.touches[0].y
      });
    }
  },

  // 绘制结束 手指抬起
  touchEnd: function () {
    if (predicting) {
      return;
    }

    drawInfos.push({
      drawArr: curDrawArr,
      color: this.data.currentColor,
      lineWidth: this.data.lineWidthArr[this.data.curWidthIndex],
    });

    // 后续笔画的起始坐标
    beginPosition = [curDrawArr[curDrawArr.length - 1]['x'], curDrawArr[curDrawArr.length - 1]['y']];

    curDrawArr = [];
    this.lineEnd();

    this.setData({
      status: '想象中［(－－)］zzz'
    });

    if (predictStroke.length <= 1) {
      this.setData({
        status: '笔画太少了(╥╯^╰╥)'
      });
      return;
    }

    predicting = true; // 开始预测与绘制
    autoPainter.generate(predictStroke).then(followStroke => {
      if (followStroke) {
        console.log('The followStroke length: ' + followStroke.length);
        this.setData({
          status: '绘制中(∪｡∪)｡｡｡zzz'
        });
        this.drawFollowStroke(followStroke, beginPosition); // 绘制后续笔画
        predictStroke = [];
        lastCoord = null;
      } else {
        this.setData({
          status: '我没想出来(╥╯^╰╥)'
        });
        predicting = false;
      }
    });
  },

  // 点击图像大小
  clickChangeSize: function (e) {
    let index = e.currentTarget.dataset.index;
    this.setData({
      curSizeIndex: index
    });
  },

  // 点击设置线条宽度
  clickChangeWidth: function (e) {
    let index = e.currentTarget.dataset.index;
    this.setLineWidthByIndex(index);
  },

  // 点击设置线条颜色
  clickChangeColor: function (e) {
    let color = e.currentTarget.dataset.color;
    this.setCurrentColor(color);
  },

  // 点击切换到擦除
  clickErase: function () {
    this.setCurrentColor(bgColor);
  },

  // 点击清空canvas
  clickClearAll: function () {
    this.fillBackground(this.context);
    this.draw();
    drawInfos = [];
    this.init();
    predicting = false;
  },

  // 点击撤销上一步
  clickFallback: function () {
    if (drawInfos.length >= 1) {
      drawInfos.pop();
    }
    this.reDraw();
  },

  // 点击重绘canvas
  clickReDraw: function () {
    this.reDraw();
  },

  // 保存canvas图像到本地缓存
  clickStore: function () {
    let that = this;
    this.store("firstCanvas", res => {
      wx.saveImageToPhotosAlbum({
        filePath: res,
      })
    });
  },

  // 点击分享
  // 现在的功能是拼接一个分享出去的图像，然后保存到本地相册
  clickShare: function () {
    let that = this;
    // 在用户看不到的地方显示隐藏的canvas
    this.setData({
      hidden: false
    });
    // 截图的时候屏蔽用户操作
    wx.showLoading({
      title: '请稍等',
      mask: true
    })
    // 300毫秒后恢复正常
    setTimeout(() => {
      wx.hideLoading();
      that.setData({
        hidden: true
      });
    }, 300);

    // 截图用户绘制的canvaas
    this.store("firstCanvas", filePath => {
      // 生成海报并分享

      that.sharePost(filePath);

    });
  },

  modelChange: async function (e) {
    this.setData({
      status: '正在努力加载模型ᕙ༼ ͝°益° ༽ᕗ'
    });

    console.log(e.detail.value);
    wx.showLoading({
      title: '加载模型...',
      mask: true,
    });
    await autoPainter.loadModels(e.detail.value).then((res) => {
      wx.hideLoading();
      if (res) {
        this.setData({
          status: '给我一个起始笔画吧，' + (Math.random() > 0.5 ? '不要太长哦！(⊙ᗜ⊙)' : '短一些会更好！(⊙ᗜ⊙)')
        });
        this.setCurrentColor(this.data.avaliableColors[Math.floor((Math.random() * this.data.avaliableColors.length))]);
        wx.showToast({
          title: '加载完成',
        });
      } else {
        this.setData({
          status: '模型加载超时（´□｀川）'
        });
        wx.showModal({
          title: '加载失败',
          content: '选择其他模型试试吧',
          showCancel: false,
        });
      }
    });
  },

  /*---------------------end of 界面绑定的函数------------------------------------------ */

  // 初始化
  init: function () {
    this.context.setLineCap('round') // 让线条圆润
    this.context.strokeStyle = this.data.currentColor;
    this.context.setLineWidth(this.data.lineWidthArr[this.data.curWidthIndex]);
    this.setData({
      currentColor: this.data.currentColor,
      curWidthIndex: this.data.curWidthIndex
    });
  },

  // 设置线条颜色
  setCurrentColor: function (color) {
    this.data.currentColor = color;
    this.context.strokeStyle = color;
    this.setData({
      currentColor: color
    });
  },

  // 设置线条宽度
  setLineWidthByIndex: function (index) {
    let width = this.data.lineWidthArr[index];
    this.context.setLineWidth(width);
    this.setData({
      curWidthIndex: index
    });
  },

  // 开始绘制线条
  lineBegin: function (x, y) {
    begin = true;
    this.context.beginPath()
    startX = x;
    startY = y;
    this.context.moveTo(startX, startY)
    this.lineAddPoint(x, y);
  },

  // 绘制线条中间添加点
  lineAddPoint: function (x, y) {
    this.context.moveTo(startX, startY)
    this.context.lineTo(x, y)
    this.context.stroke();
    startX = x;
    startY = y;
  },

  // 绘制线条结束
  lineEnd: function () {
    this.context.closePath();
    begin = false;
  },

  // 根据保存的绘制信息重新绘制
  reDraw: function () {
    this.init();
    this.fillBackground(this.context);
    // this.draw(false);
    for (var i = 0; i < drawInfos.length; i++) {
      this.context.strokeStyle = drawInfos[i].color;
      this.context.setLineWidth(drawInfos[i].lineWidth);
      let drawArr = drawInfos[i].drawArr;
      this.lineBegin(drawArr[0].x, drawArr[0].y)
      for (var j = 1; j < drawArr.length; j++) {
        this.lineAddPoint(drawArr[j].x, drawArr[j].y);
        // this.draw(true);
      }

      this.lineEnd();
    }

    this.draw();
  },

  // 将canvas导出为临时图像文件
  // canvasId： 要导出的canvas的id
  // cb: 回调函数
  store: function (canvasId, cb) {
    wx.canvasToTempFilePath({
      destWidth: 400,
      destHeight: 300,
      canvasId: canvasId,
      success: function (res) {
        typeof (cb) == 'function' && cb(res.tempFilePath);
      },
      fail: function (res) {
        console.log("store fail");
        console.log(res);
      }
    })
  },

  // 绘制canvas
  // isReverse: 是否保留之前的像素
  draw: function (isReverse = false, cb) {
    this.context.draw(isReverse, () => {
      if (cb && typeof (cb) == "function") {
        cb();
      }
    });
  },


  // canvas上下文设置背景为白色
  fillBackground: function (context) {
    context.setFillStyle(bgColor);
    context.fillRect(0, 0, 500, 500); //TODO context的宽和高待定
    context.fill();
  },


  // 预览
  pageView: function () {
    wx.canvasToTempFilePath({
      canvasId: 'firstCanvas',
      success: function (res) {
        wx.previewImage({
          current: res.tempFilePath,
          urls: [res.tempFilePath],
          success: function (res) {

          },
          fail: function (res) {

          },
        });
      },
      fail: function (res) {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    }, this)
  },

  // 分享海报
  sharePost: function (filePath) {
    let url = `/pages/share/share?imgUrl=${filePath}&levelId=${this.data.levelId}`;
    wx.navigateTo({
      url: url
    })
  },

  // 记录笔画偏移量数组，用于预测后续笔画
  recordPredictStroke: function (x, y) {
    var posX = x;
    var posY = y;
    if (lastCoord !== null) {
      // Calc the delta.
      let xDelta = posX - lastCoord[0];
      let yDelta = lastCoord[1] - posY; // Reverse the y coordinate.
      // Normalization.
      xDelta = xDelta / DRAW_SIZE[this.data.curSizeIndex][0];
      yDelta = yDelta / DRAW_SIZE[this.data.curSizeIndex][1];
      if (predictStroke.length > 0) {
        if (xDelta === 0.0 && predictStroke[predictStroke.length - 1][0] === 0.0) {
          // Merge if only move in y axis.
          predictStroke[predictStroke.length - 1][1] += yDelta;
          lastCoord = [posX, posY];
          return;
        }
        if (yDelta === 0.0 && predictStroke[predictStroke.length - 1][1] === 0.0) {
          // Merge if only move in x axis.
          predictStroke[predictStroke.length - 1][0] += xDelta;
          lastCoord = [posX, posY];
          return;
        }
      }
      // Ignore < DRAW_PREC.
      if (Math.abs(xDelta) >= DRAW_PREC || Math.abs(yDelta) >= DRAW_PREC) {
        predictStroke.push([xDelta, yDelta, 0.0, 0.0]);
        lastCoord = [posX, posY];
      }
      // console.log(predictStroke)
    } else {
      lastCoord = [posX, posY];
    }
  },

  // 绘制预测的后续笔画
  drawFollowStroke: async function (inks, beginPos) {
    console.log('drawFollowStroke');
    // 1, generate coords by deltas.
    let inkCoords = [
      [beginPos[0] / DRAW_SIZE[this.data.curSizeIndex][0], beginPos[1] / DRAW_SIZE[this.data.curSizeIndex][1], 0, 0]
    ];
    for (let ink in inks) {
      let posX = inkCoords[ink][0] + inks[ink][0];
      let posY = inkCoords[ink][1] - inks[ink][1];
      let endFlag = inks[ink][2];
      let completeFlag = inks[ink][3];
      inkCoords.push([posX, posY, endFlag, completeFlag]);
    }
    // 2, zoom in to DRAW_SIZE scale.
    for (let ink in inkCoords) {
      inkCoords[ink][0] *= DRAW_SIZE[this.data.curSizeIndex][0];
      inkCoords[ink][1] *= DRAW_SIZE[this.data.curSizeIndex][1];
    }

    // console.log(inkCoords);
    // 3. Draw every stroke.
    let stroke = [];
    for (let ink in inkCoords) {
      // Check if is complete ink.
      if (inkCoords[ink][3] > 0.5) {
        await this.drawStroke(stroke);
        stroke = [];
        predicting = false; // 预测与绘制完毕
        this.setData({
          status: '我画完了(⊙ᗜ⊙)' + (Math.random() > 0.5 ? '不满意的话尝试调整或缩短一下起始笔画吧' : '')
        });
        return;
      }
      // Check if is stroke end ink.
      if (inkCoords[ink][2] > 0.5) {
        // It's the stroke end ink, draw current stroke.
        stroke.push([inkCoords[ink][0], inkCoords[ink][1]]);
        await this.drawStroke(stroke);
        stroke = [];
      } else {
        // It's one point in stroke, add into current stroke.
        stroke.push([inkCoords[ink][0], inkCoords[ink][1]]);
      }
    }
    if (stroke.length !== 0) {
      // There has been left inks.
      await this.drawStroke(stroke);
    }
    predicting = false; // 预测与绘制完毕
    this.setData({
      status: '我画完了(⊙ᗜ⊙)，不满意的话尝试调整或缩短一下起始笔画吧'
    });
  },

  // 绘制一笔
  drawStroke: async function (stroke) {
    // 睡眠
    let sleep = function (time) {
      let systemInfo = wx.getSystemInfoSync();
      if (systemInfo.platform == 'android') {
        // android sleep will very slow.
        return;
      }
      return new Promise((resolve) => setTimeout(resolve, time));
    }
    // 欧氏距离
    let eucDistance = function (x0, x1, y0, y1) {
      return ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5;
    }

    // 随机颜色
    this.setCurrentColor(this.data.avaliableColors[Math.floor((Math.random() * this.data.avaliableColors.length))]);

    if (stroke.length === 1) {
      console.log("Only have one ink.");
      this.lineAddPoint(stroke[0][0], stroke[0][1]);
      this.draw(true);
      await sleep(10);
      return;
    }

    for (let ink in stroke) {
      if (ink == 0) {
        continue;
      }
      this.lineAddPoint(stroke[ink][0], stroke[ink][1]);
      this.draw(true);

      // If euclidean distance of two ink < 3, add path later and don't delay.
      // console.log(eucDistance(stroke[ink - 1][0], stroke[ink][0], stroke[ink - 1][1], stroke[ink][1]));
      if (eucDistance(stroke[ink - 1][0], stroke[ink][0], stroke[ink - 1][1], stroke[ink][1]) < 3) {
        console.log("If euclidean distance of two ink < 3, add path later and don't delay.");
      } else {
        await sleep(10);
      }
    }
  }
})