const copyBtn = document.getElementById("copy");
const pasteBtn = document.getElementById("paste");
const settingBtn = document.getElementById("setting");
const promisify = (fn) => (...args) =>
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

const copyFn = async () => {
  const tabs = await tabQuery({ active: true, currentWindow: true });
  const curTab = tabs[0];
  const url = curTab.url;
  const tabId = curTab.id;
  console.log(url);
  const storeId = await getCurStoreId(tabId);
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

copyBtn.addEventListener("click", eventWrapper(copyFn));
pasteBtn.addEventListener("click", eventWrapper(pasteFn));
settingBtn.addEventListener("click", eventWrapper(settingFn));
