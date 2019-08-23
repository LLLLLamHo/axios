'use strict';

var slowTime = 400;
var requestObj = {};

// 记录慢请求时间
function setSlowTime(time) {
  slowTime = time || slowTime;
}

function clearItem(key) {
  if (requestObj[key]) {
    delete requestObj[key];
  }
  setSlowTime(400);
}

function validationRequest(key) {
  var data = requestObj[key];
  if (!data) return;
  var startTime = data.startTime;
  var endTime = data.endTime;
  var reqInfo = data.reqInfo;
  var resInfo = data.resInfo;
  var status = resInfo.status;
  var itemSlowTime = data.slowTime;
  var eaData = null;
  // 判断返回的状态 可能是状态码，可能是超时，可能是错误
  if ( status === 'error' ) {
    eaData = {
      label: '请求出错',
      apiLogType: 'error',
      responseCode: 'error',
      apiRequestUrl: reqInfo.url,
      apiRequestData: {
        method: reqInfo.method,
        headers: reqInfo.headers
      },
      apiResponseData: null
    };
  } else if ( status === 'timeout' ) {
    eaData = {
      label: '请求超时',
      apiLogType: 'timeout',
      responseCode: 'timeout',
      apiRequestUrl: reqInfo.url,
      apiRequestData: {
        method: reqInfo.method,
        headers: reqInfo.headers
      },
      apiResponseData: null
    };
  } else {
    // 判断状态码
    var validateStatus = resInfo.config.validateStatus;
    if (!validateStatus || validateStatus(resInfo.status)) {
      // 判断是否慢请求
      var requestTime = endTime - startTime;
      if ( requestTime > itemSlowTime ) {
        eaData = {
          label: '慢请求',
          apiLogType: 'slow',
          requestTime: requestTime,
          goodRequestTime: itemSlowTime,
          responseCode: resInfo.status,
          apiRequestUrl: reqInfo.url,
          apiRequestData: {
            method: reqInfo.method,
            headers: reqInfo.headers
          },
          apiResponseData: {
            headers: resInfo.headers
          }
        };
      }
    } else {
      eaData = {
        label: '服务器返回异常',
        apiLogType: 'error',
        responseCode: resInfo.status,
        apiRequestUrl: reqInfo.url,
        apiRequestData: {
          method: reqInfo.method,
          headers: reqInfo.headers
        },
        apiResponseData: {
          headers: resInfo.headers
        }
      };
    }
  }
  ea && ea('log', 'apiMonitor', eaData);
}

// 获取慢请求时间
function getSlowTime() {
  return slowTime;
}

function createRequestItem() {
  var key = Date.now();
  requestObj[key] = {
    startTime: null,
    endTime: null,
    slowTime: 400,
    reqInfo: {},
    resInfo: {}
  };
  return key;
}

function setRequestItemReqInfo(key, info) {
  requestObj[key].reqInfo = info;
}

function setRequestItemResInfo(key, info) {
  requestObj[key].resInfo = info;
  validationRequest(key);
  clearItem(key);
}

function setRequestItemSlowTime(key, time) {
  requestObj[key].slowTime = time;
}

function setRequestItemStartTime(key, time) {
  requestObj[key].startTime = time;
}

function setRequestItemEndTime(key, time) {
  requestObj[key].endTime = time;
}

module.exports = {
  getSlowTime: getSlowTime,
  setSlowTime: setSlowTime,
  createRequestItem: createRequestItem,
  setRequestItemReqInfo: setRequestItemReqInfo,
  setRequestItemResInfo: setRequestItemResInfo,
  setRequestItemStartTime: setRequestItemStartTime,
  setRequestItemEndTime: setRequestItemEndTime,
  clearItem: clearItem,
  setRequestItemSlowTime: setRequestItemSlowTime
};
