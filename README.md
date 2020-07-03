# ai-painter-wx-miniprogram
tensorflow跑在微信小程序上，实现AI识别简笔画，AI自动画画等。<br>
<img src="https://github.com/zhaocc1106/ai-painter-wx-miniprogram/blob/master/images/mini-code.jpg"  alt="mini-code">


## quick_draw_classifier模型
#### 说明
对用户画的简笔画进行分类。
#### 数据集
使用[quick_draw dataset](https://github.com/googlecreativelab/quickdraw-dataset).<br>
#### 模型训练
https://github.com/zhaocc1106/machine_learn/tree/master/NeuralNetworks-tensorflow/RNN/quick_draw/quick_draw_classify<br>
训练完之后通过如下命令将模型转换为tensorflow.js模型。
```
tensorflowjs_converter --input_format keras model.h5 ./
```
转换后会生成model.json文件以及group bin文件，分别记录网络结构以及参数值。<br>
实际应用模型时可能需要修改一些地方，比如修改model.json的input layer的batch size为1；修改dropout training参数为false。当然也可以在保存HDF5模型文件前做修改。
#### 演示
<img src="https://github.com/zhaocc1106/ai-painter-wx-miniprogram/blob/master/images/gif/ai-classifier.gif"  alt="ai-classifier">


## quick_draw_autopainter模型
#### 说明
根据用户的起始笔画,来完成后续的简笔画.
#### 数据集
使用[quick_draw dataset](https://github.com/googlecreativelab/quickdraw-dataset).<br>
#### 模型训练
https://github.com/zhaocc1106/machine_learn/tree/master/NeuralNetworks-tensorflow/RNN/quick_draw/auto_draw<br>
训练完之后通过如下命令将模型转换为tensorflow.js模型。
```
tensorflowjs_converter --input_format keras model.h5 ./
```
转换后会生成model.json文件以及group bin文件，分别记录网络结构以及参数值。<br>
实际应用模型时可能需要修改一些地方，比如修改model.json的input layer的batch size为1；修改dropout training参数为false。当然也可以在保存HDF5模型文件前做修改。
#### 遗留问题
对起始笔画要求比较高,可能是如下原因:<br>
1. 笔画采集和预处理不太满足模型输入<br>
2. 模型本身问题<br>
3. 训练数据不够随机性<br>

后续再继续优化
#### 演示
<img src="https://github.com/zhaocc1106/ai-painter-wx-miniprogram/blob/master/images/gif/ai-painter.gif"  alt="ai-painter">


## 小程序中部署tensorflow模型
参考官方说明https://github.com/tensorflow/tfjs-wechat
