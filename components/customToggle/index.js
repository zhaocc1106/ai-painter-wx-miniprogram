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
    imgUrl: {
      type: String,
      value: ""
    },

    width:{
      type: String,
      value: "10rpx"
    },

    text:{
      type: String,
      value: ""
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

    _click(){
      this.triggerEvent("clickEvent");
    }
  }
})