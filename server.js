var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]
var md5 = require('md5');

if (!port) {
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}
let sessions = {}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true)
  var pathWithQuery = request.url
  var queryString = ''
  if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
  var path = parsedUrl.pathname
  var query = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/

  console.log('方方说：含查询字符串的路径\n' + pathWithQuery)
  if (path === '/main.js') {
    let string = fs.readFileSync('./main.js', 'utf8')
    response.setHeader('Content-Type', 'application/javascript;charset=utf8')
    // response.setHeader('Cache-Control','max-age=315360000')
    response.setHeader('Last-Modified','Wed Aug 28 2019 12:57:16 GMT')
    // console.log(response.getHeaders()['last-modified'])
    // console.log(response.getHeader('last-modified'))
    if(request.headers['if-modified-since']===response.getHeaders()['last-modified']){
            response.statusCode = 304
        //这个里面Last-Modified值一样，就没有响应体，只有响应头，也就是有请求，但是不用下载
    }else{
      //这里是Last-Modified值不一样，有响应体，并下载
      response.statusCode = 200
      response.write(string)
    }
    
    // let fileMd5 = md5(string)
    // response.setHeader('ETag', fileMd5)
    // if (request.headers['if-none-match'] === fileMd5) {
      // response.statusCode = 304
      //这个里面MD5值一样，就没有响应体，只有响应头，也就是有请求，但是不用下载
    // } else {

    // }
    response.end()
  }
  else if (path === '/default.css') {
    let string = fs.readFileSync('./default.css', 'utf8')
    // response.setHeader('Set-Cookie',`a=1;Expires=Wed, 21 Oct 2019 07:28:00 GMT`)
    response.setHeader('Set-Cookie','a=1;Max-Age=-1')
    response.setHeader('Content-Type', 'text/css;charset=utf8')
    // response.setHeader('Cache-Control', 'max-age=315360000')
    response.write(string)
    response.end()
  }
  else if (path === '/') {
    let string = fs.readFileSync('./index.html', 'utf8')
    // let cookie=''
    // if(request.headers.cookie){//当直接进入主页的时候，是没有用户上传的这个request.headers.cookie,那么服务器就会断开，request.headers.cookie是undefined，
    //   //当从登陆界面进入的时候，这个request.headers.cookie是存在的，所以需要做一个判断
    //   cookie=request.headers.cookie.split('; ')//这里是分号空格来分隔这个cookie，这个cookie类似于a=1; b=2; sign_in_email=eee
    //   //下面要用到cookie.length。所以如果cookie不存在的时候，为了可以使用，需要前面写上let cookie=''
    // }
    // let hash={}
    // for(i=0;i<cookie.length;i++){
    //   let parts=cookie[i].split('=')//继续用=来分隔这个cookie
    //   let key=parts[0]//第一部分就是前面设置的cookie名字          response.setHeader('Set-Cookie',`sign_in_email=${email};HttpOnly`)
    //   let value=parts[1]//这个第二部分就是cookie的值，对应邮箱
    //   hash[key]=value//把所有的信息都存入这个hash
    //   // console.log(hash)
    // }
    let mySession = sessions[query.sessionId]//query对应前端的查询参数获取到sessionId
    let email
    // if(sessions[hash.sessionId]){
    if (mySession) {
      email = mySession.sign_in_email//这个sessions[hash.sessionId]一旦服务器断开后就释放不存在了，一般服务器不会断开,或者关闭之前会把session存到一个地方
      //如果这个cookie本来已经保存在浏览器里面，那么就不需要判断，所以最好是判断一下
    }
    let users = fs.readFileSync('./db/users', 'utf8')//读取数据库中存储的信息
    users = JSON.parse(users)//把数据库中的字符串转换为对象
    let found = false
    for (i = 0; i < users.length; i++) {
      if (users[i].email === email) {//如果数据库中有一个邮箱和用户的邮箱(也就是cookie的值)相同，就停止退出并把found=true
        found = true
        // console.log(users)
        break
      }
    }
    if (found) {
      string = string.replace('__zhan__', email)//如果found=true说明这个Cookie的值没问题，就把占位符替换，显示用户的邮箱
    }
    else {
      string = string.replace('__zhan__', '不知道')//如果found=false说明这个Cookie的值有问题，就把占位符替换，显示不知道
    }

    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'GET') {//这里的method里面的GET要大写，并且使要满足这个路径和方法才可以走这个路由
    let string = fs.readFileSync('./sign_up.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'POST') {//当在这个路径是POST请求的时候就进这个路由
    readbody(request)
      .then((body) => {
        let hash = {}
        let strings = body.split('&')//这里的string就被&分隔，所以得到新的数组[ 'email=111', 'password=222', 'password_confirmation=333' ]
        strings.forEach((element) => {//这里的element就是前面的数组的三个元素
          let parts = element.split('=')//这里的parts就是把email=111继续分隔为[email,111]
          let key = parts[0]
          let value = parts[1]
          hash[key] = decodeURIComponent(value)//decodeURIComponent可以解码@
        });
        // console.log(hash)//这里就会打出{ email: '111', password: '222', password_confirmation: '333' }
        // console.log(body)//这里的body就是封装函数readbody里面的成功后函数的里面的参数
        // let email=hash['email']
        // let password=hash['password']
        // let password_confirmation=hash['password_confirmation']
        let { email, password, password_confirmation } = hash//这一行代码代表前面三行代码，这是ES6的新的语法
        // console.log(email,password,password_confirmation)
        if (email.indexOf('@') === -1) {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json;charset=utf-8')
          response.write(`{
            "errors":{
              "email":"invalid"
            }
          }`)
        } else if (password !== password_confirmation) {
          response.statusCode = 400
          response.write('password is not match')
        } else {
          var users = fs.readFileSync('./db/users', 'utf8')//这里的路径必须要写上最前的点.
          try {//尝试去执行这里面的代码
            users = JSON.parse(users)//[]
          } catch (error) {//如果try里面的代码执行有异常就放弃try里面的代码执行catch里面的代码,如果没有异常就跳过catch
            users = []
          }
          let inUser = false//判断先设置为false
          for (i = 0; i < users.length; i++) {
            let user = users[i]//把数据库里面的每个对象样式的字符串赋值给user
            if (user.email === email) {//如果数据库里面的邮箱和获取到用户的邮箱是一样的，那么就把inUser设置成true
              inUser = true
              break;
            }
          }
          if (inUser) {//如果inUser是true那么就判断重复了
            response.statusCode = 400
            response.write('email is used')//这里可以复杂一点改成返回给前端一个JSON，这里就不麻烦了
          }
          else {
            users.push({ email: email, password: password })//前面的email是字符串，后面的email是变量
            var usersString = JSON.stringify(users)//把users字符串化
            fs.writeFileSync('./db/users', usersString)//存储这个字符串化后的users，也就是usersString
            response.statusCode = 200
            response.write('success')
          }
        }
        // response.statusCode = 200
        response.end()
      })
    // let body = [];//请求体
    // request.on('data', (chunk) => {//监听request的data事件，每次data事件都会给一小块数据，这里用chunk表示
    //   body.push(chunk);//把这个一小块数据，也就是chunk放到body数组里面。
    // }).on('end', () => {//当end的时候，也就是数据全部上传完了之后。
    //   body = Buffer.concat(body).toString();//这里body就把里面的body数据全部合并起来
    //这个Buffer不知道是什么东西，但是可以在node.js里面打出来看到是一个函数，下面的注释
    // function Buffer(arg, encodingOrOffset,
    //   length) {
    //     showFlaggedDeprecation();
    //     // Common case.
    //     if (typeof arg === 'number') {
    //       if (typeof encodingOrOffset === 'string') {
    //         throw new ERR_INVALID_ARG_TYPE('string', 'string', arg);
    //       }
    //       return Buffer.alloc(arg);
    //     }
    //     return Buffer.from(arg, encodingOrOffset, length);
    //   }

    // at this point, `body` has the entire request body stored in it as a string
    // });
  }
  else if (path === '/sign_in' && method === 'GET') {
    let string = fs.readFileSync('./sign_in.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }
  else if (path === '/sign_in' && method === 'POST') {
    readbody(request)
      .then((body) => {
        let hash = {}
        let strings = body.split('&')//这里的string就被&分隔，所以得到新的数组[ 'email=111', 'password=222', 'password_confirmation=333' ]
        strings.forEach((element) => {//这里的element就是前面的数组的三个元素
          let parts = element.split('=')//这里的parts就是把email=111继续分隔为[email,111]
          let key = parts[0]
          let value = parts[1]
          hash[key] = decodeURIComponent(value)//decodeURIComponent可以解码@
        });
        // console.log(hash)//这里就会打出{ email: '111', password: '222', password_confirmation: '333' }
        // console.log(body)//这里的body就是封装函数readbody里面的成功后函数的里面的参数
        // let email=hash['email']
        // let password=hash['password']
        // let password_confirmation=hash['password_confirmation']
        let { email, password } = hash//这一行代码代表前面三行代码，这是ES6的新的语法
        // console.log(email,password,password_confirmation)

        if (email.indexOf('@') === -1) {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json;charset=utf-8')
          response.write(`{
          "errors":{
            "email":"invalid"
          }
        }`)
        }

        var users = fs.readFileSync('./db/users', 'utf8')//这里的路径必须要写上最前的点.
        users = JSON.parse(users)//这个是把能否储存的字符串对象化从而可以使用

        let found = false
        for (i = 0; i < users.length; i++) {
          let user = users[i]
          if (user.email === email && user.password === password) {//判断用户提供的邮箱和密码是否和数据库中的匹配
            found = true
            break
          }
        }
        if (found) {//如果匹配就200成功
          let sessionId = Math.random() * 100000//设置一个随机的sessionId
          sessions[sessionId] = { sign_in_email: email }//我们把用户的邮箱存到sessions里面，sessions对应的sessionId就可以找到某个用户的信息
          // response.setHeader('Set-Cookie', `sessionId=${sessionId}`)//把这个sessionId作为Cookie
          response.write(`{"sessionId":${sessionId}}`)//不写Cookie的方法,就是把sessionId通过JSON传给前端
          response.statusCode = 200
        } else {//如果不匹配就401验证失败
          response.statusCode = 401//401的意思是邮箱密码等验证失败的代码，而且必须要放到该路由的最前面才可以
          response.setHeader('Content-Type', 'application/json;charset=utf-8')
          response.write(`{
          "errors":{
            "matchEmailAndPassword":"invalid"
          }
        }`)
        }

        response.end()
      })
  }
  else if (path === '/main.js') {
    let string = fs.readFileSync('./main.js', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/javascript;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/xxx') {
    response.statusCode = 200
    // response.setHeader('Content-Type', 'text/json;charset=utf-8')
    response.setHeader('Content-Type', 'text/json;charset=utf-8')

    // response.setHeader('Access-Control-Allow-Origin', 'http://bomber2.com:8002')//告诉浏览器http://bomber2.com:8002是我的朋友，不要限制他的访问
    // response.setHeader('Access-Control-Allow-Origin', 'http://bomber3.com:8003')
    // response.setHeader('Access-Control-Allow-Origin', 'http://bomber2.com:8002 , http://bomber3.com:8003')
    response.setHeader('Access-Control-Allow-Origin', '*')//告诉浏览器所有人是我的朋友，不要限制他们的访问

    response.write(`
    {
      "note":{
        "to": "小谷",
        "from": "bomber",
        "heading": "打招呼",
        "content": "hi"
      }
    }
    `)
    response.end()
  } else {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(`
      {
        "error": "not found"
      }
    `)
    response.end()
  }

  /******** 代码结束，下面不要看 ************/
})

function readbody(request) {
  return new Promise((resolve, reject) => {
    let body = [];//请求体
    request.on('data', (chunk) => {//监听request的data事件，每次data事件都会给一小块数据，这里用chunk表示
      body.push(chunk);//把这个一小块数据，也就是chunk放到body数组里面。
    }).on('end', () => {//当end的时候，也就是数据全部上传完了之后。
      body = Buffer.concat(body).toString();//这里body就把里面的body数据全部合并起来
      resolve(body)//Promise执行完毕成功后就会执行resolve这个函数，这个函数同样会返回
    })
  })
}


server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)


