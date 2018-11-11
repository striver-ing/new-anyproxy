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
        // function nextPageCallback(reponse){
        //     // 修改响应到客户端的数据 response 为注入的js
        //     console.log('回调' + reponse)
        //     if (reponse == "None"){
        //         return responseDetail.response;
        //     }else{
        //         return reponse + return responseDetail.response;
        //     }
        // }
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
        else if (/mp\/appmsg_comment/i.test(requestDetail.url)){ // 评论列表
            next_page = httpPost(responseDetail.response.body.toString(), "/wechat/get_comment", requestDetail.url);
        }
        else if (/http:\/\/localhost:6210\/tip/i.test(requestDetail.url)){ // 本地提示界面
            next_page = httpPost(responseDetail.response.body.toString(), "/wechat/tip", requestDetail.url);
        }

        console.log('------------next_page')
        console.log(next_page)

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

    while(!isReturn){
        deasync.runLoopOnce();
    }
    return newBody;
}