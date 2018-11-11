'use strict';

module.exports = {

  summary: 'the default rule for AnyProxy',

  /**
   *
   *
   * @param {object} requestDetail
   * @param {string} requestDetail.protocol
   * @param {object} requestDetail.requestOptions
   * @param {object} requestDetail.requestData
   * @param {object} requestDetail.response
   * @param {number} requestDetail.response.statusCode
   * @param {object} requestDetail.response.header
   * @param {buffer} requestDetail.response.body
   * @returns
   */
  *beforeSendRequest(requestDetail) {
    if(/google|btrace/i.test(requestDetail.url)){
        return {
          response: {
            statusCode: 200,
            header: { 'content-type': 'text/html' },
            body: ''
          }
        };
    }
    return null;
  },


  /**
   *
   *
   * @param {object} requestDetail
   * @param {object} responseDetail
   */
  *beforeSendResponse(requestDetail, responseDetail) {
    try{
        var next_page = ''

        if(/mp\/profile_ext\?action=home/i.test(requestDetail.url) || /mp\/profile_ext\?action=getmsg/i.test(requestDetail.url)){ //文章列表 包括html格式和json格式
            next_page = httpPost(responseDetail.response.body.toString(), "/wechat/get_article_list", requestDetail.url);
        }
        else if(/\/s\?__biz=/i.test(requestDetail.url) || /mp\/appmsg\/show\?__biz=/i.test(requestDetail.url) || /\/mp\/rumor/i.test(requestDetail.url)){ //文章内容；mp/appmsg/show?_biz 为2014年老版链接;  mp/rumor 是不详实的文章
            next_page = httpPost(responseDetail.response.body.toString(), "/wechat/get_article_content", requestDetail.url);
        }
        else if (/mp\/getappmsgext/i.test(requestDetail.url)){ // 阅读量 观看量
            next_page = httpPost(responseDetail.response.body.toString(), "/wechat/get_read_watched_count", requestDetail.requestData.toString());
        }
        // else if (/mp\/appmsg_comment/i.test(requestDetail.url)){ // 评论列表
        //     next_page = httpPost(responseDetail.response.body.toString(), "/wechat/get_comment", requestDetail.requestData.toString());
        // }
        else if (/6210\/tip/i.test(requestDetail.url)){ // 本地提示界面
            next_page = httpPost(responseDetail.response.body.toString(), "/wechat/tip", requestDetail.url);
        }

        if (next_page != '' && next_page != 'None'){
            var newResponse = Object.assign({}, responseDetail.response);
            newResponse.body = next_page + newResponse.body;

            if(/mp\/profile_ext/i.test(requestDetail.url)){ //文章列表 包括html格式和json格式
                newResponse.header['content-type'] = 'text/html; charset=UTF-8' // 修改json类型为html
                // 不缓存
                newResponse.header['Expires'] = 0;
                newResponse.header['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            }
            // 修改文章内容的响应头，去掉安全协议，否则注入的<script>setTimeout(function(){window.location.href='url';},sleep_time);</script>js脚本不执行
            else if(/\/s\?__biz=/i.test(requestDetail.url) || /mp\/appmsg\/show\?__biz=/i.test(requestDetail.url) ){
                delete newResponse.header['Content-Security-Policy']
                delete newResponse.header['content-security-policy-report-only']
                delete newResponse.header['Strict-Transport-Security']
                delete newResponse.header['x-anyproxy-origin-content-length']
                delete newResponse.header['x-anyproxy-origin-content-encoding']
                // 不缓存
                newResponse.header['Expires'] = 0;
                newResponse.header['Cache-Control'] = 'no-cache, no-store, must-revalidate';

                newResponse.body = del_img(newResponse.body)
                // newResponse.body = del_video(newResponse.body)

                // console.log(newResponse.header)
            }

            return {
              response: newResponse
            };
        }


    }catch(e){
        console.log(e);
    }

    return null;
  },


  /**
   * default to return null
   * the user MUST return a boolean when they do implement the interface in rule
   *
   * @param {any} requestDetail
   * @returns
   */
  *beforeDealHttpsRequest(requestDetail) {
    return null;
  },

  /**
   *
   *
   * @param {any} requestDetail
   * @param {any} error
   * @returns
   */
  *onError(requestDetail, error) {
    if(/mp\.weixin\.qq\.com/i.test(requestDetail.url)){
        // 防止白屏 发生错误时自动刷新
        return {
            response: {
                statusCode: 500,
                header: { 'content-type': 'text/html' },
                body: '<script>setTimeout(function(){window.location.reload();},2000);</script>'
            }
        };

    };
    return null;
  },


  /**
   *
   *
   * @param {any} requestDetail
   * @param {any} error
   * @returns
   */
  *onConnectError(requestDetail, error) {
    return null;
  },
};

// 删除图片请求
function del_img(body){
    // /i (忽略大小写)
    // /g (全文查找出现的所有匹配字符)
    // /m (多行查找)
    // /gi(全文查找、忽略大小写)
    // /ig(全文查找、忽略大小写)
    var reg=new RegExp("<img.*?>","gmi");
    body = body.replace(reg,"");
    return body
}

// 删除视频请求 不好用
function del_video(body){
    var reg=new RegExp("div id=\"video_container\"[.\n]*?<script","gmi");
    body = body.replace(reg,"<script");
    return body
}

// 发送数据到自己的服务端
function httpPost(data, actionMethod, reqUrl) {
    console.log('发送数据到服务端')
    console.log(reqUrl)

    const deasync = require("deasync");
    let newBody, isReturn = false;

    var http = require('http');
    var data = {
        data:data,
        req_url:reqUrl
    };
    var content = require('querystring').stringify(data);
    var options = {
        method: "POST",
        host: "localhost", //注意没有http://，这是服务器的域名。
        port: 6210,
        path: actionMethod, //处理请求的action
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            "Content-Length": content.length
        }
    };
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) { // chunk 为假时不触发回调
            console.log('BODY: ' + chunk);

            newBody = chunk
            isReturn = true;

        });
    });
    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });
    req.write(content);
    req.end();

    while(!isReturn){ // 更优雅的方式 async/await node7.0

        deasync.runLoopOnce();
    }
    return newBody;
}