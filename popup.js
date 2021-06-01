const copyBtn = document.getElementById("copy");
const pasteBtn = document.getElementById("paste");
const exportBtn = document.getElementById("export");
const importBtn = document.getElementById("import");
const settingBtn = document.getElementById("setting");
const promisify =
  (fn) =>
  (...args) =>
    new Promise((resolve, reject) => {
      try {
        fn(...args, resolve);
      } catch (e) {
        reject(e);
      }
    });

const tabQuery = promisify(chrome.tabs.query);
const getAllCookieStores = promisify(chrome.cookies.getAllCookieStores);
const getAllCookie = promisify(chrome.cookies.getAll);
const setStorage = promisify(
  chrome.storage.local.set.bind(chrome.storage.local)
);
const getStorage = promisify(
  chrome.storage.local.get.bind(chrome.storage.local)
);
const clearStorage = promisify(
  chrome.storage.local.clear.bind(chrome.storage.local)
);
const setCookie = promisify(chrome.cookies.set);

const eventWrapper = (fn) => async () => {
  try {
    await fn();
  } catch (e) {
    console.log(e);
  }
};

const getCurConfig = async () => {
  const tabs = await tabQuery({ active: true, currentWindow: true });
  const curTab = tabs[0];
  const url = curTab.url;
  const tabId = curTab.id;
  const storeId = await getCurStoreId(tabId);
  return { url, storeId };
};

const getCurStoreId = async (tabId) => {
  const cookieStores = await getAllCookieStores();
  let storeId = 0;
  cookieStores.forEach((store) => {
    if (store.tabIds.includes(tabId)) {
      storeId = store.id;
    }
  });
  return storeId;
};

const copyFn = async () => {
  const { url, storeId } = await getCurConfig();
  const cookies = await getAllCookie({ url, storeId });
  await clearStorage();
  await setStorage({ cookies });
  console.log("set cookies");
};

const removeCookie = (cookie) => {
  var url =
    "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path;
  chrome.cookies.remove({ url: url, name: cookie.name });
};

const pasteFn = async () => {
  const { cookies } = await getStorage();
  console.log("get cookies", cookies);
  const tabs = await tabQuery({ active: true, currentWindow: true });
  const curTab = tabs[0];
  const url = curTab.url;
  const tabId = curTab.id;
  const storeId = await getCurStoreId(tabId);
  const oldCookies = await getAllCookie({ url, storeId });
  console.log("get oldCookies", oldCookies);
  oldCookies.forEach(removeCookie);
  cookies.forEach((cookie) => {
    setCookie({
      url,
      name: cookie.name,
      value: cookie.value,
      path: "/",
      storeId,
    });
  });
};

const focusOrCreateTab = (url) => {
  chrome.windows.getAll({ populate: true }, function (windows) {
    let existing_tab = null;
    for (const i in windows) {
      const tabs = windows[i].tabs;
      for (const j in tabs) {
        const tab = tabs[j];
        if (tab.url == url) {
          existing_tab = tab;
          break;
        }
      }
    }
    if (existing_tab) {
      chrome.tabs.update(existing_tab.id, { selected: true });
    } else {
      chrome.tabs.create({ url: url, selected: true });
    }
  });
};

const settingFn = async () => {
  const manager_url = chrome.extension.getURL("options.html");
  focusOrCreateTab(manager_url);
};

const getTpl = ({ sid, sso }) => {
  console.log({ sid, sso });
  let res = "";
  if (sid) {
    res += `export S_SID=${sid};`;
  }
  if (sso) {
    res += `export SSO_USER_TOKEN=${sso};`;
  }
  return res;
};

const getToken = (tpl) => {
  let res = { sid: "", sso: "" };
  const strs = tpl.split(";").filter(Boolean);
  console.log(strs);
  strs.forEach((str) => {
    const data = str.includes("export") ? str.slice(7) : str;
    console.log(data);
    const [k, v] = data.split("=");
    if (["S_SID", "s-sid", "sid"].includes(k)) {
      res.sid = v;
    }
    if (["SSO_USER_TOKEN", "sso", "token"].includes(k)) {
      res.sso = v;
    }
  });
  console.log(res);

  return res;
};

const write_Clipper = (text) => {
  // 创建input元素，给input传值，将input放入html里，选择input
  let w = document.createElement("input");
  w.value = text;
  document.body.appendChild(w);
  w.select();

  // 调用浏览器的复制命令
  document.execCommand("Copy");

  // 将input元素隐藏，通知操作完成！
  w.style.display = "none";
};

const importFn = async () => {
  chrome.runtime.sendMessage({}, async function (result) {
    console.log(result);
    const token = getToken(result);
    const { sid, sso } = token;
    const { url, storeId } = await getCurConfig();
    if (sid) {
      setCookie({
        url,
        name: "s-sid",
        value: sid,
        path: "/",
        storeId,
      });
    }
    if (sso) {
      setCookie({
        url,
        name: "SSO_USER_TOKEN",
        value: sso,
        path: "/",
        storeId,
      });
    }
  });
};
const exportFn = async () => {
  const { url, storeId } = await getCurConfig();
  const cookies = await getAllCookie({ url, storeId });

  const sidCookie = cookies.filter((c) => c.name === "s-sid");
  const ssoCookie = cookies.filter((c) => c.name === "SSO_USER_TOKEN");

  console.log("sidCookie", sidCookie, sidCookie?.[0]?.value);
  console.log("ssoCookie", ssoCookie, ssoCookie?.[0]?.value);

  const text = getTpl({
    sid: sidCookie?.[0]?.value,
    sso: ssoCookie?.[0]?.value,
  });
  console.log(text);
  write_Clipper(text);
};

copyBtn.addEventListener("click", eventWrapper(copyFn));
pasteBtn.addEventListener("click", eventWrapper(pasteFn));
importBtn.addEventListener("click", eventWrapper(importFn));
exportBtn.addEventListener("click", eventWrapper(exportFn));
settingBtn.addEventListener("click", eventWrapper(settingFn));
