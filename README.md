# Session、LocalStorage、Cache-Control-for-45
### Session
* 本次用的是上次[Cookie说明](https://github.com/bomber063/Cookie-sign-in-for-44)的代码.
* 我们通过测试知道，只要数据库中存在了一个用户的信息，比如邮箱或者密码，那么通过开发者工具中**修改这个Cookie对应的值**就可以更改这个Cookie从而获取到其他用户的个人隐私信息。
* 那么只要用户猜不到，或者**不知道这个Cookie的具体含义就可以解决问题了**。
* 用到的API——[Math.random()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math/random)函数返回一个浮点,  伪随机数在范围[0，1)，也就是说，从0（包括0）往上，但是不包括1（排除1），然后您可以缩放到所需的范围。实现将初始种子选择到随机数生成算法;它不能被用户选择或重置。
* 之前我们是直接存入邮箱,并且这个邮箱及用户的信息都是存在数据库中的，说明不管刷新与否都已经保存下来。
```
          response.setHeader('Set-Cookie', `sign_in_email=${email}`)
```
* 我们增加sessions作为session，和sessionId
```
let sessions={}
```
* 在sign_in和POST路由里面修改
```
          let sessionId=Math.random()*100000//设置一个随机的sessionId
          sessions[sessionId]={sign_in_email:email}//我们把用户的邮箱存到sessions里面，sessions对应的sessionId就可以找到某个用户的信息
          response.setHeader('Set-Cookie', `sessionId=${sessionId}`)//把这个sessionId作为Cookie
```
* 当用了session的时候，此时就是一个随机数，而且这个随机数是根据服务器的开启而存在的，就是说如果服务器断开了这个随机数也就是释放了，不存在了。所以会使得cookie会有undefined。所以首先要给他定义一个空字符串，这个空字符串也可以使用split()
```
  if (path === '/') {
    let string = fs.readFileSync('./index.html', 'utf8')
    let cookie=''
    if(request.headers.cookie){//当直接进入主页的时候，是没有用户上传的这个request.headers.cookie,那么服务器就会断开，request.headers.cookie是undefined，
      //当从登陆界面进入的时候，这个request.headers.cookie是存在的，所以需要做一个判断
      cookie=request.headers.cookie.split('; ')//这里是分号空格来分隔这个cookie，这个cookie类似于a=1; b=2; sign_in_email=eee
      //下面要用到cookie.length。所以如果cookie不存在的时候，为了可以使用，需要前面写上let cookie=''
    }
    let hash={}
    for(i=0;i<cookie.length;i++){//如果用户没有提交信息，那么这个cookie就是undefined
      let parts=cookie[i].split('=')//继续用=来分隔这个cookie
      let key=parts[0]//第一部分就是前面设置的cookie名字          response.setHeader('Set-Cookie',`sign_in_email=${email};HttpOnly`)
      let value=parts[1]//这个第二部分就是cookie的值，对应邮箱
      hash[key]=value//把所有的信息都存入这个hash
      // console.log(hash)
    }
```
* 这时候我们打开服务器的时候就可以看到请求里面会有一个Set-Cookie:sessionId，比如
```
Set-Cookie: sessionId=25476.958647420655
```
* 响应里面会有一个Cookie:sessionId，比如
```
Cookie: sessionId=73612.66996228874
```
* 需要注意的是，**这个东西用户本来不应该看到的，但是为了不让用户知道这是什么意思，所以用一串随机数字来代替,这个时候就算用户篡改了也没什么用处**
* 如何利用这个sessionId，只需要在访问首页的时候找到sessions里面对应的sessionId这个哈希对应的某个用户的信息值即可
* 这个地方的email之前是
```
    let email=hash.sign_in_email
```
* 修改之后
```
    let email
    if(sessions[hash.sessionId]){
      email=sessions[hash.sessionId].sign_in_email//这个sessions[hash.sessionId]一旦服务器断开后就释放不存在了，一般服务器不会断开,或者关闭之前会把session存到一个地方
      //如果这个cookie本来已经保存在浏览器里面，那么就不需要判断，所以最好是判断一下
    }
```
* 第一次请求的时候，服务器响应会返回一个Set-Cookie: sessionId=49268.77608195428(这个数字是随机的)，然后跳转到主页的时候，你的请求会带上这个(这时候不用点view source来看，点了就看不到这个跳转到主页的请求的cookie)
* 有时候会出现[provisional headers are shown(显示临时报头)](https://www.cnblogs.com/pqjwyn/p/10042492.html)这时候一般刷新下页面，或者重新打开网页和服务器就可以解决。其他情况的解决看前面的链接
* 也就是说不直接告诉Cookie这个用户的email是什么，而是通过这个票(sessionID)是多少号，通过这个多少号对应的用户的email是什么，服务器是有记录去找到的。
***
* 简单来说，前面的Cookie是直接存入用户的隐私信息，而session是通过某个随机数字来找到用户的隐私信息
* session是一小块内存，其实就是一个哈希对象，**里面可以存储多个用户的sessionId和对应的某个用户的个人隐私信息**
* sessionId是一小块内存，也是一个哈希对象，里面值存储了**某个用户的个人隐私信息**
* 这个session也是可以篡改的，但是他是一个随机数，改成什么并不影响，除非用户能否把这个随机数所对应的上亿的随机组合记忆下来，显然是几乎不可能的。所以随机数是相对比较安全的一个功能。就算是暴力穷举几乎也不可能，一个16位数的随机排列组合有10^16次方的可能，如果加上英文字母，就是36^16次方的可能，算发送一个请求需要1秒的时间，一天是86400秒，100年大约是31亿秒，16位数成功大概要3亿年时间，36位数就更加长时间了。
* 服务器通过Cookie给用户一个sessionId,然后sessionId对应服务器里面的一小块内存，每次用户访问服务器的时候，服务器就通过sessionId去读取对应的session，然后知道用户的隐私信息。
* 如果给每个用户分配1MB大小的session内存，假设服务器有1000MB可以存储，那么就最对可以服务一千个用户，用户多了这个服务器就不行了。但是一般来说一个用户所占用的内存可能只有1KB差不多了。比如只需要存入一个用户的ID就够了。或者存入一个email
***
### 用一句话来说什么是Cookie和Session
#### Cookie
1. 服务器通过Set-Cookie头给客户端一串字符串
2. 客户端每次访问相同域名的网页时，必须带上这段字符串
3. 客户端要在一段时间内保存这个Cookie
4. 相对于session来说不占用内存
#### Session
* 讲故事的方法就是如果把这个用户的隐私信息直接存到Cookie里面，用户可以看到也可以直接篡改，用作一个ID对应这个用户的隐藏信息就解决啦，这个就是Session
* 逻辑描述的方式就是
1. 将SessionId（随机数）通过Cookie发给客户端
2. 客户端访问服务器时，服务器读取SessionId
3. 服务器有一块内存（对象或者哈希表）保存了所有Session
4. 这个保存了所有Session的这块内存（对象或者哈希表）可以通过SessionId可以得到对应某个用户的Session的隐私信息，如id、email、余额等信息
5. 这块内存（对象或者哈希表）就是服务器上的所有Session，所以这个Session可以是复数，比如Sessions。
6. 对于服务器上保存了很多个Session，对于某个用户来说就是一个Session
7. session相对于Cookie来说占用内存
* 其他知识点，就是这个哈希(key-value)，我们在请求http头里面见过，这里的Session也有排序的计数排序也是哈希来做，很多地方用到哈希，所以这个很重要。
### localStorage
* 它是HTML5技术提供的一个API——[localStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage)。所有新的WEB技术统称为HTML5，包括新的标签、新的Promise等。在开发者工具中可以直接打出localStorage. 它有四个API
1. localStorage.setItem('myCat', 'Tom');//增加了一个数据项目
2. let cat = localStorage.getItem('myCat');//读取 localStorage 项
3. localStorage.removeItem('myCat');//移除 localStorage 项
4. localStorage.clear();// 移除所有
* 还可以通过console.dir(localStorage)查看更多属性和方法
* localStorage它也是一个哈希，**session是服务器上的一个哈希表，而localStorage是浏览器上的哈希表**。
* 可以通过开发者工具的Application里面的Storage->localStorage查看到
#### 通过API就可以存入localStorage到浏览器上
* 比如**存值**
```
localStorage.setItem('a',1)
localStorage.setItem('b',2)
localStorage.setItem('fn',function(){console.log(1)})
```
* 但是这些存入的只能是**字符串(String)，就算不是字符串也会转换为字符串**
* 比如存入字符串
```
localStorage.setItem('object',{name:'bomber'})
```
* 我们通过开发者工具看到显示的**结果是[object Object],说明已经转换为字符串了**，我们任何一个({}).toString()都会变成[object Object].
* 我们可以通过[JSON.stringify()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)把对象转换为一个JSON字符串的样式来存对象，也就是满足JS对象样式的JSON字符串。
```
localStorage.setItem('JSON',JSON.stringify({name:'bomber'}))//存入的结果是{"name":"bomber"}
```
* 当然你还可以直接自己存入符合JS对象样式的字符串
```
localStorage.setItem('O',`{'name':'bomber'}`)//存入的结果是{'name':'bomber'}
```
#### 通过API就可以从浏览器中取出localStorage
* 比如
```
localStorage.getItem('a')//"1"
localStorage.getItem('b')//"2"
localStorage.getItem('fn')//"function(){console.log(1)}"
localStorage.getItem('object')//"[object Object]"
localStorage.getItem('JSON')//"{"name":"bomber"}"
localStorage.getItem('O')//"{'name':'bomber'}"
```
#### 直接清空localStorage
* 清空比如
```
localStorage.clear()
```
### localStorage的使用
* 当我们在主页上增加代码
```
  <script>
    var a=1
    console.log(a)
  </script>
```
* 之后我们打开主页开发者工具在Console里面打印出来的是1，但是当我们在开发者工具中在Console里面输入
```
a=2
```
之后就会显示a返回的是2。**但是当页面刷新后会这个在开发者工具中在Console里面输入的a=2就没有了，也就是当页面关闭只有这个变量就没有了，a就返回还是主页代码里面的1，也就是a=2已经不存在了**
* 那么有什么办法可以使第一个页面的时候存在，第二个页面的时候还是之前那个值呢？这就需要通过**localStorage，因为localStorage是存在浏览器的Application->storage->localStorage里面的，不是存在页面里面，他在window电脑里面一般存在C盘的一个文件里面，所以不管页面刷新还是页面开多少，或者页面关闭，它都存在这个文件里面**，我们通过下面代码来测试
```
    var a=localStorage.getItem('a')//从浏览器，其实是C盘中读取到a的值
    if(!a){//如果不存在就把a赋值为0
      a=0
    }
    else{
      a=parseInt(a,10)+1//parseInt字符串转换为数字，如果存在就把a赋值为a+1
    }
    console.log('a',a)
    localStorage.setItem('a',a)//从浏览器，其实是C盘中设置到'a'的值为a
```
* 这样我们每次刷新页面的时候在开发者工具**Console中看到的是a 0(第一次，因为a不存在所以a赋值为0，同时把a赋值为0的信息存到浏览器的Application->storage->localStorage里面的，其实是c盘的文件里面)->a 1(前面一步存到浏览器的a自己增加1)-> a 2(前面一步存到浏览器的a自己增加1)......然后一直数字增加**
* 所有的页面**共用了一个C盘文件。这就叫做持久化存储**。在有localStorage**之前**，所有的在开发者工具中的变量在页面刷新的那一刻全部释放(销毁)，但是有了localStorage就可以把一些东西存在本地C盘的文件里面。存下来以便以后使用
#### localStorage常见的使用场景
* 比如某个网站（写代码啦网站）要改版了，**提示一下用户这个功能**
* 如果我们不用localStorage
```
    alert('你好，我们的网址改版了，有了这些新功能')
```
* 这样的结果是**每次刷新都会弹出这个提示，有点不友好。其实只需要第一次弹出一个提示就可以了**。这就是典型的在跨页面的时候记录一些东西。怎么记录？**不要存到变量里面，存到localStorage里面就是一种方案。**看下面代码
```
    let already=localStorage.getItem('已经提示')//首先看看有没有提示
    if(!already){//如果没有提示，就提示下用户，然后更改localStorage里面为提示过(也就是同时记录下已经提示了)
      alert('你好，我们的网址改版了，有了这些新功能')
      localStorage.setItem('已经提示',true)
    }else{//如果已经提示过就啥都不做

    }
```
* 这样用户只是第一次进来后看到提示，那么下一次或者刷新页面后就**不会重复提示了，此时他的localStorage已经存下来为'已经提示'这个key**。
#### localStorage的特点
1. LocalStorage跟HTTP无关(相对于Cookie来说，因为Cookie是HTTP的一个请求头，而这没关系)
2. 由于第一条的特点，所以HTTP不会带上LocalStorage的值
3. 只有相同域名的页面才能互相读取LocalStorage，如果QQ域名存储的LocalStorage，百度域名是读取不到的。这个是**浏览器的基本功能**。**但是没有同源那么严格**
4. 每个域名LocalStorage最大存储量为5MB左右(左右的原因是每个浏览器不一样,**我自己测试我自己的电脑的chrome、IE、Edge,360浏览器都是可以储存65MB，66MB就报错了**)，我们可以测试下自己浏览器存储的最大储存量
```
      let s=''
    for(i=0;i<660000;i++){
      s+='一二三四五六七八'
    }
    console.log(s.length)//i<10000,这样有80000个字符，每个字符是两个字节，一个字节是8位，所以80000*2*8=1280000位
    //1280000/1024/1024约等于1.22MB
    localStorage.setItem('aaa',s)//然后乘以65倍存到LocalStorage里面是可以存储的，说明可以存储65MB，
    //但是如果乘以66倍就报错了，在Chrome浏览器的报错信息(index):36 Uncaught DOMException: Failed to execute 'setItem' on 'Storage': Setting the value of 'aaa' exceeded the quota.
```
5. 常用场景：记录有没有提示过用户（不涉及隐私等敏感的信息，不能记录密码等敏感隐私信息）
6. LocalStorage永久有效，除非用户自己清除，或者用户清理缓存，在chrome浏览器中按住Ctrl+shift+delete，你就会得到这个清楚这个浏览器的数据操作页面，对应的高级->Cookie及其他网站数据勾选，这个'及其他网站数据'就包括了LocalStorage，如果点击清楚数据，这个LocalStorage就清除了。
#### sessionStorage的特点
* [sessionStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/sessionStorage)属性允许你访问一个 session Storage 对象。它与 localStorage 相似，不同之处在于 localStorage 里面存储的数据没有过期时间设置，而存储在 sessionStorage 里面的数据在页面会话结束时会被清除。
* 它跟localStorage的API一样，也就是
1. sessionStorage.setItem('myCat', 'Tom');//增加了一个数据项目
2. let cat = sessionStorage.getItem('myCat');//读取 localStorage 项
3. sessionStorage.removeItem('myCat');//移除 localStorage 项
4. sessionStorage.clear();// 移除所有
* 特点：
1. 同localStorage
2. 同localStorage
3. 同localStorage
4. 同localStorage
5. sessionStorage在关闭页面后失效，没有办法和Cookie一样设置失效时间
* 当存入数据后，把浏览器关闭后，**等几秒钟时间时间后在打开就发现sessionStorage已经清空了**。
### 面试题
#### 1. 请问Cookie和session什么关系
* **一般来说**session是基于Cookie实现的——因为session必须将sessionId放到Cookie里面然后发给客户端，没有这个sessionId就没有session，session依赖于Cookie。Cookie是session的基石，不基于Cookie的Session见下面
#### 2. Cookie和localStorage的区别是什么
* 最大的区别就是Cookie每次请求的时候都会带给服务器，而localStorage不会带到服务器上去，因为localStoage跟HTTP无关。
* 其他的补充：Cookie的储存量一般是4KB，而localStorage会有及5MB(经过测试，我的电脑的所有浏览器可以储存65MB)
#### 3. localStorage和sessionStorage的区别
* sessionStorage在用户关闭页面（Session(会话)结束后，这个Session跟服务器上的Session没有一点关系）后失效，
#### 其他
* sessionStorage一般是会话存储，而session一般不翻译，因为session就是一个变量名而已
### 不基于Cookie的Session(这个有些面试官也不一定知道，所以属于超纲的知识)
* 本小节有点超纲，前面说过一般情况Session是基于Cookie实现的，**特殊情况**也可以不基于Cookie
* 实现一个不写Cookie的方法
* 后端部分登陆页面,把Set-Cookie注释掉，然后传一个JSON给前端
```
        if(found){//如果匹配就200成功
          let sessionId=Math.random()*100000//设置一个随机的sessionId
          sessions[sessionId]={sign_in_email:email}//我们把用户的邮箱存到sessions里面，sessions对应的sessionId就可以找到某个用户的信息
          // response.setHeader('Set-Cookie', `sessionId=${sessionId}`)//把这个sessionId作为Cookie
          response.write(`{"sessionId":${sessionId}}`)//不写Cookie的方法,就是把sessionId通过JSON传给前端
          response.statusCode = 200
        }
```
* 后端部分主页，把关于Cookie的都注释掉，然后通过查询参数来获取到sessionId
```
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
    let mySession=sessions[query.sessionId]//query对应前端的查询参数
    console.log(mySession)
    let email
    // if(sessions[hash.sessionId]){
      if(mySession){
      email=mySession.sign_in_email//这个sessions[hash.sessionId]一旦服务器断开后就释放不存在了，一般服务器不会断开,或者关闭之前会把session存到一个地方
      //如果这个cookie本来已经保存在浏览器里面，那么就不需要判断，所以最好是判断一下
    }
```
* 前端登陆页面部分,值写出了第一个then的代码，因为只改了这里的代码，通过把sessionId存到LocalStorage里面，然后通过查询参数传给后台并跳转页面。
```
                .then(
                    (r) => {
                        //不用Cookie的方法，下面三行
                        let object=JSON.parse(r)
                        localStorage.setItem('sessionId',object.sessionId)
                        window.location.href = `/?sessionId=${object.sessionId}`//？是查询参数,首页通过查询参数知道当前用户sessionId是什么
                        console.log('成功', r)
                    },//这里的r就是服务器返回的response，也就是符合html语法的字符串
```
* 前端部分的查询参数带代码
```
                        window.location.href = `/?sessionId=${object.sessionId}`//？是查询参数,首页通过查询参数知道当前用户sessionId是什么

```
* 对应后端部分的查询参数代码
```
    let mySession=sessions[query.sessionId]//query对应前端的查询参数获取到sessionId
```
* 也就是前端`/?sessionId=${object.sessionId}`,这里是反引号,对应后端的query.sessionId
* 不过这个SessionId就会直接显示在浏览器地址里面
* 写了这么多就是为了说明Session**大部分时间**是基于Cookie来存储它的ID，但是也可以通过**查询参数和localStorage来存储它的ID**
### 为什么会把localStorage和Cookie进行比较
* 这是有历史原因的。因为localStorage是新的API，就是近五年左右出现的，那么在此之前的前端是如何做跨页面的持久化存储呢？只能通过Cookie，Cookie也是存储在C盘的，所以页面刷新在多次这个Cookie在是存储在C盘里面，所以之前的前端都是把数据存到Cookie里面来实现跨页面的。
* 但是Cookie有一个**缺点**，所有（每一个请求）写到Cookie里面的东西都会带到服务器上去，假设Cookie里面有1KB的字符串，那么每一次请求都会多1KB的大小（本来一个请求只有几百B左右的大小），这样导致数据上传或者**传输的过程会变慢**，所以后面出现新的localStorage就用localStorage了。
* 所以localStorage和Cookie做**持久化储存肯定是选择localStorage**
* 一般来说**前端工程师永远不要读取或者写Cookie，因为正常来说Cookie是后端工程师来读取和写的，而且前端有自己的API——localStorage**，另外Cookie一般存储一个写ID，不能存储用户的昵称密码等敏感信息，如果需要取用户的邮箱或者密码就问服务器。服务器会告诉你，Cookie这个东西不靠谱。
### HTTP缓存
* 先从Cache-Control讲起，[Cache-Control](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Cache-Control)通用消息头字段，被用于在http请求和响应中，通过指定指令来实现缓存机制。它属于Web性能优化的一部分（在中国要讲Web性能优化，是因为以前的前端比较菜，因为以前的前端不知道如何加速网页访问）。
* 为了能看到请求响应的速度，我们下载一个比较大的CSS和JS。
* 下载[vue.js](https://cdn.bootcss.com/vue/2.6.10/vue.js)和[bootstrap.css](https://cdn.bootcss.com/twitter-bootstrap/4.3.1/css/bootstrap.css)到main.js和default.css里面保存。再次打开主页请求后看到。
1. 主页的请求时间是6ms,大小19KB
2. main.js的请求时间是20ms，大小是369KB
3. default.css的请求时间是15ms，大小是217KB
* 当然每次刷新时间不一定一样，总的来说都是main.js和default.css都是比主页要慢。
#### 如何加快速度？
* 当我们在路由main.js里面写下
```
    response.setHeader('Cache-Control','max-age=30')//max-age设置缓存存储的最大周期，超过这个时间缓存被认为过期(单位秒)。与Expires相反，时间是相对于请求的时间。
```
* 我们再次看请求的时间，发现main.js第一次刷新后多了一个请求头Cache-Control: max-age=30，当我们在**30s内**再次刷新请求后**显示的时间是0ms，并且大小（size）显示的是memory cache**，也就是20ms变成了0ms。当**超过30s后**再次刷新后，又会显示20ms左右（为什么是左右，因为每次请求时间不一定完全相同）
* 也就是说第一次浏览器请求服务器一个main.js，然后服务器给了一堆文本，其实有一个请求头是Cache-Control: max-age=30,这里的单位是秒
1. 如果浏览器在**30秒内请求同样的URL(也就是网址)**，那么浏览器就会**阻断这个请求，没有发请求**，而是直接从内存中返回上一次的main.js。
2. 如果过了30秒后，浏览器再次请求这个同样的额URL，那么浏览器才会重新发出请求最开始（第一次的请求）的那次请求。
3. 然后30秒内继续不请求，30秒发出请求，不停的循环
* 我们继续把CSS的路由改成一样的
```
    response.setHeader('Cache-Control','max-age=30')
```
* 我们发现**第一次30秒内请求的时候大小(size)会有一个disk cache，也就是从硬盘缓存获取**，而**下一次30秒内会显示大小(size)会有一个memory cache**,这个我就不知道是为啥。经过查看[写代码啦](https://xiedaimala.com/)网站，可以看到不管是JS还是CSS都有可能出现disk cache和memory cache
* 如果**你选择了Disable cache**,那么就不会从内存里面获取信息，而是每次都会发送请求去获取页面。这样时间就会长一点。测试后如果选择了Disable cache需要下载耗时**7.72s**，但是没有选择Disable cache只需要耗时**709ms**。