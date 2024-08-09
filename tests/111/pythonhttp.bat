chcp 65001

@echo off  
set cur=%~dp0
echo %cur% 正在切换到目录 xxx...  
cd /d E:/steamLibrary/steamapps/common/iles/resources/app.asar_unpack2024_07_29/web-res/web-mobile
if %errorlevel% neq 0 (  
    echo 切换目录失败，请检查路径是否正确。  
    pause  
    exit /b  
)  
  
echo 正在启动HTTP服务器...  
@REM python -m http.server 8000   这样不支持跨域
python %cur%/pythonhttp.py
if %errorlevel% neq 0 (  
    echo 启动HTTP服务器失败，请确保Python已安装并正确配置。  
    pause  
    exit /b  
)  
  
echo HTTP服务器已启动，访问 http://localhost:8000 查看内容。  
pause