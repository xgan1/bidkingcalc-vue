<script setup lang="ts">
/**
 * 说明与简要攻略：石油王段落在前，老头段落在后；道具名与输入框对应见正文。
 * 金色与橙色在游戏里多指同一档；本页与计算器统一称「橙色」。
 */
</script>

<template>
  <section class="inner-section">
    <h2>说明与使用建议</h2>

    <p>
      本项目由 <strong>B 站：tim561</strong> 制作，纯前端网页：<strong>非营利、无需登录</strong>，计算在浏览器内完成。
      若担心安全可自行查看打包后的脚本或用信任的 <strong>AI</strong> 协助通读，确认没有隐藏上传。
    </p>

    <h3>金色和橙色统一叫橙色</h3>
    <p>同一档品质，界面写法不同；下文与计算器统称<strong>橙色</strong>。</p>

    <h3>艾哈迈德（石油王）</h3>

    <div class="about-images">
      <figure>
        <img src="/images/ahmed-tools.png" alt="艾哈迈德（石油王）道具列表截图" loading="lazy" />
        <figcaption>石油王道具示例；其中<strong>普品扫描、普品均格、良品存量</strong>为必带。</figcaption>
      </figure>
    </div>

    <p>玩<strong>石油王</strong>时，三回合按顺序用下面三件道具。</p>

    <ol class="about-round-list">
      <li>
        <strong>第一回合：</strong><strong>普品扫描</strong> → 填<strong>白绿总占位</strong>（道具） → 填<strong>总藏品数量</strong>（技能）。
      </li>
      <li>
        <strong>第二回合：</strong><strong>普品均格</strong> → 填<strong>白绿平均格数</strong>（道具） → 填<strong>橙色平均格数</strong>（技能）。
      </li>
      <li>
        <strong>第三回合：</strong><strong>良品存量</strong> → 填<strong>蓝色总数量</strong>（道具） → 填<strong>紫色平均格数</strong>（技能）。
      </li>
    </ol>

    <p>
      若系统面板或局内还给出<strong>其它与推算相关的信息</strong>，你可以一并填进表单里标为<strong>「（可选）」</strong>的项，便于进一步缩窄范围。
    </p>

    <h3>维克托（老头）</h3>

    <div class="about-images">
      <figure>
        <img src="/images/victor-tools.png" alt="维克托（老头）道具列表截图" loading="lazy" />
        <figcaption>老头道具示例；其中<strong>优品均格</strong>为必带。</figcaption>
      </figure>
    </div>

    <p>
      <strong>老头</strong>（维克托）的技能会提前给出红色、橙色、紫色各自的<strong>总件数</strong>。
      你用<strong>优品均格</strong>读出平均格数后，打开<strong>「老头」</strong>标签页里的<strong>「平均格数（小数点后两位）」</strong>，把游戏里显示的两位小数填进去，页面会列出<strong>紫色件数</strong>的若干可能，例如<strong>7、14、21…</strong>。
      你再对照<strong>老头技能里红、橙、紫三档的合计总件数</strong>来排除：例如三档合计只有<strong>11</strong>，而候选里下一档已是<strong>14</strong>（大于 11），便可<strong>确定紫色为 7 件</strong>，于是<strong>红色与橙色合计为 4 件</strong>（11 − 7）。
      再按常用的粗估办法，用<strong>「红色 + 橙色」件数 × 约十万游戏币</strong>在心里估算总价，本例大约<strong>四十万</strong>左右（误差可能很大，仅作参考）。
      很多时候，平均值的<strong>特殊尾数</strong>还能帮你在<strong>第一回合只花约两千五游戏币</strong>，就先把<strong>橙色 + 红色</strong>的总数缩到一个大致范围。
    </p>
    <p>
      <strong>另外</strong>，道具涨价后，你若想先弄清<strong>橙色有几件</strong>再反推红色，往往要买<strong>约七万游戏币</strong>档的情报，不太划算。
      若你的目标是直接弄清<strong>红色总件数</strong>，可以直接使用<strong>珍品存量</strong>一类道具（大约<strong>十万游戏币</strong>），比绕弯更省事。
    </p>
    <p>
      <strong>所以</strong>，<strong>局面比较简单</strong>时，更推荐你只花<strong>约两千五游戏币</strong>带<strong>优品均格</strong>：用读出的<strong>紫色平均格数</strong>配合<strong>老头技能给出的总件数</strong>，心里估<strong>红色 + 橙色</strong>的大致总件数即可。
      <strong>局面复杂</strong>（例如红、橙<strong>加起来超过 40 件</strong>）时，你可以直接使用<strong>珍品存量</strong>（约<strong>十万游戏币</strong>），一次拿到<strong>红色总件数</strong>。
    </p>

    <p>
      <strong>老头</strong>线只花<strong>约两千五游戏币</strong>（优品均格等）就能大致推断<strong>红色 + 橙色</strong>的总件数；<strong>石油王</strong>三回合三件普通道具合计大约<strong>六千五游戏币</strong>，用来收窄<strong>红色</strong>的可能区间。
      两条路<strong>各有利弊</strong>，按本局情况选用。
    </p>
  </section>
</template>
