import * as migration_20260911_132233_initial_blog from './20260911_132233_initial_blog';
import * as migration_20260913_120000_article_cover from './20260913_120000_article_cover';
import * as migration_20260913_150000_article_view_days from './20260913_150000_article_view_days';

export const migrations = [
  {
    up: migration_20260911_132233_initial_blog.up,
    down: migration_20260911_132233_initial_blog.down,
    name: '20260911_132233_initial_blog'
  },
  {
    up: migration_20260913_120000_article_cover.up,
    down: migration_20260913_120000_article_cover.down,
    name: '20260913_120000_article_cover'
  },
  {
    up: migration_20260913_150000_article_view_days.up,
    down: migration_20260913_150000_article_view_days.down,
    name: '20260913_150000_article_view_days'
  },
];
