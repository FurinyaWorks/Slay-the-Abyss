# 商店删牌说明差量复核

本目录仅验证新官方布局的文字下限修复：原动态 shop 树及实际文案不变，将新生成 removal/description 的 minFontSize=14 应用到原树。没有重复跑玩法、伪造新 Host 到达或修改生产Lua状态。完整前后字段和源哈希见 delta.json；原图在 ../visual/shop.png。

PIL测量前：104×64、font=min20，4行约104px，溢出1项，与价格区冲突。
PIL测量后：geometry与文案不变，fontSize20、min14允许缩至约16px、三行（约62.4px），溢出0、安全区越界0、同级命中区交叉0。shop-fixed.png已视觉核对，说明与价格不再叠置。

这仍是明确水印的PIL几何诊断，不是浏览器/官方客户端截图；SDK字体/真实自动缩字和纹理尚需同候选验收。source-integrity.json仅覆盖差量渲染期间的源码稳定性，不代表旧动态树重新运行。
