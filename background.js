var refreshUrl = "https://ks.kunskapsporten.se/skolspecifikt/orebro.4.2c212145130af01345480007035.html?sv.url=12.537a6cce147592b878a1a5f&state=view";
var voteUrl = "https://ks.kunskapsporten.se/4.2c212145130af01345480007035/12.537a6cce147592b878a1a5f.html?state=vote&sv.contenttype=text/html;charset=UTF-8&poll=42.44a31829156eddf0fde8c0f5&vote=3";
var badUrl = "https://sts.kedschools.com/adfs/ls/";
var loginUrl = "https://ks.kunskapsporten.se/";

var refreshTabId,
    voteTabId,
    loginTabId;

var redirects = 0;

var running = false;


function vote() {
    if (running) {
        chrome.cookies.remove({url:refreshUrl,name:"JSESSIONID"}, function(details) {
            redirects = 0;
            chrome.tabs.create({url:refreshUrl,active:false}, function(refreshTab) {
                refreshTabId = refreshTab.id;
            });
        });
    }
}

chrome.browserAction.onClicked.addListener(function(activeTab) {
    if (running) {
        running = false;
    } else {
        running = true;
        vote();
    }
});

chrome.webNavigation.onCompleted.addListener(function(details) {
    if (details.tabId == refreshTabId) {
        if (redirects == 2) {
            chrome.tabs.remove(refreshTabId, function() {});
            refreshTabId = null;
            if (running) {
                redirects = 0;
                chrome.tabs.create({url:voteUrl,active:false}, function(voteTab) {
                    voteTabId = voteTab.id;
                });
            }
        } else {
            if (details.url.indexOf(badUrl) >= 0) {
                refreshCount = 0;
                chrome.tabs.executeScript(refreshTabId, {code:"document.getElementsByClassName(\"idp\")[2].click();"});
            }
            redirects++;
        }
    } else if (details.tabId == voteTabId) {
        if (redirects == 1) {
            chrome.tabs.remove(voteTabId, function() {
                voteTabId = null;
                if (running) {
                    vote();
                }
            });
        } else {
            redirects++;
        }
    } else if (details.tabId == loginTabId) {
        console.log("login");
        if (redirects == 1) {
            chrome.tabs.executeScript(loginTabId, {code:"document.getElementsByClassName(\"idp\")[2].click();"});
        } else if (redirects >= 2) {
            console.log(redirects);
            chrome.tabs.remove(loginTabId, function() {});
            loginTabId = null;
            vote();
        } else {
            redirects++;
        }
    }
});

chrome.webRequest.onCompleted.addListener(function(details) {
    if (details.statusCode === 400) {
        chrome.cookies.getAll({url:badUrl}, function(badCookies) {
            for (var i=0; i<badCookies.length; i++) {
                chrome.cookies.remove({url:"https://" + badCookies[i].domain + badCookies[i].path,name:badCookies[i].name});
            }
            chrome.cookies.getAll({url:loginUrl}, function(loginCookies) {
                for (var i=0; i<loginCookies.length; i++) {
                    chrome.cookies.remove({url:"https://" + loginCookies[i].domain + loginCookies[i].path,name:loginCookies[i].name});
                }
                console.log(details.url);
                chrome.tabs.get(refreshTabId, function(tab) {
                    if (chrome.runtime.lastError) {
                        chrome.tabs.get(voteTabId, function(tab) {
                            if (!chrome.runtime.lastError) {
                                chrome.tabs.remove(voteTabId, function() {});
                            }
                        });
                    } else {
                        chrome.tabs.remove(refreshTabId, function() {});
                    }
                    redirects = 1;
                    chrome.tabs.create({url:loginUrl,active:false}, function(loginTab) {
                        loginTabId = loginTab.id;
                    });
                });
            });
        });
    }
}, {urls:["*://*.kedschools.com/*", "*://*.kunskapsporten.se/*", "*://*.kunskapsskolan.se/*"]});