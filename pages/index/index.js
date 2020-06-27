// pages/games/draw.js
// https://github.com/ETRick/MiniProgram-Draw

const app = getApp();

const classifier = require('../../components/aiModels/classifier/classifier.js');

const DRAW_SIZE = [255, 255];
const DRAW_PREC = 0.03678;

var drawInfos = [];
var startX = 0;
var startY = 0;
var bgColor = "white";
var begin = false;
var curDrawArr = [];
var lastCoord = null; // 记录画笔上一个坐标
var predictStroke = []; // 用于预测的笔画偏移量数组
var drawing = false; // 正在画画

Page({
  /**
   * 页面的初始数据
   */
  data: {
    levelId: 0,
    status: "正在努力加载模型...",
    hidden: true, // 是否隐藏生成海报的canvas
    bgColor: bgColor,
    currentColor: 'black',
    avatarUrl: "",
    curWidthIndex: 0,
    lineWidthArr: [2, 5, 10, 20],
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
    classesName: ['class1', 'class2', 'class3', 'class4', 'class5'],
    classesProg: [0, 0, 0, 0, 0]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.showShareMenu({
      withShareTicket: true
    });

    // 加载模型
    classifier.resetClassifier();
    classifier.loadModels().then(() => {
      this.setData({
        status: '模型加载完成！'
      });
      this.setCurrentColor(this.data.avaliableColors[Math.floor((Math.random() * this.data.avaliableColors.length))]);
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
    drawing = true;
    this.lineBegin(e.touches[0].x, e.touches[0].y)
    this.recordPredictStroke(e.touches[0].x, e.touches[0].y);
    curDrawArr.push({
      x: e.touches[0].x,
      y: e.touches[0].y
    });
  },

  // 绘制中 手指在屏幕上移动
  touchMove: function (e) {
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
    drawing = false;
    drawInfos.push({
      drawArr: curDrawArr,
      color: this.data.currentColor,
      lineWidth: this.data.lineWidthArr[this.data.curWidthIndex],
    });
    // console.log(curDrawArr);
    curDrawArr = [];
    this.lineEnd();
    predictStroke[predictStroke.length - 1][2] = 1.0;
    classifier.classify(predictStroke, (res) => {
      if (drawing) {
        console.log('Is drawing, ignore it.');
        return;
      }
      // console.log(res);
      let probs = res.probs;
      for (let i = 0; i < probs.length; i++) {
        probs[i] = Number(probs[i] * 100).toFixed(1);
      }
      this.setData({
        classesName: res.names,
        classesProg: probs
      });
      // predictStroke = [];
    });

    this.setCurrentColor(this.data.avaliableColors[Math.floor((Math.random() * this.data.avaliableColors.length))]);
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
    lastCoord = null;
    predictStroke = [];
    this.setData({
      classesName: ['class1', 'class2', 'class3', 'class4', 'class5'],
      classesProg: [0, 0, 0, 0, 0]
    });
    classifier.resetClassifier();
    this.init();
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

  // 记录笔画偏移量数组，用于预测分类
  recordPredictStroke: function (x, y) {
    var posX = x;
    var posY = y;
    if (lastCoord !== null) {
      // Calc the delta.
      let xDelta = posX - lastCoord[0];
      let yDelta = lastCoord[1] - posY; // Reverse the y coordinate.
      // Normalization.
      xDelta = Number((xDelta / DRAW_SIZE[0]).toFixed(10));
      yDelta = Number((yDelta / DRAW_SIZE[1]).toFixed(10));
      // xDelta = xDelta / DRAW_SIZE[0];
      // yDelta = yDelta / DRAW_SIZE[1];
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
        predictStroke.push([xDelta, yDelta, 0.0]);
        lastCoord = [posX, posY];
      }
      // console.log(predictStroke)
    } else {
      lastCoord = [posX, posY];
    }
  }
})