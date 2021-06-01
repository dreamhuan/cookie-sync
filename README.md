# 安装说明

1. clone 项目至本地
1. 打开 chrome 的插件页面并打开开发者模式（按钮在右上角）
1. “加载已解压的扩展程序”
1. 选择本项目目录

# 更新说明

1. 进入本地 clone 的项目
1. `git pull`
1. 去 chrome 扩展程序找到 cookie sync 点下面的刷新图标

# 使用说明

## 复制/粘贴

1. 打开并登陆日常/预发/线上的 iot 页面
1. 点击插件后点复制
1. 打开本地起的项目（localhost:3000 或者别的改了 host 的地址）
1. 点击粘贴

一句话说明： A 页面复制，B 页面粘贴。效果是吧 A 页面的 cookie 塞给 B 页面

## 导出/导入

1. 打开并登陆日常/预发/线上的 iot 页面
1. 点击插件后点导出（**注意，这一步操作会覆盖剪切板内容!!!**）
1. 打开本地起的项目（localhost:3000 或者别的改了 host 的地址）
1. 点击导入

一句话说明： 导出把 cookie 的登录态放到剪切板，导入从剪切板读取登录态设置到 cookie

# 原理

复制按钮把当前 url 的所有 cookie（每个子域下的）复制到 storage，粘贴按钮遍历在 storage 的 cookie 并设置到当前的页面。本质上相当于直接操作 application，手动复制 cookie 的每一条到另一个页面。

导出按钮把当前 cookie 的“s-sid”和“SSO_USER_TOKEN”组装成特定格式塞到剪切板。

```js
const getTpl = (ssoCookies) => {
  const keyMap = {
    "s-sid": "S_SID",
    SSO_USER_TOKEN: "SSO_USER_TOKEN",
  };
  let res = "";
  ssoCookies.forEach((cookie) => {
    const { name, value } = cookie;
    res += `export ${keyMap[name]}=${value};`;
  });
  return res;
};

```

导入按钮从剪切板读取内容塞到 cookie。内容支持多种格式：

1. 导出的格式
1. sid=xxx、s-sid=xxx
1. sso=xxx、SSO_USER_TOKEN=xxx

```js
const getToken = (tpl) => {
  const keyMap = {
    S_SID: "s-sid",
    "s-sid": "s-sid",
    sid: "s-sid",
    SSO_USER_TOKEN: "SSO_USER_TOKEN",
    sso: "SSO_USER_TOKEN",
    token: "SSO_USER_TOKEN",
  };
  let res = [];
  const strs = tpl.split(";").filter(Boolean);
  strs.forEach((str) => {
    const data = str.includes("export") ? str.slice(7) : str;
    let [k, v] = data.split("=").map((d) => d?.trim());
    const realKey = keyMap[k];
    if (realKey) {
      res.push({
        name: realKey,
        value: v,
      });
    }
  });
  return res;
};
```

# 安全风险

复制后你的 cookie 就在插件的 storage 中，也会保存在磁盘的某个位置，不过不同的插件 storage 是隔离的。所以不确定这个风险有多大
