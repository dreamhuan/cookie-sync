# 安装说明
1. clone项目至本地
1. 打开chrome的插件页面并打开开发者模式（按钮在右上角）
1. “加载已解压的扩展程序”
1. 选择本项目目录

# 使用说明
1. 打开并登陆主项目的页面
1. 点击插件后点复制
1. 打开本地起的项目（localhost:3000或者别的改了host的地址）
1. 点击粘贴
1. 刷新页面

一句话说明： A页面复制，B页面粘贴。效果是吧A页面的cookie塞给B页面  


# 原理
复制按钮把当前url的所有cookie（每个子域下的）复制到storage，粘贴按钮遍历在storage的cookie并设置到当前的页面

# 安全风险
复制后你的cookie就在插件的storage中，也会保存在磁盘的某个位置，不过不同的插件storage是隔离的。所以不确定这个风险有多大