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

const getCurConfig = async () => {
  const tabs = await tabQuery({ active: true, currentWindow: true });
  const curTab = tabs[0];
  const url = curTab.url;
  const tabId = curTab.id;
  const storeId = await getCurStoreId(tabId);
  return { url, tabId, storeId };
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
  const { url, tabId, storeId } = await getCurConfig();
  const oldCookies = await getAllCookie({ url, storeId });
  console.log("get oldCookies", oldCookies);
  oldCookies.forEach(removeCookie);
  await Promise.all(
    cookies.map((cookie) =>
      setCookie({
        url,
        name: cookie.name,
        value: cookie.value,
        path: "/",
        storeId,
      })
    )
  );

  chrome.tabs.reload(tabId);
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
  console.log(strs);
  strs.forEach((str) => {
    const data = str.includes("export") ? str.slice(7) : str;
    console.log(data);
    let [k, v] = data.split("=").map((d) => d?.trim());
    const realKey = keyMap[k];
    if (realKey) {
      res.push({
        name: realKey,
        value: v,
      });
    }
  });
  console.log(res);

  return res;
};

const readClipper = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({}, async function (result) {
      resolve(result);
    });
  });
};

const writeClipper = (text) => {
  let w = document.createElement("input");
  w.value = text;
  document.body.appendChild(w);
  w.select();
  document.execCommand("Copy");
  w.style.display = "none";
};

const importFn = async () => {
  const result = await readClipper();
  console.log(result);
  const token = getToken(result);
  const { url, tabId, storeId } = await getCurConfig();
  await Promise.all(
    token.map(({ name, value }) =>
      setCookie({
        url,
        name,
        value,
        path: "/",
        storeId,
      })
    )
  );

  chrome.tabs.reload(tabId);
};

const exportFn = async () => {
  const { url, storeId } = await getCurConfig();
  const cookies = await getAllCookie({ url, storeId });

  const ssoCookie = cookies
    .filter((c) => c.name === "s-sid" || c.name === "SSO_USER_TOKEN")
    .map((d) => ({
      name: d.name,
      value: d.value,
    }));

  const text = getTpl(ssoCookie);
  console.log(text);
  writeClipper(text);
};

copyBtn.addEventListener("click", eventWrapper(copyFn));
pasteBtn.addEventListener("click", eventWrapper(pasteFn));
importBtn.addEventListener("click", eventWrapper(importFn));
exportBtn.addEventListener("click", eventWrapper(exportFn));
settingBtn.addEventListener("click", eventWrapper(settingFn));
