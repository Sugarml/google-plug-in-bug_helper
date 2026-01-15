const scenarios = {
  motor: { steps: "1. 進入汽車險新保作業\n2. 輸入被保人與車輛資料\n3. 點選試算並選擇險種\n4. 點選存檔產製報價單", expected: "系統應成功計算保費，產出報價單號並可預覽 PDF。" },
  search: { steps: "1. 進入案件查詢頁面\n2. 輸入身分證號或單號\n3. 點選查詢按鈕", expected: "列表應正確顯示該案件資料，且資料內容與資料庫一致。" },
  print: { steps: "1. 找到目標案件\n2. 點選產製 PDF/印單按鈕\n3. 等待系統回傳檔案", expected: "系統應彈出 PDF 視窗，且文件內容標籤正確。" }
};

function fillScenario(type) {
  const data = scenarios[type];
  document.getElementById('steps').value = data.steps;
  document.getElementById('expected').value = data.expected;
  document.getElementById('actual').value = "目前顯示正常。";
}

function syncApiInfo() {
  chrome.storage.local.get(['lastTraceId', 'lastApiUrl', 'lastStatus'], (data) => {
    document.getElementById('traceId').value = data.lastTraceId || "無";
    document.getElementById('apiUrl').value = data.lastApiUrl || "無";
    const wrapper = document.getElementById('statusWrapper');
    const led = document.getElementById('ledLight');
    const txt = document.getElementById('statusText');

    if (data.lastStatus >= 400) {
      wrapper.className = "status-bar red-mode";
      led.style.background = "#dc3545";
      txt.innerText = `偵測到錯誤 (Status: ${data.lastStatus})`;
    } else if (data.lastTraceId && data.lastTraceId !== "無") {
      wrapper.className = "status-bar green-mode";
      led.style.background = "#28a745";
      txt.innerText = "已同步最新業務 API 資訊";
    }
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
  let currentTab = tabs[0];
  if (!currentTab) return;
  syncApiInfo();

  document.getElementById('scenMotor').onclick = () => fillScenario('motor');
  document.getElementById('scenSearch').onclick = () => fillScenario('search');
  document.getElementById('scenPrint').onclick = () => fillScenario('print');

  // 自動辨識系統與環境
  let systemName = currentTab.url.includes("motor") ? "車險系統" : (currentTab.url.includes("fire") ? "火險系統" : "B2B系統");
  let environment = currentTab.url.includes("b2btest") ? "UAT 環境" : "SIT 環境";
  
  // 抓取帳號
  let userId = "未偵測";
  try {
    let res = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => document.querySelector('.navbar-right .dropdown-toggle')?.innerText.trim()
    });
    userId = res[0].result || "未偵測";
  } catch (e) { userId = "辨識失敗"; }
  document.getElementById('sysInfo').innerText = `${systemName} | ${environment} | 帳號: ${userId}`;

  document.getElementById('resetBtn').onclick = () => {
    chrome.storage.local.set({ lastStatus: 0, lastTraceId: "", lastApiUrl: "" }, () => location.reload());
  };

  document.getElementById('copyBtn').onclick = function () {
    const s = document.getElementById('steps').value || "無";
    const e = document.getElementById('expected').value || "無";
    const a = document.getElementById('actual').value || "無";
    const api = document.getElementById('apiUrl').value || "無";
    const tid = document.getElementById('traceId').value || "無";

    let report = `\n系統：${systemName}\n環境：${environment}\n帳號：${userId}\n網址：${currentTab.url}\n`;
    report += `API URL：${api}\nTrace ID：${tid}\n`;
    report += `步驟：\n${s}\n`;
    report += `預期結果：${e}\n實際結果：${a}\n`;
    report += `--------------------------\n`;

    navigator.clipboard.writeText(report).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.innerText = "✅ 複製成功！";
      btn.style.background = "#007bff";
      setTimeout(() => { btn.innerText = "複製完整報告"; btn.style.background = "#28a745"; }, 2000);
    });
  };
});