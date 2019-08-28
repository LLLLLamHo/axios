# zzc-axios

[axios文档](https://github.com/axios/axios)

使用zzc-axios和axios本质上没有任何区别，只需要改变应用zzc-axios即可。

使用zzc-axios的页面必须引用鹰眼的SDK。

内置鹰眼接口监控，方便检测接口的情况，主要做了以下功能。
 - 慢请求
 - 服务器异常返回
 - js请求出错
 - 超时请求

## 慢请求

默认设置了800毫秒的阈值，当请求超过这个阈值，将会主动上报慢请求。

因为每个接口的情况不一样，所以可以提供单独传入参数slowTime来配置阈值。


几种不同的方式
```JavaScript
// 直接调用axios发起请求
var options = {
  url: 'xxxxxx'
  data: {},
  method: 'xxx',
  headers: {},
  slowTime: 2000 // 配置两秒的慢请求阈值
};
axios(options)
  .then(function (res) {
    response.innerHTML = JSON.stringify(res.data, null, 2);
  })
  .catch(function (res) {
    response.innerHTML = JSON.stringify(res.data, null, 2);
  });

// 调用get或者post发起请求
axios.get(URL, { params: BODY, slowTime: 2000 })
  .then(handleSuccess)
  .catch(handleFailure);

axios.post(URL, BODY, {slowTime: 2000})
  .then(handleSuccess)
  .catch(handleFailure);

```

### 自定义上传

为满足RN上报，提供自定义上报函数的传入方式。

```JavaScript
this.http = axios.create({
  customUpload: (data) => {}
});
```

MIT
