// pages/index/index.js

Page({

  jumpTo: function (event) {
    let page = event.target.dataset.dest;
    wx.navigateTo({
      url: '/pages/' + page + '/index',
    })
  },
})