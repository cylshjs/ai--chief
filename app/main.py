import os

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api.v1 import chat
from app.api.v1 import oss
from app.common.logger import setup_logging

# 初始化日志配置
setup_logging()

app = FastAPI(
    title="Personal Chief API",
    description="私厨",
    version="0.1.0"
)

# 注：不需要 CORS。开发期 Vite 把 /api 代理到 8001（见 frontend/vite.config.ts），
# 生产期前端由下面这个进程的 StaticFiles 托管 —— 两种情况浏览器看到的都是同源请求。

# 1.挂载路由
app.include_router(chat.router, prefix="/api/v1", tags=["对话"])
app.include_router(oss.router, prefix="/api/v1", tags=["申请上传签名url"])

# 2.挂载前端资源（Vue 构建产物，输出目录见 frontend/vite.config.ts 的 build.outDir）
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


# 3.SPA fallback：静态文件没命中就回 index.html，交给 vue-router 处理前端路由
# 注意：Starlette 按注册顺序匹配，挂在 "/" 的 StaticFiles 会吞掉之后注册的所有路由，
# 所以这里用 404 异常处理器，而不是再写一个 catch-all 路由
@app.exception_handler(StarletteHTTPException)
async def spa_fallback(request: Request, exc: StarletteHTTPException):
    index_path = os.path.join(static_dir, "index.html")
    last_segment = request.url.path.rsplit("/", 1)[-1]
    if (
        exc.status_code == 404
        and not request.url.path.startswith("/api/")
        # 只回落"页面导航"（/history、/chat/xxx）。带扩展名的路径说明在要具体的文件，
        # 缺了就是真的缺 —— 回 HTML 会被浏览器当 JS 解析，报 Unexpected token '<'
        and "." not in last_segment
        and os.path.exists(index_path)
    ):
        return FileResponse(index_path)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


# 4.缓存策略：index.html 每次回源校验，带哈希的 assets 长期缓存
@app.middleware("http")
async def cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif response.headers.get("content-type", "").startswith("text/html"):
        response.headers["Cache-Control"] = "no-cache"
    return response

if __name__ == "__main__":
    import uvicorn
    # 启动命令：python -m app.main
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
