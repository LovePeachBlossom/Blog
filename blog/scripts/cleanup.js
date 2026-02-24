hexo.extend.filter.register('after_generate', function() {
  const toRemove = [
    'js/search/algolia.js',
    'js/tw_cn.js',
    'css/var.css'
  ];

  toRemove.forEach(function(path) {
    hexo.route.remove(path);
    hexo.log.info('Cleaned up route: %s', path);
  });
});
