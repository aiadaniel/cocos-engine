目前的运行方式无法确认是使用哪个平台，所以fsUtils会找不到（这个依赖于平台实现），当前手动修改settings的属性为公开，外部直接设置。

由于cocos资源加载最终需要执行xmlhttprequest（几个downloader模块），故需用pythonhttp.bat脚本启动一个简单http服务。

另外每个项目的settings.json没有配置该服务地址，直接代码层面替换。


url-trans-combine是个资源解析的例子，里面可以看到完整的bundle config信息，文件信息等，保留参考。
