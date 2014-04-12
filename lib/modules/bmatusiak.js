var URL;
if(!process.env.BMATUSIAK_DOMAIN){
    URL = "api.bmatusiak.us";
}else{
    URL = process.env.BMATUSIAK_DOMAIN;
}
var oauthModule = require('./oauth2')
  , url = require('url');

var fb = module.exports =
oauthModule.submodule('bmatusiak')
  .configurable({})

  .apiHost('http://'+URL)
  .oauthHost('http://'+URL)

  .authPath('http://'+URL+'/oauth/authorize')

  .entryPath('/auth/bmatusiak')
  .callbackPath('/auth/bmatusiak/callback')

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.error;
  })
  .handleAuthCallbackError( function (req, res) {
    if (res.redirect) {
        res.redirect("/");
    } else {
      // TODO Replace this with a nice fallback
      throw new Error("You must configure handleAuthCallbackError if you are not using express");
    }
  })

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    var fieldsQuery = "";
    if (this._fields && this._fields.length > 0){
        fieldsQuery = "?fields=" + this.fields();
    }
    this.oauth.get(this.apiHost() + '/me' + fieldsQuery, accessToken, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var facebookResponse = err.extra.res
        , serverResponse = seqValues.res;
      serverResponse.writeHead(
          facebookResponse.statusCode
        , facebookResponse.headers);
      serverResponse.end(err.extra.data);
    } else if (err.statusCode) {
      var serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  });

fb.mobile = function (isMobile) {
  if (isMobile) {
    this.authPath('http://'+URL+'/oauth/authorize');
  }
  return this;
};

fb.popup = function (isPopup) {
  if (isPopup) {
    this.authQueryParam('display', 'popup');
  }
  return this;
};
