# Session、LocalStorage、Cache-Control-for-45
### Session
* 本次用的是上次[Cookie说明](https://github.com/bomber063/Cookie-sign-in-for-44)的代码.
* 我们通过测试知道，只要数据库中存在了一个用户的信息，比如邮箱或者密码，那么通过开发者工具中**修改这个Cookie对应的值**就可以更改这个Cookie从而获取到其他用户的个人隐私信息。
* 那么只要用户猜不到，或者**不知道这个Cookie的具体含义就可以解决问题了**。
* 用到的API——(Math.random())(https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math/random)函数返回一个浮点,  伪随机数在范围[0，1)，也就是说，从0（包括0）往上，但是不包括1（排除1），然后您可以缩放到所需的范围。实现将初始种子选择到随机数生成算法;它不能被用户选择或重置。
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
* Cookie
1. 服务器通过Set-Cookie头给客户端一串字符串
2. 客户端每次访问相同域名的网页时，必须带上这段字符串
3. 客户端要在一段时间内保存这个Cookie
* Session
* 讲故事的方法就是如果把这个用户的隐私信息直接存到Cookie里面，用户可以看到也可以直接篡改，用作一个ID对应这个用户的隐藏信息就解决啦，这个就是Session
* 逻辑描述的方式就是
1. 将SessionId（随机数）通过Cookie发给客户端
2. 客户端访问服务器时，服务器读取SessionId
3. 服务器有一块内存（对象或者哈希表）保存了所有Session
4. 这个保存了所有Session的这块内存（对象或者哈希表）可以通过SessionId可以得到对应某个用户的Session的隐私信息，如id、email、余额等信息
5. 这块内存（对象或者哈希表）就是服务器上的所有Session，所以这个Session可以是复数，比如Sessions。
6. 对于服务器上保存了很多个Session，对于某个用户来说就是一个Session
* 其他知识点，就是这个哈希(key-value)，我们在请求http头里面见过，这里的Session也有排序的计数排序也是哈希来做，很多地方用到哈希，所以这个很重要。

