//index.js

Page({
  data: {
    painting: {},
    shareImage: ''
  },
  onLoad: function (options) {
     wx.showLoading({
      title: '绘制中...',
      mask: true
    });
    this.eventDraw(options.imgUrl)
  },
  eventDraw: function (imgUrl) {   
    this.setData({
      painting: {
        width: 375,
        height: 555,
        clear: true,
        views: [
          {
            type: 'image',
            url: imgUrl,
            top: 136,
            left: 42.5,
            width: 290,
            height: 240
          },
        ]
      }
    })
  },
  eventSave: function () {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.shareImage,
      success (res) {
        wx.showToast({
          title: '保存图片成功',
          icon: 'success',
          duration: 2000
        })
      }
  })
  },
  eventGetImage: function (event) {
    wx.hideLoading()
    const { tempFilePath } = event.detail
    this.setData({
      shareImage: tempFilePath
    })
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '我创作了一副名画，你也来试一下吧!',
      path: `/pages/ai-painter/index`,
      imageUrl: this.data.imgUrl,
      success: function (res) {
        // 转发成功
      },
      fail: function (res) {
        // 转发失败
      }
    }
  },
})
