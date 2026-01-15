chrome.webRequest.onCompleted.addListener(
  (details) => {
    // 只監聽非同步請求
    if (details.type !== "xmlhttprequest" && details.type !== "fetch") return;

    // 定義高優先權業務關鍵字 (包含報價、保單、或帶有單號 ID 的請求)
    const isBusinessApi = details.url.includes('qot') || details.url.includes('policies') || details.url.includes('id=');
    
    if (details.responseHeaders) {
      // 尋找 Trace ID 標籤
      const traceHeader = details.responseHeaders.find(
        (h) => ["x-b3-traceid", "x-trace-id", "trace-id"].includes(h.name.toLowerCase())
      );
      
      if (traceHeader) {
        chrome.storage.local.get(['lastStatus'], (data) => {
          const isCurrentError = details.statusCode >= 400;
          const alreadyHasError = (data.lastStatus >= 400);

          // 核心邏輯：若是業務型 API，無視先前紅燈狀態一律覆蓋；或是目前的請求本身就是錯誤(優先紀錄錯誤)
          if (isBusinessApi || isCurrentError || !alreadyHasError) {
            chrome.storage.local.set({ 
              lastTraceId: traceHeader.value, 
              lastApiUrl: details.url,
              lastStatus: details.statusCode 
            });
          }
        });
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);