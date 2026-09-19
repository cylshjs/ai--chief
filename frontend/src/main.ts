import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 1. 组件库样式（必须引，否则组件是裸的 HTML）
import 'element-plus/dist/index.css'
// 2. 暗色模式的 CSS 变量，配合 index.html 里给 <html> 挂 .dark
import 'element-plus/theme-chalk/dark/css-vars.css'
// 3. 自己的覆盖样式放最后，才能盖住组件库默认值
import '@/style.css'

import App from '@/App.vue'
import { router } from '@/router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// 全量注册：注册后所有 el-xxx 组件在任意 .vue 里直接可用，不用逐个 import。
// 代价是整包进产物（约 100KB gzip）。要瘦身改成按需引入，见 README 里的说明。
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
