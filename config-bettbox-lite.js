function main(config) {
  const newConfig = { ...config };

  const reservedGroupNames = new Set([
    '默认代理', // 修改点：保留字改名
    '自动选择',
    '漏网之鱼',
    'AI',
    'Media',
    'FCM',
    'Google',
    'Microsoft',
    'Telegram',
    'TikTok',
    'AdBlock',
  ]);

  const proxies = Array.isArray(config.proxies) ? config.proxies : [];

  const filteredProxies = proxies.filter((proxy) => {
    if (!proxy || !proxy.name) return false;
    if (reservedGroupNames.has(proxy.name)) return false;
    return true;
  });

  const allProxyNames = filteredProxies.map((proxy) => proxy.name);

  const uniq = (arr) => {
    return [...new Set(arr.filter(Boolean))];
  };

  const nodeOptions = allProxyNames.length > 0 ? allProxyNames : ['DIRECT'];

  const selectBaseOption = {
    type: 'select',
    'include-all': false,
  };

  const urlTestBaseOption = {
    type: 'url-test',
    'include-all': false,
    url: 'https://www.gstatic.com/generate_204',
    interval: 300,
    tolerance: 50,
    timeout: 5000,
    lazy: true,
  };

  // 自动选择代理组：仅包含纯节点
  const autoGroup = {
    ...urlTestBaseOption,
    name: '自动选择',
    hidden: false, 
    proxies: uniq([...nodeOptions]),
  };

  // 业务代理组和漏网之鱼的基础公共选项，包含默认代理和自动选择
  const commonGroupOptions = ['默认代理', '自动选择']; // 修改点：手动选择 -> 默认代理

  // 【修改点】默认代理组：更名自“手动选择”，并在 proxies 中加入了“自动选择”
  const defaultGroup = {
    ...selectBaseOption,
    name: '默认代理',
    proxies: uniq(['自动选择', ...nodeOptions, 'DIRECT']), // 包含自动选择、纯节点和直连
  };

  // 漏网之鱼代理组：包含公共选项（默认代理+自动选择）、纯节点和直连
  const fallbackGroup = {
    ...selectBaseOption,
    name: '漏网之鱼',
    proxies: uniq([...commonGroupOptions, ...nodeOptions, 'DIRECT']),
  };

  const ruleProvider = (name, behavior, url) => {
    return {
      type: 'http',
      behavior,
      format: 'yaml',
      interval: 86400,
      path: `./ruleset/${name}.yaml`,
      url,
    };
  };

  const finalRuleProviders = {
    github: ruleProvider('github', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.yaml'),
    openai: ruleProvider('openai', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/anthropic.yaml'),
    anthropic: ruleProvider('anthropic', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/anthropic.yaml'),
    google: ruleProvider('google', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.yaml'),
    googlefcm: ruleProvider('googlefcm', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/googlefcm.yaml'),
    youtube: ruleProvider('youtube', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.yaml'),
    netflix: ruleProvider('netflix', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.yaml'),
    spotify: ruleProvider('spotify', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/spotify.yaml'),
    disney: ruleProvider('disney', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/disney.yaml'),
    microsoft: ruleProvider('microsoft', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.yaml'),
    onedrive: ruleProvider('onedrive', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.yaml'),
    telegram: ruleProvider('telegram', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.yaml'),
    telegram_ip: ruleProvider('telegram_ip', 'ipcidr', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.yaml'),
    tiktok: ruleProvider('tiktok', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.yaml'),
    ads: ruleProvider('ads', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ads-all.yaml'),
    gfw: ruleProvider('gfw', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.yaml'),
    cn: ruleProvider('cn', 'domain', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.yaml'),
    cn_ip: ruleProvider('cn_ip', 'ipcidr', 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.yaml'),
  };

  const services = [
    { name: 'AI', ruleSets: ['openai', 'anthropic'] },
    { name: 'Media', ruleSets: ['youtube', 'netflix', 'spotify', 'disney'] },
    { name: 'FCM', ruleSets: ['googlefcm'] },
    { name: 'Google', ruleSets: ['google'] },
    { name: 'Microsoft', ruleSets: ['microsoft', 'onedrive'] },
    { name: 'Telegram', ruleSets: ['telegram', 'telegram_ip'] },
    { name: 'TikTok', ruleSets: ['tiktok'] },
    { name: 'AdBlock', ruleSets: ['ads'], reject: true },
  ];

  const functionalGroups = [];
  const finalRules = [];

  for (const svc of services) {
    const groupProxies = svc.reject
      ? ['REJECT', 'DIRECT']
      : uniq([...commonGroupOptions, ...nodeOptions, 'DIRECT']);

    functionalGroups.push({
      ...selectBaseOption,
      name: svc.name,
      proxies: groupProxies,
    });

    for (const ruleSet of svc.ruleSets) {
      if (ruleSet.endsWith('_ip')) {
        finalRules.push(`RULE-SET,${ruleSet},${svc.name},no-resolve`);
      } else {
        finalRules.push(`RULE-SET,${ruleSet},${svc.name}`);
      }
    }
  }

  // DNS 保持原有逻辑
  newConfig.dns = {
    enable: true,
    listen: ':1053',
    ipv6: false,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'fake-ip-filter': [
      '*.lan', 'localhost.ptlogin2.qq.com', '+.msftconnecttest.com', '+.msftncsi.com',
      'time.*.com', 'time.*.gov', 'time.*.edu.cn', 'time.*.apple.com', 'time-ios.apple.com',
      'time1.*.com', 'time2.*.com', 'time3.*.com', 'time4.*.com', 'time5.*.com', 'time6.*.com', 'time7.*.com',
      'ntp.*.com', 'ntp1.*.com', 'ntp2.*.com', 'ntp3.*.com', 'ntp4.*.com', 'ntp5.*.com', 'ntp6.*.com', 'ntp7.*.com',
      '+.pool.ntp.org', '+.ipv6.microsoft.com', 'speedtest.cros.wr.pvp.net',
    ],
    'default-nameserver': ['223.5.5.5', '119.29.29.29'],
    nameserver: ['https://dns.alidns.com/dns-query', 'https://doh.pub/dns-query'],
    fallback: ['https://1.1.1.1/dns-query', 'https://8.8.8.8/dns-query'],
    'fallback-filter': {
      geoip: true,
      'geoip-code': 'CN',
      ipcidr: ['240.0.0.0/4'],
      domain: ['+.google.com', '+.facebook.com', '+.youtube.com'],
    },
    ...(typeof config.dns === 'object' && config.dns ? config.dns : {}),
  };

  newConfig.proxies = filteredProxies;

  // 优化面板展示顺序：默认代理（全局控） -> 自动选择 -> 业务细分策略组 -> 漏网之鱼全局兜底
  newConfig['proxy-groups'] = [
    defaultGroup,
    autoGroup,
    ...functionalGroups,
    fallbackGroup,
  ];

  newConfig['rule-providers'] = finalRuleProviders;

  newConfig.rules = [
    'RULE-SET,github,Google',
    ...finalRules,
    'RULE-SET,gfw,Google',
    'RULE-SET,cn,DIRECT',
    'RULE-SET,cn_ip,DIRECT,no-resolve',
    'MATCH,漏网之鱼',
  ];

  return newConfig;
}
