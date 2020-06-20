// components/brushPoint/index.js
Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   * 用于组件自定义设置
   */
  properties: {
    color: {
      type: String,
      value: "red"
      // observer: function (newVal, oldVal) { }
    },

    width: {
      type: String,
      value: "60rpx"
    },

    height: {
      type: String,
      value: "60rpx"
    },

    bgColor: {
      type: String,
      value: "white"
    },

    radius: {
      type: Number,
      value: 20
    },

    selected: {
      type: Boolean,
      value: false
    },
  },

  /**
   * 私有数据,组件的初始数据
   * 可用于模版渲染
   */
  data: {
    hideEffect: true
  },

  attached: function () {
    this.setData({
      innerRadius: this.properties.radius * 1.7 + 10,
      outterRadius: this.properties.radius * 1.7 + 20,
    });
  },

  /**
   * 组件的方法列表
   * 更新属性和数据的方法与更新页面数据的方法类似
   */
  methods: {

    /*
    * 内部私有方法建议以下划线开头
    * triggerEvent 用于触发事件
    */

    // 选中笔刷
    _select(e) {
      this.setData({
        hideEffect: false
      });

      setTimeout(() => {
        this.setData({
          hideEffect: true
        });
      }, 500);
      this.triggerEvent("select");
    }
  }
})