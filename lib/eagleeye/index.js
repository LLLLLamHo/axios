'use strict';

var slowTime = 800;
var uploadFn = null;
var requestObj = {};

function toFixed ( s, n ) {
  return Math.round( s * Math.pow( 10, n ) ) / Math.pow( 10, n );
}

// 记录慢请求时间
function setSlowTime ( time ) {
  slowTime = time || slowTime;
}

function clearItem ( key ) {
  if ( requestObj[key] ) {
    delete requestObj[key];
  }
  setSlowTime( 800 );
}

function getPerformance ( name ) {
  var entries = window.performance.getEntriesByName( name );
  var entry = entries && entries[0] ? entries[0] : null;
  var result = null;
  if ( entry ) {
    result = {
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      nextHopProtocol: entry.nextHopProtocol,
      // 谁发起的请求
      // link 即 <link> 标签、script 即 <script>、redirect 即重定向、xmlhttprequest 既ajax
      //   initiatorType: entry.initiatorType,
      //   entryType: entry.entryType, // 资源类型
      //   name: entry.name,
      timing: {
        // 重定向的时间
        redirect: toFixed( entry.redirectEnd - entry.redirectStart, 3 ),
        // 域名解析的耗时
        dns: toFixed( entry.domainLookupEnd - entry.domainLookupStart, 3 ),
        // TCP连接的耗时
        conn: toFixed( entry.connectEnd - entry.connectStart, 3 ),
        // 发出HTTP请求后，收到（或从本地缓存读取）第一个字节时响应耗时
        ttfb: toFixed( entry.responseStart - entry.requestStart, 3 ),
        // 从服务器下载内容耗时
        download: toFixed( entry.responseEnd - entry.responseStart, 3 ),
        // 总耗时
        duration: toFixed( entry.duration, 3 )
      }
    };
  }
  return result;
}

function validationRequest( key ) {
  var data = requestObj[key];
  if ( !data ) return;
  var startTime = data.startTime;
  var endTime = data.endTime;
  var reqInfo = data.reqInfo;
  var resInfo = data.resInfo;
  var status = resInfo.status;
  var itemSlowTime = data.slowTime;
  var eaData = null;
  var reqURL = (reqInfo && reqInfo.url.match( /(http)+|(https)+/g )) ? reqInfo.url : window.location.origin + reqInfo.url;
  var query = null;
  // 考虑到GET请求参数在url，所有如果url存在？那么会进行切割
  if ( reqURL.indexOf( '?' ) !== -1 ) {
    try {
      var splitData = reqURL.split( '?' );
      reqURL = splitData[0];
      query = splitData[1] ? decodeURIComponent( splitData[1] ) : null;
    } catch ( err ) {
      console.error( err );
    }
  }

  // 判断返回的状态 可能是状态码，可能是超时，可能是错误
  if ( status === 2 ) {
    eaData = {
      label: '请求出错',
      apiLogType: 'error',
      responseCode: 2,
      apiRequestUrl: reqURL,
      apiRequestData: {
        method: reqInfo.method,
        headers: reqInfo.headers,
        query: query
      },
      apiResponseData: null
    };
  } else if ( status === 1 ) {
    eaData = {
      label: '请求超时',
      apiLogType: 'timeout',
      responseCode: 1,
      apiRequestUrl: reqURL,
      apiRequestData: {
        method: reqInfo.method,
        headers: reqInfo.headers,
        query: query
      },
      apiResponseData: null
    };
  } else {
    // 判断状态码
    var validateStatus = resInfo.config.validateStatus;
    if ( !validateStatus || validateStatus( resInfo.status ) ) {
      // 判断是否慢请求
      var requestTime = endTime - startTime;
      // 如果浏览器支持performance，用performance来计算
      if ( window.performance && window.performance.getEntriesByName ) {
        var performanceData = getPerformance( resInfo.request.responseURL || '' );
        if ( performanceData && performanceData.timing.duration > itemSlowTime ) {
          eaData = {
            label: '慢请求',
            apiLogType: 'slow',
            requestTime: performanceData.timing.duration,
            goodRequestTime: itemSlowTime,
            responseCode: resInfo.status,
            apiRequestUrl: reqURL,
            apiRequestData: {
              method: reqInfo.method || null,
              headers: reqInfo.headers || null,
              body: reqInfo.data || null,
              query: query
            },
            apiResponseData: {
              headers: resInfo.headers
            },
            performance: performanceData
          };
        } else if ( requestTime > itemSlowTime ) {
          eaData = {
            label: '慢请求',
            apiLogType: 'slow',
            requestTime: requestTime,
            goodRequestTime: itemSlowTime,
            responseCode: resInfo.status,
            apiRequestUrl: reqURL,
            apiRequestData: {
              method: reqInfo.method,
              headers: reqInfo.headers,
              query: query
            },
            apiResponseData: {
              headers: resInfo.headers
            }
          };
        }
      } else if ( requestTime > itemSlowTime ) {
        eaData = {
          label: '慢请求',
          apiLogType: 'slow',
          requestTime: requestTime,
          goodRequestTime: itemSlowTime,
          responseCode: resInfo.status,
          apiRequestUrl: reqURL,
          apiRequestData: {
            method: reqInfo.method,
            headers: reqInfo.headers,
            query: query
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
        apiRequestUrl: reqURL,
        apiRequestData: {
          method: reqInfo.method,
          headers: reqInfo.headers,
          query: query
        },
        apiResponseData: {
          headers: resInfo.headers
        }
      };
    }
  }
  if ( uploadFn ) {
    eaData && uploadFn( eaData );
  } else {
    window.ea && eaData && window.ea( 'log', 'apiMonitor', eaData );
  }
}

// 获取慢请求时间
function getSlowTime () {
  return slowTime;
}

function createRequestItem () {
  var key = Date.now() + (Math.floor(Math.random() * 1000));
  requestObj[key] = {
    id: null,
    startTime: null,
    endTime: null,
    slowTime: 800,
    reqInfo: {},
    resInfo: {}
  };
  return key;
}

function setRequestItemReqInfo ( key, info ) {
  if ( requestObj[key] ) {
    requestObj[key].reqInfo = info;
    // 因为需要获取performance.getEntriesByName，考虑post请求或者RESTful设计方式，post的url一样，所以会自动为url添加一个标识
    if ( window.performance && window.performance.getEntriesByName ) {
      requestObj[key].id = Date.now();
    }
  }
}

function getRequestUrl ( key, url ) {
  if ( !requestObj[key] ) return url;
  var id = requestObj[key].id;
  if ( !id ) {
    return url;
  }
  var newUrl = url;
  if ( url.indexOf( '?' ) !== -1 ) {
    newUrl += '&_eareqid=' + id;
  } else {
    newUrl += '?_eareqid=' + id;
  }
  return newUrl;
}

function setRequestItemResInfo ( key, info ) {
  if ( !requestObj[key] ) return;
  requestObj[key].resInfo = info;
  validationRequest( key );
  clearItem( key );
}

function setRequestItemSlowTime ( key, time ) {
  if ( !requestObj[key] ) return;
  requestObj[key].slowTime = time;
}

function setRequestItemStartTime ( key, time ) {
  if ( !requestObj[key] ) return;
  requestObj[key].startTime = time;
}

function setRequestItemEndTime ( key, time ) {
  if ( !requestObj[key] ) return;
  requestObj[key].endTime = time;
}

function setUploadFn ( fn ) {
  if ( fn ) {
    uploadFn = fn;
  }
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
  setRequestItemSlowTime: setRequestItemSlowTime,
  getRequestUrl: getRequestUrl,
  setUploadFn: setUploadFn
};
