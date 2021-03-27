'use strict';

//const consoleLog = console.log;
const consoleLog = () => {}

let connected = false;
let passHubPort;

// popup:

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  if (message.id == "popup shown") {
    consoleLog(`${message.id} on ${message.url}`);
    if(connected) {
      sendResponse({response: "Wait.."});
      passHubPort.postMessage({id: 'find', url: message.url});
    } else {
      sendResponse({response: "not connected"});
    }
  } else {
    consoleLog(message) 
  }
});

chrome.runtime.onConnectExternal.addListener((port) =>  {
  passHubPort = port;
  passHubPort.onDisconnect.addListener((prt) =>  {
    consoleLog(`disconnected ${prt.sender.origin}`);
    connected = false;
  });
  
  consoleLog(`connected: ${passHubPort.sender.origin}`);
  connected = true;
  passHubPort.onMessage.addListener(function(message,sender){
    consoleLog('received');
    consoleLog(message);
  });
  passHubPort.onMessage.addListener(function(message,sender){
    consoleLog('received external ');
    consoleLog(message);
  });
});

function contentScriptCb(result) {
    const lastErr = chrome.runtime.lastError;
    if (lastErr) {
      consoleLog(' lastError: ' + JSON.stringify(lastErr));
    }
}

let loginRequest = {};

function tabCreated(aTab) {

  const lastErr = chrome.runtime.lastError;
  if (lastErr) { 
    consoleLog('tab: ' + tab.id + ' lastError: ' + JSON.stringify(lastErr));
    return;
  }
    // requires additional permission 
    
  chrome.tabs.executeScript(aTab.id, {
      code: `loginRequestJson = ${JSON.stringify(loginRequest)};`
    }, function() {
      const lastErr = chrome.runtime.lastError;
      if (lastErr) {
        consoleLog(' lastError: ' + JSON.stringify(lastErr));
      } else {
        chrome.tabs.executeScript(aTab.id, {file: 'contentScript.js'}, contentScriptCb)
      }
  });
}

let farewellCount = 1;

chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
      
      consoleLog(`request from ${sender.url}`);
      if(request.id == 'loginRequest') {
        loginRequest = request;
        chrome.tabs.create({ url: request.url }, tabCreated);
      } else if (request.id == 'advise') {
        chrome.runtime.sendMessage(request);
      }
      sendResponse({farewell: `goodbye ${request.id} ${farewellCount}`});
      farewellCount++;
    }
);


// just a logger
chrome.tabs.onRemoved.addListener(
  function () {
    const lastErr = chrome.runtime.lastError;
    if (lastErr) {
      consoleLog(' lastError: ' + JSON.stringify(lastErr));
    } else {
      consoleLog('tab Removed');
    }
  }
);


// signal PassHub.net tab (or first candidate) that the extenstion is installed

chrome.runtime.onInstalled.addListener(
  function() {
    const manifest = chrome.runtime.getManifest();
    const urlList = manifest.externally_connectable.matches;
  
    chrome.tabs.query({url: urlList }, function(passHubTabs) {
        if (passHubTabs && passHubTabs.length) {
          const tabId = passHubTabs[0].id;
          chrome.tabs.executeScript(tabId, {
            code: 'const event = new Event("passhubExtInstalled");'
            +'document.dispatchEvent(event);console.log("extension installed")'
          });
      }
    })
  }
);

/*
function cbGetCurrentTab(tab) {
  if(tab.length) {
    consoleLog(tab[0]);
    if (connected) {
      passHubPort.postMessage({id: 'find', url: tab[0].url});
    } else {
      consoleLog('Disco1')
    }
  }
}
*/
